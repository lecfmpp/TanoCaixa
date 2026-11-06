import { useAuth } from './AuthContext'

/**
 * "Meu site" (site do cliente em {sub}.tanocaixa.com.br) está em teste: só
 * estas contas veem o item no menu e abrem a tela. A function publicarSite
 * confere a mesma lista (functions/src/site/index.ts), então não dá para
 * publicar por fora da interface.
 */
export const CONTAS_COM_SITE = ['lecfmpp@gmail.com', 'suporte@spoonconsultoria.com.br']

export function useSiteLiberado(): boolean {
  const { sessao } = useAuth()
  if (!sessao) return false
  // A demonstração LOCAL enxerga, pra dar pra desenvolver e testar sem login.
  if (import.meta.env.DEV && sessao.demo) return true
  return CONTAS_COM_SITE.includes(sessao.usuario.email.trim().toLowerCase())
}
