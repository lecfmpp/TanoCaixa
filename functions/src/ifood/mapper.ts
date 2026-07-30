/* ------------------------------------------------------------------ *
 * Mapeamento iFood → modelo do Tá no Caixa (Firestore).
 * Todo o parsing "defensivo" do payload bruto do iFood vive aqui, para
 * isolar o resto do código de mudanças de schema da API.
 * ------------------------------------------------------------------ */
import type { VendaIFood, ItemCatalogoIFood } from './types'

const num = (...vs: unknown[]): number => {
  for (const v of vs) {
    const n = typeof v === 'string' ? Number(v) : (v as number)
    if (typeof n === 'number' && !Number.isNaN(n)) return n
  }
  return 0
}
const str = (...vs: unknown[]): string => {
  for (const v of vs) if (typeof v === 'string' && v) return v
  return ''
}

/** Extrai o array de itens de um payload que pode vir como [] ou {…: []}. */
function comoLista(bruto: unknown): Record<string, unknown>[] {
  if (Array.isArray(bruto)) return bruto as Record<string, unknown>[]
  const o = (bruto ?? {}) as Record<string, unknown>
  for (const chave of ['sales', 'data', 'items', 'content', 'sellableItems']) {
    if (Array.isArray(o[chave])) return o[chave] as Record<string, unknown>[]
  }
  return []
}

/** Normaliza vendas da Financial › Sales (tolerante a variações de campo). */
export function normalizarVendas(bruto: unknown): VendaIFood[] {
  return comoLista(bruto).map((s) => {
    const ordem = (s.order ?? s) as Record<string, unknown>
    const bruto1 = num(s.grossValue, s.gross, s.amount, s.value, s.paidValue)
    const liquido = num(s.netValue, s.net, s.transferValue)
    // taxa = bruto − líquido quando não houver campo explícito de fees.
    const taxaExplicita = num(s.fees, s.fee, s.commission, s.totalFees)
    const taxa = taxaExplicita || Math.max(0, bruto1 - liquido)
    return {
      orderId: str(ordem.id, s.orderId, s.id),
      shortId: str(ordem.shortId, s.shortId),
      date: str(s.date, s.salesDate, s.createdAt, ordem.createdAt),
      paymentMethod: str(s.paymentMethod, s.method),
      grossValue: bruto1,
      fees: taxa,
      netValue: liquido || bruto1 - taxa,
      status: str(s.status, s.paymentStatus),
    }
  })
}

/** Normaliza itens do catálogo (sellableItems) com preço. */
export function normalizarItens(bruto: unknown): ItemCatalogoIFood[] {
  return comoLista(bruto).map((i) => {
    const preco = (i.price ?? {}) as Record<string, unknown>
    return {
      id: str(i.id, i.itemId, i.productId),
      name: str(i.name, i.description),
      price: { value: num(preco.value, i.price), originalValue: num(preco.originalValue) },
      category: str(i.category, i.categoryName),
      status: str(i.status),
    }
  })
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
    const dia = (v.date || '').slice(0, 10)
    if (!dia) continue
    const r = mapa.get(dia) ?? { data: dia, bruto: 0, taxa: 0, liquido: 0, pedidos: 0 }
    r.bruto += v.grossValue
    r.taxa += v.fees
    r.liquido += v.netValue
    r.pedidos += 1
    mapa.set(dia, r)
  }
  return [...mapa.values()].sort((a, b) => (a.data < b.data ? -1 : 1))
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
    canais: [{ canal: 'ifood', valorBruto: resumo.bruto, taxa: resumo.taxa, pedidos: resumo.pedidos }],
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
    valorTotal: Math.round(resumo.taxa * 100) / 100,
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
    canal: 'ifood',
    ...autoria(),
  }
}
