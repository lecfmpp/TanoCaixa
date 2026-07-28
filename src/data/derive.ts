import type { CategoriaDespesa } from '@/types'
import type { DespesaDoc, ReceitaDiaDoc, RestauranteDoc } from './types'

/** "Hoje" de referência da demonstração. */
export const HOJE = new Date(2026, 6, 28)

export interface Contexto {
  despesas: DespesaDoc[]
  receitaDia: ReceitaDiaDoc[]
  config: RestauranteDoc | null
}

/** Ponto de equilíbrio — custos fixos / margem de contribuição típica. */
const MARGEM_CONTRIBUICAO = 0.415

function noPeriodo(iso: string, periodo: 'semana' | 'mes'): boolean {
  const d = new Date(iso)
  if (periodo === 'mes') return d.getMonth() === HOJE.getMonth() && d.getFullYear() === HOJE.getFullYear()
  const seteDias = new Date(HOJE)
  seteDias.setDate(HOJE.getDate() - 7)
  return d > seteDias && d <= HOJE
}

function somaCategoria(despesas: DespesaDoc[], cat: CategoriaDespesa): number {
  return despesas.filter((d) => d.categoria === cat).reduce((s, d) => s + d.valorTotal, 0)
}

function faturamento(receita: ReceitaDiaDoc[]): number {
  return receita.reduce((s, r) => s + r.canais.reduce((a, c) => a + c.valorBruto, 0), 0)
}

function semanaDoMes(iso: string): number {
  const dia = new Date(iso).getDate()
  return Math.min(4, Math.ceil(dia / 7))
}

export interface ResumoInicio {
  entrou: number
  saiu: number
  sobrou: number
  margem: number
  pontoEquilibrio: number
  barras: { rotulo: string; entrou: number; saiu: number }[]
  cmv: number
  pessoal: number
  apps: number
  ocupacao: number
  imposto: number
  sobrouFinal: number
}

export function resumoInicio(ctx: Contexto, periodo: 'semana' | 'mes'): ResumoInicio {
  const desp = ctx.despesas.filter((d) => noPeriodo(d.dataCompetencia, periodo))
  const rec = ctx.receitaDia.filter((r) => noPeriodo(r.data, periodo))
  const entrou = faturamento(rec)
  const saiu = desp.reduce((s, d) => s + d.valorTotal, 0)
  const cmv = somaCategoria(desp, 'mercadoria')
  const pessoal = somaCategoria(desp, 'pessoal')
  const apps = somaCategoria(desp, 'taxas_app')
  const ocupacao = somaCategoria(desp, 'ocupacao')
  const sobrou = entrou - saiu
  const aliquota = ctx.config?.aliquotaImposto ?? 0.06
  const imposto = Math.round(entrou * aliquota)
  const custosFixos = pessoal + ocupacao
  const pontoEquilibrio = Math.round(custosFixos / MARGEM_CONTRIBUICAO / 100) * 100

  // Barras por semana (mês) — no modo semana, agrupa por dia.
  let barras: ResumoInicio['barras']
  if (periodo === 'mes') {
    const sem = [1, 2, 3, 4].map((n) => ({
      rotulo: `${n}ª sem`,
      entrou: rec.filter((r) => semanaDoMes(r.data) === n).reduce((s, r) => s + r.canais.reduce((a, c) => a + c.valorBruto, 0), 0),
      saiu: desp.filter((d) => semanaDoMes(d.dataCompetencia) === n).reduce((s, d) => s + d.valorTotal, 0),
    }))
    barras = sem
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
    margem: entrou ? (sobrou / entrou) * 100 : 0,
    pontoEquilibrio,
    barras,
    cmv,
    pessoal,
    apps,
    ocupacao,
    imposto,
    sobrouFinal: sobrou - imposto,
  }
}

/** Resumo dos cartões da página Despesas. */
export function despesasResumo(despesas: DespesaDoc[]) {
  const saiu = despesas.reduce((s, d) => s + d.valorTotal, 0)
  const pago = despesas.filter((d) => d.status === 'pago').reduce((s, d) => s + d.valorTotal, 0)
  const aPagar = despesas.filter((d) => d.status !== 'pago').reduce((s, d) => s + d.valorTotal, 0)
  const em3 = new Date(HOJE)
  em3.setDate(HOJE.getDate() + 3)
  const vence3 = despesas
    .filter((d) => d.status !== 'pago' && d.dataVencimento && new Date(d.dataVencimento) <= em3)
    .reduce((s, d) => s + d.valorTotal, 0)
  return { saiu, pago, aPagar, vence3, contagem: despesas.length }
}

const ROTULO_CAT: Record<CategoriaDespesa, string> = {
  mercadoria: 'Mercadoria',
  pessoal: 'Pessoal',
  ocupacao: 'Ocupação',
  taxas_app: 'Taxas de app',
}

/** "Onde o dinheiro saiu" — categorias com valor e % do faturamento. */
export function categoriasResumo(despesas: DespesaDoc[], faturamentoBruto: number) {
  return (Object.keys(ROTULO_CAT) as CategoriaDespesa[]).map((cat) => {
    const valor = somaCategoria(despesas, cat)
    return { cat, nome: ROTULO_CAT[cat], valor, pct: faturamentoBruto ? (valor / faturamentoBruto) * 100 : 0 }
  })
}

/** Linhas do Plano do mês: teto × realizado × status. */
export function planoLinhas(ctx: Contexto) {
  const desp = ctx.despesas.filter((d) => noPeriodo(d.dataCompetencia, 'mes'))
  const fat = faturamento(ctx.receitaDia.filter((r) => noPeriodo(r.data, 'mes')))
  const tetos = ctx.config?.tetos
  return (Object.keys(ROTULO_CAT) as CategoriaDespesa[]).map((cat) => {
    const valor = somaCategoria(desp, cat)
    const realPct = fat ? (valor / fat) * 100 : 0
    const teto = tetos?.[cat] ?? 0
    let status: 'tranquilo' | 'quase' | 'estourou' = 'tranquilo'
    if (realPct > teto + 1) status = 'estourou'
    else if (realPct > teto) status = 'quase'
    return { cat, nome: ROTULO_CAT[cat], teto, realPct, valor, status }
  })
}
