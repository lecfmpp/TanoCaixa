/* ------------------------------------------------------------------ *
 * Regras puras do grupo de WhatsApp de cada loja: celular do dono,
 * código de pareamento, status do grupo e leitura dos webhooks dos dois
 * provedores (Green API e W-API). Sem Firebase e sem rede: testável.
 * ------------------------------------------------------------------ */

export type Provedor = 'green' | 'wapi'

/** Situação do grupo da loja, como o painel mostra. */
export type StatusGrupo = 'sem_grupo' | 'conectado' | 'dono_fora' | 'sem_acesso' | 'erro'

/** Situação de um envio. A ordem importa: um status nunca volta para trás. */
export type StatusEnvio = 'falhou' | 'enviado' | 'entregue' | 'lido'
const ORDEM_ENVIO: Record<StatusEnvio, number> = { falhou: 0, enviado: 1, entregue: 2, lido: 3 }

/** O status novo vale se for "mais adiante" que o atual (falha só vale sobre "enviado"). */
export function avancaStatus(atual: StatusEnvio | undefined, novo: StatusEnvio): boolean {
  if (!atual) return true
  if (novo === 'falhou') return atual === 'enviado'
  return ORDEM_ENVIO[novo] > ORDEM_ENVIO[atual]
}

/* ------------------------------- Celular -------------------------------- */

const soDigitos = (v: string) => v.replace(/\D/g, '')

/**
 * Formas possíveis do celular no WhatsApp (só dígitos, com 55). Números
 * brasileiros antigos às vezes estão registrados sem o 9 depois do DDD, então
 * "(21) 99876-5432" vira ['5521998765432', '552198765432'].
 */
export function formasDoCelular(celular: string | undefined): string[] {
  let d = soDigitos(celular ?? '')
  if (!d) return []
  if (d.length === 10 || d.length === 11) d = `55${d}`
  if (!d.startsWith('55') || (d.length !== 12 && d.length !== 13)) return [d]
  const ddd = d.slice(2, 4)
  const local = d.slice(4)
  if (local.length === 9 && local.startsWith('9')) return [d, `55${ddd}${local.slice(1)}`]
  if (local.length === 8 && /^[6-9]/.test(local)) return [d, `55${ddd}9${local}`]
  return [d]
}

/** Só os dígitos de um ID do WhatsApp ("5521…@c.us", "5521…@s.whatsapp.net", "5521…:12@…"). */
export function digitosDoId(id: string): string {
  return soDigitos(id.split('@')[0].split(':')[0])
}

/** O celular do dono está entre os participantes (ou é quem mandou a mensagem)? */
export function donoPresente(participantes: string[], celularDono: string | undefined): boolean {
  const formas = new Set(formasDoCelular(celularDono))
  if (!formas.size) return false
  return participantes.some((p) => formas.has(digitosDoId(p)))
}

/**
 * Dá para conferir o dono por esta lista? O WhatsApp às vezes só devolve IDs
 * anônimos (`…@lid`), sem o telefone; aí a conferência não decide nada.
 */
export const listaTemTelefones = (participantes: string[]) => participantes.some((p) => !p.endsWith('@lid'))

/** "(21) 99876-5432" → "final 5432", para mensagens sem expor o número inteiro. */
export function finalDoCelular(celular: string | undefined): string {
  const d = soDigitos(celular ?? '')
  return d.length >= 4 ? `final ${d.slice(-4)}` : 'do dono'
}

/* --------------------------- Código de pareamento ----------------------- */

export const VALIDADE_CODIGO_MIN = 30

/** Código curto que o dono manda no grupo: "TNC-4821". */
export function gerarCodigo(aleatorio: () => number = Math.random): string {
  return `TNC-${String(Math.floor(aleatorio() * 9000) + 1000)}`
}

/** Acha um código de pareamento numa mensagem ("tnc 4821", "TNC-4821", "Tnc4821"). */
export function extrairCodigo(texto: string | undefined): string | null {
  const m = /\bTNC[\s-]?(\d{4})\b/i.exec(texto ?? '')
  return m ? `TNC-${m[1]}` : null
}

export function codigoValido(expiraEm: string | undefined, agora = new Date()): boolean {
  return !!expiraEm && Date.parse(expiraEm) > agora.getTime()
}

/* ---------------------------- Link de convite --------------------------- */

/**
 * Código do link de convite do grupo ("https://chat.whatsapp.com/AbC123…").
 * Aceita com ou sem https, com espaços ou texto em volta. Sem link válido, null.
 */
export function codigoDoConvite(texto: string | undefined): string | null {
  const m = /(?:https?:\/\/)?chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{18,32})\b/.exec(texto ?? '')
  return m ? m[1] : null
}

export const linkDoConvite = (codigo: string) => `https://chat.whatsapp.com/${codigo}`

/* --------------------------------- Status ------------------------------- */

export const FALHAS_PARA_ERRO = 2

/** Os lembretes só saem quando o grupo está conectado (dono dentro e sem falhas seguidas). */
export const podeEnviar = (status: StatusGrupo | undefined, temGrupo: boolean) => temGrupo && (status ?? 'conectado') === 'conectado'

/** Status depois de uma conferência dos participantes. */
export function statusDaConferencia(r: { acessivel: boolean; donoDentro: boolean }): StatusGrupo {
  if (!r.acessivel) return 'sem_acesso'
  return r.donoDentro ? 'conectado' : 'dono_fora'
}

/** Status depois de um envio: sucesso reconecta; falhas seguidas viram erro. */
export function statusDepoisDoEnvio(atual: StatusGrupo | undefined, ok: boolean, falhasSeguidas: number): StatusGrupo {
  if (ok) return 'conectado'
  if (falhasSeguidas >= FALHAS_PARA_ERRO) return 'erro'
  return atual ?? 'conectado'
}

/* -------------------------------- Webhooks ------------------------------ */

export type EventoWebhook =
  | { tipo: 'recebida'; chatId: string; deGrupo: boolean; remetente: string; texto: string }
  | { tipo: 'status'; idMensagem: string; status: StatusEnvio; erro?: string }
  | { tipo: 'conexao'; conectado: boolean }

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {})
const str = (v: unknown) => (typeof v === 'string' ? v : '')

function statusGreen(s: string): StatusEnvio | null {
  if (s === 'sent') return 'enviado'
  if (s === 'delivered') return 'entregue'
  if (s === 'read') return 'lido'
  if (['failed', 'noAccount', 'notInGroup', 'yellowCard'].includes(s)) return 'falhou'
  return null
}

function statusWapi(s: string): StatusEnvio | null {
  const v = s.toUpperCase()
  if (['SENT', 'SERVER_ACK', 'PENDING'].includes(v)) return 'enviado'
  if (['RECEIVED', 'DELIVERY', 'DELIVERED', 'DELIVERY_ACK'].includes(v)) return 'entregue'
  if (['READ', 'PLAYED'].includes(v)) return 'lido'
  if (['ERROR', 'FAILED'].includes(v)) return 'falhou'
  return null
}

/** Texto de uma mensagem do WhatsApp em qualquer dos formatos comuns. */
function textoDaMensagem(m: Obj): string {
  return (
    str(m.conversation) ||
    str(obj(m.extendedTextMessage).text) ||
    str(obj(m.textMessageData).textMessage) ||
    str(obj(m.extendedTextMessageData).text) ||
    str(obj(obj(m.message).extendedTextMessage).text) ||
    str(obj(m.message).conversation)
  )
}

/** Converte o corpo do webhook do provedor num evento nosso (ou null, se não interessa). */
export function interpretarWebhook(provedor: Provedor, corpo: unknown): EventoWebhook | null {
  const b = obj(corpo)
  if (provedor === 'green') {
    const tipo = str(b.typeWebhook)
    if (tipo === 'incomingMessageReceived') {
      const s = obj(b.senderData)
      const chatId = str(s.chatId)
      return { tipo: 'recebida', chatId, deGrupo: chatId.endsWith('@g.us'), remetente: str(s.sender), texto: textoDaMensagem(obj(b.messageData)) }
    }
    if (tipo === 'outgoingMessageStatus') {
      const st = statusGreen(str(b.status))
      return st && str(b.idMessage) ? { tipo: 'status', idMensagem: str(b.idMessage), status: st, ...(st === 'falhou' ? { erro: str(b.status) } : {}) } : null
    }
    if (tipo === 'stateInstanceChanged') return { tipo: 'conexao', conectado: str(b.stateInstance) === 'authorized' }
    return null
  }

  const evento = str(b.event)
  if (evento === 'webhookReceived') {
    if (b.fromMe === true) return null
    const chatId = str(obj(b.chat).id)
    return { tipo: 'recebida', chatId, deGrupo: b.isGroup === true || chatId.endsWith('@g.us'), remetente: str(obj(b.sender).id), texto: textoDaMensagem(obj(b.msgContent)) }
  }
  if (evento === 'webhookDelivery') {
    const id = str(b.messageId)
    if (!id) return null
    const falhou = b.error === true || !!str(b.errorMessage)
    return { tipo: 'status', idMensagem: id, status: falhou ? 'falhou' : 'enviado', ...(falhou ? { erro: str(b.errorMessage) || 'erro no envio' } : {}) }
  }
  if (evento === 'webhookStatus') {
    const st = statusWapi(str(b.status))
    return st && str(b.messageId) ? { tipo: 'status', idMensagem: str(b.messageId), status: st, ...(st === 'falhou' ? { erro: str(b.status) } : {}) } : null
  }
  if (evento === 'webhookConnected') return { tipo: 'conexao', conectado: true }
  if (evento === 'webhookDisconnected') return { tipo: 'conexao', conectado: false }
  return null
}

/* ------------------------------ Mensagens fixas ------------------------- */

export const textoTeste = (loja: string, quem: string, hora: string) =>
  `✅ *Teste do Tá no Caixa*\nSe você está lendo isto, os lembretes da ${loja} vão chegar neste grupo.\n_Enviado por ${quem} às ${hora}_`

export const textoConectado = (loja: string) =>
  `✅ *Pronto!* Este grupo agora recebe os lembretes da ${loja}.\nNo máximo um por dia, sempre com o link da tela certa. Para ligar ou desligar cada lembrete: tanocaixa.com/painel/ajustes`

export const textoFaltaDono = (finalCelular: string) =>
  `⚠️ Quase lá. Para receber os lembretes, este grupo precisa ter o número do dono da loja (${finalCelular}). Adicione o número e mande o código de novo.`

export const textoGrupoDeOutraLoja = () =>
  '⚠️ Este grupo já recebe os lembretes de outra loja. Crie um grupo só para esta loja e mande o código lá.'
