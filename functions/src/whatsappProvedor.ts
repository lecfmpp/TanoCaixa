/* ------------------------------------------------------------------ *
 * Provedor de WhatsApp: a única parte que sabe falar com a Green API ou com
 * a W-API. O resto do código chama enviarTexto/enviarImagem/participantes e
 * recebe sempre o mesmo formato de resposta. Trocar de provedor é só mudar
 * o parâmetro WHATSAPP_PROVEDOR ('green' ou 'wapi') e os segredos dele.
 *
 * Green API (padrão, o que está no ar):
 *   segredos GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN
 * W-API (https://docs.w-api.app):
 *   parâmetro WAPI_INSTANCE_ID (ID da instância, não é segredo)
 *   segredo   WAPI_TOKEN       (vai no cabeçalho Authorization: Bearer)
 * ------------------------------------------------------------------ */
import { defineSecret, defineString } from 'firebase-functions/params'
import type { Provedor } from './whatsappGrupoRegras'

const GREEN_API_URL = defineSecret('GREEN_API_URL')
const GREEN_API_ID = defineSecret('GREEN_API_ID')
const GREEN_API_TOKEN = defineSecret('GREEN_API_TOKEN')
const WAPI_TOKEN = defineSecret('WAPI_TOKEN')
const WAPI_INSTANCE_ID = defineString('WAPI_INSTANCE_ID', { default: '' })
const WHATSAPP_PROVEDOR = defineString('WHATSAPP_PROVEDOR', { default: 'green' })
/** Número do Tá no Caixa que o dono adiciona ao grupo, como aparece na tela (ex.: "(11) 91234-5678"). */
export const WHATSAPP_NUMERO = defineString('WHATSAPP_NUMERO', { default: '' })

export const SEGREDOS_PROVEDOR = [GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN, WAPI_TOKEN]

export const provedorAtual = (): Provedor => (WHATSAPP_PROVEDOR.value() === 'wapi' ? 'wapi' : 'green')

export interface ResultadoEnvio {
  ok: boolean
  idMensagem?: string
  erro?: string
}

export interface ResultadoParticipantes {
  ok: boolean
  /** IDs como o WhatsApp devolve ("5521…@c.us", "…@s.whatsapp.net", "…@lid"). */
  participantes: string[]
  erro?: string
}

const WAPI_BASE = 'https://api.w-api.app/v1'
const TIMEOUT = 30_000

export function configurado(): boolean {
  return provedorAtual() === 'wapi'
    ? !!(WAPI_INSTANCE_ID.value() && WAPI_TOKEN.value())
    : !!(GREEN_API_URL.value() && GREEN_API_ID.value() && GREEN_API_TOKEN.value())
}

/** Chamada HTTP que nunca lança: devolve o JSON ou o erro em texto. */
async function http(url: string, init: RequestInit): Promise<{ ok: boolean; json: Record<string, unknown>; erro?: string }> {
  try {
    const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) })
    const texto = await resp.text()
    let json: Record<string, unknown> = {}
    try {
      json = texto ? JSON.parse(texto) : {}
    } catch {
      /* resposta sem JSON */
    }
    if (!resp.ok) return { ok: false, json, erro: `HTTP ${resp.status}: ${texto.slice(0, 160)}` }
    if (json.error === true) return { ok: false, json, erro: String(json.message ?? 'erro do provedor').slice(0, 160) }
    return { ok: true, json }
  } catch (e) {
    return { ok: false, json: {}, erro: `rede: ${(e as Error).message ?? e}`.slice(0, 160) }
  }
}

/* --------------------------------- Green -------------------------------- */

const greenUrl = (metodo: string) => `${GREEN_API_URL.value()}/waInstance${GREEN_API_ID.value()}/${metodo}/${GREEN_API_TOKEN.value()}`

async function greenPost(metodo: string, corpo: Record<string, unknown>) {
  return http(greenUrl(metodo), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
}

/* --------------------------------- W-API -------------------------------- */

const wapiUrl = (caminho: string, extra: Record<string, string> = {}) =>
  `${WAPI_BASE}${caminho}?${new URLSearchParams({ instanceId: WAPI_INSTANCE_ID.value(), ...extra })}`
const wapiHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${WAPI_TOKEN.value()}` })

/** A W-API recebe o destino sem formatação: "5521…" ou "1203…@g.us". */
const destinoWapi = (chatId: string) => (chatId.endsWith('@c.us') ? chatId.replace('@c.us', '') : chatId)

/* ------------------------------ API comum -------------------------------- */

const semConfig = (): ResultadoEnvio => ({ ok: false, erro: 'WhatsApp não configurado' })

export async function enviarTexto(chatId: string, texto: string): Promise<ResultadoEnvio> {
  if (!configurado()) return semConfig()
  const r =
    provedorAtual() === 'wapi'
      ? await http(wapiUrl('/message/send-text'), { method: 'POST', headers: wapiHeaders(), body: JSON.stringify({ phone: destinoWapi(chatId), message: texto }) })
      : await greenPost('sendMessage', { chatId, message: texto, linkPreview: false })
  const id = String(r.json.idMessage ?? r.json.messageId ?? '') || undefined
  return r.ok ? { ok: true, idMensagem: id } : { ok: false, erro: r.erro }
}

export async function enviarImagem(chatId: string, url: string, arquivo: string, legenda: string): Promise<ResultadoEnvio> {
  if (!configurado()) return semConfig()
  const r =
    provedorAtual() === 'wapi'
      ? await http(wapiUrl('/message/send-image'), { method: 'POST', headers: wapiHeaders(), body: JSON.stringify({ phone: destinoWapi(chatId), image: url, caption: legenda }) })
      : await greenPost('sendFileByUrl', { chatId, urlFile: url, fileName: arquivo, caption: legenda })
  const id = String(r.json.idMessage ?? r.json.messageId ?? '') || undefined
  return r.ok ? { ok: true, idMensagem: id } : { ok: false, erro: r.erro }
}

/** Participantes do grupo. Falha quando o nosso número não está mais no grupo ou o grupo não existe. */
export async function participantes(grupoId: string): Promise<ResultadoParticipantes> {
  if (!configurado()) return { ok: false, participantes: [], erro: 'WhatsApp não configurado' }
  if (provedorAtual() === 'wapi') {
    const r = await http(wapiUrl('/group/get-Participants', { groupId: grupoId }), { method: 'GET', headers: wapiHeaders() })
    const lista = Array.isArray(r.json.participants) ? (r.json.participants as { id?: string; phoneNumber?: string }[]) : []
    const ids = lista.flatMap((p) => [p.id, p.phoneNumber].filter((x): x is string => !!x))
    return r.ok && ids.length ? { ok: true, participantes: ids } : { ok: false, participantes: [], erro: r.erro ?? 'grupo sem participantes visíveis' }
  }
  const r = await greenPost('getGroupData', { groupId: grupoId })
  const lista = Array.isArray(r.json.participants) ? (r.json.participants as { id?: string }[]) : []
  const ids = lista.map((p) => p.id).filter((x): x is string => !!x)
  return r.ok && ids.length ? { ok: true, participantes: ids } : { ok: false, participantes: [], erro: r.erro ?? 'sem acesso ao grupo' }
}

export interface ResultadoConvite {
  ok: boolean
  grupoId?: string
  nome?: string
  erro?: string
}

/**
 * Descobre o grupo de um link de convite (sem entrar nele). Só a W-API tem isso;
 * na Green API o caminho é o código de pareamento.
 */
export async function grupoPeloConvite(link: string, codigo: string): Promise<ResultadoConvite> {
  if (!configurado()) return { ok: false, erro: 'WhatsApp não configurado' }
  if (provedorAtual() !== 'wapi') return { ok: false, erro: 'Conectar pelo link ainda não funciona neste número. Use o código.' }
  for (const tentativa of [link, codigo]) {
    const r = await http(wapiUrl('/group/group-invitation-metadata', { inviteUrl: tentativa }), { method: 'GET', headers: wapiHeaders() })
    const id = String(r.json.id ?? obj(r.json.group).id ?? '')
    if (r.ok && id.endsWith('@g.us')) return { ok: true, grupoId: id, nome: String(r.json.subject ?? obj(r.json.group).subject ?? '') || undefined }
  }
  return { ok: false, erro: 'Não achamos o grupo deste link. Confira se o link é o mais recente (Dados do grupo → Convidar via link).' }
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

/** O número do Tá no Caixa está conectado ao provedor? */
export async function instanciaConectada(): Promise<boolean> {
  if (!configurado()) return false
  if (provedorAtual() === 'wapi') {
    const r = await http(wapiUrl('/instance/status-instance'), { method: 'GET', headers: wapiHeaders() })
    return r.ok && (r.json.connected === true || String(r.json.status ?? '').toLowerCase() === 'connected')
  }
  const r = await http(greenUrl('getStateInstance'), { method: 'GET' })
  return r.ok && r.json.stateInstance === 'authorized'
}
