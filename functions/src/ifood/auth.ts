import type { CredenciaisIFood, TokenIFood } from './types'

const BASE_PADRAO = 'https://merchant-api.ifood.com.br'

/**
 * Gerenciador de token OAuth do iFood (modelo Centralizado).
 * grant_type=client_credentials → um token que acessa todas as lojas do app.
 * O token dura ~3-6h; guardamos em memória e renovamos com folga.
 */
export class AutenticacaoIFood {
  private token: TokenIFood | null = null
  private readonly base: string

  constructor(private cred: CredenciaisIFood) {
    this.base = cred.baseUrl ?? BASE_PADRAO
  }

  /** Retorna um access token válido (renova se estiver perto de expirar). */
  async accessToken(): Promise<string> {
    const agora = Date.now()
    if (this.token && this.token.expiraEm - 60_000 > agora) {
      return this.token.accessToken
    }
    const corpo = new URLSearchParams({
      grantType: 'client_credentials',
      clientId: this.cred.clientId,
      clientSecret: this.cred.clientSecret,
    })
    const resp = await fetch(`${this.base}/authentication/v1.0/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: corpo.toString(),
    })
    if (!resp.ok) {
      throw new Error(`iFood auth falhou (${resp.status}): ${await resp.text()}`)
    }
    const json = (await resp.json()) as { accessToken: string; expiresIn: number }
    this.token = {
      accessToken: json.accessToken,
      expiraEm: agora + json.expiresIn * 1000,
    }
    return this.token.accessToken
  }
}
