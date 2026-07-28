import { AutenticacaoRappi } from './auth'
import type { CredenciaisRappi } from './types'

const BASE_PADRAO = 'https://api.rappi.com.br'
const LEGADO_PADRAO = 'https://services.rappi.com.br'

/**
 * Cliente da API do Rappi — foco financeiro (pagamentos/repasse, pedidos,
 * menu). Autentica com `x-authorization: bearer {token}`. Parsing bruto fica
 * em `mapper.ts`.
 */
export class ClienteRappi {
  private auth: AutenticacaoRappi
  private base: string
  private legado: string

  constructor(cred: CredenciaisRappi) {
    this.auth = new AutenticacaoRappi(cred)
    this.base = cred.baseUrl ?? BASE_PADRAO
    this.legado = cred.legacyUrl ?? LEGADO_PADRAO
  }

  private async get(url: string, contexto: string): Promise<unknown> {
    const token = await this.auth.accessToken()
    const resp = await fetch(url, {
      headers: { 'x-authorization': `bearer ${token}`, Accept: 'application/json' },
    })
    if (resp.status === 204) return []
    if (!resp.ok) throw new Error(`Rappi ${contexto} (${resp.status}): ${await resp.text()}`)
    return resp.json()
  }

  /** Pagamentos/repasse da loja (finance). Payload bruto → mapper. */
  async pagamentosBrutos(storeId: string): Promise<unknown> {
    return this.get(`${this.base}/restaurants/finance/v1/stores/${storeId}/payments`, 'finance/payments')
  }

  /** Pedidos (com taxas/comissões). Usa a API legada v2. Payload bruto → mapper. */
  async pedidosBrutos(): Promise<unknown> {
    return this.get(`${this.legado}/api/v2/restaurants-integrations-public-api/orders`, 'orders')
  }

  /** Menu/cardápio da loja com preços. Payload bruto → mapper. */
  async menuBruto(storeId: string): Promise<unknown> {
    return this.get(`${this.base}/restaurants/menu/v1/stores/${storeId}/menu`, 'menu')
  }
}
