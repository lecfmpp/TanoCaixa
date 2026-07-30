/* ------------------------------------------------------------------ *
 * Loja que o painel está mostrando agora.
 *
 * Quem tem rede pode abrir o painel de qualquer loja sem trocar de conta:
 * o tenant vira o da loja escolhida e todo o resto (DRE, despesas, estoque)
 * segue junto, porque tudo já lê de `useTenant()`.
 *
 * Store externo em vez de context pra não criar ciclo de import com os
 * hooks de dados, e pra sobreviver a um F5 (fica na sessão do navegador).
 * ------------------------------------------------------------------ */

import { useSyncExternalStore } from 'react'

const CHAVE = 'tanocaixa:loja'

function ler(): string | null {
  try {
    return sessionStorage.getItem(CHAVE)
  } catch {
    return null
  }
}

let atual: string | null = ler()
const ouvintes = new Set<() => void>()

function inscrever(fn: () => void) {
  ouvintes.add(fn)
  return () => ouvintes.delete(fn)
}

/** `null` volta pra loja do próprio login. */
export function definirLojaAtiva(restauranteId: string | null): void {
  atual = restauranteId
  try {
    if (restauranteId) sessionStorage.setItem(CHAVE, restauranteId)
    else sessionStorage.removeItem(CHAVE)
  } catch {
    /* sessionStorage bloqueado — segue só em memória */
  }
  ouvintes.forEach((fn) => fn())
}

export function useLojaAtiva(): string | null {
  return useSyncExternalStore(inscrever, () => atual, () => null)
}
