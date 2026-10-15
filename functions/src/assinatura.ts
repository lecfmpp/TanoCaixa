/* ------------------------------------------------------------------ *
 * Assinatura do Tá no Caixa: plano único, R$ 149/mês por restaurante.
 * Regras puras (sem Firebase e sem Stripe), para testar sem rede.
 *
 * O teste é de 14 dias SEM cartão (promessa da landing): conta a partir da
 * criação do restaurante. O Stripe só entra quando a pessoa decide assinar.
 * ------------------------------------------------------------------ */

export const PLANO_UNICO = 'unico'
export const PRECO_CENTAVOS = 14_900
export const DIAS_DE_TESTE = 14

/** Situação mostrada ao usuário. */
export type Situacao = 'em_teste' | 'teste_encerrado' | 'ativa' | 'pagamento_falhou' | 'pendente' | 'cancelada'

/** Status de assinatura do Stripe → o que guardamos. */
export function statusDoStripe(s: string | undefined): Exclude<Situacao, 'em_teste' | 'teste_encerrado'> {
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
      return 'pendente' // incomplete, paused, desconhecido: não libera nada por engano
  }
}

const DIA_MS = 24 * 3600 * 1000

/** Dias que faltam do teste (0 = último dia já passou). `criadoEm` e `agora` em ISO. */
export function diasDeTesteRestantes(criadoEm: string, agora: string): number {
  const passados = Math.floor((Date.parse(agora) - Date.parse(criadoEm)) / DIA_MS)
  return Math.max(0, DIAS_DE_TESTE - passados)
}

export interface EstadoAssinatura {
  situacao: Situacao
  /** Só em `em_teste`. */
  diasRestantes?: number
  /** Dá para abrir o portal (tem cliente no Stripe). */
  temPortal: boolean
  precoCentavos: number
}

/**
 * `status`/`customerId` vêm do documento gravado pelo webhook (ausente = nunca
 * assinou). Quem nunca assinou está em teste ou com o teste encerrado.
 */
export function estadoDaAssinatura(p: { status?: string; customerId?: string; criadoEm: string; agora: string }): EstadoAssinatura {
  const base = { temPortal: !!p.customerId, precoCentavos: PRECO_CENTAVOS }
  if (p.status) return { situacao: p.status as Situacao, ...base }
  const restantes = diasDeTesteRestantes(p.criadoEm, p.agora)
  return restantes > 0 ? { situacao: 'em_teste', diasRestantes: restantes, ...base } : { situacao: 'teste_encerrado', ...base }
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
