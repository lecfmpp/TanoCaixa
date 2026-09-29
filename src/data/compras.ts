/* ------------------------------------------------------------------ *
 * Compras de mercadoria.
 *
 * Uma nota fiscal de fornecedor tem dois papéis: é mercadoria entrando no
 * estoque e é dinheiro saindo do caixa. Aqui ela continua sendo lançamento
 * financeiro (o DRE e o contas a pagar dependem disso), mas marcada como
 * `tipoLancamento: 'compra'` — assim a tela não mistura a conta de luz com a
 * compra de carne.
 * ------------------------------------------------------------------ */
import { CONTA } from './planoContas'
import type { DespesaDoc, ItemNota } from './types'

/**
 * A compra de mercadoria é o lançamento que entrou pela nota fiscal. O que
 * foi lançado antes desta separação existir não tem o campo — nesse caso vale
 * a conta do DRE: tudo que cai no CMV é compra.
 */
export function ehCompra(d: DespesaDoc): boolean {
  if (d.tipoLancamento) return d.tipoLancamento === 'compra'
  return CONTA[d.categoria]?.grupo === 'cmv'
}

/** O contrário de `ehCompra`: aluguel, luz, folha, marketing… */
export function ehContaDaCasa(d: DespesaDoc): boolean {
  return !ehCompra(d)
}

export interface Nota {
  /** Id da nota, ou o id do próprio lançamento quando ele veio avulso. */
  id: string
  fornecedor: string
  data: string
  valorTotal: number
  status: DespesaDoc['status']
  formaPagamento: DespesaDoc['formaPagamento']
  itens: ItemNota[]
  quem: string
  criadoEm: string
  /** Vencimento do boleto/nota — o mais próximo, quando há mais de um lançamento. */
  vencimento?: string
  observacao?: string
  /** Quando e por quem a nota foi marcada como paga. */
  pagoEm?: string
  pagoPorNome?: string
  /** A nota nasceu com id de nota (dá pra refazer item a item) ou é lançamento antigo, avulso. */
  temNotaId: boolean
  /** Lançamentos que formam a nota (uma conta de CMV cada). */
  lancamentos: DespesaDoc[]
}

/**
 * Junta os lançamentos de volta em notas. Uma nota vira mais de um lançamento
 * quando tem item de conta diferente (alimento e bebida, por exemplo) — o DRE
 * precisa disso separado, o gestor quer ver a nota inteira.
 */
export function agruparEmNotas(despesas: DespesaDoc[]): Nota[] {
  const porNota = new Map<string, DespesaDoc[]>()
  for (const d of despesas.filter(ehCompra)) {
    const chave = d.notaId ?? d.id
    porNota.set(chave, [...(porNota.get(chave) ?? []), d])
  }
  return [...porNota.entries()]
    .map(([id, lancamentos]) => {
      const base = lancamentos[0]
      return {
        id,
        fornecedor: base.fornecedor,
        data: base.dataCompetencia,
        valorTotal: lancamentos.reduce((s, l) => s + l.valorTotal, 0),
        status: lancamentos.some((l) => l.status !== 'pago') ? ('a_pagar' as const) : ('pago' as const),
        formaPagamento: base.formaPagamento,
        itens: lancamentos.flatMap((l) => l.itens ?? []),
        quem: base.criadoPorNome,
        criadoEm: base.criadoEm,
        vencimento: lancamentos
          .map((l) => l.dataVencimento)
          .filter((v): v is string => !!v)
          .sort()[0],
        observacao: base.observacao,
        pagoEm: lancamentos.every((l) => l.status === 'pago')
          ? lancamentos.map((l) => l.pagoEm).filter((v): v is string => !!v).sort().pop()
          : undefined,
        pagoPorNome: lancamentos.find((l) => l.pagoPorNome)?.pagoPorNome,
        temNotaId: !!base.notaId,
        lancamentos,
      }
    })
    .sort((a, b) => (a.data < b.data ? 1 : -1))
}

export interface PrecoDoItem {
  produtoId: string
  produto: string
  unidade?: string
  /** Preço unitário da compra mais recente. */
  atual: number
  /** Preço da compra anterior — null quando só existe uma compra. */
  anterior: number | null
  /** Variação % entre as duas últimas compras. */
  variacao: number | null
  ultimaCompra: string
  fornecedor: string
  /** Quantas vezes o item já foi comprado. */
  compras: number
}

/**
 * Histórico de preço por produto, da compra mais recente para a mais antiga.
 * É o que sustenta o alerta de "o tomate subiu 14%".
 */
export function precosPorItem(despesas: DespesaDoc[]): PrecoDoItem[] {
  const notas = agruparEmNotas(despesas)
  const porProduto = new Map<string, { nota: Nota; item: ItemNota }[]>()
  for (const nota of notas) {
    for (const item of nota.itens) {
      const chave = item.produtoId || item.produto.toLowerCase().trim()
      porProduto.set(chave, [...(porProduto.get(chave) ?? []), { nota, item }])
    }
  }
  return [...porProduto.entries()]
    .map(([chave, compras]) => {
      // agruparEmNotas já devolve da mais nova pra mais velha.
      const [ultima, penultima] = compras
      const atual = ultima.item.precoUnitario
      const anterior = penultima?.item.precoUnitario ?? null
      return {
        produtoId: ultima.item.produtoId || chave,
        produto: ultima.item.produto,
        unidade: ultima.item.unidade,
        atual,
        anterior,
        variacao: anterior && anterior > 0 ? ((atual - anterior) / anterior) * 100 : null,
        ultimaCompra: ultima.nota.data,
        fornecedor: ultima.nota.fornecedor,
        compras: compras.length,
      }
    })
    .sort((a, b) => (a.produto < b.produto ? -1 : 1))
}

export interface ResumoFornecedor {
  fornecedor: string
  notas: number
  total: number
  itens: number
  /** Média das variações de preço dos itens dele — quem está subindo preço. */
  variacaoMedia: number | null
  ultimaCompra: string
}

/** Quanto cada fornecedor levou no período e como o preço dele se comportou. */
export function resumoPorFornecedor(despesas: DespesaDoc[]): ResumoFornecedor[] {
  const notas = agruparEmNotas(despesas)
  const precos = new Map(precosPorItem(despesas).map((p) => [p.produtoId, p]))
  const porFornecedor = new Map<string, Nota[]>()
  for (const n of notas) {
    const chave = n.fornecedor.trim() || 'Sem fornecedor'
    porFornecedor.set(chave, [...(porFornecedor.get(chave) ?? []), n])
  }
  return [...porFornecedor.entries()]
    .map(([fornecedor, doFornecedor]) => {
      const itens = doFornecedor.flatMap((n) => n.itens)
      const variacoes = itens
        .map((i) => precos.get(i.produtoId)?.variacao)
        .filter((v): v is number => typeof v === 'number')
      return {
        fornecedor,
        notas: doFornecedor.length,
        total: doFornecedor.reduce((s, n) => s + n.valorTotal, 0),
        itens: itens.length,
        variacaoMedia: variacoes.length ? variacoes.reduce((s, v) => s + v, 0) / variacoes.length : null,
        ultimaCompra: doFornecedor[0].data,
      }
    })
    .sort((a, b) => b.total - a.total)
}

/** Alta de preço que merece aviso na tela — só o que subiu de verdade. */
export const ALTA_RELEVANTE = 5

export function altasDePreco(despesas: DespesaDoc[]): PrecoDoItem[] {
  return precosPorItem(despesas)
    .filter((p) => (p.variacao ?? 0) >= ALTA_RELEVANTE)
    .sort((a, b) => (b.variacao ?? 0) - (a.variacao ?? 0))
}
