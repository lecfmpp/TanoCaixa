/* Preço público do Tá no Caixa — usado pela landing e pela página de
 * assinatura. O que o Stripe cobra de fato vive em
 * functions/src/assinatura.ts (PRECO_LOJA_CENTAVOS e PRECO_LOJA_EXTRA_CENTAVOS):
 * mudou aqui, mude lá. */

/** Valor da primeira loja, por mês (sem PDV, que está em breve). */
export const PRECO_LOJA = 149
/** Cada loja a mais da rede, por mês. */
export const PRECO_LOJA_EXTRA = 79
/** Preço "de" — âncora de valor. Não é cobrado. */
export const PRECO_LOJA_CHEIO = 249
/** Desconto promocional vigente ("por enquanto"). */
export const DESCONTO_LOJA = PRECO_LOJA_CHEIO - PRECO_LOJA
/** Dias de teste com tudo liberado (1 loja). Igual a DIAS_TESTE em functions/src/assinatura.ts. */
export const DIAS_TESTE = 14
