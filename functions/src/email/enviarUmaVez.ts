/* ------------------------------------------------------------------ *
 * Envio com cadeado: o mesmo e-mail (mesma `chave`) sai uma vez só, mesmo
 * com job rodando duas vezes ou webhook repetido. Cadeado em
 * emails_enviados/{chave} (create() falha se já existe) + Idempotency-Key
 * no Resend. Falhou o envio → o cadeado sai, pra próxima tentativa poder
 * mandar.
 * ------------------------------------------------------------------ */
import type { Firestore } from 'firebase-admin/firestore'
import { aplicarModo, type ModoEmail } from './envio'
import { REMETENTE, RESPONDER_PARA } from './layout'
import type { ClienteResend } from './resend'

export type ResultadoEnvio = 'enviado' | 'ja-enviado' | 'desligado' | 'falhou'

export interface PedidoEnvio {
  chave: string
  para: string
  assunto: string
  html: string
  text: string
  tipo: string
  uid?: string
  restauranteId?: string
}

export async function enviarUmaVez(
  p: PedidoEnvio,
  deps: { db: Firestore; resend: ClienteResend; modo: ModoEmail; testePara: string },
): Promise<ResultadoEnvio> {
  const saida = aplicarModo(
    {
      from: REMETENTE,
      to: [p.para],
      reply_to: RESPONDER_PARA,
      subject: p.assunto,
      html: p.html,
      text: p.text,
      tags: [{ name: 'tipo', value: p.tipo.replace(/[^A-Za-z0-9_-]/g, '_') }],
    },
    deps.modo,
    deps.testePara,
  )
  if (!saida) {
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
    const r = await deps.resend.enviar(saida, chave)
    await ref.set({ status: 'enviado', resendId: r.id ?? null, enviadoEm: new Date().toISOString() }, { merge: true })
    return 'enviado'
  } catch (e) {
    console.error(`e-mail ${chave} falhou:`, e instanceof Error ? e.message : e)
    await ref.delete()
    return 'falhou'
  }
}
