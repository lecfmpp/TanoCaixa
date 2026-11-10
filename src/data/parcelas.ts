/* ------------------------------------------------------------------ *
 * Parcelas de uma nota fiscal: um boleto com vários vencimentos, cada um
 * com o seu valor (ex.: 3 parcelas de R$ 1.200, R$ 1.200 e R$ 1.100).
 *
 * A nota já vira um lançamento por conta do DRE (alimento, bebida…). Com
 * parcelas, cada conta vira um lançamento POR PARCELA: mesma nota (`notaId`
 * e número), vencimento e valor da parcela. O DRE continua lendo a compra na
 * data da nota (competência); o contas a pagar lê cada parcela no seu dia.
 * ------------------------------------------------------------------ */
import type { DespesaDoc } from './types'

/** Parcela como o formulário manda: vencimento + valor da parcela inteira. */
export interface ParcelaEntrada {
  vencimento: string
  valor: number
  /** Ao corrigir a nota, a parcela que já estava paga continua paga. */
  status?: DespesaDoc['status']
  pagoEm?: string
  pagoPorNome?: string
}

/** Parcela remontada a partir dos lançamentos gravados. */
export interface ParcelaDaNota {
  numero: number
  vencimento?: string
  valor: number
  pago: boolean
  pagoEm?: string
  pagoPorNome?: string
}

export const MAX_PARCELAS = 12

const cent = (v: number) => Math.round(v * 100)

/**
 * Divide o valor de cada conta entre as parcelas, em centavos, de modo que:
 *  - cada PARCELA some exatamente o valor do boleto daquela parcela;
 *  - cada CONTA some exatamente o valor dela.
 * Devolve `matriz[conta][parcela]` em reais. Exige que os dois totais batam.
 */
export function dividirEmParcelas(valoresPorConta: number[], valoresDasParcelas: number[]): number[][] {
  const contas = valoresPorConta.map(cent)
  const parcelas = valoresDasParcelas.map(cent)
  const total = contas.reduce((s, v) => s + v, 0)
  if (total !== parcelas.reduce((s, v) => s + v, 0)) {
    throw new Error('A soma das parcelas precisa ser igual ao total da nota.')
  }
  const nC = contas.length
  const nP = parcelas.length
  const m = contas.map(() => parcelas.map(() => 0))
  for (let p = 0; p < nP - 1; p++) {
    let usado = 0
    for (let c = 0; c < nC - 1; c++) {
      m[c][p] = total > 0 ? Math.round((contas[c] * parcelas[p]) / total) : 0
      usado += m[c][p]
    }
    m[nC - 1][p] = parcelas[p] - usado
  }
  // Última parcela fecha cada conta no centavo.
  for (let c = 0; c < nC; c++) {
    let usado = 0
    for (let p = 0; p < nP - 1; p++) usado += m[c][p]
    m[c][nP - 1] = contas[c] - usado
  }
  return m.map((linha) => linha.map((v) => v / 100))
}

/** Divide um total em `n` parcelas iguais; os centavos que sobram vão nas primeiras. */
export function dividirIgual(total: number, n: number): number[] {
  if (n < 1) return []
  const t = cent(total)
  const base = Math.floor(t / n)
  const resto = t - base * n
  return Array.from({ length: n }, (_, i) => (base + (i < resto ? 1 : 0)) / 100)
}

/** Soma em reais sem erro de ponto flutuante. */
export function somar(valores: number[]): number {
  return valores.reduce((s, v) => s + cent(v), 0) / 100
}

/** Junta os lançamentos de uma nota em parcelas (vazio quando a nota não é parcelada). */
export function parcelasDaNota(lancamentos: DespesaDoc[]): ParcelaDaNota[] {
  if (!lancamentos.some((l) => (l.parcelas ?? 1) > 1)) return []
  const porNumero = new Map<number, DespesaDoc[]>()
  for (const l of lancamentos) {
    const n = l.parcela ?? 1
    porNumero.set(n, [...(porNumero.get(n) ?? []), l])
  }
  return [...porNumero.entries()]
    .sort(([a], [b]) => a - b)
    .map(([numero, ls]) => {
      const pago = ls.every((l) => l.status === 'pago')
      return {
        numero,
        vencimento: ls.map((l) => l.dataVencimento?.slice(0, 10)).find(Boolean),
        valor: somar(ls.map((l) => l.valorTotal)),
        pago,
        pagoEm: pago ? ls.map((l) => l.pagoEm).filter((v): v is string => !!v).sort().pop() : undefined,
        pagoPorNome: pago ? ls.find((l) => l.pagoPorNome)?.pagoPorNome : undefined,
      }
    })
}

/** "Parcela 2 de 3" — vazio quando o lançamento não é parcelado. */
export function rotuloParcela(d: Pick<DespesaDoc, 'parcela' | 'parcelas'>): string {
  return d.parcelas && d.parcelas > 1 ? `Parcela ${d.parcela ?? 1} de ${d.parcelas}` : ''
}
