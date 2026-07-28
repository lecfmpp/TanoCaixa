/* ------------------------------------------------------------------ *
 * Tipos da API do iFood (foco financeiro). Base: merchant-api.ifood.com.br
 * Modelo Centralizado (client_credentials → várias lojas + webhooks).
 *
 * OBS: os nomes de campo da Financial › Sales foram modelados a partir da
 * documentação pública; confira contra o payload real na homologação e
 * ajuste em `mapper.ts` (concentramos o parsing lá de propósito).
 * ------------------------------------------------------------------ */

export interface CredenciaisIFood {
  clientId: string
  clientSecret: string
  /** merchant-api.ifood.com.br (default). */
  baseUrl?: string
}

export interface TokenIFood {
  accessToken: string
  /** epoch ms de expiração. */
  expiraEm: number
}

/** Loja (merchant) à qual o app tem acesso. */
export interface MerchantIFood {
  id: string
  name: string
  corporateName?: string
}

/* ------------------------------- Financial ------------------------------ */

/** Uma venda da Financial › Sales API. */
export interface VendaIFood {
  /** id do pedido no iFood. */
  orderId: string
  /** número curto exibido ao cliente. */
  shortId?: string
  /** data/hora da venda (ISO). */
  date: string
  paymentMethod?: string
  /** valor bruto pago pelo cliente. */
  grossValue: number
  /** comissão + taxas do iFood sobre a venda (valor absoluto). */
  fees: number
  /** valor líquido (repasse) da venda. */
  netValue: number
  status?: string
}

/** Repasse (Settlement) — o que o iFood pagou no período. */
export interface RepasseIFood {
  id: string
  competencia: string // 'YYYY-MM'
  valorLiquido: number
  pago: boolean
  data?: string
}

/* -------------------------------- Order --------------------------------- */

/** Evento do polling de pedidos. */
export interface EventoPedidoIFood {
  id: string
  code: string // PLC (placed), CFM (confirmed), CAN (cancelled)...
  orderId: string
  createdAt: string
}

/** Detalhe de pedido (GET /orders/{id}) — recorte financeiro. */
export interface PedidoIFood {
  id: string
  createdAt: string
  total: { subTotal: number; deliveryFee: number; benefits: number; orderAmount: number }
  payments?: { prepaid: number; pending: number }
}

/* -------------------------------- Catalog ------------------------------- */

export interface ItemCatalogoIFood {
  id: string
  name: string
  /** preço de venda no cardápio. */
  price: { value: number; originalValue?: number }
  category?: string
  status?: string
}
