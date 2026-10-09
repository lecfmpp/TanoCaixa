import { useSyncExternalStore } from 'react'
import type { Periodo } from '@/types'

/**
 * Semana | Mês é UM filtro só pro painel inteiro. Antes cada página guardava o
 * seu próprio estado: o dono escolhia "Semana" no Dashboard, ia pra Despesas e
 * encontrava o mês de volta.
 */
let atual: Periodo = 'mes'
const ouvintes = new Set<() => void>()

function assinar(fn: () => void) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

function trocar(p: Periodo) {
  if (p === atual) return
  atual = p
  ouvintes.forEach((fn) => fn())
}

export function usePeriodo(): [Periodo, (p: Periodo) => void] {
  const p = useSyncExternalStore(assinar, () => atual)
  return [p, trocar]
}
