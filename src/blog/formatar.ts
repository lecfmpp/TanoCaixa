/** Formatação pt-BR. Funciona igual no servidor (pré-render) e no navegador. */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brlInteiro = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const percentual = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })

/** R$ 1.234,56 (espaço sem quebra, como o Intl entrega). */
export function formatarBRL(v: number, semCentavos = false): string {
  if (!Number.isFinite(v)) return '—'
  return (semCentavos ? brlInteiro : brl).format(v)
}

/** 12,5% */
export function formatarPct(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return `${percentual.format(v)}%`
}

export function formatarNumero(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return numero.format(v)
}

/** Aceita "1.234,56", "1234,56" e "1234.56". Vazio ou inválido vira 0. */
export function lerNumero(texto: string): number {
  const t = texto.trim().replace(/\s/g, '')
  if (!t) return 0
  const comVirgula = t.includes(',')
  const limpo = comVirgula ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(limpo)
  return Number.isFinite(n) ? n : 0
}

/** 2026-10-21 → 21 de outubro de 2026 */
export function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
  return `${d} de ${meses[m - 1]} de ${a}`
}

/** Identificador de âncora a partir do título (sem acento, kebab-case). */
export function slugificar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
}
