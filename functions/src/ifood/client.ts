import { AutenticacaoIFood } from './auth'
import type {
  CredenciaisIFood,
  MerchantIFood,
  MerchantDetalheIFood,
  StatusLojaIFood,
  InterrupcaoIFood,
  HorarioIFood,
  VendaIFood,
  LancamentoFinanceiroIFood,
  RepasseIFood,
  AntecipacaoIFood,
  EventoPedidoIFood,
  PedidoIFood,
  CatalogoIFood,
  CategoriaIFood,
} from './types'

const BASE_PADRAO = 'https://merchant-api.ifood.com.br'

/** Erro de API com o status e o corpo preservados, para virar mensagem na UI. */
export class ErroIFood extends Error {
  constructor(
    readonly status: number,
    readonly contexto: string,
    readonly corpo: string,
    /** `code` do payload de erro do iFood, quando presente. */
    readonly codigo?: string,
  ) {
    super(`iFood ${contexto} (${status}): ${corpo}`)
    this.name = 'ErroIFood'
  }

  /** Mensagem curta e legível para mostrar ao dono do restaurante. */
  get mensagemAmigavel(): string {
    if (this.status === 401 || this.status === 403) return 'A conexão com o iFood expirou. Reconecte a loja em Ajustes.'
    if (this.status === 404) return 'O iFood não encontrou essa loja. Confira se ela ainda está vinculada.'
    if (this.status === 429) return 'O iFood está limitando as consultas agora. Tentaremos de novo em instantes.'
    if (this.status >= 500) return 'O iFood está instável no momento. Vamos tentar de novo automaticamente.'
    return 'Não foi possível consultar o iFood agora.'
  }
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface OpcoesRequisicao {
  metodo?: 'GET' | 'POST'
  corpo?: unknown
  /** Aceita 204/404 sem lançar, devolvendo null. */
  toleraVazio?: boolean
}

/**
 * Cliente da API do iFood.
 *
 * Cuida sozinho de três coisas que os critérios de homologação cobram:
 *  - reautentica e repete uma vez quando o token é recusado (401);
 *  - repete com espera crescente em 429 e 5xx, respeitando `Retry-After`;
 *  - percorre a paginação até o fim (`hasNextPage` / lista vazia).
 */
export class ClienteIFood {
  private auth: AutenticacaoIFood
  private base: string
  private homologacao: boolean

  constructor(cred: CredenciaisIFood) {
    this.auth = new AutenticacaoIFood(cred)
    this.base = cred.baseUrl ?? BASE_PADRAO
    this.homologacao = cred.homologacao === true
  }

  /* --------------------------- infraestrutura --------------------------- */

  private async requisicao(
    path: string,
    contexto: string,
    { metodo = 'GET', corpo, toleraVazio = false }: OpcoesRequisicao = {},
  ): Promise<Response | null> {
    const TENTATIVAS = 4
    let reautenticou = false

    for (let tentativa = 1; ; tentativa++) {
      const token = await this.auth.accessToken()
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      }
      // Faz o iFood devolver os dados do ambiente de homologação.
      if (this.homologacao) headers['x-request-homologation'] = 'true'
      if (corpo !== undefined) headers['Content-Type'] = 'application/json'

      const resp = await fetch(`${this.base}${path}`, {
        method: metodo,
        headers,
        body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      })

      if (resp.ok) return resp
      if (resp.status === 204) return toleraVazio ? null : resp
      if (resp.status === 404 && toleraVazio) return null

      // Token recusado: força renovação e repete uma única vez.
      if (resp.status === 401 && !reautenticou) {
        reautenticou = true
        this.auth.invalidar()
        continue
      }

      const recuperavel = resp.status === 429 || resp.status >= 500
      if (recuperavel && tentativa < TENTATIVAS) {
        const retryAfter = Number(resp.headers.get('retry-after'))
        const backoff = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 2 ** tentativa * 500
        await espera(backoff)
        continue
      }

      const texto = await resp.text()
      let codigo: string | undefined
      try {
        codigo = (JSON.parse(texto) as { code?: string }).code
      } catch {
        /* corpo não-JSON: segue sem código */
      }
      throw new ErroIFood(resp.status, contexto, texto, codigo)
    }
  }

  private async json<T>(path: string, contexto: string, opts?: OpcoesRequisicao): Promise<T> {
    const resp = await this.requisicao(path, contexto, opts)
    if (!resp) return null as T
    return (await resp.json()) as T
  }

  private async texto(path: string, contexto: string): Promise<string> {
    const resp = await this.requisicao(path, contexto)
    return resp ? await resp.text() : ''
  }

  /**
   * Percorre todas as páginas de um endpoint paginado.
   * `extrair` devolve os itens da página; paramos quando `hasNextPage` é
   * falso ou quando a página volta vazia (endpoints antigos não têm a flag).
   */
  private async paginado<T>(
    montarPath: (pagina: number) => string,
    contexto: string,
    extrair: (payload: Record<string, unknown>) => T[],
  ): Promise<T[]> {
    const todos: T[] = []
    const LIMITE_PAGINAS = 200
    for (let pagina = 1; pagina <= LIMITE_PAGINAS; pagina++) {
      const payload = await this.json<Record<string, unknown>>(montarPath(pagina), contexto)
      const itens = extrair(payload ?? {})
      todos.push(...itens)
      const temProxima = payload?.hasNextPage
      if (temProxima === false || itens.length === 0) break
      if (temProxima === undefined && itens.length === 0) break
    }
    return todos
  }

  /* ------------------------------ Merchant ------------------------------ */

  /** Lojas às quais o app tem acesso (todas as páginas). */
  async merchants(): Promise<MerchantIFood[]> {
    return this.paginado<MerchantIFood>(
      (p) => `/merchant/v1.0/merchants?page=${p}&size=100`,
      'merchants',
      (payload) => {
        if (Array.isArray(payload)) return payload as MerchantIFood[]
        const lista = payload.merchants ?? payload.data ?? payload.content
        return Array.isArray(lista) ? (lista as MerchantIFood[]) : []
      },
    )
  }

  /** Detalhe da loja: razão social, endereço e canais de operação. */
  async merchantDetalhe(merchantId: string): Promise<MerchantDetalheIFood> {
    return this.json<MerchantDetalheIFood>(`/merchant/v1.0/merchants/${merchantId}`, 'merchant detail')
  }

  /** Situação atual: OK · WARNING · CLOSED · ERROR. */
  async statusLoja(merchantId: string): Promise<StatusLojaIFood[]> {
    const r = await this.json<StatusLojaIFood[] | StatusLojaIFood>(
      `/merchant/v1.0/merchants/${merchantId}/status`,
      'merchant status',
    )
    return Array.isArray(r) ? r : r ? [r] : []
  }

  /** Pausas ativas da loja (lista vazia quando não há nenhuma). */
  async interrupcoes(merchantId: string): Promise<InterrupcaoIFood[]> {
    const r = await this.json<InterrupcaoIFood[]>(
      `/merchant/v1.0/merchants/${merchantId}/interruptions`,
      'interruptions',
    )
    return Array.isArray(r) ? r : []
  }

  /** Turnos de funcionamento cadastrados no iFood. */
  async horarios(merchantId: string): Promise<HorarioIFood[]> {
    const r = await this.json<{ shifts?: HorarioIFood[] } | HorarioIFood[]>(
      `/merchant/v1.0/merchants/${merchantId}/opening-hours`,
      'opening hours',
    )
    if (Array.isArray(r)) return r
    return r?.shifts ?? []
  }

  /* ------------------------------ Financial ----------------------------- */

  /** Vendas do período (todas as páginas). Datas 'YYYY-MM-DD'. */
  async vendas(merchantId: string, inicio: string, fim: string): Promise<VendaIFood[]> {
    return this.paginado<VendaIFood>(
      (p) =>
        `/financial/v3.0/merchants/${merchantId}/sales` +
        `?beginSalesDate=${inicio}&endSalesDate=${fim}&page=${p}`,
      'sales',
      (payload) => (Array.isArray(payload.sales) ? (payload.sales as VendaIFood[]) : []),
    )
  }

  /**
   * Razão de lançamentos financeiros do período de apuração.
   * ATENÇÃO: o intervalo precisa CONTER um período de apuração inteiro — pedir
   * um recorte no meio de uma semana de apuração devolve erro no iFood.
   */
  async lancamentosFinanceiros(
    merchantId: string,
    inicio: string,
    fim: string,
  ): Promise<LancamentoFinanceiroIFood[]> {
    return this.paginado<LancamentoFinanceiroIFood>(
      (p) =>
        `/financial/v3.0/merchants/${merchantId}/financial-events` +
        `?beginDate=${inicio}&endDate=${fim}&page=${p}&size=100`,
      'financial events',
      (payload) =>
        Array.isArray(payload.financialEvents)
          ? (payload.financialEvents as LancamentoFinanceiroIFood[])
          : [],
    )
  }

  /** Liquidações (repasses) do período de apuração. */
  async repasses(merchantId: string, inicio: string, fim: string): Promise<RepasseIFood> {
    return this.json<RepasseIFood>(
      `/financial/v3.0/merchants/${merchantId}/settlements?beginDate=${inicio}&endDate=${fim}`,
      'settlements',
    )
  }

  /** Antecipações de recebíveis do período de apuração. */
  async antecipacoes(merchantId: string, inicio: string, fim: string): Promise<AntecipacaoIFood> {
    return this.json<AntecipacaoIFood>(
      `/financial/v3.0/merchants/${merchantId}/anticipations` +
        `?beginCalculationDate=${inicio}&endCalculationDate=${fim}`,
      'anticipations',
    )
  }

  /** Arquivo de conciliação por competência ('YYYY-MM'), em CSV. */
  async conciliacao(merchantId: string, competencia: string): Promise<string> {
    return this.texto(
      `/financial/v3.0/merchants/${merchantId}/reconciliation?competence=${competencia}`,
      'reconciliation',
    )
  }

  /** Solicita a geração do arquivo sob demanda. Devolve o requestId. */
  async pedirConciliacao(merchantId: string, competencia: string): Promise<string> {
    const r = await this.json<{ requestId?: string; id?: string }>(
      `/financial/v3.0/merchants/${merchantId}/reconciliation/on-demand`,
      'reconciliation on-demand (solicitação)',
      { metodo: 'POST', corpo: { competencia } },
    )
    const id = r?.requestId ?? r?.id
    if (!id) throw new Error('iFood não devolveu o requestId da conciliação sob demanda')
    return id
  }

  /** Busca o arquivo sob demanda já gerado. */
  async buscarConciliacao(merchantId: string, requestId: string): Promise<string> {
    return this.texto(
      `/financial/v3.0/merchants/${merchantId}/reconciliation/on-demand/${requestId}`,
      'reconciliation on-demand (arquivo)',
    )
  }

  /* -------------------------------- Order ------------------------------- */

  /** Polling de eventos. 204 = sem novidades. */
  async pollingEventos(): Promise<EventoPedidoIFood[]> {
    const r = await this.json<EventoPedidoIFood[]>('/events/v1.0/events:polling', 'events:polling', {
      toleraVazio: true,
    })
    return Array.isArray(r) ? r : []
  }

  /** Confirma o recebimento dos eventos (ACK) — obrigatório após persistir. */
  async ackEventos(ids: string[]): Promise<void> {
    if (!ids.length) return
    await this.requisicao('/events/v1.0/events/acknowledgment', 'ack', {
      metodo: 'POST',
      corpo: ids.map((id) => ({ id })),
      toleraVazio: true,
    })
  }

  /** Detalhe de um pedido — usado para saber os itens vendidos. */
  async pedido(orderId: string): Promise<PedidoIFood> {
    return this.json<PedidoIFood>(`/order/v1.0/orders/${orderId}`, 'order details')
  }

  /* ------------------------------- Catalog ------------------------------ */

  /** Todos os catálogos da loja (não só o primeiro). */
  async catalogos(merchantId: string): Promise<CatalogoIFood[]> {
    const r = await this.json<CatalogoIFood[]>(
      `/catalog/v2.0/merchants/${merchantId}/catalogs`,
      'catalogs',
    )
    return Array.isArray(r) ? r : []
  }

  /** Categorias de um catálogo. */
  async categorias(merchantId: string, catalogId: string): Promise<CategoriaIFood[]> {
    const r = await this.json<CategoriaIFood[]>(
      `/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`,
      'categories',
    )
    return Array.isArray(r) ? r : []
  }

  /** Itens vendáveis (cardápio) com preço e complementos. Payload bruto → mapper. */
  async itensVendaveisBrutos(merchantId: string, catalogId: string): Promise<unknown> {
    return this.json<unknown>(
      `/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/sellableItems`,
      'sellableItems',
    )
  }
}

export type {
  MerchantIFood,
  MerchantDetalheIFood,
  StatusLojaIFood,
  InterrupcaoIFood,
  HorarioIFood,
  VendaIFood,
  LancamentoFinanceiroIFood,
  RepasseIFood,
  AntecipacaoIFood,
  PedidoIFood,
  CatalogoIFood,
  CategoriaIFood,
}
