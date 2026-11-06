/* ------------------------------------------------------------------ *
 * Envio com cadeado: o mesmo e-mail (mesma `chave`) sai uma vez só, mesmo
 * com job rodando duas vezes ou webhook repetido. Cadeado em
 * emails_enviados/{chave} (create() falha se já existe) + Idempotency-Key
 * no Resend. Falhou o envio → o cadeado sai, pra próxima tentativa poder
 * mandar.
 *
 * Vai pelo template do Resend (`tnc-<id>`, editável no painel). Se o
 * template não existir ou recusar, manda o mesmo texto montado no código.
 * ------------------------------------------------------------------ */
import type { Firestore } from 'firebase-admin/firestore'
import type { EmailPronto } from './catalogo'
import { aplicarModo, type ModoEmail } from './envio'
import { REMETENTE, RESPONDER_PARA } from './layout'
import { ErroResend, type ClienteResend, type EmailSaida } from './resend'

export type ResultadoEnvio = 'enviado' | 'ja-enviado' | 'desligado' | 'falhou'

export interface PedidoEnvio {
  chave: string
  para: string
  email: EmailPronto
  tipo: string
  uid?: string
  restauranteId?: string
  /** E-mail de uso/novidades: link de descadastro (vira cabeçalho List-Unsubscribe). */
  descadastro?: string
  /** false = sempre montado no código (ex.: vários botões, um por loja). */
  usarTemplate?: boolean
  /** Troca o assunto (e-mails de teste). */
  assunto?: string
}

export interface DepsEnvio {
  db: Firestore
  resend: ClienteResend
  modo: ModoEmail
  testePara: string
}

/** Monta o pedido pro Resend: por template ou com HTML. */
export function paraResend(p: PedidoEnvio, porTemplate: boolean): EmailSaida {
  const base = {
    from: REMETENTE,
    to: [p.para],
    reply_to: RESPONDER_PARA,
    subject: p.assunto ?? p.email.assunto,
    tags: [{ name: 'tipo', value: p.tipo.replace(/[^A-Za-z0-9_-]/g, '_') }],
    ...(p.descadastro ? { headers: { 'List-Unsubscribe': `<${p.descadastro}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
  }
  return porTemplate ? { ...base, template: p.email.template } : { ...base, html: p.email.html, text: p.email.text }
}

export async function enviarUmaVez(p: PedidoEnvio, deps: DepsEnvio): Promise<ResultadoEnvio> {
  const porTemplate = p.usarTemplate !== false
  if (!aplicarModo(paraResend(p, porTemplate), deps.modo, deps.testePara)) {
    console.log(`e-mail ${p.chave} não enviado (modo ${deps.modo})`)
    return 'desligado'
  }
  // No modo teste o cadeado tem outra chave: um teste não "gasta" o envio real.
  const chave = deps.modo === 'teste' ? `teste_${p.chave}` : p.chave
  const ref = deps.db.doc(`emails_enviados/${chave}`)
  try {
    await ref.create({ tipo: p.tipo, uid: p.uid ?? null, restauranteId: p.restauranteId ?? null, status: 'enviando', modo: deps.modo, criadoEm: new Date().toISOString() })
  } catch (e) {
    if ((e as { code?: number }).code === 6) return 'ja-enviado' // ALREADY_EXISTS
    throw e
  }
  try {
    const r = await enviarComReserva(p, porTemplate, deps, chave)
    await ref.set({ status: 'enviado', resendId: r.id ?? null, enviadoEm: new Date().toISOString() }, { merge: true })
    return 'enviado'
  } catch (e) {
    console.error(`e-mail ${chave} falhou:`, e instanceof Error ? e.message : e)
    await ref.delete()
    return 'falhou'
  }
}

/** Tenta pelo template; se o Resend recusar o template (4xx), manda montado no código. */
export async function enviarComReserva(p: PedidoEnvio, porTemplate: boolean, deps: Pick<DepsEnvio, 'resend' | 'modo' | 'testePara'>, chave: string) {
  const saida = aplicarModo(paraResend(p, porTemplate), deps.modo, deps.testePara)!
  try {
    return await deps.resend.enviar(saida, chave)
  } catch (e) {
    if (!porTemplate || !(e instanceof ErroResend) || e.status >= 500 || e.status === 429) throw e
    console.warn(`template ${p.email.template.id} recusado (${e.status}); enviando montado no código`)
    return deps.resend.enviar(aplicarModo(paraResend(p, false), deps.modo, deps.testePara)!, `${chave}_html`)
  }
}
