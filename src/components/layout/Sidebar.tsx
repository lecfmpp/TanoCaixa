import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { itensNav } from './nav'
import { useAuth } from '@/auth/AuthContext'
import { numerosPendentes, useRede, useRestaurante } from '@/data/hooks'
import { temRede } from '@/types'

/** Barra lateral 236px cor Mar, menu em texto (sem ícones). */
export function Sidebar({ aoNavegar }: { aoNavegar?: () => void }) {
  const { sessao, permissoes, sair } = useAuth()
  const usuario = sessao?.usuario

  // "Rede" só faz sentido pra quem opera mais de uma loja — ou pra quem já
  // criou a rede. Loja única não vê o item.
  const cfg = useRestaurante().data
  const rede = useRede().data
  const mostraRede = !!rede || temRede(cfg?.tipoNegocio) || usuario?.papel === 'franqueador'
  const pendente = numerosPendentes(cfg)
  const itens = itensNav.filter((i) => !i.oculto && permissoes?.[i.chave] && (!i.para.match(/\/(rede|franquias)$/) || mostraRede))

  return (
    <nav className="flex h-full w-[236px] shrink-0 flex-col bg-mar text-creme">
      <div className="px-6 pt-6 pb-6">
        <Logo tom="claro" tamanho={18} href="/painel" />
      </div>

      {/* O menu ocupa o meio inteiro: o card de progresso da contagem que ficava
       * ancorado aqui embaixo comia a altura da lista e escondia os últimos
       * itens — e ainda mostrava "10 de 10" fixo, vindo do mock. */}
      <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4">
        {itens.map((item) => (
          <li key={item.para}>
            {item.recurso === 'pdv' ? (
              <span
                aria-disabled
                title="O PDV está chegando"
                className="block cursor-not-allowed rounded-botao px-4 py-2.5 text-[15px] font-medium text-creme/40"
              >
                {item.rotulo}
                <span className="ml-2 rounded-chip bg-sol/25 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-sol">em breve</span>
              </span>
            ) : (
            <NavLink
              to={item.para}
              end={item.para === '/painel'}
              onClick={aoNavegar}
              className={({ isActive }) =>
                cn(
                  'block rounded-botao px-4 py-2.5 text-[15px] transition',
                  isActive
                    ? 'bg-white/12 font-bold text-creme'
                    : 'font-medium text-creme/70 hover:bg-white/6 hover:text-creme',
                )
              }
            >
              {item.rotulo}
              {item.alertaNumeros && pendente && (
                <span
                  title="Falta conferir faturamento e meta"
                  className="ml-2 inline-grid h-[18px] w-[18px] place-items-center rounded-full bg-sol align-middle text-[11px] font-extrabold text-noite"
                >
                  !
                </span>
              )}
              {item.emBreve && (
                <span className="ml-2 rounded-chip bg-sol/25 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-sol">em breve</span>
              )}
            </NavLink>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-white/10">
        {usuario && (
          <NavLink
            to="/painel/perfil"
            onClick={aoNavegar}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-6 py-3.5 transition hover:bg-white/6',
                isActive && 'bg-white/12',
              )
            }
          >
            <Avatar inicial={usuario.avatarInicial} cor={usuario.avatarCor} foto={usuario.photoURL} tamanho={30} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-creme">{usuario.nome}</span>
              <span className="block truncate text-xs text-creme/60">Ver perfil</span>
            </span>
          </NavLink>
        )}
        <NavLink
          to="/painel/assinatura"
          onClick={aoNavegar}
          className={({ isActive }) =>
            cn('block px-6 py-2 text-sm text-creme/70 transition hover:text-creme', isActive && 'text-creme')
          }
        >
          Assinatura
        </NavLink>
        <button
          onClick={sair}
          className="w-full px-6 py-3 text-left text-sm text-creme/70 transition hover:text-creme"
        >
          Sair da conta
        </button>
      </div>
    </nav>
  )
}
