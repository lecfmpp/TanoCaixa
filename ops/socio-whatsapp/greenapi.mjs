/* ------------------------------------------------------------------ *
 * Green-API — o mesmo provedor de WhatsApp do RetroFoot
 * (retrofoot98: .github/workflows/vigia-supabase.yml e
 *  scripts/sql/avisos_grupo_whatsapp.sql).
 *
 * Credenciais SÓ por variável de ambiente (secrets do GitHub):
 *   GREEN_API_URL    ex.: https://7105.api.greenapi.com
 *   GREEN_API_ID     idInstance
 *   GREEN_API_TOKEN  apiTokenInstance
 * A Green-API não é a API oficial da Meta: usar número secundário.
 * ------------------------------------------------------------------ */

export function credenciais(env) {
  const url = (env.GREEN_API_URL || '').replace(/\/+$/, '')
  const id = env.GREEN_API_ID || ''
  const token = env.GREEN_API_TOKEN || ''
  if (!url || !id || !token) return null
  return { url, id, token }
}

function endpoint(c, metodo) {
  return `${c.url}/waInstance${c.id}/${metodo}/${c.token}`
}

async function post(c, metodo, corpo) {
  const r = await fetch(endpoint(c, metodo), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(30000),
  })
  // nunca logar a URL: ela contém o token
  if (!r.ok) throw new Error(`Green-API ${metodo} -> HTTP ${r.status}`)
  return r.json()
}

/** Últimas `count` mensagens do chat (1:1 termina em @c.us, grupo em @g.us). */
export function lerHistorico(c, chatId, count = 200) {
  return post(c, 'getChatHistory', { chatId, count })
}

/** Lista grupos/contatos — para achar o chatId no setup. */
export async function listarChats(c) {
  const r = await fetch(endpoint(c, 'getContacts'), { signal: AbortSignal.timeout(30000) })
  if (!r.ok) throw new Error(`Green-API getContacts -> HTTP ${r.status}`)
  return r.json()
}

/** Envia texto. Só é chamado por rodar.mjs depois de podeEnviar() === true. */
export function enviar(c, chatId, message) {
  return post(c, 'sendMessage', { chatId, message, linkPreview: false })
}
