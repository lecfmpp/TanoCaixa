/* ------------------------------------------------------------------ *
 * Mapeamento iFood → modelo do Tá no Caixa (Firestore).
 *
 * Os nomes de campo seguem a documentação oficial da API Sales e da API
 * Financial Events. Concentramos o parsing aqui para isolar o resto do
 * código de mudanças de schema.
 * ------------------------------------------------------------------ */
import type {
  VendaIFood,
  LancamentoFinanceiroIFood,
  ItemCatalogoIFood,
  ComplementoIFood,
  LinhaConciliacaoIFood,
} from './types'

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}
const str = (...vs: unknown[]): string => {
  for (const v of vs) if (typeof v === 'string' && v) return v
  return ''
}
const cent = (n: number) => Math.round(n * 100) / 100

/* --------------------------------- Vendas ------------------------------- */

/** Valor bruto da venda = itens (bag) + entrega + taxa de serviço. */
export function valorBrutoVenda(v: VendaIFood): number {
  const g = v.saleGrossValue ?? { bag: 0, deliveryFee: 0, serviceFee: 0 }
  return cent(num(g.bag) + num(g.deliveryFee) + num(g.serviceFee))
}

/** Soma de todos os benefícios (descontos) aplicados ao pedido. */
export function totalBeneficios(v: VendaIFood): number {
  const lista = v.benefits?.benefits ?? []
  return cent(lista.reduce((soma, b) => soma + num(b.totalValue), 0))
}

/** Valor efetivamente pago pelo consumidor (soma dos meios de pagamento). */
export function valorPagoPeloCliente(v: VendaIFood): number {
  const lista = v.payments?.payments ?? []
  if (lista.length) return cent(lista.reduce((soma, p) => soma + num(p.value), 0))
  // Sem detalhe de pagamento: bruto menos os benefícios concedidos.
  return cent(valorBrutoVenda(v) - totalBeneficios(v))
}

/** Taxa de serviço que o iFood cobrou do CLIENTE (não da loja). */
export function taxaServicoCliente(v: VendaIFood): number {
  return cent(num(v.saleGrossValue?.serviceFee))
}

/**
 * Líquido que a loja recebe pelo pedido. O campo `billingSumary.saleBalance`
 * já considera cancelamentos, reembolsos e ajustes.
 */
export function liquidoDaLoja(v: VendaIFood): number {
  return cent(num(v.billingSumary?.saleBalance))
}

/** Comissão/taxas retidas pelo iFood sobre a venda. */
export function taxasDaLoja(v: VendaIFood): number {
  return cent(valorPagoPeloCliente(v) - liquidoDaLoja(v))
}

/* ------------------------- Lançamentos financeiros ---------------------- */

/**
 * Repasse do período = soma apenas dos lançamentos COM impacto no repasse.
 * Lançamentos sem impacto (VR/VA, dinheiro, maquininha da loja, promoção da
 * própria loja) existem só para transparência e não entram na conta.
 */
export function repasseLiquido(lancs: LancamentoFinanceiroIFood[]): number {
  return cent(
    lancs.filter((l) => l.hasTransferImpact).reduce((s, l) => s + num(l.amount?.value), 0),
  )
}

/** Soma de TODOS os lançamentos, com e sem impacto no repasse. */
export function totalLancamentos(lancs: LancamentoFinanceiroIFood[]): number {
  return cent(lancs.reduce((s, l) => s + num(l.amount?.value), 0))
}

/**
 * Entradas financeiras cuja transação foi acolhida pela LOJA — pagamento em
 * VR/VA, dinheiro ou maquininha própria. `payment.liability = EXTERNAL`.
 */
export function entradasComLojaResponsavel(lancs: LancamentoFinanceiroIFood[]): number {
  return cent(
    lancs
      .filter((l) => ehEntradaFinanceira(l) && l.payment?.liability === 'EXTERNAL')
      .reduce((s, l) => s + num(l.amount?.value), 0),
  )
}

/** Um lançamento de entrada financeira (o pagamento do pedido em si). */
export function ehEntradaFinanceira(l: LancamentoFinanceiroIFood): boolean {
  const n = (l.name ?? '').toUpperCase()
  return n.includes('PAYMENT') || n.includes('ENTRADA')
}

/** Lançamentos gerados por ocorrências (reclamações/ressarcimentos). */
export function cobrancasPorOcorrencia(lancs: LancamentoFinanceiroIFood[]): number {
  return cent(
    lancs
      .filter((l) => {
        const alvo = `${l.name ?? ''} ${l.description ?? ''} ${l.trigger ?? ''}`.toUpperCase()
        return alvo.includes('OCCURRENCE') || alvo.includes('OCORRENCIA') || alvo.includes('OCORRÊNCIA')
      })
      .reduce((s, l) => s + num(l.amount?.value), 0),
  )
}

/* --------------------------- Arquivo de conciliação --------------------- */

/** Converte o CSV do iFood (separado por ';') em registros por coluna. */
export function lerConciliacao(csv: string): LinhaConciliacaoIFood[] {
  const linhas = csv.split(/\r?\n/).filter((l) => l.trim())
  if (linhas.length < 2) return []
  const sep = (linhas[0].match(/;/g) ?? []).length >= (linhas[0].match(/,/g) ?? []).length ? ';' : ','
  const colunas = linhas[0].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))
  return linhas.slice(1).map((linha) => {
    const celulas = linha.split(sep)
    const registro: LinhaConciliacaoIFood = {}
    colunas.forEach((coluna, i) => {
      registro[coluna] = (celulas[i] ?? '').trim().replace(/^"|"$/g, '')
    })
    return registro
  })
}

/** Lê um valor monetário do CSV, que usa vírgula como separador decimal. */
export function valorConciliacao(linha: LinhaConciliacaoIFood, coluna = 'valor'): number {
  const bruto = (linha[coluna] ?? '').replace(/\./g, '').replace(',', '.')
  return num(bruto)
}

/** 'SIM' → true. A coluna marca se o lançamento entra no cálculo do repasse. */
export function temImpactoNoRepasse(linha: LinhaConciliacaoIFood): boolean {
  return (linha['impacto_no_repasse'] ?? '').trim().toUpperCase() === 'SIM'
}

/* --------------------------- Agregação por dia -------------------------- */

export interface ResumoDiaIFood {
  data: string // YYYY-MM-DD
  bruto: number
  taxa: number
  liquido: number
  pedidos: number
}

export function agregarPorDia(vendas: VendaIFood[]): ResumoDiaIFood[] {
  const mapa = new Map<string, ResumoDiaIFood>()
  for (const v of vendas) {
    const dia = (v.createdAt || '').slice(0, 10)
    if (!dia) continue
    const r = mapa.get(dia) ?? { data: dia, bruto: 0, taxa: 0, liquido: 0, pedidos: 0 }
    r.bruto += valorPagoPeloCliente(v)
    r.taxa += taxasDaLoja(v)
    r.liquido += liquidoDaLoja(v)
    r.pedidos += 1
    mapa.set(dia, r)
  }
  return [...mapa.values()]
    .map((r) => ({ ...r, bruto: cent(r.bruto), taxa: cent(r.taxa), liquido: cent(r.liquido) }))
    .sort((a, b) => (a.data < b.data ? -1 : 1))
}

/* ------------------------------- Catálogo -------------------------------- */

function comoLista(bruto: unknown): Record<string, unknown>[] {
  if (Array.isArray(bruto)) return bruto as Record<string, unknown>[]
  const o = (bruto ?? {}) as Record<string, unknown>
  for (const chave of ['sellableItems', 'items', 'data', 'content']) {
    if (Array.isArray(o[chave])) return o[chave] as Record<string, unknown>[]
  }
  return []
}

function normalizarComplementos(bruto: unknown): ComplementoIFood[] {
  const grupos = Array.isArray(bruto) ? (bruto as Record<string, unknown>[]) : []
  return grupos.map((g) => {
    const opcoes = Array.isArray(g.options ?? g.optionGroups)
      ? ((g.options ?? g.optionGroups) as Record<string, unknown>[])
      : []
    return {
      id: str(g.id, g.optionGroupId),
      name: str(g.name),
      min: num(g.min),
      max: num(g.max),
      status: str(g.status),
      opcoes: opcoes.map((o) => {
        const preco = (o.price ?? {}) as Record<string, unknown>
        return {
          id: str(o.id, o.optionId),
          name: str(o.name),
          price: num(preco.value ?? o.price),
          status: str(o.status),
        }
      }),
    }
  })
}

/** Normaliza itens do catálogo (sellableItems) com preço e complementos. */
export function normalizarItens(bruto: unknown): ItemCatalogoIFood[] {
  return comoLista(bruto).map((i) => {
    const preco = (i.price ?? {}) as Record<string, unknown>
    return {
      id: str(i.id, i.itemId, i.productId),
      name: str(i.name, i.description),
      description: str(i.description),
      price: { value: num(preco.value ?? i.price), originalValue: num(preco.originalValue) },
      category: str(i.category, i.categoryName),
      categoryId: str(i.categoryId),
      status: str(i.status),
      complementos: normalizarComplementos(i.optionGroups ?? i.complements ?? i.modifiers),
    }
  })
}

/* ----------------------- Documentos do Firestore ----------------------- */

function autoria() {
  return {
    criadoEm: new Date().toISOString(),
    criadoPorId: 'ifood',
    criadoPorNome: 'Automático',
    origem: 'integracao' as const,
  }
}

/** Um dia do iFood → doc de receita_dia (canal ifood). */
export function receitaDiaDoIFood(resumo: ResumoDiaIFood) {
  return {
    id: `ifood-${resumo.data}`,
    data: resumo.data,
    canais: [
      { canal: 'ifood', valorBruto: resumo.bruto, taxa: resumo.taxa, pedidos: resumo.pedidos },
    ],
    recebimentos: [],
    sangria: 0,
    totalDia: resumo.bruto,
    ...autoria(),
  }
}

/** A comissão/taxa do iFood do dia → despesa em comissao_marketplace. */
export function despesaTaxaDoIFood(resumo: ResumoDiaIFood) {
  return {
    id: `ifood-taxa-${resumo.data}`,
    fornecedor: 'Taxa iFood',
    descricao: `${resumo.pedidos} pedidos`,
    categoria: 'comissao_marketplace' as const,
    valorTotal: cent(resumo.taxa),
    dataCompetencia: resumo.data,
    formaPagamento: 'automatico' as const,
    status: 'pago' as const,
    recorrente: false,
    ...autoria(),
  }
}

/** Item de cardápio do iFood → produto "de venda" (preço no menu). */
export function produtoMenuDoIFood(item: ItemCatalogoIFood) {
  return {
    id: `ifood-item-${item.id}`,
    nome: item.name,
    categoria: item.category || 'Cardápio',
    precoVenda: item.price.value,
    complementos: item.complementos,
    canal: 'ifood',
    ...autoria(),
  }
}
