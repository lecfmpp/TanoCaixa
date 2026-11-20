/* ------------------------------------------------------------------ *
 * E-mail de boas-vindas (Resend). Lógica pura e testável: o gatilho
 * (onDocumentCreated em users/{uid}) fica em index.ts e injeta aqui a
 * chave, o fetch e o "cadeado" de idempotência.
 *
 * Regras:
 *  - Nada de promessa de integração com loja: o app está na V1 e as
 *    integrações aparecem como "Em breve".
 *  - A chave do Resend NUNCA fica no código (secret RESEND_API_KEY).
 * ------------------------------------------------------------------ */

import { renderizar, type EmailPronto } from './email/catalogo'

export const REMETENTE = 'Tá no Caixa <ola@tanocaixa.com>'
export const RESPONDER_PARA = 'ola@tanocaixa.com'
export const ASSUNTO = 'Bem-vindo ao Tá no Caixa'
export const URL_APP = 'https://tanocaixa.com'
const RESEND_URL = 'https://api.resend.com/emails'

export function primeiroNome(nome: string | undefined, email: string): string {
  const base = (nome ?? '').trim() || email.split('@')[0] || ''
  const p = base.split(/\s+/)[0] ?? ''
  return p ? p[0].toUpperCase() + p.slice(1) : ''
}


/** Mesmo texto do template `tnc-boas-vindas` (catálogo), montado no código. */
export function montarEmail(nome: string | undefined, email: string): EmailPronto {
  const n = primeiroNome(nome, email)
  return renderizar('boas-vindas', { OI: n ? `Oi, ${n}!` : 'Oi!' })
}

/** Cadeado de idempotência por usuário (Firestore em produção, memória nos testes). */
export interface Cadeado {
  /** true se este chamador ganhou o direito de enviar; false se já foi enviado/está enviando. */
  tomar(uid: string): Promise<boolean>
  concluir(uid: string, resendId: string | undefined): Promise<void>
  /** Libera o cadeado após falha, para uma nova tentativa poder enviar. */
  liberar(uid: string, erro: string): Promise<void>
}

export type ResultadoBoasVindas = 'enviado' | 'ja-enviado' | 'sem-email' | 'sem-chave' | 'falhou'

export async function enviarBoasVindas(
  uid: string,
  user: { nome?: string; email?: string } | undefined,
  deps: { apiKey: string; cadeado: Cadeado; fetchFn?: typeof fetch },
): Promise<ResultadoBoasVindas> {
  const email = (user?.email ?? '').trim()
  if (!email || !email.includes('@')) return 'sem-email'
  if (!deps.apiKey) return 'sem-chave'
  if (!(await deps.cadeado.tomar(uid))) return 'ja-enviado'

  const pronto = montarEmail(user?.nome, email)
  const post = (corpo: Record<string, unknown>, chave: string) =>
    (deps.fetchFn ?? fetch)(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.apiKey}`,
        'Content-Type': 'application/json',
        // Segunda camada contra duplicidade, no próprio Resend.
        'Idempotency-Key': chave,
      },
      body: JSON.stringify({ from: REMETENTE, to: [email], reply_to: RESPONDER_PARA, subject: ASSUNTO, ...corpo }),
    })
  try {
    // Pelo template do Resend (editável no painel); se ele recusar, o mesmo texto montado aqui.
    let resp = await post({ template: pronto.template }, `boas-vindas/${uid}`)
    if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
      resp = await post({ html: pronto.html, text: pronto.text }, `boas-vindas/${uid}/html`)
    }
    if (!resp.ok) {
      // Não registra o corpo inteiro (pode ecoar dados); só o status.
      await deps.cadeado.liberar(uid, `resend http ${resp.status}`)
      return 'falhou'
    }
    const corpo = (await resp.json().catch(() => ({}))) as { id?: string }
    await deps.cadeado.concluir(uid, corpo.id)
    return 'enviado'
  } catch (e) {
    await deps.cadeado.liberar(uid, e instanceof Error ? e.message : 'erro de rede')
    return 'falhou'
  }
}
