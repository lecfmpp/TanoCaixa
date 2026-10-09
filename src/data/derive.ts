import { pagaFranqueadora, type CategoriaDespesa, type Filtro, type GrupoDRE, type Intervalo } from '@/types'
import {
  CONTA,
  GRUPO,
  GRUPOS,
  GRUPOS_COM_TETO,
  LINHAS_RECEITA,
  contasDoGrupo,
  tetosNormalizados,
  type Tetos,
} from './planoContas'
import type { ContagemDoc, DespesaDoc, ReceitaDiaDoc, RestauranteDoc } from './types'

/** "Hoje" da demonstração — os dados de exemplo são todos de julho de 2026. */
const HOJE_DEMO = new Date(2026, 6, 28)

/**
 * Chave de sessão que marca a demonstração (espelha o AuthContext). Só é
 * gravada quando alguém clica em "Ver demonstração" (ou volta com o login
 * anônimo que esse botão cria). Conta real apaga a chave ao entrar.
 */
const CHAVE_DEMO = 'tanocaixa:demo'

function ehDemo(): boolean {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(CHAVE_DEMO) === '1'
  } catch {
    return false
  }
}

let modoDemo = ehDemo()

/**
 * "Hoje" de referência do painel. Na conta real é o dia de verdade (e anda com
 * o relógio: ver `virouODia`). Só a demonstração fica parada em 28/07/2026,
 * que é quando estão os dados de exemplo.
 */
export let HOJE = modoDemo ? HOJE_DEMO : new Date()

export interface Contexto {
  despesas: DespesaDoc[]
  receitaDia: ReceitaDiaDoc[]
  contagens?: ContagemDoc[]
  config: RestauranteDoc | null
}

/** Margem de contribuição de fallback, quando ainda não há venda no mês. */
const MC_PADRAO = 0.415

/** Mês de referência no formato 'YYYY-MM' (evita bug de fuso do Date). */
export let MES_REF = mesDe(HOJE)

/** Dia em 'YYYY-MM-DD' pelo calendário LOCAL (toISOString usa UTC e, à noite no Brasil, já é amanhã). */
export function isoDoDia(d: Date): string {
  return `${mesDe(d)}-${String(d.getDate()).padStart(2, '0')}`
}

/** Hoje em 'YYYY-MM-DD', pelo calendário local e pela data de referência. */
export function diaDeHoje(): string {
  return isoDoDia(HOJE)
}

function mesDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Agora, pra comparar horários ("hoje, 14:03", "ontem…"). Na conta real é o
 * relógio; na demonstração, o dia de exemplo.
 */
export function agora(): Date {
  return modoDemo ? HOJE : new Date()
}

/** Quantos dias faltam pro mês de referência acabar (0 no último dia). */
export function diasRestantesNoMes(): number {
  const ultimo = new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0).getDate()
  return ultimo - HOJE.getDate()
}

/**
 * Fixa a data de referência quando a sessão é resolvida: demonstração fica em
 * julho de 2026, conta real anda com o relógio.
 */
export function ajustarDataDeReferencia(demo: boolean): void {
  modoDemo = demo
  HOJE = demo ? HOJE_DEMO : new Date()
  MES_REF = mesDe(HOJE)
}

/**
 * Conta real com o app aberto de um dia pro outro: avança HOJE/MES_REF pro dia
 * novo. Devolve true quando mudou (quem chama re-renderiza o painel).
 */
export function virouODia(): boolean {
  if (modoDemo) return false
  const hoje = new Date()
  if (isoDoDia(hoje) === isoDoDia(HOJE)) return false
  HOJE = hoje
  MES_REF = mesDe(HOJE)
  return true
}

/** '2026-07' → '2026-06'. */
export function mesAnterior(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}

/** Os dias do intervalo ('YYYY-MM-DD'), do primeiro ao último. */
function diasDoIntervalo(i: Intervalo): string[] {
  const dias: string[] = []
  const cur = new Date(i.de + 'T12:00:00')
  const fim = new Date(i.ate + 'T12:00:00')
  while (cur <= fim && dias.length < 400) {
    dias.push(isoDoDia(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dias
}

/** Quantos dias tem a janela do filtro (mês corrente inteiro, 7, ou o intervalo). */
export function diasDoFiltro(f: Filtro): number {
  if (typeof f !== 'string') return Math.max(1, diasDoIntervalo(f).length)
  return f === 'semana' ? 7 : new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0).getDate()
}

export function noPeriodo(iso: string, periodo: Filtro): boolean {
  if (typeof periodo !== 'string') {
    const dia = iso.slice(0, 10)
    return dia >= periodo.de && dia <= periodo.ate
  }
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
 * Ordena contagens no tempo. Contagem antiga (sem dia) fica no COMEÇO do mês
 * dela: qualquer contagem com dia, feita depois, passa por cima.
 */
function chaveDaContagem(c: ContagemDoc): string {
  return c.data ?? `${c.mesReferencia}-00`
}

/**
 * Valor do estoque num dia, somando o que cada produto tinha na ÚLTIMA vez que
 * foi contado até ali. Assim uma contagem parcial (só a câmara fria) não zera o
 * resto do estoque no CMV.
 */
export function inventarioAte(contagens: ContagemDoc[], ateChave: string): number {
  const ultimo = new Map<string, { quantidade: number; custoUnitario: number }>()
  const ordenadas = contagens
    .filter((c) => c.status === 'fechada' && chaveDaContagem(c) <= ateChave)
    .sort((a, b) => (chaveDaContagem(a) < chaveDaContagem(b) ? -1 : 1))
  for (const c of ordenadas) {
    for (const i of c.itens) ultimo.set(i.produtoId, { quantidade: i.quantidade, custoUnitario: i.custoUnitario })
  }
  let total = 0
  for (const v of ultimo.values()) total += v.quantidade * v.custoUnitario
  return total
}

export interface Inventario {
  valor: number
  /** Dia da contagem que fechou o mês. Vazio na contagem antiga, mensal. */
  data?: string
}

/**
 * Inventário de um mês: o estoque da última contagem feita nele. Só conta
 * contagem FECHADA — contagem aberta ainda muda, e um CMV que muda sozinho
 * não serve pro contador.
 */
export function inventarioDoMes(contagens: ContagemDoc[] | undefined, mes: string): Inventario | null {
  const doMes = (contagens ?? [])
    .filter((c) => c.mesReferencia === mes && c.status === 'fechada')
    .sort((a, b) => (chaveDaContagem(a) < chaveDaContagem(b) ? 1 : -1))
  const ultima = doMes[0]
  if (!ultima) return null
  if (ultima.data) return { valor: inventarioAte(contagens ?? [], ultima.data), data: ultima.data }
  // Contagem mensal antiga: o valor gravado nela é o que vale.
  return {
    valor: typeof ultima.valorEstoque === 'number'
      ? ultima.valorEstoque
      : ultima.itens.reduce((s, it) => s + it.quantidade * it.custoUnitario, 0),
  }
}

/** Estoque somado de várias lojas. Só vale se TODAS contaram no mês. */
function inventarioConsolidado(ctxs: Contexto[], mes: string): Inventario | null {
  const invs = ctxs.map((c) => inventarioDoMes(c.contagens, mes))
  if (invs.some((v) => v === null)) return null
  return {
    valor: invs.reduce((s, v) => s + (v?.valor ?? 0), 0),
    // Com uma loja só dá pra dizer o dia; numa rede as datas divergem.
    data: invs.length === 1 ? invs[0]?.data : undefined,
  }
}

/** "16/05" quando há o dia da contagem, "05/2026" quando só há o mês. */
function rotuloInventario(inv: Inventario | null, mes: string): string {
  if (inv?.data) return `${inv.data.slice(8, 10)}/${inv.data.slice(5, 7)}`
  return `${mes.slice(5, 7)}/${mes.slice(0, 4)}`
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

  L({ id: 'receita_bruta', label: '(+) Receita Bruta', valor: receitaBruta, tipo: 'subtotal', nivel: 0 })
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
  L({ id: 'receita_liquida', label: '(=) Receita Líquida', valor: receitaLiquida, tipo: 'subtotal', nivel: 0 })

  /* ---------------------------- CMV com inventário ---------------------- */
  // Na ordem do modelo: matéria-prima por conta, subtotal, os dois inventários
  // (com o dia da contagem) e o total do CMV.
  const compras = somaGrupo(desp, 'cmv')
  const invFinal = inventarioConsolidado(ctxs, mes)
  const invInicial = inventarioConsolidado(ctxs, mesAnterior(mes))
  const estoqueFinal = invFinal?.valor ?? null
  const estoqueInicial = invInicial?.valor ?? null
  const temInventario = invFinal !== null
  const cmvTotal = temInventario ? compras + (estoqueInicial ?? 0) - (estoqueFinal ?? 0) : compras
  if (!temInventario && compras > 0) {
    pendencias.push('Sem contagem de estoque neste mês, o CMV é só o que você comprou — faça a contagem pro número ficar exato.')
  }

  for (const conta of contasDoGrupo('cmv')) {
    const valor = somaConta(desp, conta.id)
    if (valor === 0) continue
    L({ id: `c_${conta.id}`, label: conta.nome, valor, tipo: 'conta', nivel: 1, grupo: 'cmv' })
  }
  L({ id: 'cmv_compras', label: 'Sub Total (CMV)', valor: compras, tipo: 'conta', nivel: 1, grupo: 'cmv' })
  if (temInventario) {
    L({
      id: 'cmv_est_ini',
      label: `(+) Inventário (${rotuloInventario(invInicial, mesAnterior(mes))})`,
      valor: estoqueInicial ?? 0,
      tipo: 'conta',
      nivel: 1,
      grupo: 'cmv',
      nota: estoqueInicial === null ? 'sem contagem do mês anterior' : undefined,
    })
    L({ id: 'cmv_est_fim', label: `(−) Inventário (${rotuloInventario(invFinal, mes)})`, valor: estoqueFinal ?? 0, tipo: 'conta', nivel: 1, grupo: 'cmv' })
  } else {
    L({ id: 'cmv_sem_inv', label: 'Estoque ainda não contado neste mês', valor: 0, tipo: 'info', nivel: 1, grupo: 'cmv' })
  }
  L({ id: 'g_cmv', label: '(−) Total (CMV)', valor: cmvTotal, tipo: 'grupo', nivel: 0, grupo: 'cmv' })

  const lucroBruto = receitaLiquida - cmvTotal
  L({ id: 'lucro_bruto', label: '(=) Lucro Bruto', valor: lucroBruto, tipo: 'subtotal', nivel: 0 })

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
  L({ id: 'lucro_operacional', label: '(=) Lucro Operacional', valor: lucroOperacional, tipo: 'subtotal', nivel: 0 })

  /* --------------------------- Não operacional -------------------------- */
  const naoOperacional = somaGrupo(desp, 'nao_operacional')
  // No modelo, "Outras despesas / provisões / retiradas" e "Multas, atrasos"
  // vêm soltas entre o lucro operacional e o líquido — sem linha de grupo.
  if (naoOperacional > 0) {
    for (const conta of contasDoGrupo('nao_operacional')) {
      const valor = somaConta(desp, conta.id)
      if (valor === 0) continue
      L({ id: `c_${conta.id}`, label: `(−) ${conta.nome}`, valor, tipo: 'conta', nivel: 0, grupo: 'nao_operacional' })
    }
  }

  const lucroLiquido = lucroOperacional - naoOperacional
  L({ id: 'lucro_liquido', label: '(=) Lucro Líquido', valor: lucroLiquido, tipo: 'total', nivel: 0 })

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

export function resumoInicio(ctx: Contexto, periodo: Filtro): ResumoInicio {
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
  } else if (typeof periodo !== 'string') {
    // Intervalo livre: uma barra por dia; se for longo, agrupa em blocos de
    // vários dias pra não passar de ~10 barras.
    const todos = diasDoIntervalo(periodo)
    const bloco = Math.max(1, Math.ceil(todos.length / 10))
    const soma = (lista: string[]) => ({
      entrou: rec.filter((r) => lista.includes(r.data.slice(0, 10))).reduce((s, r) => s + r.canais.reduce((a, c) => a + c.valorBruto, 0), 0),
      saiu: desp.filter((d) => lista.includes(d.dataCompetencia.slice(0, 10))).reduce((s, d) => s + d.valorTotal, 0),
    })
    barras = []
    for (let i = 0; i < todos.length; i += bloco) {
      const lista = todos.slice(i, i + bloco)
      barras.push({ rotulo: `${lista[0].slice(8, 10)}/${lista[0].slice(5, 7)}`, ...soma(lista) })
    }
  } else {
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    // Os últimos 7 dias terminando hoje, cada barra com o nome do dia dela
    // (antes o rótulo era fixo Seg…Dom e não batia com a data da barra).
    barras = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const alvo = new Date(HOJE)
      alvo.setDate(HOJE.getDate() - (6 - i))
      const iso = isoDoDia(alvo)
      return {
        rotulo: i === 6 ? 'Hoje' : dias[(alvo.getDay() + 6) % 7],
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

/**
 * Mesma janela no período anterior, pra comparar sem inventar número: no mês,
 * o mês passado do dia 1 até o dia de hoje; na semana, os 7 dias antes destes.
 * `temBase` é falso quando não há nada lançado na janela anterior.
 */
export function periodoAnterior(ctx: Contexto, periodo: Filtro) {
  let dentro: (iso: string) => boolean
  if (typeof periodo !== 'string') {
    // Intervalo: a janela de mesmo tamanho logo antes dele.
    const n = diasDoIntervalo(periodo).length
    const fim = new Date(periodo.de + 'T12:00:00')
    fim.setDate(fim.getDate() - 1)
    const ini = new Date(fim)
    ini.setDate(fim.getDate() - (n - 1))
    const [a, b] = [isoDoDia(ini), isoDoDia(fim)]
    dentro = (iso) => iso.slice(0, 10) >= a && iso.slice(0, 10) <= b
  } else if (periodo === 'mes') {
    const mes = mesAnterior(MES_REF)
    const ateDia = HOJE.getDate()
    dentro = (iso) => iso.slice(0, 7) === mes && Number(iso.slice(8, 10)) <= ateDia
  } else {
    const ini = new Date(HOJE)
    ini.setDate(HOJE.getDate() - 13)
    const fim = new Date(HOJE)
    fim.setDate(HOJE.getDate() - 7)
    const [a, b] = [isoDoDia(ini), isoDoDia(fim)]
    dentro = (iso) => iso.slice(0, 10) >= a && iso.slice(0, 10) <= b
  }
  const rec = ctx.receitaDia.filter((r) => dentro(r.data))
  const desp = ctx.despesas.filter((d) => dentro(d.dataCompetencia))
  return {
    mes: mesAnterior(MES_REF),
    entrou: faturamento(rec),
    saiu: desp.reduce((s, d) => s + d.valorTotal, 0),
    temBase: rec.length > 0 || desp.length > 0,
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

/**
 * Linhas do Plano do mês: teto × realizado × status, por grupo do DRE.
 * `tetosDoMes` vem do plano daquele mês, quando o dono montou um; sem ele,
 * valem os tetos gerais do restaurante.
 */
export function planoLinhas(ctx: Contexto, tetosDoMes?: Tetos) {
  const dre = dreDoMes(ctx)
  const tetos = tetosDoMes ?? tetosNormalizados(ctx.config?.tetos as Record<string, number> | undefined)
  return GRUPOS_COM_TETO.map((id) => {
    const g = dre.grupos.find((x) => x.grupo === id)!
    const teto = tetos[id] ?? 0
    let status: 'tranquilo' | 'quase' | 'estourou' = 'tranquilo'
    if (g.pct > teto + 1) status = 'estourou'
    else if (g.pct > teto) status = 'quase'
    return { cat: id, nome: GRUPO[id].simples, contabil: GRUPO[id].nome, teto, realPct: g.pct, valor: g.total, status }
  })
}
