/* ------------------------------------------------------------------ *
 * Leva o retrato de uma pessoa pro contato dela no Resend.
 *
 * - `carregarRetrato` lê o Firestore (usuário, lojas, papel, assinatura, uso).
 * - `sincronizar` aplica no Resend: cria/atualiza o contato, garante as
 *   propriedades e os segmentos "TNC · …", e põe/tira a pessoa de cada um.
 * Idempotente: se nada mudou desde a última vez (impressão igual em
 * `contatos_resend/{uid}`), não chama a API.
 * ------------------------------------------------------------------ */
import type { Firestore } from 'firebase-admin/firestore'
import { calcularContato, diferencaSegmentos, impressao, PROPRIEDADES, SEGMENTOS, type LojaDaPessoa, type RetratoPessoa } from './contato'
import { ErroResend, type ClienteResend } from './resend'

export async function carregarRetrato(db: Firestore, uid: string): Promise<RetratoPessoa | null> {
  const u = await db.doc(`users/${uid}`).get()
  if (!u.exists) return null
  const d = u.data() ?? {}
  const email = (d.email as string | undefined) ?? ''
  const lojasSnap = await db.collection('restaurants').where('memberUids', 'array-contains', uid).get()
  const lojas: LojaDaPessoa[] = await Promise.all(
    lojasSnap.docs.map(async (r) => {
      const rid = r.id
      const [membro, assin, contagem, ultimo, atividade, despesas] = await Promise.all([
        db.doc(`restaurants/${rid}/membros/${uid}`).get(),
        db.doc(`assinaturas/${rid}`).get(),
        db.collection(`restaurants/${rid}/receita_dia`).count().get(),
        db.collection(`restaurants/${rid}/receita_dia`).orderBy('data', 'desc').limit(1).get(),
        db.collection(`restaurants/${rid}/atividades`).orderBy('criadoEm', 'desc').limit(1).get(),
        db.collection(`restaurants/${rid}/despesas`).count().get(),
      ])
      const quando = atividade.docs[0]?.data().criadoEm as string | { toDate?: () => Date } | undefined
      return {
        rid,
        nome: r.data().nome as string | undefined,
        papel: membro.data()?.papel as string | undefined,
        assinatura: assin.data() as LojaDaPessoa['assinatura'],
        diasLancados: contagem.data().count,
        ultimoLancamento: (ultimo.docs[0]?.data().data as string | undefined)?.slice(0, 10),
        ultimaAtividade: typeof quando === 'string' ? quando : quando?.toDate?.().toISOString(),
        membros: ((r.data().memberUids as string[] | undefined) ?? []).length,
        despesas: despesas.data().count,
        desde: membro.createTime?.toDate().toISOString(),
      }
    }),
  )
  const convite = await db.collection('convites').where('usadoPor', '==', uid).limit(1).get()
  const criado = d.criadoEm ?? u.createTime?.toDate().toISOString()
  return {
    uid,
    email,
    nome: d.nome as string | undefined,
    criadoEm: typeof criado === 'string' ? criado : (criado as { toDate?: () => Date })?.toDate?.().toISOString(),
    entrouPor: convite.empty ? 'direto' : 'convite',
    lojas,
  }
}

/** Cache por instância: ids de segmento por nome e propriedades já criadas. */
export interface CacheResend {
  segmentos?: Map<string, string>
  propriedades?: Set<string>
}

async function idsDosSegmentos(r: ClienteResend, cache: CacheResend, nomes: string[]): Promise<Map<string, string>> {
  if (!cache.segmentos) cache.segmentos = new Map((await r.listarSegmentos()).map((s) => [s.name, s.id]))
  for (const nome of nomes) {
    if (!cache.segmentos.has(nome)) cache.segmentos.set(nome, (await r.criarSegmento(nome)).id)
  }
  return cache.segmentos
}

async function garantirPropriedades(r: ClienteResend, cache: CacheResend) {
  if (!cache.propriedades) cache.propriedades = new Set((await r.listarPropriedades()).map((p) => p.key))
  for (const [key, tipo] of Object.entries(PROPRIEDADES)) {
    if (!cache.propriedades.has(key)) {
      await r.criarPropriedade(key, tipo)
      cache.propriedades.add(key)
    }
  }
}

export type ResultadoSync = 'atualizado' | 'sem-mudanca' | 'removido' | 'ignorado'

export interface Estado {
  ler(uid: string): Promise<{ contatoId?: string; email?: string; impressao?: string } | undefined>
  gravar(uid: string, dados: { contatoId: string; email: string; impressao: string }): Promise<void>
  apagar(uid: string): Promise<void>
}

export async function sincronizar(
  uid: string,
  retrato: RetratoPessoa | null,
  deps: { resend: ClienteResend; estado: Estado; cache: CacheResend; agora?: Date; forcar?: boolean },
): Promise<ResultadoSync> {
  const { resend, estado, cache } = deps
  const anterior = await estado.ler(uid)
  const contato = retrato ? calcularContato(retrato, deps.agora ?? new Date()) : null

  if (!contato) {
    // Conta apagada (ou sem e-mail): some do Resend junto.
    if (anterior?.contatoId) {
      await resend.removerContato(anterior.contatoId).catch((e) => {
        if (!(e instanceof ErroResend && e.status === 404)) throw e
      })
      await estado.apagar(uid)
      return 'removido'
    }
    return 'ignorado'
  }

  const marca = impressao(contato)
  if (!deps.forcar && anterior?.impressao === marca && anterior.contatoId) return 'sem-mudanca'

  await garantirPropriedades(resend, cache)
  const corpo = { first_name: contato.primeiroNome, properties: contato.propriedades }

  // Trocou de e-mail: o contato antigo sai (o Resend identifica contato pelo e-mail).
  if (anterior?.contatoId && anterior.email && anterior.email !== contato.email) {
    await resend.removerContato(anterior.contatoId).catch(() => undefined)
  }
  let contatoId: string
  try {
    contatoId = (await resend.criarContato({ email: contato.email, ...corpo })).id
  } catch (e) {
    // Já existe (cadastrado antes, ou por outro caminho): atualiza pelo e-mail.
    if (!(e instanceof ErroResend) || e.status >= 500) throw e
    await resend.atualizarContato(contato.email, corpo)
    contatoId = (await resend.buscarContato(contato.email)).id
  }

  const ids = await idsDosSegmentos(resend, cache, Object.values(SEGMENTOS))
  const atuais = (await resend.segmentosDoContato(contatoId)).map((s) => s.name)
  const { entrar, sair } = diferencaSegmentos(contato.segmentos, atuais)
  for (const nome of entrar) await resend.adicionarAoSegmento(contatoId, ids.get(nome)!)
  for (const nome of sair) {
    const sid = ids.get(nome)
    if (sid) await resend.removerDoSegmento(contatoId, sid)
  }

  await estado.gravar(uid, { contatoId, email: contato.email, impressao: marca })
  return 'atualizado'
}

/** Estado no Firestore (coleção só do servidor; nenhuma regra do app libera). */
export function estadoFirestore(db: Firestore): Estado {
  const ref = (uid: string) => db.doc(`contatos_resend/${uid}`)
  return {
    ler: async (uid) => (await ref(uid).get()).data() as Awaited<ReturnType<Estado['ler']>>,
    gravar: async (uid, dados) => void (await ref(uid).set({ ...dados, sincronizadoEm: new Date().toISOString() })),
    apagar: async (uid) => void (await ref(uid).delete()),
  }
}
