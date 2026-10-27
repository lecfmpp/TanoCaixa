/* Preço público do Tá no Caixa — usado pela landing e pela página de
 * assinatura. O que o Stripe cobra de fato vive em
 * functions/src/stripe.ts (PRECO_LOJA_CENTAVOS): mudou aqui, mude lá. */

/** Valor cobrado por loja, por mês (sem PDV e CMV, que estão em breve). */
export const PRECO_LOJA = 149
/** Preço "de" — âncora de valor. Não é cobrado. */
export const PRECO_LOJA_CHEIO = 249
/** Desconto promocional vigente ("por enquanto"). */
export const DESCONTO_LOJA = PRECO_LOJA_CHEIO - PRECO_LOJA
