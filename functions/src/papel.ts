/** Espelho de src/types.ts (papéis) — Functions não compartilha bundle com o frontend. */
export type Papel = 'dono' | 'gestao' | 'caixa' | 'cozinha'

export function normalizarPapel(p: string | undefined): Papel {
  if (p === 'dono') return 'dono'
  if (p === 'gestao' || p === 'gerente' || p === 'contador') return 'gestao'
  if (p === 'caixa' || p === 'lancador') return 'caixa'
  return 'cozinha'
}
