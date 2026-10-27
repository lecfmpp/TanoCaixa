/* ------------------------------------------------------------------ *
 * Escala dos eixos e formatos curtos de número dos gráficos. Puro (sem React),
 * testado em escala.test.mjs.
 * ------------------------------------------------------------------ */

export interface Escala {
  lo: number
  hi: number
  ticks: number[]
}

/** Escala "redonda" (passos 1/2/2,5/5 × 10ⁿ) que cobre [min, max], com até ~4 divisões. */
export function escala(min: number, max: number, incluiZero = true): Escala {
  const lo0 = incluiZero ? Math.min(0, min) : min
  const hi0 = incluiZero ? Math.max(0, max) : max
  const span = hi0 - lo0 || 1
  const bruto = span / 4
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? 10 * pot
  const lo = Math.floor(lo0 / passo) * passo
  const hi = Math.max(Math.ceil(hi0 / passo) * passo, lo + passo)
  const ticks: number[] = []
  for (let v = lo; v <= hi + passo / 1000; v += passo) ticks.push(Math.round(v * 1000) / 1000)
  return { lo, hi, ticks }
}

/** 56k, 7,5k, 104k, 1,2M, 800 — rótulo do eixo. A partir de 100k sem decimal (cabe em coluna estreita). */
export function compacto(n: number): string {
  const a = Math.abs(n)
  const sinal = n < 0 ? '-' : ''
  if (a >= 999_500) {
    // Sem isso o eixo de um restaurante que fatura R$ 10 milhões vira "10000k" e invade o gráfico.
    const m = Math.round((a / 1e6) * 10) / 10 // arredonda antes: 999,7 mil é "1M", não "1,0M"
    return `${sinal}${(Number.isInteger(m) ? String(m) : m >= 100 ? String(Math.round(m)) : m.toFixed(1)).replace('.', ',')}M`
  }
  if (a >= 1000) {
    const k = a / 1000
    return `${sinal}${(Number.isInteger(k) ? String(k) : k >= 100 ? String(Math.round(k)) : k.toFixed(1)).replace('.', ',')}k`
  }
  return `${sinal}${Math.round(a)}`
}

/** 8,1k — valor sobre a barra (sempre com 1 casa, sem "R$": cabe em 390px). */
export function curtoK(n: number): string {
  const a = Math.abs(n)
  const sinal = n < 0 ? '-' : ''
  if (a >= 999_500) return compacto(n) // 1,2M em vez de "1200,0k"
  return a >= 1000 ? `${sinal}${(a / 1000).toFixed(1).replace('.', ',')}k` : `${sinal}${Math.round(a)}`
}
