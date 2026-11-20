/* ------------------------------------------------------------------ *
 * Recado de segunda (regra pura): a semana passada (segunda a domingo,
 * Brasília) em três números, a comparação com a semana anterior e um
 * alerta, se houver. Semana sem nada lançado não gera recado.
 * ------------------------------------------------------------------ */
import { diaSP } from './lembretesTeste'

export interface Semana {
  de: string
  ate: string
}

function somaDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Semana anterior completa (segunda a domingo) e a de antes dela. */
export function semanasDoRecado(agora: Date): { passada: Semana; anterior: Semana } {
  const hoje = diaSP(agora)
  const dow = new Date(`${hoje}T12:00:00Z`).getUTCDay() // 0 = domingo
  const segundaDestaSemana = somaDias(hoje, -((dow + 6) % 7))
  const de = somaDias(segundaDestaSemana, -7)
  return {
    passada: { de, ate: somaDias(de, 6) },
    anterior: { de: somaDias(de, -7), ate: somaDias(de, -1) },
  }
}

export const brlInteiro = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export interface NumerosLoja {
  nome: string
  entrou: number
  saiu: number
  entrouAntes: number
  diasComVenda: number
}

const NOMES_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function variaveisRecado(n: NumerosLoja, diasSemVenda: string[] = []): Record<string, string> | null {
  if (n.entrou === 0 && n.saiu === 0) return null
  const saldo = n.entrou - n.saiu
  let comparacao = ''
  if (n.entrouAntes > 0) {
    const pct = Math.round(((n.entrou - n.entrouAntes) / n.entrouAntes) * 100)
    comparacao = pct === 0 ? 'Entrou o mesmo que na semana anterior.' : `Entrou ${Math.abs(pct)}% ${pct > 0 ? 'mais' : 'menos'} que na semana anterior.`
  }
  const alerta = diasSemVenda.length
    ? `${diasSemVenda.length === 1 ? 'Ficou sem lançamento' : 'Ficaram sem lançamento'}: ${diasSemVenda.map((d) => NOMES_DIA[new Date(`${d}T12:00:00Z`).getUTCDay()]).join(', ')}.`
    : saldo < 0
      ? 'A semana fechou com mais saída do que entrada.'
      : ''
  return { LOJA: n.nome, ENTROU: brlInteiro(n.entrou), SAIU: brlInteiro(n.saiu), SALDO: brlInteiro(saldo), COMPARACAO: comparacao, ALERTA: alerta }
}

export function diasDaSemana(s: Semana): string[] {
  return Array.from({ length: 7 }, (_, i) => somaDias(s.de, i))
}

export function variaveisRecadoRede(lojas: Array<{ nome: string; entrou: number }>): Record<string, string> | null {
  if (!lojas.length || lojas.every((l) => l.entrou === 0)) return null
  const total = lojas.reduce((s, l) => s + l.entrou, 0)
  const melhor = [...lojas].sort((a, b) => b.entrou - a.entrou)[0]
  const paradas = lojas.filter((l) => l.entrou === 0).map((l) => l.nome)
  return {
    N_LOJAS: String(lojas.length),
    TOTAL: brlInteiro(total),
    MELHOR_LOJA: `${melhor.nome} (${brlInteiro(melhor.entrou)})`,
    SEM_LANCAMENTO: paradas.length ? `${paradas.join(', ')} ${paradas.length === 1 ? 'ficou' : 'ficaram'} sem lançamento na semana.` : '',
  }
}
