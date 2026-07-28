import { useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { seedDemoSeVazio } from './seed'
import { DEMO_TENANT } from './tenant'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

/** Provider de dados: React Query + seed do tenant de demonstração. */
export function DataProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    seedDemoSeVazio(DEMO_TENANT)
      .catch((e) => console.warn('seed:', e))
      .finally(() => setPronto(true))
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {pronto ? children : children}
    </QueryClientProvider>
  )
}
