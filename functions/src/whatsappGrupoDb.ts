/* ------------------------------------------------------------------ *
 * Firestore do grupo de WhatsApp de cada loja. Tudo aqui é só do servidor.
 *
 *   whatsapp_grupos/{rid}                 grupo, status, lembretes ligados
 *   whatsapp_grupos/{rid}/envios/{id}     cada tentativa de envio (sucesso ou falha)
 *   whatsapp_mensagens/{idMensagem}       índice idMensagem → loja/envio (webhook de status)
 *   whatsapp_codigos/{TNC-1234}           código de pareamento (30 min)
 * ------------------------------------------------------------------ */
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import type { IdLembrete } from './lembretesCatalogo'
import { normalizarPapel } from './papel'
import { participantes } from './whatsappProvedor'
import {
  avancaStatus,
  donoPresente,
  finalDoCelular,
  listaTemTelefones,
  statusDaConferencia,
  statusDepoisDoEnvio,
  type StatusEnvio,
  type StatusGrupo,
} from './whatsappGrupoRegras'
import type { ResultadoEnvio } from './whatsappProvedor'

const fs = () => getFirestore()

export interface GrupoDoc {
  grupoId?: string
  status?: StatusGrupo
  statusMotivo?: string
  statusEm?: string
  ativos?: Partial<Record<IdLembrete, boolean>>
  ultimoEnvio?: Partial<Record<IdLembrete, string>> // YYYY-MM-DD
  falhasSeguidas?: number
  ultimoEnvioOkEm?: string
  conectadoEm?: string
  conectadoPor?: string
  origem?: 'codigo' | 'link' | 'manual'
  grupoNome?: string
  grupoLink?: string
  codigo?: string
  codigoExpiraEm?: string
}

export type TipoEnvio = 'lembrete' | 'teste' | 'boas_vindas' | 'aviso'

export interface EnvioDoc {
  tipo: TipoEnvio
  lembrete?: IdLembrete
  rodada?: 'manha' | 'noite'
  grupoId: string
  porUid?: string
  porNome?: string
  status: StatusEnvio
  idMensagem?: string
  erro?: string
  criadoEm: string
  atualizadoEm: string
  /** Para a regra de TTL do Firestore apagar envios antigos (90 dias). */
  expiraEm: Date
}

export const refGrupo = (rid: string) => fs().doc(`whatsapp_grupos/${rid}`)

/** Celular do dono da loja: membro com papel dono → `celular`, senão `users/{uid}.celularWhatsapp`. */
export async function celularDoDono(rid: string): Promise<string | undefined> {
  const membros = await fs().collection(`restaurants/${rid}/membros`).get()
  const dono = membros.docs.find((m) => normalizarPapel(m.get('papel') as string | undefined) === 'dono')
  if (!dono) return undefined
  const celular = (dono.get('celular') as string | undefined) || undefined
  if (celular) return celular
  return ((await fs().doc(`users/${dono.id}`).get()).get('celularWhatsapp') as string | undefined) || undefined
}

/** Grava o envio e o índice pelo idMensagem; devolve o id do registro. */
export async function registrarEnvio(rid: string, dados: Omit<EnvioDoc, 'status' | 'criadoEm' | 'atualizadoEm' | 'expiraEm'>, r: ResultadoEnvio): Promise<string> {
  const agora = new Date()
  const doc: EnvioDoc = {
    ...dados,
    status: r.ok ? 'enviado' : 'falhou',
    ...(r.idMensagem ? { idMensagem: r.idMensagem } : {}),
    ...(r.erro ? { erro: r.erro } : {}),
    criadoEm: agora.toISOString(),
    atualizadoEm: agora.toISOString(),
    expiraEm: new Date(agora.getTime() + 90 * 24 * 3600 * 1000),
  }
  const ref = refGrupo(rid).collection('envios').doc()
  await ref.set(doc)
  if (r.idMensagem) await fs().doc(`whatsapp_mensagens/${r.idMensagem}`).set({ rid, envioId: ref.id, expiraEm: doc.expiraEm })
  return ref.id
}

/** Depois de um envio da rotina: conta falhas seguidas e muda o status quando precisa. */
export async function anotarResultado(rid: string, cfg: GrupoDoc, r: ResultadoEnvio): Promise<void> {
  const falhas = r.ok ? 0 : (cfg.falhasSeguidas ?? 0) + 1
  const status = statusDepoisDoEnvio(cfg.status, r.ok, falhas)
  await refGrupo(rid).set(
    {
      falhasSeguidas: falhas,
      ...(r.ok ? { ultimoEnvioOkEm: new Date().toISOString() } : {}),
      ...(status !== cfg.status ? { status, statusEm: new Date().toISOString(), statusMotivo: r.ok ? '' : r.erro ?? 'falha no envio' } : {}),
    },
    { merge: true },
  )
}

/** Webhook de status: atualiza o envio, sem nunca voltar um status para trás. */
export async function atualizarStatusEnvio(idMensagem: string, status: StatusEnvio, erro?: string): Promise<void> {
  const indice = await fs().doc(`whatsapp_mensagens/${idMensagem}`).get()
  if (!indice.exists) return
  const { rid, envioId } = indice.data() as { rid: string; envioId: string }
  const ref = refGrupo(rid).collection('envios').doc(envioId)
  await fs().runTransaction(async (t) => {
    const atual = await t.get(ref)
    if (!atual.exists || !avancaStatus(atual.get('status') as StatusEnvio, status)) return
    t.update(ref, { status, atualizadoEm: new Date().toISOString(), ...(erro ? { erro } : {}) })
  })
}

export interface Conferencia {
  status: StatusGrupo
  donoDentro: boolean
  /** false quando o WhatsApp não mostrou telefones (só IDs anônimos): não deu para conferir. */
  conferiu: boolean
  pessoas: number
  erro?: string
}

/** Lê os participantes e diz se o grupo está acessível e com o dono dentro. */
export async function conferirGrupo(grupoId: string, celularDono: string | undefined): Promise<Conferencia> {
  const p = await participantes(grupoId)
  if (!p.ok) return { status: 'sem_acesso', donoDentro: false, conferiu: true, pessoas: 0, erro: p.erro }
  const conferiu = listaTemTelefones(p.participantes)
  const donoDentro = conferiu ? donoPresente(p.participantes, celularDono) : true
  return { status: statusDaConferencia({ acessivel: true, donoDentro }), donoDentro, conferiu, pessoas: new Set(p.participantes).size }
}

/** Grava o resultado de uma conferência no grupo da loja. */
export async function gravarConferencia(rid: string, c: Conferencia): Promise<void> {
  const motivo = c.status === 'sem_acesso' ? c.erro ?? 'sem acesso ao grupo' : c.status === 'dono_fora' ? 'o número do dono não está no grupo' : ''
  await refGrupo(rid).set(
    { status: c.status, statusMotivo: motivo, statusEm: new Date().toISOString(), pessoas: c.pessoas, ...(c.status === 'conectado' ? { falhasSeguidas: 0 } : {}) },
    { merge: true },
  )
}

/** Quantos testes a loja mandou na última hora (limite contra spam). */
export async function testesNaUltimaHora(rid: string): Promise<number> {
  const desde = new Date(Date.now() - 3600 * 1000).toISOString()
  const snap = await refGrupo(rid).collection('envios').where('criadoEm', '>=', desde).get()
  return snap.docs.filter((d) => d.get('tipo') === 'teste').length
}

/** Últimos envios da loja, para o histórico do painel. */
export async function ultimosEnvios(rid: string, n = 20) {
  const snap = await refGrupo(rid).collection('envios').orderBy('criadoEm', 'desc').limit(n).get()
  return snap.docs.map((d) => {
    const e = d.data() as EnvioDoc
    return { id: d.id, tipo: e.tipo, lembrete: e.lembrete ?? null, porNome: e.porNome ?? null, status: e.status, erro: e.erro ?? null, criadoEm: e.criadoEm }
  })
}

export const apagarCampo = FieldValue.delete

export type ResultadoConexao =
  | { ok: true; status: StatusGrupo }
  | { ok: false; motivo: 'outra_loja' | 'sem_acesso' | 'dono_fora'; mensagem: string }

/**
 * Liga um grupo à loja, valendo para os três caminhos (código, link, ID manual).
 * Regras: o grupo não pode ser de outra loja; o número do Tá no Caixa precisa
 * estar nele; o número do dono também (ou o dono foi quem mandou o código).
 * Só grava se tudo estiver certo, e manda a boas-vindas no grupo.
 */
export async function conectarGrupo(
  rid: string,
  grupoId: string,
  dados: { origem: 'codigo' | 'link' | 'manual'; por: string; remetente?: string; grupoNome?: string; grupoLink?: string },
  enviarBoasVindas: (grupoId: string) => Promise<ResultadoEnvio>,
): Promise<ResultadoConexao> {
  const outro = await fs().collection('whatsapp_grupos').where('grupoId', '==', grupoId).limit(2).get()
  if (outro.docs.some((d) => d.id !== rid)) return { ok: false, motivo: 'outra_loja', mensagem: 'Este grupo já recebe os lembretes de outra loja. Crie um grupo só para esta loja.' }

  const celular = await celularDoDono(rid)
  const c = await conferirGrupo(grupoId, celular)
  if (c.status === 'sem_acesso') return { ok: false, motivo: 'sem_acesso', mensagem: 'O número do Tá no Caixa ainda não está neste grupo. Adicione o número ao grupo e tente de novo.' }
  const foiODono = !!dados.remetente && donoPresente([dados.remetente], celular)
  if (!c.donoDentro && !foiODono) return { ok: false, motivo: 'dono_fora', mensagem: `O número do dono (${finalDoCelular(celular)}) precisa estar no grupo. Adicione e tente de novo.` }

  await refGrupo(rid).set(
    {
      grupoId,
      origem: dados.origem,
      conectadoEm: new Date().toISOString(),
      conectadoPor: dados.por,
      grupoNome: dados.grupoNome ?? FieldValue.delete(),
      grupoLink: dados.grupoLink ?? FieldValue.delete(),
      codigo: FieldValue.delete(),
      codigoExpiraEm: FieldValue.delete(),
    },
    { merge: true },
  )
  await gravarConferencia(rid, { ...c, status: 'conectado', donoDentro: true })
  const r = await enviarBoasVindas(grupoId)
  await registrarEnvio(rid, { tipo: 'boas_vindas', grupoId }, r)
  return { ok: true, status: 'conectado' }
}
