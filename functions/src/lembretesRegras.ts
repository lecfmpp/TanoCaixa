/* ------------------------------------------------------------------ *
 * Regras (puras) de quando cada lembrete deve sair. Testáveis sem Firebase.
 * ------------------------------------------------------------------ */

export interface AtividadeMin {
  acao: string
  criadoEm: string // ISO
  quem?: string
  origem?: string
}

const ehNota = (a: AtividadeMin) => a.acao === 'lançou a nota do'

/**
 * "Notas do dia": lembrar só quem tem o hábito de lançar nota (pelo menos uma
 * nos últimos 14 dias) e ainda não lançou hoje. Quem nunca lança nota, ou já
 * lançou, não recebe nada. `inicioDoDia` é o ISO da meia-noite de hoje (SP).
 */
export function deveLembrarNotasDoDia(atividades: AtividadeMin[], inicioDoDia: string): boolean {
  const notas = atividades.filter((a) => ehNota(a) && a.origem !== 'integracao')
  if (!notas.length) return false
  return !notas.some((a) => a.criadoEm >= inicioDoDia)
}
