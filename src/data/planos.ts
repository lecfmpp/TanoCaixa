/* ------------------------------------------------------------------ *
 * Assinatura: plano único (Pro). Toda loja nova começa com 14 dias de teste,
 * tudo liberado pra 1 loja. Teste vencido não trava nada: o app só avisa pra
 * assinar. Loja extra da rede (R$ 79/mês) exige o Pro pago — essa trava vale
 * no servidor (abrirLojaExtra).
 *
 * O estado vem de `assinaturas/{restauranteId}`, que só o servidor grava
 * (gatilho comecarTeste, webhook do Stripe e functions); o app só lê.
 * Espelha functions/src/assinatura.ts.
 * ------------------------------------------------------------------ */

import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type Acesso = 'pago' | 'teste' | 'vencido'

export interface AssinaturaDoc {
  status?: 'ativa' | 'pagamento_falhou' | 'pendente' | 'cancelada' | 'teste'
  /** Fim do teste de 14 dias (ISO). */
  testeAte?: string
  lojas?: number | null
  /** Loja extra da rede: id da loja que paga a assinatura. */
  pagadorId?: string
  customerId?: string
}

export function estaPago(a: AssinaturaDoc | null | undefined): boolean {
  return a?.status === 'ativa' || a?.status === 'pagamento_falhou'
}

/** Ninguém perde o teste antes de 25/11/2026, 23:59 de Brasília. Igual a FIM_DO_TESTE em functions/src/assinatura.ts. */
export const FIM_DO_TESTE = '2026-11-26T02:59:59.000Z'

/** Fim do teste da loja: o gravado ou o piso FIM_DO_TESTE, o que vier depois. */
function fimDoTeste(a: AssinaturaDoc | null | undefined): number {
  const g = a?.testeAte ? Date.parse(a.testeAte) : NaN
  return Math.max(Number.isFinite(g) ? g : 0, Date.parse(FIM_DO_TESTE))
}

export function acessoDaAssinatura(a: AssinaturaDoc | null | undefined, agora = new Date()): Acesso {
  if (estaPago(a)) return 'pago'
  return fimDoTeste(a) > agora.getTime() ? 'teste' : 'vencido'
}

/** Dias que faltam no teste, arredondando pra cima. */
export function diasDeTeste(a: AssinaturaDoc | null | undefined, agora = new Date()): number {
  return Math.max(0, Math.ceil((fimDoTeste(a) - agora.getTime()) / (24 * 3600 * 1000)))
}

export async function getAssinatura(restauranteId: string): Promise<AssinaturaDoc | null> {
  const snap = await getDoc(doc(db, 'assinaturas', restauranteId))
  return snap.exists() ? (snap.data() as AssinaturaDoc) : null
}

/** Erro de uma Cloud Function que barrou por falta do Pro pago (details.motivo = 'plano_pro'). */
export function ehErroDePlano(e: unknown): boolean {
  const d = (e as { details?: { motivo?: string } } | undefined)?.details
  return d?.motivo === 'plano_pro'
}
