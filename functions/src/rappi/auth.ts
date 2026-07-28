import type { CredenciaisRappi, TokenRappi } from './types'

const BASE_PADRAO = 'https://api.rappi.com.br'
/** Token do Rappi dura ~1 semana; renovamos com 1 dia de folga. */
const VALIDADE_PADRAO_MS = 6 * 24 * 60 * 60 * 1000

/**
 * Gerenciador de token do Rappi. Diferente do iFood: corpo JSON e o token vai
 * no header `x-authorization: bearer {token}` (ver client.ts).
 */
export class AutenticacaoRappi {
  private token: TokenRappi | null = null
  private readonly base: string

  constructor(private cred: CredenciaisRappi) {
    this.base = cred.baseUrl ?? BASE_PADRAO
  }

  async accessToken(): Promise<string> {
    const agora = Date.now()
    if (this.token && this.token.expiraEm - 60_000 > agora) return this.token.accessToken

    const resp = await fetch(`${this.base}/restaurants/auth/v1/token/login/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: this.cred.clientId, client_secret: this.cred.clientSecret }),
    })
    if (!resp.ok) throw new Error(`Rappi auth falhou (${resp.status}): ${await resp.text()}`)

    const json = (await resp.json()) as { access_token?: string; token?: string; expires_in?: number }
    const accessToken = json.access_token ?? json.token
    if (!accessToken) throw new Error('Rappi auth: token ausente na resposta')

    this.token = {
      accessToken,
      expiraEm: agora + (json.expires_in ? json.expires_in * 1000 : VALIDADE_PADRAO_MS),
    }
    return accessToken
  }
}
