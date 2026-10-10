/* ------------------------------------------------------------------ *
 * Cálculos do Dashboard. Funções puras: recebem o contexto (despesas,
 * vendas, config) e devolvem o que cada gráfico desenha — nada de série
 * fixa. Tudo que é "% da receita bruta" usa a mesma receita bruta do
 * período (soma dos canais de venda).
 * ------------------------------------------------------------------ */
import type { CanalVenda, Filtro } from '@/types'
import { CONTA, GRUPO, type GrupoDRE } from './planoContas'
import { ehCompra } from './compras'
import { HOJE, MES_REF, dentroDoPeriodoAnterior, dreDoMes, faturamento, isoDoDia, mesAnterior, noPeriodo, type Contexto } from './derive'
import { nomeDoMes } from './planoMes'
import type { DespesaDoc, ReceitaDiaDoc } from './types'

export const MAR = '#2E5F73'
export const TELHA = '#C05437'
export const MATA = '#2F6B4A'
export const SOL = '#EFAB5C'

const totalDia = (r: ReceitaDiaDoc) => r.canais.reduce((s, c) => s + c.valorBruto, 0)
const diaDaSemana = (iso: string) => (new Date(iso.slice(0, 10) + 'T12:00:00').getDay() + 6) % 7 // 0 = segunda

export const NOMES_DIA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
export const ROTULOS_DIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** 'julho' — nome do mês sem o ano. */
export const nomeCurtoDoMes = (mes: string) => nomeDoMes(mes).split(' de ')[0]

/* ------------------------------ Gastos ------------------------------- */

export interface FatiaGasto {
  grupo: GrupoDRE
  nome: string
  cor: string
  valor: number
  pct: number
}

/** Tudo que saiu, por grupo do DRE (o mesmo agrupamento do DRE, não por conta avulsa). */
export function gastosPorGrupo(despesas: DespesaDoc[]): FatiaGasto[] {
  const soma = new Map<GrupoDRE, number>()
  for (const d of despesas) {
    const g = CONTA[d.categoria]?.grupo ?? 'cmv'
    soma.set(g, (soma.get(g) ?? 0) + d.valorTotal)
  }
  const total = [...soma.values()].reduce((s, v) => s + v, 0)
  return [...soma.entries()]
    .filter(([, v]) => v > 0)
    .map(([grupo, valor]) => ({
      grupo,
      // Compra de mercadoria aparece com o nome que o dono usa, não o do DRE.
      nome: grupo === 'cmv' ? 'Despesas com compras' : grupo === 'deducao' ? 'Taxas e impostos sobre venda' : GRUPO[grupo].simples,
      cor: GRUPO[grupo].cor,
      valor,
      pct: total ? (valor / total) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor)
}

export function leituraGastos(fatias: FatiaGasto[]): string {
  if (!fatias.length) return ''
  const m = fatias[0]
  return `${m.nome} é o maior peso: ${Math.round(m.pct)}% de tudo que saiu no período.`
}

/* ------------------------------ Canais ------------------------------- */

const CANAL: Record<CanalVenda, { nome: string; cor: string }> = {
  balcao: { nome: 'Balcão e retirada', cor: MAR },
  apps: { nome: 'Apps de delivery', cor: TELHA },
  ifood: { nome: 'iFood', cor: '#D98A6E' },
  rappi: { nome: 'Rappi', cor: SOL },
  whatsapp: { nome: 'WhatsApp e site próprio', cor: MATA },
  outros: { nome: 'Outras receitas', cor: '#7B6A8C' },
}

export interface FatiaCanal {
  canal: CanalVenda
  nome: string
  cor: string
  valor: number
  pct: number
  /** Variação % contra o período anterior; null sem base pra comparar. */
  variacao: number | null
}

function somaPorCanal(rec: ReceitaDiaDoc[]): Map<CanalVenda, number> {
  const m = new Map<CanalVenda, number>()
  for (const r of rec) for (const c of r.canais) m.set(c.canal, (m.get(c.canal) ?? 0) + c.valorBruto)
  return m
}

export function vendasPorCanal(rec: ReceitaDiaDoc[], recAnterior: ReceitaDiaDoc[]): FatiaCanal[] {
  const atual = somaPorCanal(rec)
  const antes = somaPorCanal(recAnterior)
  const total = [...atual.values()].reduce((s, v) => s + v, 0)
  return [...atual.entries()]
    .filter(([, v]) => v > 0)
    .map(([canal, valor]) => {
      const ant = antes.get(canal) ?? 0
      return {
        canal,
        nome: CANAL[canal]?.nome ?? canal,
        cor: CANAL[canal]?.cor ?? MAR,
        valor,
        pct: total ? (valor / total) * 100 : 0,
        variacao: ant > 0 ? ((valor - ant) / ant) * 100 : null,
      }
    })
    .sort((a, b) => b.valor - a.valor)
}

export function leituraCanais(canais: FatiaCanal[], contra: string): string {
  if (!canais.length) return ''
  const top = canais[0]
  let t = `${top.nome} é o canal que mais vende: ${Math.round(top.pct)}% do total.`
  const cresce = canais.filter((c) => c.variacao !== null && c.variacao > 0).sort((a, b) => b.variacao! - a.variacao!)[0]
  if (cresce && cresce.canal !== top.canal) t += ` ${cresce.nome} é o que mais cresce vs. ${contra}.`
  return t
}

/* ---------------------- Caminho até o equilíbrio --------------------- */

export interface Acumulado {
  ultimoDia: number
  hojeDia: number
  /** Vendido acumulado, do dia 1 até hoje (índice 0 = dia 1). */
  acum: number[]
  /** Projeção do dia de hoje até o fim do mês (índice 0 = hoje). */
  proj: number[]
  /** Primeiro dia em que o acumulado cobriu o ponto de equilíbrio. */
  cruzouDia: number | null
  fechaEm: number
}

/** Vendas acumuladas do mês corrente, dia a dia, e a projeção pelo ritmo de cada dia da semana. */
export function acumuladoDoMes(receitaDia: ReceitaDiaDoc[], pontoEquilibrio: number): Acumulado {
  const ultimoDia = new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0).getDate()
  const hojeDia = HOJE.getDate()
  const porDia = new Array<number>(ultimoDia).fill(0)
  for (const r of receitaDia) {
    if (r.data.slice(0, 7) !== MES_REF) continue
    const d = Number(r.data.slice(8, 10))
    if (d >= 1 && d <= ultimoDia) porDia[d - 1] += totalDia(r)
  }
  const acum: number[] = []
  let a = 0
  for (let d = 1; d <= hojeDia; d++) {
    a += porDia[d - 1]
    acum.push(a)
  }
  // Ritmo: média dos dias com venda, por dia da semana; sem dado do dia da
  // semana, cai na média geral dos dias com venda.
  const porSemana: number[][] = [[], [], [], [], [], [], []]
  for (let d = 1; d <= hojeDia; d++) {
    if (porDia[d - 1] > 0) porSemana[diaDaSemana(`${MES_REF}-${String(d).padStart(2, '0')}`)].push(porDia[d - 1])
  }
  const todos = porSemana.flat()
  const mediaGeral = todos.length ? todos.reduce((s, v) => s + v, 0) / todos.length : 0
  const media = porSemana.map((l) => (l.length ? l.reduce((s, v) => s + v, 0) / l.length : mediaGeral))
  const proj: number[] = [a]
  for (let d = hojeDia + 1; d <= ultimoDia; d++) {
    a += media[diaDaSemana(`${MES_REF}-${String(d).padStart(2, '0')}`)]
    proj.push(a)
  }
  const idx = pontoEquilibrio > 0 ? acum.findIndex((v) => v >= pontoEquilibrio) : -1
  return { ultimoDia, hojeDia, acum, proj, cruzouDia: idx >= 0 ? idx + 1 : null, fechaEm: proj[proj.length - 1] }
}

export function leituraAcumulado(ac: Acumulado, pontoEquilibrio: number, meta: number): string {
  const brl = (n: number) => `R$ ${Math.round(n).toLocaleString('pt-BR')}`
  const mes = nomeCurtoDoMes(MES_REF)
  if (ac.acum[ac.acum.length - 1] <= 0) return 'Assim que as vendas do mês forem lançadas, o caminho até o ponto de equilíbrio aparece aqui.'
  const partes: string[] = []
  if (pontoEquilibrio <= 0) partes.push('Lance as contas fixas pra calcular o ponto de equilíbrio.')
  else if (ac.cruzouDia) partes.push(`O ponto de equilíbrio (${brl(pontoEquilibrio)}) foi coberto no dia ${ac.cruzouDia}.`)
  else partes.push(`Faltam ${brl(pontoEquilibrio - ac.acum[ac.acum.length - 1])} pra cobrir o ponto de equilíbrio (${brl(pontoEquilibrio)}).`)
  if (ac.hojeDia >= ac.ultimoDia) {
    partes.push(`${mes.charAt(0).toUpperCase() + mes.slice(1)} fechou em ${brl(ac.fechaEm)}${meta > 0 ? (ac.fechaEm >= meta ? `, acima da meta de ${brl(meta)}.` : `, abaixo da meta de ${brl(meta)}.`) : '.'}`)
  } else {
    partes.push(`No ritmo dos últimos dias, ${mes} fecha perto de ${brl(ac.fechaEm)}${meta > 0 ? (ac.fechaEm >= meta ? `, acima da meta de ${brl(meta)}.` : `, abaixo da meta de ${brl(meta)}.`) : '.'}`)
  }
  return partes.join(' ')
}

/* ------------------------- Dias que mais vendem ----------------------- */

export interface MediaDia {
  rot: string
  nome: string
  media: number
}

/** Média de venda por dia da semana, nos dias com venda do mês corrente. */
export function mediaPorDiaDaSemana(receitaDia: ReceitaDiaDoc[]): MediaDia[] {
  const grupos: number[][] = [[], [], [], [], [], [], []]
  for (const r of receitaDia) {
    if (r.data.slice(0, 7) !== MES_REF) continue
    const t = totalDia(r)
    if (t > 0) grupos[diaDaSemana(r.data)].push(t)
  }
  return grupos.map((l, i) => ({
    rot: ROTULOS_DIA[i],
    nome: NOMES_DIA[i],
    media: l.length ? l.reduce((s, v) => s + v, 0) / l.length : 0,
  }))
}

export function leituraDias(dias: MediaDia[]): string {
  const com = dias.filter((d) => d.media > 0)
  if (com.length < 2) return ''
  const ord = [...com].sort((a, b) => b.media - a.media)
  const total = com.reduce((s, d) => s + d.media, 0)
  const share = Math.round(((ord[0].media + ord[1].media) / total) * 100)
  const fraco = ord[ord.length - 1]
  return `${cap(ord[0].nome)} e ${ord[1].nome} respondem por ${share}% do que entra. ${cap(fraco.nome)} é o dia mais fraco.`
}

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/* ---------------------------- Históricos 6m --------------------------- */

export interface PontoMes {
  mes: string
  valor: number
}

function ultimosSeisMeses(): string[] {
  const meses: string[] = []
  let m = MES_REF
  for (let i = 0; i < 6; i++) {
    meses.unshift(m)
    m = mesAnterior(m)
  }
  return meses
}

const temLancamento = (ctx: Contexto, mes: string) =>
  ctx.despesas.some((d) => d.dataCompetencia.slice(0, 7) === mes) || ctx.receitaDia.some((r) => r.data.slice(0, 7) === mes)

/** Lucro líquido dos últimos 6 meses, pelo mesmo DRE da tela de DRE. Meses sem lançamento ficam de fora. */
export function historicoSobrou(ctx: Contexto): PontoMes[] {
  return ultimosSeisMeses()
    .filter((mes) => temLancamento(ctx, mes))
    .map((mes) => ({ mes, valor: dreDoMes(ctx, mes).lucroLiquido }))
}

/** Despesas com compras ÷ receita bruta, mês a mês. Mês sem venda não tem % e fica de fora. */
export function historicoCompras(ctx: Contexto): PontoMes[] {
  return ultimosSeisMeses()
    .map((mes) => {
      const bruta = faturamento(ctx.receitaDia.filter((r) => r.data.slice(0, 7) === mes))
      const compras = ctx.despesas
        .filter((d) => d.dataCompetencia.slice(0, 7) === mes && ehCompra(d))
        .reduce((s, d) => s + d.valorTotal, 0)
      return { mes, valor: bruta > 0 ? (compras / bruta) * 100 : NaN }
    })
    .filter((p) => !Number.isNaN(p.valor))
}

export function leituraCompras(h: PontoMes[], teto: number): string {
  if (!h.length) return ''
  const atual = h[h.length - 1]
  const mes = nomeCurtoDoMes(atual.mes)
  const fmt = (n: number) => n.toFixed(1).replace('.', ',')
  const ref = `${fmt(atual.valor)}% em ${mes}, ${atual.valor > teto ? `acima do teto de ${fmt(teto)}%` : `dentro do teto de ${fmt(teto)}%`}`
  const ant = h[h.length - 2]
  if (!ant) return `Despesas com compras ficaram em ${ref}.`
  const dif = atual.valor - ant.valor
  if (Math.abs(dif) < 0.05) return `Despesas com compras ficaram em ${ref}, no mesmo patamar de ${nomeCurtoDoMes(ant.mes)}.`
  return `Despesas com compras ${dif > 0 ? 'subiram' : 'caíram'} ${fmt(Math.abs(dif))} p.p. desde ${nomeCurtoDoMes(ant.mes)} e ficaram em ${ref}.`
}

/* -------------------------- Semana / intervalo ------------------------ */

export function leituraBarras(barras: { rotulo: string; entrou: number; saiu: number }[]): string {
  const com = barras.filter((b) => b.entrou > 0)
  if (!com.length) return 'Assim que houver venda e despesa lançadas no período, o entrou × saiu aparece aqui.'
  const melhor = [...com].sort((a, b) => b.entrou - a.entrou)[0]
  const saldo = barras.reduce((s, b) => s + b.entrou - b.saiu, 0)
  const brl = (n: number) => `R$ ${Math.round(Math.abs(n)).toLocaleString('pt-BR')}`
  return `${melhor.rotulo} foi o que mais vendeu (${brl(melhor.entrou)}). No período, ${saldo >= 0 ? `sobraram ${brl(saldo)}` : `faltaram ${brl(saldo)}`}. A linha de baixo é o saldo de cada barra.`
}

/* ---------------------------- Receita/Compras ------------------------- */

export function recDoPeriodo(ctx: Contexto, f: Filtro): ReceitaDiaDoc[] {
  return ctx.receitaDia.filter((r) => noPeriodo(r.data, f))
}
export function recDoPeriodoAnterior(ctx: Contexto, f: Filtro): ReceitaDiaDoc[] {
  const dentro = dentroDoPeriodoAnterior(f)
  return ctx.receitaDia.filter((r) => dentro(r.data))
}

/** Texto do período pro subtítulo do gráfico ("20 a 26 de julho"). */
export function rotuloDoPeriodo(f: Filtro): string {
  const curto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
  if (typeof f !== 'string') return f.de === f.ate ? curto(f.de) : `${curto(f.de)} a ${curto(f.ate)}`
  if (f === 'mes') return nomeDoMes(MES_REF)
  const ini = new Date(HOJE)
  ini.setDate(HOJE.getDate() - 6)
  return `${curto(isoDoDia(ini))} a ${curto(isoDoDia(HOJE))}`
}
