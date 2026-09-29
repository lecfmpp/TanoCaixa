/* ------------------------------------------------------------------ *
 * Cardápio e ficha técnica.
 *
 * O cardápio é o elo entre venda e estoque: cada prato diz quais matérias-
 * primas consome e em que quantidade. Daqui saem três números que o resto do
 * app usa — o custo do prato, o CMV teórico (custo ÷ preço) e o consumo de
 * insumos por venda, que é o que vai baixar o estoque quando o PDV vender.
 * ------------------------------------------------------------------ */
import type { IngredienteFicha, PratoDoc, ProdutoDoc } from './types'

/** Categorias sugeridas na hora de cadastrar. As que já existem no cardápio aparecem também. */
export const CATEGORIAS_SUGERIDAS = ['Principais', 'Porções', 'Bebidas', 'Sobremesas', 'Combos', 'Outros']

/** Unidade em que a ficha é escrita para cada unidade de compra do produto. */
export function unidadeDaFicha(unidadeProduto: string): { unidade: string; fator: number } {
  const u = unidadeProduto.toLowerCase()
  if (u === 'kg') return { unidade: 'g', fator: 1000 }
  if (u === 'l') return { unidade: 'ml', fator: 1000 }
  return { unidade: unidadeProduto, fator: 1 }
}

/** Quanto do produto (na unidade de COMPRA) a linha da ficha consome, com a perda. */
export function consumoDaLinha(ing: IngredienteFicha, produto: ProdutoDoc): { total: number; perda: number } {
  const { fator } = unidadeDaFicha(produto.unidade)
  const liquido = ing.quantidade / fator
  const total = liquido * (1 + (ing.perdaPct ?? 0) / 100)
  return { total, perda: total - liquido }
}

export function custoDaLinha(ing: IngredienteFicha, produto: ProdutoDoc | undefined): number {
  if (!produto) return 0
  return consumoDaLinha(ing, produto).total * produto.custoAtual
}

export interface CustoDoPrato {
  custo: number
  /** Sem nenhum ingrediente (ou componente) o custo é zero e o CMV não significa nada. */
  semFicha: boolean
  /** Linhas que apontam para produto que não existe mais no cadastro. */
  orfaos: number
}

export function custoDoPrato(prato: PratoDoc, produtos: ProdutoDoc[], pratos: PratoDoc[]): CustoDoPrato {
  const porId = new Map(produtos.map((p) => [p.id, p]))
  if (prato.tipo === 'combo') {
    const porPrato = new Map(pratos.map((p) => [p.id, p]))
    const comps = prato.componentes ?? []
    let custo = 0
    let orfaos = 0
    for (const c of comps) {
      const base = porPrato.get(c.pratoId)
      if (!base) {
        orfaos++
        continue
      }
      // Um nível só: combo dentro de combo não existe, então não há ciclo.
      custo += custoDoPrato({ ...base, tipo: 'prato' }, produtos, []).custo * c.quantidade
    }
    return { custo, semFicha: comps.length === 0, orfaos }
  }
  let custo = 0
  let orfaos = 0
  for (const ing of prato.ficha) {
    const p = porId.get(ing.produtoId)
    if (!p) orfaos++
    custo += custoDaLinha(ing, p)
  }
  return { custo, semFicha: prato.ficha.length === 0, orfaos }
}

/** CMV teórico do prato em % do preço. Sem preço ou sem ficha, não há o que dizer. */
export function cmvDoPrato(custo: number, preco: number): number | null {
  return preco > 0 && custo > 0 ? (custo / preco) * 100 : null
}

/** Preço que fecha o CMV na meta (ex.: 30%). */
export function precoParaMeta(custo: number, metaCmvPct: number): number {
  return metaCmvPct > 0 ? custo / (metaCmvPct / 100) : 0
}

export type SituacaoCmv = 'sem_ficha' | 'ok' | 'atencao' | 'alto'

/** Verde até a meta, amarelo até 5 pontos acima, vermelho depois. */
export function situacaoDoCmv(cmv: number | null, metaPct: number): SituacaoCmv {
  if (cmv === null) return 'sem_ficha'
  if (cmv <= metaPct) return 'ok'
  return cmv <= metaPct + 5 ? 'atencao' : 'alto'
}

export interface ConsumoDeInsumo {
  produtoId: string
  /** Na unidade de COMPRA do produto (kg, L, un…) — a mesma do estoque. */
  quantidade: number
  /** Parte da quantidade que é perda prevista no preparo. */
  perda: number
}

/**
 * O que vender `qtd` unidades deste prato tira do estoque. É o gancho da venda:
 * o PDV soma isto por item vendido para baixar estoque, calcular o CMV real e
 * separar o desperdício previsto do que foi realmente perdido.
 */
export function consumoDeInsumos(
  prato: PratoDoc,
  qtd: number,
  produtos: ProdutoDoc[],
  pratos: PratoDoc[],
): ConsumoDeInsumo[] {
  const porId = new Map(produtos.map((p) => [p.id, p]))
  const acumulado = new Map<string, ConsumoDeInsumo>()
  const somar = (p: PratoDoc, vezes: number) => {
    for (const ing of p.ficha) {
      const produto = porId.get(ing.produtoId)
      if (!produto) continue
      const { total, perda } = consumoDaLinha(ing, produto)
      const atual = acumulado.get(produto.id) ?? { produtoId: produto.id, quantidade: 0, perda: 0 }
      atual.quantidade += total * vezes
      atual.perda += perda * vezes
      acumulado.set(produto.id, atual)
    }
  }
  if (prato.tipo === 'combo') {
    const porPrato = new Map(pratos.map((p) => [p.id, p]))
    for (const c of prato.componentes ?? []) {
      const base = porPrato.get(c.pratoId)
      if (base && base.tipo === 'prato') somar(base, c.quantidade * qtd)
    }
  } else {
    somar(prato, qtd)
  }
  return [...acumulado.values()]
}

/** Pratos (e combos) que usam um produto — pra avisar antes de excluí-lo do cadastro. */
export function pratosQueUsam(produtoId: string, pratos: PratoDoc[]): PratoDoc[] {
  return pratos.filter((p) => p.ficha.some((i) => i.produtoId === produtoId))
}
