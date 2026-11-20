/* Preço público do Tá no Caixa — usado pela landing, pelo onboarding e pela
 * página de assinatura. O que o Stripe cobra de fato vive em
 * functions/src/assinatura.ts (PRECO_PRO_CENTAVOS e PRECO_EXPANSAO_CENTAVOS):
 * mudou aqui, mude lá. */

/** Pro — o único plano pago, com 1 loja (sem PDV e CMV, que estão em breve). */
export const PRECO_LOJA = 149
/** Expansão (opcional): cada loja além da primeira, por mês. */
export const PRECO_EXPANSAO = 79
/** Preço "de" — âncora de valor. Não é cobrado. */
export const PRECO_LOJA_CHEIO = 249
/** Desconto promocional vigente ("por enquanto"). */
export const DESCONTO_LOJA = PRECO_LOJA_CHEIO - PRECO_LOJA

/** Total por mês com N lojas: Pro + (N − 1) × Expansão. */
export function totalMensal(lojas: number): number {
  return PRECO_LOJA + Math.max(0, Math.floor(lojas) - 1) * PRECO_EXPANSAO
}
