import { AutenticacaoIFood } from './auth'
import type {
  CredenciaisIFood,
  MerchantIFood,
  VendaIFood,
  RepasseIFood,
  EventoPedidoIFood,
  PedidoIFood,
  ItemCatalogoIFood,
} from './types'

const BASE_PADRAO = 'https://merchant-api.ifood.com.br'

/**
 * Cliente da API do iFood — foco financeiro (vendas, repasses, pedidos,
 * catálogo). O parsing dos campos brutos fica em `mapper.ts`; aqui só fazemos
 * as chamadas HTTP autenticadas e devolvemos tipos já normalizados.
 */
export class ClienteIFood {
  private auth: AutenticacaoIFood
  private base: string

  constructor(cred: CredenciaisIFood) {
    this.auth = new AutenticacaoIFood(cred)
    this.base = cred.baseUrl ?? BASE_PADRAO
  }

  private async get(path: string): Promise<Response> {
    const token = await this.auth.accessToken()
    return fetch(`${this.base}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
  }
  private async post(path: string, body?: unknown): Promise<Response> {
    const token = await this.auth.accessToken()
    return fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  private async json<T>(resp: Response, contexto: string): Promise<T> {
    if (!resp.ok) throw new Error(`iFood ${contexto} (${resp.status}): ${await resp.text()}`)
    return (await resp.json()) as T
  }

  /* ------------------------------ Merchant ------------------------------ */

  /** Lojas às quais o app tem acesso. */
  async merchants(): Promise<MerchantIFood[]> {
    const resp = await this.get('/merchant/v1.0/merchants')
    return this.json<MerchantIFood[]>(resp, 'merchants')
  }

  /* ------------------------------ Financial ----------------------------- */

  /**
   * Vendas de um período (Financial › Sales). Datas no formato 'YYYY-MM-DD'.
   * Devolve o payload bruto — normalizado em mapper.normalizarVendas().
   */
  async vendasBrutas(merchantId: string, inicio: string, fim: string): Promise<unknown> {
    const q = new URLSearchParams({ beginSalesDate: inicio, endSalesDate: fim })
    const resp = await this.get(`/financial/v3.0/merchants/${merchantId}/sales?${q}`)
    return this.json<unknown>(resp, 'sales')
  }

  /** Repasses (Settlement) do período. Payload bruto → mapper. */
  async repassesBrutos(merchantId: string, competencia: string): Promise<unknown> {
    const resp = await this.get(
      `/financial/v3.0/merchants/${merchantId}/settlements?competence=${competencia}`,
    )
    return this.json<unknown>(resp, 'settlements')
  }

  /* -------------------------------- Order ------------------------------- */

  /** Polling de eventos (a cada ~30s). 204 = sem novidades. */
  async pollingEventos(): Promise<EventoPedidoIFood[]> {
    const resp = await this.get('/order/v1.0/events:polling')
    if (resp.status === 204) return []
    return this.json<EventoPedidoIFood[]>(resp, 'events:polling')
  }

  /** Confirma o recebimento dos eventos (ACK) — obrigatório após persistir. */
  async ackEventos(ids: string[]): Promise<void> {
    const resp = await this.post(
      '/order/v1.0/events/acknowledgment',
      ids.map((id) => ({ id })),
    )
    if (!resp.ok && resp.status !== 202) {
      throw new Error(`iFood ack (${resp.status}): ${await resp.text()}`)
    }
  }

  /** Detalhe de um pedido (recorte financeiro). Payload bruto → mapper. */
  async pedidoBruto(orderId: string): Promise<unknown> {
    const resp = await this.get(`/order/v1.0/orders/${orderId}`)
    return this.json<unknown>(resp, 'order details')
  }

  /* ------------------------------- Catalog ------------------------------ */

  /** Catálogos da loja (para achar o groupId). */
  async catalogos(merchantId: string): Promise<{ groupId: string }[]> {
    const resp = await this.get(`/catalog/v2.0/merchants/${merchantId}/catalogs`)
    return this.json<{ groupId: string }[]>(resp, 'catalogs')
  }

  /** Itens vendáveis (cardápio) com preço. Payload bruto → mapper. */
  async itensVendaveisBrutos(merchantId: string, groupId: string): Promise<unknown> {
    const resp = await this.get(
      `/catalog/v2.0/merchants/${merchantId}/catalogs/${groupId}/sellableItems`,
    )
    return this.json<unknown>(resp, 'sellableItems')
  }
}

export type { MerchantIFood, VendaIFood, RepasseIFood, PedidoIFood, ItemCatalogoIFood }
