/* ------------------------------------------------------------------ *
 * Fluxo de caixa: o que tem pra pagar no dia, na semana ou no mês.
 *
 * Cada conta cai no dia do VENCIMENTO (sem vencimento, no dia da entrada).
 * Nota com mais de um lançamento (alimento + bebida) vira UMA linha — quem
 * paga o boleto paga a nota inteira. O juro pago vira lançamento à parte
 * (`jurosDe`), e aqui ele aparece colado na conta de origem, não sozinho.
 * ------------------------------------------------------------------ */
import { ehCompra } from './compras'
import type { DespesaDoc } from './types'

export type Janela = 'dia' | 'semana' | 'mes'

export interface ContaDoFluxo {
  /** Id da nota, ou do lançamento quando ele veio avulso. */
  id: string
  natureza: 'nota' | 'conta'
  fornecedor: string
  descricao?: string
  categoria: DespesaDoc['categoria']
  formaPagamento: DespesaDoc['formaPagamento']
  /** Valor do boleto (soma dos lançamentos, sem juros). */
  valor: number
  /** 'YYYY-MM-DD' — o dia em que a conta cai no fluxo. */
  dia: string
  temVencimento: boolean
  pago: boolean
  pagoEm?: string
  pagoPorNome?: string
  juros: number
  lancamentos: DespesaDoc[]
}

/** Agrupa os lançamentos em contas a pagar (o juro não entra como conta própria). */
export function contasDoFluxo(despesas: DespesaDoc[]): ContaDoFluxo[] {
  const grupos = new Map<string, DespesaDoc[]>()
  for (const d of despesas) {
    if (d.jurosDe) continue
    const chave = ehCompra(d) && d.notaId ? d.notaId : d.id
    grupos.set(chave, [...(grupos.get(chave) ?? []), d])
  }
  return [...grupos.entries()].map(([id, lancs]) => {
    const venc = lancs.map((l) => l.dataVencimento?.slice(0, 10)).filter((v): v is string => !!v).sort()[0]
    const base = lancs[0]
    const pago = lancs.every((l) => l.status === 'pago')
    return {
      id,
      natureza: ehCompra(base) ? 'nota' : 'conta',
      fornecedor: base.fornecedor,
      descricao: base.descricao,
      categoria: base.categoria,
      formaPagamento: base.formaPagamento,
      valor: lancs.reduce((s, l) => s + l.valorTotal, 0),
      dia: venc ?? base.dataCompetencia.slice(0, 10),
      temVencimento: !!venc,
      pago,
      pagoEm: pago ? lancs.map((l) => l.pagoEm).filter((v): v is string => !!v).sort().pop() : undefined,
      pagoPorNome: pago ? lancs.find((l) => l.pagoPorNome)?.pagoPorNome : undefined,
      juros: lancs.reduce((s, l) => s + (l.juros ?? 0), 0),
      lancamentos: lancs,
    }
  })
}

const DIA_MS = 86_400_000
const paraUTC = (iso: string) => {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}
const isoUTC = (d: Date) => d.toISOString().slice(0, 10)

/** Soma `n` dias a um 'YYYY-MM-DD'. */
export function somarDias(iso: string, n: number): string {
  return isoUTC(new Date(paraUTC(iso).getTime() + n * DIA_MS))
}

/**
 * Primeiro e último dia da janela que contém `ref`. A semana vai de segunda
 * a domingo — é como o dono pensa "as contas da semana".
 */
export function limitesDaJanela(janela: Janela, ref: string): { de: string; ate: string } {
  if (janela === 'dia') return { de: ref, ate: ref }
  if (janela === 'semana') {
    const dow = (paraUTC(ref).getUTCDay() + 6) % 7 // segunda = 0
    const de = somarDias(ref, -dow)
    return { de, ate: somarDias(de, 6) }
  }
  const d = paraUTC(ref)
  const fim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
  return { de: `${ref.slice(0, 7)}-01`, ate: isoUTC(fim) }
}

/** A janela anterior (-1) ou a seguinte (+1), a partir da referência. */
export function moverJanela(janela: Janela, ref: string, passo: -1 | 1): string {
  if (janela === 'dia') return somarDias(ref, passo)
  if (janela === 'semana') return somarDias(ref, 7 * passo)
  const d = paraUTC(ref)
  return isoUTC(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + passo, 1)))
}

/** Juro = o que passou do boleto. Pagar menos não vira juro negativo. */
export function jurosDoPagamento(valorBoleto: number, valorPago: number): number {
  return Math.max(0, Math.round((valorPago - valorBoleto) * 100) / 100)
}
