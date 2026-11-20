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

/* ---------------------------- Teste grátis ---------------------------- */

/** Dias de uso grátis antes de exigir a assinatura. Espelho em src/data/assinatura.ts. */
export const DIAS_TESTE = 14
const DIA_MS = 24 * 60 * 60 * 1000

/** Fim do teste a partir de quando ele começou (conta nova, ou o 1º acesso depois desta regra existir). */
export function fimDoTeste(inicio: Date): string {
  return new Date(inicio.getTime() + DIAS_TESTE * DIA_MS).toISOString()
}

export type Acesso = 'ativa' | 'pagamento_falhou' | 'teste' | 'bloqueada'

/**
 * O que a conta pode fazer agora. Assinatura ativa libera; pagamento que falhou
 * segue liberado (o Stripe ainda tenta cobrar) mas com aviso; sem assinatura,
 * vale o teste até `testeAte` e depois bloqueia.
 */
export function acessoDaConta(situacao: Situacao | undefined | null, testeAte: string | undefined, agora: Date): { acesso: Acesso; diasRestantes: number } {
  if (situacao === 'ativa') return { acesso: 'ativa', diasRestantes: 0 }
  if (situacao === 'pagamento_falhou') return { acesso: 'pagamento_falhou', diasRestantes: 0 }
  const fim = testeAte ? Date.parse(testeAte) : NaN
  if (!Number.isFinite(fim)) return { acesso: 'bloqueada', diasRestantes: 0 }
  const resta = fim - agora.getTime()
  if (resta <= 0) return { acesso: 'bloqueada', diasRestantes: 0 }
  return { acesso: 'teste', diasRestantes: Math.ceil(resta / DIA_MS) }
}

/* ------------------------- Pro + Expansão ------------------------- */

/** Pro: R$ 149/mês, com 1 loja. Espelho em src/data/preco.ts. */
export const PRECO_PRO_CENTAVOS = 14900
/** Expansão (opcional): R$ 79/mês por loja além da primeira. */
export const PRECO_EXPANSAO_CENTAVOS = 7900
export const MAX_LOJAS = 50

/** Quanto de cada item a assinatura cobra para N lojas: o Pro sempre 1; a Expansão só se houver loja a mais. */
export function itensDaAssinatura(lojas: number): { pro: 1; expansao: number } {
  const n = Math.min(MAX_LOJAS, Math.max(1, Math.floor(lojas) || 1))
  return { pro: 1, expansao: n - 1 }
}

/** Total mensal em centavos para N lojas. */
export function totalMensalCentavos(lojas: number): number {
  const { expansao } = itensDaAssinatura(lojas)
  return PRECO_PRO_CENTAVOS + expansao * PRECO_EXPANSAO_CENTAVOS
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
