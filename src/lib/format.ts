/* ------------------------------------------------------------------ *
 * Formatação pt-BR. Todo valor monetário sai em R$ com 2 casas.
 * Renderize sempre dentro de <span class="mono"> alinhado à direita.
 * ------------------------------------------------------------------ */

const moedaBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numeroBRL = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

/** R$ 12.345,67 */
export function brl(valor: number): string {
  return moedaBRL.format(valor)
}

const moedaBRLInteira = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

/** R$ 47.320 — sem centavos (cartões do painel). */
export function brlInteiro(valor: number): string {
  return moedaBRLInteira.format(valor)
}

/** R$ 12 mil / R$ 1,2 mi — versão curta para rótulos apertados. */
export function brlCurto(valor: number): string {
  const abs = Math.abs(valor)
  const sinal = valor < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sinal}R$ ${numeroBRL.format(abs / 1_000_000)} mi`
  if (abs >= 1_000) return `${sinal}R$ ${Math.round(abs / 1000)} mil`
  return brl(valor)
}

/** 29,9% (1 casa por padrão). */
export function pct(valor: number, casas = 1): string {
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`
}

/** 1.234 (inteiro pt-BR). */
export function inteiro(valor: number): string {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

const nomesDia = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** "hoje, 19:42", "ontem, 08:10", "ter, 22/07, 14:03" */
export function quando(data: Date, agora: Date = new Date()): string {
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const mesmoDia = data.toDateString() === agora.toDateString()
  const ontem = new Date(agora)
  ontem.setDate(agora.getDate() - 1)
  const ehOntem = data.toDateString() === ontem.toDateString()
  if (mesmoDia) return `hoje, ${hora}`
  if (ehOntem) return `ontem, ${hora}`
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${nomesDia[data.getDay()]}, ${dia}/${mes}, ${hora}`
}

/* ------------------------------ Máscaras -------------------------------- */

/** Só os dígitos de uma string. */
export const apenasDigitos = (v: string) => v.replace(/\D/g, '')

/** (21) 99814-2207 — aceita fixo (10) e celular (11 dígitos). */
export function mascararTelefone(v: string): string {
  const d = apenasDigitos(v).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** 12.345.678/0001-90 */
export function mascararCNPJ(v: string): string {
  const d = apenasDigitos(v).slice(0, 14)
  let out = d.slice(0, 2)
  if (d.length > 2) out += '.' + d.slice(2, 5)
  if (d.length > 5) out += '.' + d.slice(5, 8)
  if (d.length > 8) out += '/' + d.slice(8, 12)
  if (d.length > 12) out += '-' + d.slice(12, 14)
  return out
}

/** "22/07" */
export function dataCurta(data: Date): string {
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}
