/* ------------------------------------------------------------------ *
 * Tipos da API do iFood. Base: merchant-api.ifood.com.br
 * Modelo Centralizado (client_credentials → várias lojas + webhooks).
 *
 * Os nomes de campo abaixo foram conferidos contra a documentação oficial
 * (developer.ifood.com.br › guides/modules/financial e docs/references).
 * ------------------------------------------------------------------ */

export interface CredenciaisIFood {
  clientId: string
  clientSecret: string
  /** merchant-api.ifood.com.br (default). */
  baseUrl?: string
  /**
   * Envia `x-request-homologation: true` em todas as chamadas, fazendo o
   * iFood devolver os dados do ambiente de homologação em vez dos reais.
   * Usado só pelo script de homologação — NUNCA em produção.
   */
  homologacao?: boolean
}

export interface TokenIFood {
  accessToken: string
  /** epoch ms de expiração. */
  expiraEm: number
}

/* ------------------------------- Merchant ------------------------------- */

/** Loja (merchant) à qual o app tem acesso — `GET /merchant/v1.0/merchants`. */
export interface MerchantIFood {
  id: string
  name: string
  corporateName?: string
}

/** Detalhe da loja — `GET /merchant/v1.0/merchants/{id}`. */
export interface MerchantDetalheIFood {
  id: string
  name: string
  corporateName?: string
  description?: string
  averageTicket?: number
  exclusive?: boolean
  type?: string
  phone?: string
  address?: {
    country?: string
    state?: string
    city?: string
    district?: string
    street?: string
    number?: string
    postalCode?: string
    complement?: string
  }
  operations?: { name?: string; salesChannel?: string }[]
}

/** Situação atual da loja — `GET /merchants/{id}/status`. */
export interface StatusLojaIFood {
  operation?: string
  /** OK · WARNING · CLOSED · ERROR */
  state: string
  message?: { title?: string; subtitle?: string; description?: string }
  validations?: { id?: string; code?: string; state?: string; message?: string }[]
}

/** Pausa programada — `GET /merchants/{id}/interruptions`. */
export interface InterrupcaoIFood {
  id: string
  description?: string
  start: string
  end: string
}

/** Turno de funcionamento — `GET /merchants/{id}/opening-hours`. */
export interface HorarioIFood {
  id?: string
  dayOfWeek: string
  start: string
  /** duração do turno em minutos. */
  duration: number
}

/* ------------------------------- Financial ------------------------------ */

/**
 * Uma venda da API Sales — `GET /financial/v3.0/merchants/{id}/sales`.
 * Só o recorte que o Tá no Caixa consome; a resposta traz bem mais campos.
 */
export interface VendaIFood {
  id: string
  shortId?: number
  createdAt: string
  type?: string
  category?: string
  salesChannel?: string
  currentStatus?: string
  /** Valor bruto da venda = bag + deliveryFee + serviceFee. */
  saleGrossValue: {
    /** Valor dos itens do pedido (produtos da loja). */
    bag: number
    /** Taxa de entrega. */
    deliveryFee: number
    /** Taxa de serviço cobrada do CLIENTE pelo iFood. */
    serviceFee: number
  }
  benefits?: {
    benefits?: {
      target?: string
      totalValue?: number
      sponsorships?: { name?: string; value?: number }[]
    }[]
  }
  /** Resumo financeiro do pedido no momento da consulta. */
  billingSumary?: {
    /** Líquido a repassar à loja, já com cancelamentos/reembolsos/ajustes. */
    saleBalance?: number
    billingEntries?: { name?: string; value?: number }[]
  }
  payments?: {
    payments?: {
      method?: string
      value?: number
      /** INTERNAL = iFood acolheu · EXTERNAL = a loja recebeu direto. */
      liability?: string
    }[]
  }
}

/**
 * Um lançamento do razão financeiro — API Financial Events.
 * `GET /financial/v3.0/merchants/{id}/financial-events`
 */
export interface LancamentoFinanceiroIFood {
  /** ORDER_PAYMENT · ORDER_COMMISSION · ORDER_CANCELLATION … */
  name: string
  description?: string
  product?: string
  /** ORDER_CONCLUDED, … */
  trigger?: string
  /** YYYY-MM */
  competence?: string
  period?: { beginDate?: string; endDate?: string }
  reference?: { type?: string; id?: string; date?: string }
  /**
   * FALSE = lançamento existe só para transparência e NÃO entra no repasse
   * (pagamento em VR/VA, dinheiro, maquininha da loja, promoção da loja).
   */
  hasTransferImpact: boolean
  amount: { value: number }
  billing?: { baseValue?: number; feePercentage?: number }
  settlement?: { expectedDate?: string }
  receiver?: { merchantId?: string; merchantDocument?: string }
  payment?: {
    method?: string
    brand?: string
    /** INTERNAL = iFood acolheu a transação · EXTERNAL = a loja acolheu. */
    liability?: string
  }
}

/** Item que compõe uma liquidação (um "saldo"). */
export interface SaldoLiquidacaoIFood {
  id: string
  /** REPASSE · BOLETO · RENEGOCIADA · REGISTRO_RECEBIVEIS */
  type: string
  product?: string
  amount: number
  status?: string
  transactionId?: string
  paymentDate?: string
  accountDetails?: {
    bankName?: string
    bankNumber?: string
    branchCode?: string
    accountNumber?: string
    accountDigit?: string
  }
}

/** Liquidação de um período — API Settlements. */
export interface RepasseIFood {
  merchantId?: string
  beginDate?: string
  endDate?: string
  /** Valor líquido efetivamente recebido pela loja no período. */
  balance: number
  settlements?: {
    startDateCalculation?: string
    endDateCalculation?: string
    closingItems?: SaldoLiquidacaoIFood[]
  }[]
}

/** Antecipação de recebíveis — API Anticipations. */
export interface AntecipacaoIFood {
  merchantId?: string
  beginDate?: string
  endDate?: string
  /** Soma de todos os anticipatedPaymentAmount do período. */
  balance?: number
  settlements?: {
    startDateCalculation?: string
    endDateCalculation?: string
    closingItems?: {
      type?: string
      originalPaymentAmount?: number
      feePercentage?: number
      feeAmount?: number
      anticipatedPaymentAmount?: number
      status?: string
      originalPaymentDate?: string
      anticipatedPaymentDate?: string
    }[]
  }[]
}

/**
 * Uma linha do arquivo de conciliação (CSV, cabeçalho em português).
 * Mantemos o registro cru — as colunas mudam com o tempo e algumas já estão
 * marcadas como descontinuadas pelo iFood.
 */
export type LinhaConciliacaoIFood = Record<string, string>

/* -------------------------------- Order --------------------------------- */

/** Evento de pedido (polling ou webhook). */
export interface EventoPedidoIFood {
  id: string
  /** PLC (placed), CFM (confirmed), CAN (cancelled)… */
  code: string
  orderId: string
  merchantId?: string
  createdAt: string
}

/** Detalhe de pedido (`GET /order/v1.0/orders/{id}`) — recorte usado. */
export interface PedidoIFood {
  id: string
  createdAt: string
  items?: { name?: string; quantity?: number; unitPrice?: number; totalPrice?: number }[]
  total?: { subTotal?: number; deliveryFee?: number; benefits?: number; orderAmount?: number }
}

/* -------------------------------- Catalog ------------------------------- */

export interface CatalogoIFood {
  catalogId?: string
  groupId?: string
  status?: string
  context?: string[]
}

export interface CategoriaIFood {
  id: string
  name: string
  status?: string
  index?: number
  template?: string
}

/** Grupo de complementos de um item (tamanhos, adicionais, molhos…). */
export interface ComplementoIFood {
  id?: string
  name: string
  min?: number
  max?: number
  status?: string
  opcoes: { id?: string; name: string; price: number; status?: string }[]
}

export interface ItemCatalogoIFood {
  id: string
  name: string
  description?: string
  /** preço de venda no cardápio. */
  price: { value: number; originalValue?: number }
  category?: string
  categoryId?: string
  status?: string
  complementos: ComplementoIFood[]
}
