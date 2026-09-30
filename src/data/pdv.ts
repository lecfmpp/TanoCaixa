/* ------------------------------------------------------------------ *
 * Regras do PDV: totais do pedido, resumo do caixa e o que a venda vira
 * nos outros módulos (estoque, receita do dia, CMV).
 * ------------------------------------------------------------------ */
import type {
  CaixaPdvDoc,
  FormaPagamentoPdv,
  ItemPedido,
  PedidoPdvDoc,
  StatusPedido,
  TipoPedido,
} from './types'

export const FORMAS: { id: FormaPagamentoPdv; rotulo: string }[] = [
  { id: 'dinheiro', rotulo: 'Dinheiro' },
  { id: 'pix', rotulo: 'Pix' },
  { id: 'debito', rotulo: 'Débito' },
  { id: 'credito', rotulo: 'Crédito' },
  { id: 'voucher', rotulo: 'Voucher' },
]
export const ROTULO_FORMA: Record<FormaPagamentoPdv, string> = Object.fromEntries(FORMAS.map((f) => [f.id, f.rotulo])) as never

export const TIPOS: { id: TipoPedido; rotulo: string }[] = [
  { id: 'balcao', rotulo: 'Balcão' },
  { id: 'retirada', rotulo: 'Retirada' },
  { id: 'entrega', rotulo: 'Entrega' },
]
export const ROTULO_TIPO: Record<TipoPedido, string> = Object.fromEntries(TIPOS.map((t) => [t.id, t.rotulo])) as never

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  em_entrega: 'Em entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

/** Tipo de pedido → canal de receita do DRE (loja própria × delivery próprio). */
export function canalDaReceita(tipo: TipoPedido): 'balcao' | 'whatsapp' {
  return tipo === 'entrega' ? 'whatsapp' : 'balcao'
}

export const arred = (n: number) => Math.round(n * 100) / 100

export function totaisDoPedido(itens: ItemPedido[], desconto: number, taxaEntrega: number) {
  const subtotal = arred(itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0))
  const descontoOk = Math.min(Math.max(desconto, 0), subtotal)
  return { subtotal, desconto: descontoOk, total: arred(subtotal - descontoOk + Math.max(taxaEntrega, 0)) }
}

/** Próximo status no fluxo da cozinha/entrega, ou null se o pedido já terminou. */
export function proximoStatus(p: Pick<PedidoPdvDoc, 'status' | 'tipo'>): StatusPedido | null {
  if (p.status === 'em_preparo') return 'pronto'
  if (p.status === 'pronto') return p.tipo === 'entrega' ? 'em_entrega' : 'concluido'
  if (p.status === 'em_entrega') return 'concluido'
  return null
}

export const ROTULO_ACAO: Record<StatusPedido, string> = {
  em_preparo: '',
  pronto: 'Marcar pronto',
  em_entrega: 'Saiu p/ entrega',
  concluido: 'Concluir',
  cancelado: '',
}

/** Pedido que conta como venda: tudo menos o cancelado. */
export const ehVenda = (p: PedidoPdvDoc) => p.status !== 'cancelado'

export interface ResumoCaixa {
  faturamento: number
  pedidos: number
  ticketMedio: number
  porForma: Record<FormaPagamentoPdv, number>
  presencial: number
  delivery: number
  cancelados: number
  custo: number
  cmv: number | null
  desperdicioPrevisto: number
  reforcos: number
  sangrias: number
  /** Dinheiro que deveria estar na gaveta: fundo + vendas em dinheiro (já sem troco) + reforços − sangrias. */
  esperadoDinheiro: number
}

export function resumoDoCaixa(caixa: CaixaPdvDoc | undefined, pedidos: PedidoPdvDoc[], custoDoInsumo: (produtoId: string) => number = () => 0): ResumoCaixa {
  const vendas = pedidos.filter(ehVenda)
  const porForma: Record<FormaPagamentoPdv, number> = { dinheiro: 0, pix: 0, debito: 0, credito: 0, voucher: 0 }
  for (const p of vendas) {
    // O troco sai do dinheiro que entrou: só o valor líquido ficou no caixa.
    let troco = p.troco
    for (const pg of p.pagamentos) {
      const liquido = pg.forma === 'dinheiro' ? Math.max(0, pg.valor - troco) : pg.valor
      if (pg.forma === 'dinheiro') troco = Math.max(0, troco - pg.valor)
      porForma[pg.forma] += liquido
    }
  }
  const faturamento = arred(vendas.reduce((s, p) => s + p.total, 0))
  const custo = arred(vendas.reduce((s, p) => s + p.custo, 0))
  const reforcos = arred((caixa?.movimentos ?? []).filter((m) => m.tipo === 'reforco').reduce((s, m) => s + m.valor, 0))
  const sangrias = arred((caixa?.movimentos ?? []).filter((m) => m.tipo === 'sangria').reduce((s, m) => s + m.valor, 0))
  const desperdicioPrevisto = arred(
    vendas.reduce((s, p) => s + p.consumo.reduce((a, c) => a + c.perda * custoDoInsumo(c.produtoId), 0), 0),
  )
  return {
    faturamento,
    pedidos: vendas.length,
    ticketMedio: vendas.length ? arred(faturamento / vendas.length) : 0,
    porForma,
    presencial: arred(vendas.filter((p) => p.tipo !== 'entrega').reduce((s, p) => s + p.total, 0)),
    delivery: arred(vendas.filter((p) => p.tipo === 'entrega').reduce((s, p) => s + p.total, 0)),
    cancelados: pedidos.length - vendas.length,
    custo,
    cmv: faturamento > 0 && custo > 0 ? (custo / faturamento) * 100 : null,
    desperdicioPrevisto,
    reforcos,
    sangrias,
    esperadoDinheiro: arred((caixa?.fundo ?? 0) + porForma.dinheiro + reforcos - sangrias),
  }
}

/** Minutos desde um instante ISO. */
export function minutosDesde(iso: string, agora: number = Date.now()): number {
  return Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 60000))
}

/** '00:12' de espera → texto curto. */
export function esperaTexto(min: number): string {
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

/** Cor pela espera: até 15 min verde, até 25 amarelo, depois vermelho. */
export function corDaEspera(min: number): string {
  if (min <= 15) return 'text-mata'
  if (min <= 25) return 'text-insight-rotulo'
  return 'text-telha-alerta'
}

