import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { homeDoPapel, type Permissoes } from '@/types'

/**
 * Só renderiza a rota se o papel tiver a permissão; senão manda o usuário
 * pra sua página inicial (ex.: caixa cai no Caixa, não no DRE).
 */
export function ExigePermissao({
  chave,
  children,
}: {
  chave: keyof Permissoes
  children: ReactNode
}) {
  const { sessao, permissoes } = useAuth()
  if (permissoes && !permissoes[chave]) {
    return <Navigate to={sessao ? homeDoPapel(sessao.usuario.papel) : '/entrar'} replace />
  }
  return <>{children}</>
}
