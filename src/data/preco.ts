/* Preço público do Tá no Caixa — usado pela landing e pela página de
 * assinatura. O que o Stripe cobra de fato vive em
 * functions/src/assinatura.ts (PRECO_LOJA_CENTAVOS e PRECO_LOJA_EXTRA_CENTAVOS):
 * mudou aqui, mude lá. */

/** Plano Pro: valor da primeira loja, por mês (sem PDV, que está em breve). */
export const PRECO_LOJA = 149
/** Plano Pro: cada loja a mais da rede, por mês. */
export const PRECO_LOJA_EXTRA = 79
/** Preço "de" — âncora de valor. Não é cobrado. */
export const PRECO_LOJA_CHEIO = 249
/** Desconto promocional vigente ("por enquanto"). */
export const DESCONTO_LOJA = PRECO_LOJA_CHEIO - PRECO_LOJA
/** No Grátis a equipe vai até 2 pessoas, contando o dono. */
export const LIMITE_EQUIPE_GRATIS = 2
