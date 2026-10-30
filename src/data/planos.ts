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

/** Sem doc ainda (o gatilho cria logo depois do cadastro) conta como teste. */
export function acessoDaAssinatura(a: AssinaturaDoc | null | undefined, agora = new Date()): Acesso {
  if (estaPago(a)) return 'pago'
  if (!a) return 'teste'
  return a.testeAte && new Date(a.testeAte).getTime() > agora.getTime() ? 'teste' : 'vencido'
}

/** Dias que faltam no teste, arredondando pra cima (null se não há data). */
export function diasDeTeste(a: AssinaturaDoc | null | undefined, agora = new Date()): number | null {
  if (!a?.testeAte) return null
  return Math.max(0, Math.ceil((new Date(a.testeAte).getTime() - agora.getTime()) / (24 * 3600 * 1000)))
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
