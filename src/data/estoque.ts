/* ------------------------------------------------------------------ *
 * Estoque: o que entrou, o que foi contado e o que saiu.
 *
 * Não existe saldo mantido na mão (+/−): o estoque real vem da contagem
 * manual, e o que SAIU é a diferença entre duas contagens somada ao que
 * entrou por nota nesse meio-tempo:
 *
 *   saiu = contagem anterior + entradas do período − contagem seguinte
 *
 * É esse número que a IA lê pra gerar os insights.
 * ------------------------------------------------------------------ */
import type { ContagemDoc, MovimentoDoc, ProdutoDoc } from './types'

export const TIPO_ENTRADA = 'Entrou mercadoria'
export const TIPO_PERDA = 'Perda ou quebra'
/** Saída que o PDV gera a cada pedido, pela ficha técnica dos pratos vendidos. */
export const TIPO_VENDA = 'Saída por venda'

/** Dia do movimento ('YYYY-MM-DD'): a nota manda a data dela. */
export function diaDoMovimento(m: MovimentoDoc): string {
  return (m.data ?? m.criadoEm ?? '').slice(0, 10)
}

/* --------------------------- Total adicionado -------------------------- */

export interface AdicionadoDoProduto {
  produtoId: string
  produto: string
  unidade: string
  categoria: string
  quantidade: number
  valor: number
  entradas: number
  ultimaEntrada: string
  fornecedor?: string
}

export interface TotalAdicionado {
  linhas: AdicionadoDoProduto[]
  /** Produtos diferentes que receberam entrada no período. */
  produtos: number
  entradas: number
  valor: number
  ultima?: { dia: string; produto: string }
}

/**
 * Tudo que foi adicionado ao estoque por nota fiscal. `mes` filtra pelo mês
 * ('YYYY-MM'); sem ele, vale o histórico inteiro.
 */
export function totalAdicionado(
  produtos: ProdutoDoc[],
  movimentos: MovimentoDoc[],
  mes?: string,
): TotalAdicionado {
  const porId = new Map(produtos.map((p) => [p.id, p]))
  const linhas = new Map<string, AdicionadoDoProduto>()
  let entradas = 0
  let valor = 0
  let ultima: TotalAdicionado['ultima']

  for (const m of movimentos) {
    if (m.tipo !== TIPO_ENTRADA) continue
    const dia = diaDoMovimento(m)
    if (mes && dia.slice(0, 7) !== mes) continue
    const prod = porId.get(m.produtoId)
    const atual = linhas.get(m.produtoId) ?? {
      produtoId: m.produtoId,
      produto: prod?.nome ?? m.produto,
      unidade: prod?.unidade ?? '',
      categoria: prod?.categoria ?? '—',
      quantidade: 0,
      valor: 0,
      entradas: 0,
      ultimaEntrada: '',
      fornecedor: undefined,
    }
    atual.quantidade += m.quantidade
    atual.valor += m.valor
    atual.entradas += 1
    if (dia >= atual.ultimaEntrada) {
      atual.ultimaEntrada = dia
      atual.fornecedor = m.fornecedor ?? atual.fornecedor
    }
    linhas.set(m.produtoId, atual)
    entradas += 1
    valor += m.valor
    if (!ultima || dia >= ultima.dia) ultima = { dia, produto: prod?.nome ?? m.produto }
  }

  return {
    linhas: [...linhas.values()].sort((a, b) => b.valor - a.valor),
    produtos: linhas.size,
    entradas,
    valor,
    ultima,
  }
}

/* -------------------------------- Contagem ------------------------------ */

/** Último dia do mês ('2026-07' → '2026-07-31'). */
function ultimoDiaDoMes(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return `${mes}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`
}

/** Dia da contagem. A antiga, mensal, vale o último dia do mês dela. */
export function diaDaContagem(c: ContagemDoc): string {
  return c.data ?? ultimoDiaDoMes(c.mesReferencia)
}

/** Última quantidade contada de cada produto (e quando), pra mostrar na tela de contagem. */
export function ultimaContagemPorProduto(contagens: ContagemDoc[]): Map<string, { quantidade: number; dia: string }> {
  const mapa = new Map<string, { quantidade: number; dia: string }>()
  const ordenadas = contagens
    .filter((c) => c.status === 'fechada')
    .sort((a, b) => (diaDaContagem(a) < diaDaContagem(b) ? -1 : 1))
  for (const c of ordenadas) {
    for (const i of c.itens) mapa.set(i.produtoId, { quantidade: i.quantidade, dia: diaDaContagem(c) })
  }
  return mapa
}

/* --------------------------------- Saídas ------------------------------- */

export interface PeriodoDeSaida {
  de: string
  ate: string
  dias: number
  contagemInicial: number
  entrou: number
  contagemFinal: number
  /** Perda ou quebra registrada no período — já está dentro de `saiu`. */
  perdaRegistrada: number
  /** O que o PDV diz que as vendas consumiram no período (ficha técnica × pedidos). */
  vendido: number
  /** contagemInicial + entrou − contagemFinal. Negativo = sobrou mais do que devia. */
  saiu: number
}

export interface SaidaDoProduto {
  produtoId: string
  produto: string
  unidade: string
  custoUnitario: number
  periodos: PeriodoDeSaida[]
  saiu: number
  valorSaiu: number
  /** Total que as vendas do PDV explicam nesses períodos. */
  vendido: number
  /** Saída real − o que as vendas + perdas registradas explicam. Positivo = sumiu mais do que o PDV vendeu. */
  semExplicacao: number
  /** Média de saída por dia, olhando só os períodos com saída positiva. */
  mediaPorDia: number
}

function diasEntre(de: string, ate: string): number {
  const t = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  return Math.max(1, Math.round((t(ate) - t(de)) / 86_400_000))
}

/**
 * O que saiu de cada produto, entre uma contagem e a seguinte. Só produtos
 * contados em pelo menos duas datas entram — com uma contagem só, não há como
 * saber o que saiu.
 */
export function saidasPorProduto(
  produtos: ProdutoDoc[],
  contagens: ContagemDoc[],
  movimentos: MovimentoDoc[],
): SaidaDoProduto[] {
  const porId = new Map(produtos.map((p) => [p.id, p]))
  const contagensFechadas = contagens
    .filter((c) => c.status === 'fechada')
    .sort((a, b) => (diaDaContagem(a) < diaDaContagem(b) ? -1 : 1))

  // Série de contagens de cada produto, em ordem de data.
  const series = new Map<string, { dia: string; quantidade: number; custo: number; nome: string; unidade: string }[]>()
  for (const c of contagensFechadas) {
    for (const i of c.itens) {
      const s = series.get(i.produtoId) ?? []
      s.push({ dia: diaDaContagem(c), quantidade: i.quantidade, custo: i.custoUnitario, nome: i.nome, unidade: i.unidade })
      series.set(i.produtoId, s)
    }
  }

  const doProduto = (id: string, tipo: string, de: string, ate: string) =>
    movimentos
      .filter((m) => m.produtoId === id && m.tipo === tipo)
      .filter((m) => {
        const d = diaDoMovimento(m)
        return d > de && d <= ate
      })
      .reduce((s, m) => s + m.quantidade, 0)

  const saidas: SaidaDoProduto[] = []
  for (const [produtoId, serie] of series) {
    if (serie.length < 2) continue
    const periodos: PeriodoDeSaida[] = []
    for (let k = 1; k < serie.length; k++) {
      const ini = serie[k - 1]
      const fim = serie[k]
      if (ini.dia === fim.dia) continue
      const entrou = doProduto(produtoId, TIPO_ENTRADA, ini.dia, fim.dia)
      periodos.push({
        de: ini.dia,
        ate: fim.dia,
        dias: diasEntre(ini.dia, fim.dia),
        contagemInicial: ini.quantidade,
        entrou,
        contagemFinal: fim.quantidade,
        perdaRegistrada: doProduto(produtoId, TIPO_PERDA, ini.dia, fim.dia),
        vendido: doProduto(produtoId, TIPO_VENDA, ini.dia, fim.dia),
        saiu: Math.round((ini.quantidade + entrou - fim.quantidade) * 1000) / 1000,
      })
    }
    if (!periodos.length) continue
    const ultimo = serie[serie.length - 1]
    const prod = porId.get(produtoId)
    const custoUnitario = prod?.custoAtual || ultimo.custo
    const positivos = periodos.filter((p) => p.saiu > 0)
    const saiu = periodos.reduce((s, p) => s + p.saiu, 0)
    const diasPositivos = positivos.reduce((s, p) => s + p.dias, 0)
    saidas.push({
      produtoId,
      produto: prod?.nome ?? ultimo.nome,
      unidade: prod?.unidade ?? ultimo.unidade,
      custoUnitario,
      periodos,
      saiu,
      valorSaiu: saiu * custoUnitario,
      vendido: periodos.reduce((s, p) => s + p.vendido, 0),
      semExplicacao: saiu - periodos.reduce((s, p) => s + p.vendido + p.perdaRegistrada, 0),
      mediaPorDia: diasPositivos ? positivos.reduce((s, p) => s + p.saiu, 0) / diasPositivos : 0,
    })
  }
  return saidas.sort((a, b) => b.valorSaiu - a.valorSaiu)
}

/* ----------------------------- Contexto da IA --------------------------- */

const MAX_PRODUTOS_NO_CONTEXTO = 60

const arred = (n: number) => Math.round(n * 100) / 100

/**
 * Resumo enxuto de tudo que a IA precisa saber: as contagens, as entradas e o
 * que saiu entre elas. Texto puro (JSON) — o servidor só repassa ao Gemini.
 */
export function contextoParaIA(
  produtos: ProdutoDoc[],
  contagens: ContagemDoc[],
  movimentos: MovimentoDoc[],
): { texto: string; contagens: number; entradas: number; produtosComSaida: number } {
  const fechadas = contagens.filter((c) => c.status === 'fechada')
  const saidas = saidasPorProduto(produtos, contagens, movimentos)
  const entradas = movimentos.filter((m) => m.tipo === TIPO_ENTRADA)
  const perdas = movimentos.filter((m) => m.tipo === TIPO_PERDA)

  const dados = {
    contagensFeitas: fechadas
      .sort((a, b) => (diaDaContagem(a) < diaDaContagem(b) ? -1 : 1))
      .slice(-12)
      .map((c) => ({
        dia: diaDaContagem(c),
        contadoPor: [...new Set(c.itens.map((i) => i.contadoPor).filter(Boolean))].join(', '),
        produtosContados: c.itens.length,
        valorDoEstoque: arred(c.valorEstoque ?? c.itens.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0)),
      })),
    saidaPorProduto: saidas.slice(0, MAX_PRODUTOS_NO_CONTEXTO).map((s) => ({
      produto: s.produto,
      unidade: s.unidade,
      custoUnitario: arred(s.custoUnitario),
      saiuNoTotal: arred(s.saiu),
      explicadoPelasVendas: arred(s.vendido),
      saiuSemExplicacao: arred(s.semExplicacao),
      valorQueSaiu: arred(s.valorSaiu),
      mediaPorDia: arred(s.mediaPorDia),
      periodos: s.periodos.slice(-6).map((p) => ({
        de: p.de,
        ate: p.ate,
        contagemInicial: arred(p.contagemInicial),
        entrou: arred(p.entrou),
        contagemFinal: arred(p.contagemFinal),
        perdaRegistrada: arred(p.perdaRegistrada),
        vendidoNoPdv: arred(p.vendido),
        saiu: arred(p.saiu),
      })),
    })),
    entradasRecentes: entradas
      .sort((a, b) => (diaDoMovimento(a) < diaDoMovimento(b) ? 1 : -1))
      .slice(0, 40)
      .map((m) => ({
        dia: diaDoMovimento(m),
        produto: m.produto,
        quantidade: arred(m.quantidade),
        valor: arred(m.valor),
        fornecedor: m.fornecedor ?? null,
      })),
    perdasRegistradas: perdas.slice(0, 20).map((m) => ({
      dia: diaDoMovimento(m),
      produto: m.produto,
      quantidade: arred(m.quantidade),
      valor: arred(m.valor),
      motivo: m.observacao ?? null,
    })),
    produtosCadastrados: produtos.length,
  }

  return {
    texto: JSON.stringify(dados),
    contagens: fechadas.length,
    entradas: entradas.length,
    produtosComSaida: saidas.length,
  }
}
