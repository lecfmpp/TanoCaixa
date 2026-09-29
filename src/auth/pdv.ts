import { useAuth } from './AuthContext'

/**
 * O PDV está em construção: por enquanto só estas contas o veem. Quem não está
 * na lista vê o item "PDV" no menu com a etiqueta "Em breve", desabilitado.
 *
 * É uma trava de interface — o objetivo é não expor tela pela metade, não
 * proteger dado (as coleções do PDV seguem as mesmas regras do restaurante).
 */
const CONTAS_COM_PDV = ['leandro@noboringfunnels.com']

export function usePdvLiberado(): boolean {
  const { sessao } = useAuth()
  if (!sessao) return false
  // Só a demonstração LOCAL enxerga o PDV, pra dar pra desenvolver e testar sem login.
  if (import.meta.env.DEV && sessao.demo) return true
  return CONTAS_COM_PDV.includes(sessao.usuario.email.trim().toLowerCase())
}
