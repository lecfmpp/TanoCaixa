import { pagaFranqueadora, type CategoriaDespesa, type GrupoDRE } from '@/types'
import {
  CONTA,
  GRUPO,
  GRUPOS,
  GRUPOS_COM_TETO,
  LINHAS_RECEITA,
  contasDoGrupo,
  tetosNormalizados,
} from './planoContas'
import type { ContagemDoc, DespesaDoc, ReceitaDiaDoc, RestauranteDoc } from './types'

/** "Hoje" de referência da demonstração. */
export const HOJE = new Date(2026, 6, 28)

export interface Contexto {
  despesas: DespesaDoc[]
  receitaDia: ReceitaDiaDoc[]
  contagens?: ContagemDoc[]
  config: RestauranteDoc | null
}

/** Margem de contribuição de fallback, quando ainda não há venda no mês. */
const MC_PADRAO = 0.415

// Mês de referência no formato 'YYYY-MM' (evita bug de fuso do Date).
const MES_REF = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, '0')}`

function mesAnterior(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}

function noPeriodo(iso: string, periodo: 'semana' | 'mes'): boolean {
  if (periodo === 'mes') return iso.slice(0, 7) === MES_REF
  // Semana: compara a data (ao meio-dia local, sem deslocar de fuso).
  const d = new Date(iso.slice(0, 10) + 'T12:00:00')
  const seteDias = new Date(HOJE)
  seteDias.setDate(HOJE.getDate() - 7)
  return d > seteDias && d <= new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate(), 23, 59)
}

function somaConta(despesas: DespesaDoc[], conta: CategoriaDespesa): number {
  return despesas.filter((d) => d.categoria === conta).reduce((s, d) => s + d.valorTotal, 0)
}

function somaGrupo(despesas: DespesaDoc[], grupo: GrupoDRE): number {
  return despesas
    .filter((d) => CONTA[d.categoria]?.grupo === grupo)
    .reduce((s, d) => s + d.valorTotal, 0)
}

function faturamento(receita: ReceitaDiaDoc[]): number {
  return receita.reduce((s, r) => s + r.canais.reduce((a, c) => a + c.valorBruto, 0), 0)
}

function semanaDoMes(iso: string): number {
  const dia = Number(iso.slice(8, 10))
  return Math.min(4, Math.ceil(dia / 7))
}

/**
 * Valor do estoque contado num mês. Só conta contagem FECHADA — contagem
 * aberta ainda muda, e um CMV que muda sozinho não serve pro contador.
 */
function estoqueDoMes(contagens: ContagemDoc[] | undefined, mes: string): number | null {
  const c = contagens?.find((x) => x.mesReferencia === mes && x.status === 'fechada')
  if (!c) return null
  if (typeof c.valorEstoque === 'number') return c.valorEstoque
  return c.itens.reduce((s, it) => s + it.quantidade * it.custoUnitario, 0)
}

/** Estoque somado de várias lojas. Só vale se TODAS fecharam a contagem. */
function estoqueConsolidado(ctxs: Contexto[], mes: string): number | null {
  const valores = ctxs.map((c) => estoqueDoMes(c.contagens, mes))
  if (valores.some((v) => v === null)) return null
  return valores.reduce((s: number, v) => s + (v ?? 0), 0)
}

interface Provisao {
  valor: number
  lancado: number
  /** Alguma loja não lançou e o app estimou pela alíquota/percentual. */
  estimado: boolean
}

/**
 * Conta que o app sabe estimar quando não foi lançada (imposto, royalties,
 * fundo de promoção). Roda loja a loja, porque cada uma tem seu percentual.
 */
function contaProvisionada(
  ctxs: Contexto[],
  mes: string,
  conta: CategoriaDespesa,
  taxaDaLoja: (cfg: RestauranteDoc | null) => number,
): Provisao {
  let valor = 0
  let lancado = 0
  let estimado = false
  for (const c of ctxs) {
    const desp = c.despesas.filter((d) => d.dataCompetencia.slice(0, 7) === mes)
    const bruto = faturamento(c.receitaDia.filter((r) => r.data.slice(0, 7) === mes))
    const doMes = somaConta(desp, conta)
    lancado += doMes
    const taxa = taxaDaLoja(c.config)
    if (doMes === 0 && bruto > 0 && taxa > 0) {
      valor += Math.round(bruto * taxa * 100) / 100
      estimado = true
    } else {
      valor += doMes
    }
  }
  return { valor, lancado, estimado }
}

/* ------------------------------------------------------------------ *
 * DRE — Demonstrativo de resultado do exercício
 * ------------------------------------------------------------------ */

export type TipoLinha = 'receita' | 'conta' | 'grupo' | 'subtotal' | 'total' | 'info'

export interface LinhaDRE {
  id: string
  label: string
  valor: number
  /** % sobre a receita bruta. */
  pct: number
  tipo: TipoLinha
  nivel: 0 | 1
  grupo?: GrupoDRE
  /** Valor provisionado, não lançado — o app estimou. */
  estimado?: boolean
  nota?: string
}

export interface GrupoResumo {
  grupo: GrupoDRE
  nome: string
  simples: string
  cor: string
  total: number
  pct: number
  contas: { conta: CategoriaDespesa; nome: string; valor: number; pct: number }[]
}

export interface DRE {
  mes: string
  receitaBruta: number
  deducoes: number
  receitaLiquida: number
  cmv: {
    compras: number
    estoqueInicial: number
    estoqueFinal: number
    total: number
    /** Sem contagem de estoque o CMV é só a compra do mês — menos preciso. */
    temInventario: boolean
  }
  lucroBruto: number
  despesasOperacionais: number
  lucroOperacional: number
  naoOperacional: number
  lucroLiquido: number
  imposto: { valor: number; estimado: boolean; aliquota: number }
  linhas: LinhaDRE[]
  grupos: GrupoResumo[]
  /** Avisos pro dono: o que ainda falta pro DRE ficar exato. */
  pendencias: string[]
}

/**
 * Monta o DRE do mês seguindo o modelo padrão: receita bruta → deduções sobre
 * venda (inclusive o imposto) → receita líquida → CMV com inventário → lucro
 * bruto → despesas por grupo → lucro operacional → não operacional → lucro
 * líquido.
 */
export function dreDoMes(entrada: Contexto | Contexto[], mes: string = MES_REF): DRE {
  // Uma loja ou a rede inteira — o consolidado é o mesmo cálculo somando todas.
  const ctxs = Array.isArray(entrada) ? entrada : [entrada]
  const desp = ctxs.flatMap((c) => c.despesas.filter((d) => d.dataCompetencia.slice(0, 7) === mes))
  const rec = ctxs.flatMap((c) => c.receitaDia.filter((r) => r.data.slice(0, 7) === mes))
  const mostraFranquia = ctxs.some((c) => pagaFranqueadora(c.config?.tipoNegocio))

  const receitaBruta = faturamento(rec)
  const pct = (v: number) => (receitaBruta ? (v / receitaBruta) * 100 : 0)
  const linhas: LinhaDRE[] = []
  const pendencias: string[] = []

  const L = (l: Omit<LinhaDRE, 'pct'>) => linhas.push({ ...l, pct: pct(l.valor) })

  /* ---------------------------- Receita bruta --------------------------- */
  const porCanal = (canais: string[]) =>
    rec.reduce((s, r) => s + r.canais.filter((c) => canais.includes(c.canal)).reduce((a, c) => a + c.valorBruto, 0), 0)

  L({ id: 'receita_bruta', label: 'Receita bruta', valor: receitaBruta, tipo: 'subtotal', nivel: 0 })
  for (const lr of LINHAS_RECEITA) {
    const valor = porCanal(lr.canais)
    if (valor > 0 || receitaBruta === 0) L({ id: `rec_${lr.id}`, label: lr.nome, valor, tipo: 'receita', nivel: 1 })
  }

  /* ------------- Deduções sobre venda (inclui o imposto) ---------------- */
  const aliquota = ctxs[0]?.config?.aliquotaImposto ?? 0.06
  const prov = contaProvisionada(ctxs, mes, 'imposto_vendas', (cfg) => cfg?.aliquotaImposto ?? 0.06)
  const impostoLancado = prov.lancado
  const impostoEstimado = prov.estimado
  const imposto = prov.valor
  if (impostoEstimado) pendencias.push('O imposto do mês ainda não foi lançado — o valor abaixo é uma provisão pela alíquota do Simples.')

  const deducoes = somaGrupo(desp, 'deducao') - impostoLancado + imposto

  L({ id: 'g_deducao', label: '(−) Impostos, taxas e comissões sobre vendas', valor: deducoes, tipo: 'grupo', nivel: 0, grupo: 'deducao' })
  for (const conta of contasDoGrupo('deducao')) {
    const valor = conta.id === 'imposto_vendas' ? imposto : somaConta(desp, conta.id)
    if (valor === 0 && conta.id !== 'imposto_vendas') continue
    L({
      id: `c_${conta.id}`,
      label: conta.nome,
      valor,
      tipo: 'conta',
      nivel: 1,
      grupo: 'deducao',
      estimado: conta.id === 'imposto_vendas' && impostoEstimado,
      nota: conta.id === 'imposto_vendas' && impostoEstimado ? `provisão de ${(aliquota * 100).toFixed(1)}%` : undefined,
    })
  }

  const receitaLiquida = receitaBruta - deducoes
  L({ id: 'receita_liquida', label: '= Receita líquida', valor: receitaLiquida, tipo: 'subtotal', nivel: 0 })

  /* ---------------------------- CMV com inventário ---------------------- */
  const compras = somaGrupo(desp, 'cmv')
  const estoqueFinal = estoqueConsolidado(ctxs, mes)
  const estoqueInicial = estoqueConsolidado(ctxs, mesAnterior(mes))
  const temInventario = estoqueFinal !== null
  const cmvTotal = temInventario ? compras + (estoqueInicial ?? 0) - (estoqueFinal ?? 0) : compras
  if (!temInventario && compras > 0) {
    pendencias.push('Sem contagem de estoque fechada neste mês, o CMV é só o que você comprou — feche a contagem pro número ficar exato.')
  }

  L({ id: 'g_cmv', label: '(−) CMV — custo da mercadoria vendida', valor: cmvTotal, tipo: 'grupo', nivel: 0, grupo: 'cmv' })
  for (const conta of contasDoGrupo('cmv')) {
    const valor = somaConta(desp, conta.id)
    if (valor === 0) continue
    L({ id: `c_${conta.id}`, label: conta.nome, valor, tipo: 'conta', nivel: 1, grupo: 'cmv' })
  }
  L({ id: 'cmv_compras', label: 'Subtotal — compras do mês', valor: compras, tipo: 'conta', nivel: 1, grupo: 'cmv' })
  if (temInventario) {
    L({ id: 'cmv_est_ini', label: '(+) Estoque no início do mês', valor: estoqueInicial ?? 0, tipo: 'conta', nivel: 1, grupo: 'cmv', nota: estoqueInicial === null ? 'sem contagem do mês anterior' : undefined })
    L({ id: 'cmv_est_fim', label: '(−) Estoque no fim do mês', valor: estoqueFinal ?? 0, tipo: 'conta', nivel: 1, grupo: 'cmv' })
  } else {
    L({ id: 'cmv_sem_inv', label: 'Estoque ainda não contado neste mês', valor: 0, tipo: 'info', nivel: 1, grupo: 'cmv' })
  }

  const lucroBruto = receitaLiquida - cmvTotal
  L({ id: 'lucro_bruto', label: '= Lucro bruto', valor: lucroBruto, tipo: 'subtotal', nivel: 0 })

  /* ------------------------ Despesas operacionais ----------------------- */
  // Royalties e fundo de promoção: se a franqueada não lançou, o app
  // provisiona pelo percentual do contrato — mesma lógica do imposto.
  const taxaContrato = (k: 'royalties' | 'fundoPromocao') => (cfg: RestauranteDoc | null) =>
    pagaFranqueadora(cfg?.tipoNegocio) ? (cfg?.taxasFranquia?.[k] ?? 0) / 100 : 0
  const royalties = contaProvisionada(ctxs, mes, 'royalties', taxaContrato('royalties'))
  const fundo = contaProvisionada(ctxs, mes, 'fundo_promocao', taxaContrato('fundoPromocao'))
  const franquiaTotal = royalties.valor + fundo.valor
  if (royalties.estimado || fundo.estimado) {
    pendencias.push('Royalties e fundo de promoção ainda não lançados — o valor é uma provisão pelo percentual do contrato.')
  }
  const provDaConta = (id: CategoriaDespesa) =>
    id === 'royalties' ? royalties : id === 'fundo_promocao' ? fundo : null

  const gruposOperacionais = GRUPOS.filter((g) => g.posicao === 'operacional')
  let despesasOperacionais = 0
  for (const g of gruposOperacionais) {
    const franquia = g.id === 'franqueadora'
    const total = franquia ? franquiaTotal : somaGrupo(desp, g.id)
    despesasOperacionais += total
    const sempreVisivel = g.id === 'ocupacao' || g.id === 'pessoal' || (franquia && mostraFranquia)
    if (total === 0 && !sempreVisivel) continue
    L({ id: `g_${g.id}`, label: `(−) ${g.nome}`, valor: total, tipo: 'grupo', nivel: 0, grupo: g.id })
    for (const conta of contasDoGrupo(g.id)) {
      const p = franquia ? provDaConta(conta.id) : null
      const valor = p ? p.valor : somaConta(desp, conta.id)
      if (valor === 0 && !(franquia && mostraFranquia)) continue
      L({
        id: `c_${conta.id}`,
        label: conta.nome,
        valor,
        tipo: 'conta',
        nivel: 1,
        grupo: g.id,
        estimado: p?.estimado,
        nota: p?.estimado ? 'provisão pelo contrato' : undefined,
      })
    }
  }

  const lucroOperacional = lucroBruto - despesasOperacionais
  L({ id: 'lucro_operacional', label: '= Lucro operacional', valor: lucroOperacional, tipo: 'subtotal', nivel: 0 })

  /* --------------------------- Não operacional -------------------------- */
  const naoOperacional = somaGrupo(desp, 'nao_operacional')
  if (naoOperacional > 0) {
    L({ id: 'g_nao_operacional', label: `(−) ${GRUPO.nao_operacional.nome}`, valor: naoOperacional, tipo: 'grupo', nivel: 0, grupo: 'nao_operacional' })
    for (const conta of contasDoGrupo('nao_operacional')) {
      const valor = somaConta(desp, conta.id)
      if (valor === 0) continue
      L({ id: `c_${conta.id}`, label: conta.nome, valor, tipo: 'conta', nivel: 1, grupo: 'nao_operacional' })
    }
  }

  const lucroLiquido = lucroOperacional - naoOperacional
  L({ id: 'lucro_liquido', label: '= Lucro líquido', valor: lucroLiquido, tipo: 'total', nivel: 0 })

  /* ------------------------- Resumo por grupo --------------------------- */
  const grupos: GrupoResumo[] = GRUPOS.map((g) => {
    const total =
      g.id === 'cmv' ? cmvTotal
      : g.id === 'deducao' ? deducoes
      : g.id === 'franqueadora' ? franquiaTotal
      : somaGrupo(desp, g.id)
    return {
      grupo: g.id,
      nome: g.nome,
      simples: g.simples,
      cor: g.cor,
      total,
      pct: pct(total),
      contas: contasDoGrupo(g.id)
        .map((c) => {
          const valor =
            c.id === 'imposto_vendas' ? imposto : (provDaConta(c.id)?.valor ?? somaConta(desp, c.id))
          return { conta: c.id, nome: c.nome, valor, pct: pct(valor) }
        })
        .filter((c) => c.valor !== 0),
    }
  })

  return {
    mes,
    receitaBruta,
    deducoes,
    receitaLiquida,
    cmv: { compras, estoqueInicial: estoqueInicial ?? 0, estoqueFinal: estoqueFinal ?? 0, total: cmvTotal, temInventario },
    lucroBruto,
    despesasOperacionais,
    lucroOperacional,
    naoOperacional,
    lucroLiquido,
    imposto: { valor: imposto, estimado: impostoEstimado, aliquota },
    linhas,
    grupos,
    pendencias,
  }
}

/* ------------------------------------------------------------------ *
 * Resumos das telas
 * ------------------------------------------------------------------ */

export interface ResumoInicio {
  entrou: number
  saiu: number
  /** Lucro operacional. */
  sobrou: number
  /** Margem líquida — mesma conta que fecha o DRE. */
  margem: number
  pontoEquilibrio: number
  barras: { rotulo: string; entrou: number; saiu: number }[]
  cmv: number
  pessoal: number
  /** Taxas de app, cartão, antecipação e tarifa — sem o imposto. */
  apps: number
  ocupacao: number
  imposto: number
  impostoEstimado: boolean
  /** Total das deduções sobre venda, imposto incluído. */
  deducoes: number
  /** Lucro líquido, depois do não operacional. */
  sobrouFinal: number
}

export function resumoInicio(ctx: Contexto, periodo: 'semana' | 'mes'): ResumoInicio {
  const desp = ctx.despesas.filter((d) => noPeriodo(d.dataCompetencia, periodo))
  const rec = ctx.receitaDia.filter((r) => noPeriodo(r.data, periodo))
  const entrou = faturamento(rec)
  const saiu = desp.reduce((s, d) => s + d.valorTotal, 0)

  // No mês a gente usa o DRE fechado (CMV com inventário, imposto provisionado).
  // Na semana não existe inventário, então cai no CMV por compra.
  const aliquota = ctx.config?.aliquotaImposto ?? 0.06
  const impostoLancado = somaConta(desp, 'imposto_vendas')
  const impostoEstimado = impostoLancado === 0 && entrou > 0
  const imposto = impostoEstimado ? Math.round(entrou * aliquota) : impostoLancado

  const cmv = periodo === 'mes' ? dreDoMes(ctx).cmv.total : somaGrupo(desp, 'cmv')
  const apps = somaGrupo(desp, 'deducao') - impostoLancado
  const deducoes = apps + imposto
  const pessoal = somaGrupo(desp, 'pessoal')
  const ocupacao = somaGrupo(desp, 'ocupacao')
  const administrativa = somaGrupo(desp, 'administrativa')
  const operacional = somaGrupo(desp, 'operacional')
  const variavel = somaGrupo(desp, 'variavel')
  const franqueadora = somaGrupo(desp, 'franqueadora')
  const naoOperacional = somaGrupo(desp, 'nao_operacional')

  const sobrou = entrou - deducoes - cmv - pessoal - ocupacao - administrativa - operacional - variavel - franqueadora
  const sobrouFinal = sobrou - naoOperacional

  // Ponto de equilíbrio: custos fixos ÷ margem de contribuição real do período.
  const custosFixos = pessoal + ocupacao + administrativa + operacional + franqueadora
  const mcCalculada = entrou ? (entrou - deducoes - cmv - variavel) / entrou : 0
  const mc = mcCalculada > 0.05 ? mcCalculada : MC_PADRAO
  const pontoEquilibrio = Math.round(custosFixos / mc / 100) * 100

  // Barras por semana (mês) — no modo semana, agrupa por dia.
  let barras: ResumoInicio['barras']
  if (periodo === 'mes') {
    barras = [1, 2, 3, 4].map((n) => ({
      rotulo: `${n}ª sem`,
      entrou: rec.filter((r) => semanaDoMes(r.data) === n).reduce((s, r) => s + r.canais.reduce((a, c) => a + c.valorBruto, 0), 0),
      saiu: desp.filter((d) => semanaDoMes(d.dataCompetencia) === n).reduce((s, d) => s + d.valorTotal, 0),
    }))
  } else {
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    barras = dias.map((rot, i) => {
      const alvo = new Date(HOJE)
      alvo.setDate(HOJE.getDate() - (6 - i))
      const iso = alvo.toISOString().slice(0, 10)
      return {
        rotulo: rot,
        entrou: rec.filter((r) => r.data.slice(0, 10) === iso).reduce((s, r) => s + r.canais.reduce((a, c) => a + c.valorBruto, 0), 0),
        saiu: desp.filter((d) => d.dataCompetencia.slice(0, 10) === iso).reduce((s, d) => s + d.valorTotal, 0),
      }
    })
  }

  return {
    entrou,
    saiu,
    sobrou,
    margem: entrou ? (sobrouFinal / entrou) * 100 : 0,
    pontoEquilibrio,
    barras,
    cmv,
    pessoal,
    apps,
    ocupacao,
    imposto,
    impostoEstimado,
    deducoes,
    sobrouFinal,
  }
}

/** Resumo dos cartões da página Despesas. */
export function despesasResumo(despesas: DespesaDoc[]) {
  const saiu = despesas.reduce((s, d) => s + d.valorTotal, 0)
  const pago = despesas.filter((d) => d.status === 'pago').reduce((s, d) => s + d.valorTotal, 0)
  const aPagar = despesas.filter((d) => d.status !== 'pago').reduce((s, d) => s + d.valorTotal, 0)
  const em3 = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() + 3, 23, 59)
  const inicio = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate(), 0, 0)
  const vence3 = despesas
    .filter((d) => {
      if (d.status === 'pago' || !d.dataVencimento) return false
      const v = new Date(d.dataVencimento.slice(0, 10) + 'T12:00:00')
      return v >= inicio && v <= em3
    })
    .reduce((s, d) => s + d.valorTotal, 0)
  return { saiu, pago, aPagar, vence3, contagem: despesas.length }
}

/** "Onde o dinheiro saiu" — por grupo do DRE, com % do faturamento. */
export function categoriasResumo(despesas: DespesaDoc[], faturamentoBruto: number) {
  return GRUPOS.map((g) => {
    const valor = somaGrupo(despesas, g.id)
    return {
      cat: g.id,
      nome: g.simples,
      cor: g.cor,
      valor,
      pct: faturamentoBruto ? (valor / faturamentoBruto) * 100 : 0,
    }
  }).filter((g) => g.valor > 0)
}

/** Linhas do Plano do mês: teto × realizado × status, por grupo do DRE. */
export function planoLinhas(ctx: Contexto) {
  const dre = dreDoMes(ctx)
  const tetos = tetosNormalizados(ctx.config?.tetos as Record<string, number> | undefined)
  return GRUPOS_COM_TETO.map((id) => {
    const g = dre.grupos.find((x) => x.grupo === id)!
    const teto = tetos[id] ?? 0
    let status: 'tranquilo' | 'quase' | 'estourou' = 'tranquilo'
    if (g.pct > teto + 1) status = 'estourou'
    else if (g.pct > teto) status = 'quase'
    return { cat: id, nome: GRUPO[id].simples, contabil: GRUPO[id].nome, teto, realPct: g.pct, valor: g.total, status }
  })
}
