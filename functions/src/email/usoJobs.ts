/* ------------------------------------------------------------------ *
 * E-mails de uso, recado de segunda e descadastro.
 *
 *   emailsDeUso        todo dia 10h: próximo passo da sequência do papel
 *                      principal, ou o aviso de inatividade (7 e 21 dias).
 *                      Só a partir de USO_A_PARTIR (padrão 07/12/2026),
 *                      pra não somar com os lembretes do fim do teste.
 *   recadoDeSegunda    segunda 8h: a semana passada da loja (dono/gestão)
 *                      ou da rede (franqueador).
 *   descadastrarEmail  link "Não quero mais receber" (sem login, assinado).
 * Tudo respeita users/{uid}.emails (dicas/recado/novidades) e EMAILS_MODO.
 * ------------------------------------------------------------------ */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { renderizar } from './catalogo'
import { calcularContato, ehLojaDemo, papelDoMembro, primeiroNome, situacaoDaLoja, type PapelContato, type RetratoPessoa } from './contato'
import { carregarRetrato } from './contatoSync'
import { enviarUmaVez, type DepsEnvio } from './enviarUmaVez'
import { diaPorExtenso } from './lembretesTeste'
import { EMAIL_TESTE_PARA, modoAtual, RESEND_API_KEY } from './params'
import { conferirDescadastro, lerPreferencias, linkDescadastro, TOPICOS } from './preferencias'
import { diasDaSemana, semanasDoRecado, variaveisRecado, variaveisRecadoRede } from './recado'
import { clienteResend } from './resend'
import { passoInatividade, proximoPasso, type EstadoUso } from './sequencias'

const USO_A_PARTIR = defineString('USO_A_PARTIR', { default: '2026-12-07' })
const FUSO = 'America/Sao_Paulo'

function deps(db: Firestore): DepsEnvio {
  return { db, resend: clienteResend({ apiKey: RESEND_API_KEY.value() }), modo: modoAtual(), testePara: EMAIL_TESTE_PARA.value() }
}

const oi = (nome: string) => (nome ? `Oi, ${nome}!` : 'Oi!')

/* ----------------------------- uso diário ----------------------------- */

export async function usoDeUmaPessoa(db: Firestore, d: DepsEnvio, uid: string, agora: Date): Promise<string> {
  const user = (await db.doc(`users/${uid}`).get()).data()
  if (!user || !lerPreferencias(user.emails).dicas) return 'sem-dicas'
  const retrato = await carregarRetrato(db, uid)
  const contato = retrato && calcularContato(retrato, agora)
  if (!retrato || !contato) return 'sem-contato'
  const papel = contato.propriedades.papel_principal as PapelContato | null
  if (!papel) return 'sem-papel'

  const lojasDoPapel = retrato.lojas.filter((l) => !ehLojaDemo(l.rid) && papelDoMembro(l.papel) === papel)
  const loja = lojasDoPapel[0]
  if (!loja) return 'sem-loja'
  const estadoRef = db.doc(`emails_uso/${uid}`)
  const estado = ((await estadoRef.get()).data() as EstadoUso | undefined) ?? { enviados: [] }

  const aPartir = Date.parse(`${USO_A_PARTIR.value()}T00:00:00-03:00`)
  const entrou = Date.parse((papel === 'dono' ? retrato.criadoEm : loja.desde) ?? retrato.criadoEm ?? '') || aPartir
  const inicio = new Date(Math.max(entrou, aPartir)).toISOString()
  const ctx = {
    diasLancados: loja.diasLancados ?? 0,
    despesas: loja.despesas ?? 0,
    membrosNaLoja: loja.membros ?? 1,
    lojasLancando: lojasDoPapel.filter((l) => (l.diasLancados ?? 0) >= 5).length,
  }
  const teste = papel === 'dono' && situacaoDaLoja(loja.assinatura, agora) === 'teste' ? loja.assinatura?.testeAte : undefined

  let id = proximoPasso(papel, { inicio, agora, estado, ctx, testeAcabaEm: teste })
  let chaveExtra = ''
  if (!id && (papel === 'dono' || papel === 'gestao')) {
    const ultimoUso = contato.propriedades.ultima_atividade as string | null
    const inativo = passoInatividade(ultimoUso ?? undefined, agora)
    if (inativo && Date.parse(`${ultimoUso}T12:00:00-03:00`) >= aPartir - 21 * 86_400_000) {
      id = inativo
      chaveExtra = `_${ultimoUso}`
    }
  }
  if (!id) return 'nada'

  const nome = primeiroNome(retrato.nome, retrato.email)
  const vars = { OI: oi(nome), LOJA: loja.nome ?? 'sua loja', DESDE: contato.propriedades.ultima_atividade ? diaPorExtenso(`${contato.propriedades.ultima_atividade}T15:00:00Z`) : '' }
  const descadastro = linkDescadastro(uid, 'dicas', RESEND_API_KEY.value())
  const r = await enviarUmaVez(
    { chave: `${uid}_uso_${id}${chaveExtra}`, para: contato.email, email: renderizar(id, vars, { descadastro }), tipo: `uso_${id}`, uid, descadastro },
    d,
  )
  if (r === 'enviado') await estadoRef.set({ enviados: [...estado.enviados, id], ultimoEm: agora.toISOString() }, { merge: true })
  return `${id}:${r}`
}

export const emailsDeUso = onSchedule(
  { schedule: '0 10 * * *', timeZone: FUSO, secrets: [RESEND_API_KEY], timeoutSeconds: 540 },
  async () => {
    const agora = new Date()
    if (agora.getTime() < Date.parse(`${USO_A_PARTIR.value()}T00:00:00-03:00`)) {
      console.log(`e-mails de uso só a partir de ${USO_A_PARTIR.value()}`)
      return
    }
    const db = getFirestore()
    const d = deps(db)
    const contagem: Record<string, number> = {}
    for (const u of (await db.collection('users').select().get()).docs) {
      try {
        const r = await usoDeUmaPessoa(db, d, u.id, agora)
        contagem[r] = (contagem[r] ?? 0) + 1
      } catch (e) {
        contagem.falhou = (contagem.falhou ?? 0) + 1
        console.error(`uso ${u.id}:`, e instanceof Error ? e.message : e)
      }
    }
    console.log(`e-mails de uso (modo ${d.modo}):`, JSON.stringify(contagem))
  },
)

/* ---------------------------- recado semanal ---------------------------- */

async function numerosDaLoja(db: Firestore, rid: string, de: string, ate: string) {
  const [receitas, despesas] = await Promise.all([
    db.collection(`restaurants/${rid}/receita_dia`).where('data', '>=', de).where('data', '<=', `${ate}~`).get(),
    db.collection(`restaurants/${rid}/despesas`).where('dataCompetencia', '>=', de).where('dataCompetencia', '<=', `${ate}~`).get(),
  ])
  const dias = new Set(receitas.docs.map((r) => String(r.data().data).slice(0, 10)))
  return {
    entrou: receitas.docs.reduce((s, r) => s + (Number(r.data().totalDia) || 0), 0),
    saiu: despesas.docs.reduce((s, x) => s + (Number(x.data().valorTotal) || 0), 0),
    dias,
  }
}

export async function recadoDeUmaPessoa(db: Firestore, d: DepsEnvio, retrato: RetratoPessoa, agora: Date): Promise<string[]> {
  const { passada, anterior } = semanasDoRecado(agora)
  const nome = primeiroNome(retrato.nome, retrato.email)
  const descadastro = linkDescadastro(retrato.uid, 'recado', RESEND_API_KEY.value())
  const saidas: string[] = []
  const lojas = retrato.lojas.filter((l) => !ehLojaDemo(l.rid))

  for (const l of lojas.filter((x) => ['dono', 'gestao'].includes(papelDoMembro(x.papel)))) {
    const [agoraN, antes] = await Promise.all([numerosDaLoja(db, l.rid, passada.de, passada.ate), numerosDaLoja(db, l.rid, anterior.de, anterior.ate)])
    const semVenda = agoraN.dias.size ? diasDaSemana(passada).filter((x) => !agoraN.dias.has(x)) : []
    const vars = variaveisRecado({ nome: l.nome ?? 'sua loja', entrou: agoraN.entrou, saiu: agoraN.saiu, entrouAntes: antes.entrou, diasComVenda: agoraN.dias.size }, semVenda)
    if (!vars) continue
    const r = await enviarUmaVez(
      { chave: `${retrato.uid}_recado_${l.rid}_${passada.de}`, para: retrato.email, email: renderizar('recado-semanal', { ...vars, OI: oi(nome) }, { descadastro }), tipo: 'recado', uid: retrato.uid, restauranteId: l.rid, descadastro },
      d,
    )
    saidas.push(`loja:${r}`)
  }

  const daRede = lojas.filter((x) => papelDoMembro(x.papel) === 'franqueador')
  if (daRede.length) {
    const nums = await Promise.all(daRede.map(async (l) => ({ nome: l.nome ?? l.rid, entrou: (await numerosDaLoja(db, l.rid, passada.de, passada.ate)).entrou })))
    const vars = variaveisRecadoRede(nums)
    if (vars) {
      const r = await enviarUmaVez(
        { chave: `${retrato.uid}_recado_rede_${passada.de}`, para: retrato.email, email: renderizar('recado-rede', vars, { descadastro }), tipo: 'recado_rede', uid: retrato.uid, descadastro },
        d,
      )
      saidas.push(`rede:${r}`)
    }
  }
  return saidas
}

export const recadoDeSegunda = onSchedule(
  { schedule: '0 8 * * 1', timeZone: FUSO, secrets: [RESEND_API_KEY], timeoutSeconds: 540 },
  async () => {
    const db = getFirestore()
    const d = deps(db)
    const agora = new Date()
    const contagem: Record<string, number> = {}
    for (const u of (await db.collection('users').get()).docs) {
      if (!lerPreferencias(u.data().emails).recado) continue
      try {
        const retrato = await carregarRetrato(db, u.id)
        if (!retrato?.email.includes('@')) continue
        for (const r of await recadoDeUmaPessoa(db, d, retrato, agora)) contagem[r] = (contagem[r] ?? 0) + 1
      } catch (e) {
        contagem.falhou = (contagem.falhou ?? 0) + 1
        console.error(`recado ${u.id}:`, e instanceof Error ? e.message : e)
      }
    }
    console.log(`recado de segunda (modo ${d.modo}):`, JSON.stringify(contagem))
  },
)

/* ------------------------------ descadastro ----------------------------- */

/** Link "Não quero mais receber": desliga um tópico (ou todos) sem precisar de login. */
export const descadastrarEmail = onCall({ secrets: [RESEND_API_KEY] }, async (req) => {
  const { u, t, s } = (req.data ?? {}) as { u?: string; t?: string; s?: string }
  if (!u || !t || !s || !conferirDescadastro(u, t, s, RESEND_API_KEY.value())) {
    throw new HttpsError('permission-denied', 'Link de descadastro inválido')
  }
  const desligar = t === 'tudo' ? TOPICOS : [t]
  const emails = Object.fromEntries(desligar.map((x) => [x, false]))
  await getFirestore().doc(`users/${u}`).set({ emails: { ...emails, atualizadoEm: new Date().toISOString(), origem: 'link_email' } }, { merge: true })
  return { ok: true, desligados: desligar }
})
