/* ------------------------------------------------------------------ *
 * Tipos da API do Rappi (foco financeiro). Brasil:
 *   - novo:   https://api.rappi.com.br      (auth, finance, menu, orders v1)
 *   - legado: https://services.rappi.com.br (orders v2)
 * Auth: POST /restaurants/auth/v1/token/login/integrations (client_id/secret)
 * Header das chamadas: `x-authorization: bearer {token}`.
 *
 * Nomes de campo modelados a partir da doc pública; confira na homologação e
 * ajuste em `mapper.ts` (parsing concentrado lá).
 * ------------------------------------------------------------------ */

export interface CredenciaisRappi {
  clientId: string
  clientSecret: string
  /** api.rappi.com.br (novo — auth/finance/menu). */
  baseUrl?: string
  /** services.rappi.com.br (legado — orders v2). */
  legacyUrl?: string
}

export interface TokenRappi {
  accessToken: string
  expiraEm: number // epoch ms
}

/** Pedido do Rappi (recorte financeiro). */
export interface PedidoRappi {
  orderId: string
  createdAt: string
  /** valor total pago pelo cliente. */
  totalValue: number
  /** comissão do Rappi sobre o pedido. */
  commission: number
  taxes: number
  discounts: number
}

/** Pagamento/repasse (finance › payments). */
export interface PagamentoRappi {
  id: string
  date: string
  grossValue: number
  commission: number
  netValue: number
}

/** Item do menu (cardápio) com preço. */
export interface ItemMenuRappi {
  id: string
  name: string
  price: number
  category?: string
}
