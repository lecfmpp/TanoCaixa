/* ------------------------------------------------------------------ *
 * Cliente mínimo da API do Resend (e-mails, contatos, propriedades e
 * segmentos). Tudo por fetch injetável, pra testar sem rede.
 *
 * Limite da API: poucas chamadas por segundo por conta. O cliente espera
 * um intervalo mínimo entre chamadas e tenta de novo em 429/5xx.
 * ------------------------------------------------------------------ */

const API = 'https://api.resend.com'

export interface EmailSaida {
  from: string
  to: string[]
  subject: string
  html?: string
  text?: string
  template?: { id: string; variables?: Record<string, string | number> }
  reply_to?: string
  headers?: Record<string, string>
  tags?: Array<{ name: string; value: string }>
}

export class ErroResend extends Error {
  constructor(public status: number, public corpo: string, caminho: string) {
    super(`resend ${caminho}: http ${status}`)
  }
}

export interface OpcoesCliente {
  apiKey: string
  fetchFn?: typeof fetch
  /** Intervalo mínimo entre chamadas, em ms (padrão 550 ≈ 2 por segundo). */
  intervaloMs?: number
  /** Espera entre tentativas (troca nos testes). */
  dormir?: (ms: number) => Promise<void>
}

export type ClienteResend = ReturnType<typeof clienteResend>

export function clienteResend(o: OpcoesCliente) {
  const f = o.fetchFn ?? fetch
  const intervalo = o.intervaloMs ?? 550
  const dormir = o.dormir ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  let ultima = 0

  async function chamar<T>(metodo: string, caminho: string, corpo?: unknown, extras?: Record<string, string>): Promise<T> {
    for (let tentativa = 0; ; tentativa++) {
      const espera = ultima + intervalo - Date.now()
      if (espera > 0) await dormir(espera)
      ultima = Date.now()
      const resp = await f(`${API}${caminho}`, {
        method: metodo,
        headers: { Authorization: `Bearer ${o.apiKey}`, 'Content-Type': 'application/json', ...extras },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      })
      if ((resp.status === 429 || resp.status >= 500) && tentativa < 3) {
        const depois = Number(resp.headers.get('retry-after'))
        await dormir(Number.isFinite(depois) && depois > 0 ? depois * 1000 : 1000 * (tentativa + 1))
        continue
      }
      const texto = await resp.text()
      if (!resp.ok) throw new ErroResend(resp.status, texto.slice(0, 300), `${metodo} ${caminho.split('?')[0]}`)
      return (texto ? JSON.parse(texto) : {}) as T
    }
  }

  async function listarTudo<T>(caminho: string): Promise<T[]> {
    const itens: T[] = []
    let depois: string | undefined
    for (let i = 0; i < 50; i++) {
      const sep = caminho.includes('?') ? '&' : '?'
      const r = await chamar<{ data?: T[]; has_more?: boolean }>('GET', `${caminho}${sep}limit=100${depois ? `&after=${depois}` : ''}`)
      const pagina = r.data ?? []
      itens.push(...pagina)
      if (!r.has_more || pagina.length === 0) break
      depois = (pagina[pagina.length - 1] as { id?: string }).id
    }
    return itens
  }

  const id = (s: string) => encodeURIComponent(s)

  return {
    enviar: (e: EmailSaida, chaveIdempotencia?: string) =>
      chamar<{ id?: string }>('POST', '/emails', e, chaveIdempotencia ? { 'Idempotency-Key': chaveIdempotencia } : undefined),

    criarContato: (c: { email: string; first_name?: string; properties?: Record<string, string | number | null> }) =>
      chamar<{ id: string }>('POST', '/contacts', c),
    atualizarContato: (contato: string, c: { email?: string; first_name?: string; properties?: Record<string, string | number | null> }) =>
      chamar<{ id: string }>('PATCH', `/contacts/${id(contato)}`, c),
    buscarContato: (contato: string) => chamar<{ id: string; email: string }>('GET', `/contacts/${id(contato)}`),
    removerContato: (contato: string) => chamar<unknown>('DELETE', `/contacts/${id(contato)}`),

    listarSegmentos: () => listarTudo<{ id: string; name: string }>('/segments'),
    criarSegmento: (nome: string) => chamar<{ id: string }>('POST', '/segments', { name: nome }),
    segmentosDoContato: (contato: string) => listarTudo<{ id: string; name: string }>(`/contacts/${id(contato)}/segments`),
    adicionarAoSegmento: (contato: string, segmentoId: string) =>
      chamar<unknown>('POST', `/contacts/${id(contato)}/segments/${id(segmentoId)}`),
    removerDoSegmento: (contato: string, segmentoId: string) =>
      chamar<unknown>('DELETE', `/contacts/${id(contato)}/segments/${id(segmentoId)}`),

    listarPropriedades: () => listarTudo<{ id: string; key: string }>('/contact-properties'),
    criarPropriedade: (key: string, type: 'string' | 'number') => chamar<{ id: string }>('POST', '/contact-properties', { key, type }),

    listarTemplates: () => listarTudo<{ id: string; alias?: string; name: string }>('/templates'),
    criarTemplate: (t: { name: string; alias: string; from?: string; subject?: string; reply_to?: string; html: string; variables: Array<{ key: string; type: 'string'; fallback_value?: string }> }) =>
      chamar<{ id: string }>('POST', '/templates', t),
    atualizarTemplate: (idOuAlias: string, t: { name?: string; subject?: string; html?: string; variables?: Array<{ key: string; type: 'string'; fallback_value?: string }> }) =>
      chamar<{ id: string }>('PATCH', `/templates/${id(idOuAlias)}`, t),
    publicarTemplate: (idOuAlias: string) => chamar<{ id: string }>('POST', `/templates/${id(idOuAlias)}/publish`),
  }
}
