/* ------------------------------------------------------------------ *
 * Assinatura e teste grátis, do jeito que o painel enxerga.
 *
 * Quem decide é o servidor (`statusAssinatura`, em functions/src/stripe.ts):
 * o fim do teste mora em `assinaturas/*`, que o app não grava. Se a consulta
 * falhar (sem rede, Functions fora do ar), o painel segue liberado — nunca
 * trava quem pagou por um erro nosso.
 * ------------------------------------------------------------------ */

import { useQuery } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useAuth } from '@/auth/AuthContext'

/** Espelho de DIAS_TESTE em functions/src/assinatura.ts. */
export const DIAS_TESTE = 14

export type Acesso = 'ativa' | 'pagamento_falhou' | 'teste' | 'bloqueada'

export interface StatusAssinatura {
  acesso: Acesso
  diasRestantes: number
  testeIniciadoEm: string | null
  testeAte: string
  /** Lojas cadastradas na conta (a rede inteira paga numa assinatura só). */
  lojas: number
  /** Lojas que a assinatura cobra hoje (null = ainda não assinou). */
  lojasAssinadas: number | null
  /** Pode assinar/gerenciar o pagamento (dono ou gestão da conta que paga). */
  responsavel: boolean
}

const statusFn = httpsCallable<{ restauranteId: string }, StatusAssinatura>(functions, 'statusAssinatura')

/** Situação da conta do login (não da loja ativa: a rede paga junto). Demo não tem. */
export function useAssinatura() {
  const { sessao } = useAuth()
  const rid = sessao && !sessao.demo ? sessao.tenantId : null
  return useQuery({
    queryKey: ['assinatura', rid],
    queryFn: async () => {
      try {
        return (await statusFn({ restauranteId: rid! })).data
      } catch (e) {
        console.warn('statusAssinatura:', e)
        return null
      }
    },
    enabled: !!rid,
    staleTime: 5 * 60 * 1000,
    // Voltando do checkout (?assinatura=ok), o webhook do Stripe leva uns
    // segundos: consulta de novo até a assinatura aparecer como ativa.
    refetchInterval: (q) =>
      window.location.search.includes('assinatura=ok') && q.state.data?.acesso !== 'ativa' ? 4000 : false,
    refetchOnWindowFocus: true,
  })
}

/** Quanto do teste já foi usado, de 0 a 1 (pra barra de progresso). */
export function progressoDoTeste(s: StatusAssinatura): number {
  return Math.min(1, Math.max(0, (DIAS_TESTE - s.diasRestantes) / DIAS_TESTE))
}

const convidarGestorFn = httpsCallable<{ restauranteId: string; email: string }, { url: string; enviado: boolean }>(
  functions,
  'convidarGestor',
)

/** Cadastra o gestor da loja: o convite vai pro e-mail e só ele aceita. */
export async function convidarGestor(restauranteId: string, email: string) {
  return (await convidarGestorFn({ restauranteId, email: email.trim().toLowerCase() })).data
}

export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

const portalFn = httpsCallable<{ restauranteId: string; returnUrl: string }, { url: string }>(functions, 'portalAssinatura')

/** Portal do Stripe (trocar cartão, faturas, cancelar). */
export async function abrirPortal(restauranteId: string) {
  const { url } = (await portalFn({ restauranteId, returnUrl: `${window.location.origin}/painel/assinatura` })).data
  window.location.href = url
}
