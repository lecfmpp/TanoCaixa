import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Logo } from '@/components/ui/Logo'

/** Só deixa passar quem tem sessão; senão manda pro login. */
export function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="grid min-h-dvh place-items-center bg-fundo-app">
        <div className="animate-pulse">
          <Logo tom="escuro" tamanho={26} />
        </div>
      </div>
    )
  }

  if (!sessao) return <Navigate to="/entrar" replace />

  return <>{children}</>
}
