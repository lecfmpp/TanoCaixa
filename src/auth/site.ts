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

/**
 * Página "Configurações" (abas de notificações de WhatsApp e Meu site) em
 * teste: só estas contas veem o item no menu e abrem a página. As demais
 * continuam com os lembretes de WhatsApp em Ajustes.
 */
export const CONTAS_COM_CONFIGURACOES = ['lecfmpp@gmail.com', 'suporte@spoonconsultoria.com.br']

export function useConfiguracoesLiberadas(): boolean {
  const { sessao } = useAuth()
  if (!sessao) return false
  if (import.meta.env.DEV && sessao.demo) return true
  return CONTAS_COM_CONFIGURACOES.includes(sessao.usuario.email.trim().toLowerCase())
}
