import { useAuth } from './AuthContext'
import { useTenant } from '@/data/hooks'
import { siteLiberadoPara } from '@site/modelo'

/**
 * "Meu site" (site do cliente em {sub}.tanocaixa.com.br) está em teste: só as
 * contas e lojas liberadas em functions/src/site/modelo.ts veem o item no menu
 * e abrem a tela. As functions publicarSite/despublicarSite conferem a mesma
 * lista, então não dá para publicar por fora da interface.
 */
export function useSiteLiberado(): boolean {
  const { sessao } = useAuth()
  const tenant = useTenant()
  if (!sessao) return false
  // A demonstração LOCAL enxerga, pra dar pra desenvolver e testar sem login.
  if (import.meta.env.DEV && sessao.demo) return true
  return siteLiberadoPara(sessao.usuario.email, tenant)
}
