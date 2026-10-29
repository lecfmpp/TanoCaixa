/* ------------------------------------------------------------------ *
 * Plano Grátis × Pro, lido do servidor. A fonte é `assinaturas/{restauranteId}`
 * (só o webhook do Stripe e as functions gravam lá). Loja extra da rede tem o
 * próprio doc, com o status copiado da assinatura de quem paga (`pagadorId`).
 *
 * Grátis: tudo da loja única, menos DRE completo, foto da nota com IA e
 * lembretes no WhatsApp; equipe até 2 pessoas. Pro: tudo isso, rede e lojas
 * extras (R$ 79 cada) e equipe sem limite.
 * ------------------------------------------------------------------ */
import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { planoDaSituacao, type Plano } from './assinatura'
import { ehDemo } from './whatsapp'

export async function planoDoRestaurante(restauranteId: string): Promise<Plano> {
  // A demonstração mostra tudo que o Pro tem.
  if (ehDemo(restauranteId)) return 'pro'
  const snap = await getFirestore().doc(`assinaturas/${restauranteId}`).get()
  return planoDaSituacao(snap.data()?.status as string | undefined)
}

/** Barra o recurso de quem está no Grátis. O app mostra o convite pro Pro ao ver este erro. */
export async function exigirPro(restauranteId: string, recurso: string): Promise<void> {
  if ((await planoDoRestaurante(restauranteId)) !== 'pro') {
    throw new HttpsError('failed-precondition', `${recurso} é do plano Pro`, { motivo: 'plano_pro' })
  }
}
