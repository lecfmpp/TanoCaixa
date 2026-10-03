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

function escapaHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function montarEmail(nome: string | undefined, email: string): { html: string; text: string } {
  const n = primeiroNome(nome, email)
  const oi = n ? `Oi, ${n}!` : 'Oi!'
  const linhas = [
    'Sua conta no Tá no Caixa está criada. Que bom ter você aqui.',
    'O Tá no Caixa ajuda você a enxergar o dinheiro do seu restaurante: lance faturamento e despesas (inclusive por foto da nota) e acompanhe lucro, margem e custos no painel.',
    'Para começar, lance o faturamento de hoje e uma despesa. Leva poucos minutos.',
    'As integrações com lojas e plataformas estão marcadas como "Em breve" no app. Quando estiverem prontas, a gente avisa por aqui.',
    'Dúvidas? É só responder este e-mail.',
  ]
  const text = [oi, '', ...linhas.flatMap((l) => [l, '']), `Abrir o Tá no Caixa: ${URL_APP}`, '', 'Equipe Tá no Caixa'].join('\n')
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1d2b2a;max-width:520px">` +
    `<p><strong>${escapaHtml(oi)}</strong></p>` +
    linhas.map((l) => `<p>${escapaHtml(l)}</p>`).join('') +
    `<p><a href="${URL_APP}" style="display:inline-block;background:#2E5F73;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">Abrir o Tá no Caixa</a></p>` +
    `<p>Equipe Tá no Caixa</p></div>`
  return { html, text }
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

  const { html, text } = montarEmail(user?.nome, email)
  try {
    const resp = await (deps.fetchFn ?? fetch)(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.apiKey}`,
        'Content-Type': 'application/json',
        // Segunda camada contra duplicidade, no próprio Resend.
        'Idempotency-Key': `boas-vindas/${uid}`,
      },
      body: JSON.stringify({
        from: REMETENTE,
        to: [email],
        reply_to: RESPONDER_PARA,
        subject: ASSUNTO,
        html,
        text,
      }),
    })
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
