import { useSyncExternalStore } from 'react'
import type { Filtro } from '@/types'

/**
 * Semana | Mês | intervalo de datas é UM filtro só pro painel inteiro. Antes
 * cada página guardava o seu próprio estado: o dono escolhia "Semana" no
 * Dashboard, ia pra Despesas e encontrava o mês de volta.
 */
let atual: Filtro = 'mes'
const ouvintes = new Set<() => void>()

function assinar(fn: () => void) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

function trocar(f: Filtro) {
  const igual =
    typeof f === 'string' || typeof atual === 'string' ? f === atual : f.de === atual.de && f.ate === atual.ate
  if (igual) return
  atual = f
  ouvintes.forEach((fn) => fn())
}

export function usePeriodo(): [Filtro, (f: Filtro) => void] {
  const f = useSyncExternalStore(assinar, () => atual)
  return [f, trocar]
}

/** Pedaço do nome do arquivo exportado: 'semana', 'AAAA-MM' ou 'de_ate'. */
export function sufixoDoFiltro(f: Filtro, mesRef: string): string {
  return typeof f === 'string' ? (f === 'semana' ? 'semana' : mesRef) : `${f.de}_${f.ate}`
}

/** '2026-09-01' → '01/09'. */
const curto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Texto do intervalo pro botão do seletor: '01/09 – 18/09'. */
export function rotuloIntervalo(i: { de: string; ate: string }): string {
  return i.de === i.ate ? curto(i.de) : `${curto(i.de)} – ${curto(i.ate)}`
}
