/* ------------------------------------------------------------------ *
 * Regras puras da assinatura (sem Firebase e sem Stripe), para testar sem rede.
 * ------------------------------------------------------------------ */

/** Situação guardada em `assinaturas/{restauranteId}`. */
export type Situacao = 'ativa' | 'pagamento_falhou' | 'pendente' | 'cancelada'

/** Plano do restaurante. Grátis é o padrão de quem não tem assinatura ativa. */
export type Plano = 'gratis' | 'pro'

/** R$ 149,00 a primeira loja e R$ 79,00 cada loja extra da rede, por mês.
 * Mudou o preço? Mude aqui e em src/data/preco.ts (landing e página de assinatura). */
export const PRECO_LOJA_CENTAVOS = 14900
export const PRECO_LOJA_EXTRA_CENTAVOS = 7900
export const MAX_LOJAS = 50
/** No Grátis a equipe vai até 2 pessoas, contando o dono. */
export const LIMITE_EQUIPE_GRATIS = 2

/** Só assinatura ativa libera o Pro. Pagamento que falhou segura o Pro enquanto o Stripe
 * tenta cobrar de novo (ele cancela sozinho no fim das tentativas). */
export function planoDaSituacao(s: string | undefined): Plano {
  return s === 'ativa' || s === 'pagamento_falhou' ? 'pro' : 'gratis'
}

/** Quantidades dos dois itens da assinatura: a loja principal é sempre 1, o resto é extra. */
export function itensDaAssinatura(lojas: number): { principal: number; extras: number } {
  const n = Math.min(MAX_LOJAS, Math.max(1, Math.floor(lojas)))
  return { principal: 1, extras: n - 1 }
}

/** Total por mês, em centavos. */
export function totalMensalCentavos(lojas: number): number {
  const { principal, extras } = itensDaAssinatura(lojas)
  return principal * PRECO_LOJA_CENTAVOS + extras * PRECO_LOJA_EXTRA_CENTAVOS
}

/** Status de assinatura do Stripe → o que guardamos. O que não conhecemos NÃO libera nada. */
export function statusDoStripe(s: string | undefined): Situacao {
  switch (s) {
    case 'active':
    case 'trialing':
      return 'ativa'
    case 'past_due':
    case 'unpaid':
      return 'pagamento_falhou'
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelada'
    default:
      return 'pendente' // incomplete, paused, desconhecido
  }
}

const ORIGENS_PERMITIDAS = ['https://tanocaixa.com', 'https://www.tanocaixa.com', 'https://tanocaixa.web.app']

/** Só volta para o nosso site: URL de outra origem (ou inválida) cai no padrão. Evita redirecionar o cliente para fora. */
export function urlSegura(url: string | undefined, padrao: string): string {
  if (!url) return padrao
  try {
    const u = new URL(url)
    return ORIGENS_PERMITIDAS.includes(u.origin) ? u.toString() : padrao
  } catch {
    return padrao
  }
}

/** Stripe pode entregar eventos fora de ordem: só vale o que é mais novo que o já gravado. */
export function eventoEhMaisNovo(eventoEm: number, gravadoEm: number | undefined): boolean {
  return gravadoEm === undefined || eventoEm >= gravadoEm
}
