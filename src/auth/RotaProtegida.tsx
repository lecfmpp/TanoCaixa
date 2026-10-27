import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Logo } from '@/components/ui/Logo'
import { ErroDeSessao } from './ErroDeSessao'

/** Só deixa passar quem tem sessão; senão manda pro login. */
export function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, carregando, erroSessao } = useAuth()
  const local = useLocation()

  if (carregando) {
    return (
      <div className="grid min-h-dvh place-items-center bg-fundo-app">
        <div className="animate-pulse">
          <Logo tom="escuro" tamanho={26} />
        </div>
      </div>
    )
  }

  if (!sessao && erroSessao) {
    return (
      <div className="grid min-h-dvh place-items-center bg-fundo-app px-4">
        <div className="w-full max-w-[400px]">
          <div className="mb-6">
            <Logo tom="escuro" tamanho={24} />
          </div>
          <ErroDeSessao />
        </div>
      </div>
    )
  }

  if (!sessao) return <Navigate to="/entrar" replace state={{ voltar: local.pathname + local.search }} />

  return <>{children}</>
}
