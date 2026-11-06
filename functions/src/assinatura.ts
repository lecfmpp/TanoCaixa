/* ------------------------------------------------------------------ *
 * Regras puras da assinatura (sem Firebase e sem Stripe), para testar sem rede.
 * ------------------------------------------------------------------ */

/** Situação guardada em `assinaturas/{restauranteId}`. */
export type Situacao = 'ativa' | 'pagamento_falhou' | 'pendente' | 'cancelada'

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

/**
 * Fim do teste grátis igual pra todas as contas: 25/11/2026, 23:59 no horário
 * de Brasília (= 02:59 UTC do dia 26). Conta que já tinha um teste mais longo
 * guardado fica com o dela.
 */
export const FIM_DO_TESTE = '2026-11-26T02:59:59.000Z'

export function fimDoTesteDaConta(gravado: string | undefined): string {
  const g = gravado ? Date.parse(gravado) : NaN
  return Number.isFinite(g) && g > Date.parse(FIM_DO_TESTE) ? new Date(g).toISOString() : FIM_DO_TESTE
}

/** O que a barra do painel mostra: assinatura em dia, pagamento com problema ou teste (com dias que faltam). */
export type SituacaoDoPainel = 'ativa' | 'pagamento_falhou' | 'teste' | 'teste_acabou'

export function situacaoDoPainel(
  status: string | undefined,
  testeAte: string,
  agora: Date,
): { situacao: SituacaoDoPainel; diasRestantes: number } {
  if (status === 'ativa') return { situacao: 'ativa', diasRestantes: 0 }
  if (status === 'pagamento_falhou') return { situacao: 'pagamento_falhou', diasRestantes: 0 }
  const resta = Date.parse(testeAte) - agora.getTime()
  if (resta <= 0) return { situacao: 'teste_acabou', diasRestantes: 0 }
  return { situacao: 'teste', diasRestantes: Math.ceil(resta / 86_400_000) }
}
