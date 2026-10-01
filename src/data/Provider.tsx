import { useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/auth/AuthContext'
import { seedDemoSeVazio } from './seed'
import { DEMO_TENANT } from './tenant'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

/**
 * Provider de dados: React Query + seed do tenant de demonstração.
 *
 * O seed só roda quando alguém ENTRA na demonstração. Antes rodava a cada
 * visita (inclusive de quem tem conta real), escrevendo no tenant de exemplo
 * sem necessidade. Conta real nunca lê nem escreve o tenant demo.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { sessao } = useAuth()
  const demo = sessao?.demo ?? false

  useEffect(() => {
    if (!demo) return
    seedDemoSeVazio(DEMO_TENANT)
      .then(() => queryClient.invalidateQueries())
      .catch((e) => console.warn('seed:', e))
  }, [demo])

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
