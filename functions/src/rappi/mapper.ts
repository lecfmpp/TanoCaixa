/* ------------------------------------------------------------------ *
 * Mapeamento Rappi → modelo do Tá no Caixa (Firestore). Parsing defensivo.
 * ------------------------------------------------------------------ */
import type { PedidoRappi, PagamentoRappi, ItemMenuRappi } from './types'

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
function comoLista(bruto: unknown): Record<string, unknown>[] {
  if (Array.isArray(bruto)) return bruto as Record<string, unknown>[]
  const o = (bruto ?? {}) as Record<string, unknown>
  for (const chave of ['payments', 'orders', 'data', 'items', 'menu', 'products', 'content']) {
    if (Array.isArray(o[chave])) return o[chave] as Record<string, unknown>[]
  }
  return []
}

export function normalizarPagamentos(bruto: unknown): PagamentoRappi[] {
  return comoLista(bruto).map((p) => {
    const gross = num(p.grossValue, p.gross, p.amount, p.total, p.value)
    const comissao = num(p.commission, p.fee, p.fees)
    const net = num(p.netValue, p.net, p.payout)
    return {
      id: str(p.id, p.paymentId, p.orderId),
      date: str(p.date, p.createdAt, p.paymentDate),
      grossValue: gross,
      commission: comissao || Math.max(0, gross - net),
      netValue: net || gross - comissao,
    }
  })
}

export function normalizarPedidos(bruto: unknown): PedidoRappi[] {
  return comoLista(bruto).map((o) => ({
    orderId: str(o.id, o.orderId, o.order_id),
    createdAt: str(o.createdAt, o.created_at, o.date),
    totalValue: num(o.totalValue, o.total_value, o.total, o.value),
    commission: num(o.commission, o.commissions, o.fee),
    taxes: num(o.taxes, o.tax),
    discounts: num(o.discounts, o.discount, o.sales_discount),
  }))
}

export function normalizarMenu(bruto: unknown): ItemMenuRappi[] {
  return comoLista(bruto).map((i) => ({
    id: str(i.id, i.productId, i.sku),
    name: str(i.name, i.title, i.description),
    price: num((i.price as Record<string, unknown>)?.value, i.price, i.value),
    category: str(i.category, i.categoryName),
  }))
}

/* --------------------------- Agregação por dia -------------------------- */

export interface ResumoDiaRappi {
  data: string
  bruto: number
  taxa: number
  liquido: number
  pedidos: number
}

/** Agrega pagamentos por dia (fonte financeira preferencial). */
export function agregarPagamentos(pgs: PagamentoRappi[]): ResumoDiaRappi[] {
  const mapa = new Map<string, ResumoDiaRappi>()
  for (const p of pgs) {
    const dia = (p.date || '').slice(0, 10)
    if (!dia) continue
    const r = mapa.get(dia) ?? { data: dia, bruto: 0, taxa: 0, liquido: 0, pedidos: 0 }
    r.bruto += p.grossValue
    r.taxa += p.commission
    r.liquido += p.netValue
    r.pedidos += 1
    mapa.set(dia, r)
  }
  return [...mapa.values()].sort((a, b) => (a.data < b.data ? -1 : 1))
}

/* ----------------------- Documentos do Firestore ----------------------- */

function autoria() {
  return {
    criadoEm: new Date().toISOString(),
    criadoPorId: 'rappi',
    criadoPorNome: 'Automático',
    origem: 'integracao' as const,
  }
}

export function receitaDiaDoRappi(r: ResumoDiaRappi) {
  return {
    id: `rappi-${r.data}`,
    data: r.data,
    canais: [{ canal: 'rappi', valorBruto: r.bruto, taxa: r.taxa, pedidos: r.pedidos }],
    recebimentos: [],
    sangria: 0,
    totalDia: r.bruto,
    ...autoria(),
  }
}

export function despesaTaxaDoRappi(r: ResumoDiaRappi) {
  return {
    id: `rappi-taxa-${r.data}`,
    fornecedor: 'Taxa Rappi',
    descricao: `${r.pedidos} pedidos`,
    categoria: 'taxas_app' as const,
    valorTotal: Math.round(r.taxa * 100) / 100,
    dataCompetencia: r.data,
    formaPagamento: 'automatico' as const,
    status: 'pago' as const,
    recorrente: false,
    ...autoria(),
  }
}

export function produtoMenuDoRappi(item: ItemMenuRappi) {
  return {
    id: `rappi-item-${item.id}`,
    nome: item.name,
    categoria: item.category || 'Cardápio',
    precoVenda: item.price,
    canal: 'rappi',
    ...autoria(),
  }
}
