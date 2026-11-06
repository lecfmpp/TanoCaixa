/* ------------------------------------------------------------------ *
 * Registro de {sub}.tanocaixa.com.br no Firebase Hosting (site dos clientes).
 *
 * Mesmo modelo do WiseFunnel (*.wiseform.io): o DNS tem um curinga
 *   *.tanocaixa.com.br  CNAME  tanocaixa-lojas.web.app
 * e cada subdomínio é registrado no site do Hosting na hora de publicar.
 * O Firebase emite o certificado sozinho (alguns minutos na 1ª vez).
 * Sem o registro, o subdomínio não abre (erro de certificado).
 *
 * A function que chama isto roda com a conta `sites-publicador`, que tem
 * Firebase Hosting Admin (ver ops/sites-wildcard/README.md).
 * ------------------------------------------------------------------ */
import { applicationDefault } from 'firebase-admin/app'

export const SITE_HOSTING = 'tanocaixa-lojas'
const PROJETO = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'tanocaixa'
const BASE = `https://firebasehosting.googleapis.com/v1beta1/projects/${PROJETO}/sites/${SITE_HOSTING}/domains`

async function chamar(metodo: 'GET' | 'POST' | 'DELETE', caminho: string, corpo?: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const { access_token } = await applicationDefault().getAccessToken()
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const json = (await r.json().catch(() => ({}))) as Record<string, unknown>
  return { status: r.status, json }
}

export type EstadoDominio = 'ativo' | 'emitindo' | 'erro'

function estado(json: Record<string, unknown>): EstadoDominio {
  const st = String(json.status ?? '')
  const cert = String((json.provisioning as { certStatus?: string } | undefined)?.certStatus ?? '')
  if (st.includes('VERIFICATION') || cert === 'CERT_ERROR') return 'erro'
  return st === 'DOMAIN_ACTIVE' && cert === 'CERT_ACTIVE' ? 'ativo' : 'emitindo'
}

/** Registra (ou confirma) o domínio no site do Hosting. Idempotente. */
export async function registrarDominio(dominio: string): Promise<EstadoDominio> {
  const atual = await chamar('GET', '/' + dominio)
  if (atual.status === 200) return estado(atual.json)
  const r = await chamar('POST', '', { site: SITE_HOSTING, domainName: dominio })
  if (r.status === 200 || r.status === 409) return r.status === 200 ? estado(r.json) : 'emitindo'
  throw new Error(`Hosting ${r.status}: ${JSON.stringify(r.json).slice(0, 300)}`)
}

/** Remove o domínio (quando o restaurante troca de endereço). 404 = já não existia. */
export async function removerDominio(dominio: string): Promise<void> {
  const r = await chamar('DELETE', '/' + dominio)
  if (r.status !== 200 && r.status !== 404) throw new Error(`Hosting ${r.status}: ${JSON.stringify(r.json).slice(0, 300)}`)
}
