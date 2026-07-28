import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { itensNav } from './nav'
import { useAuth } from '@/auth/AuthContext'

/** Barra lateral 236px cor Mar. Vira ícones no tablet, gaveta no celular. */
export function Sidebar({ aoNavegar }: { aoNavegar?: () => void }) {
  const { sessao, sair } = useAuth()
  const papel = sessao?.usuario.papel

  const itens = itensNav.filter((i) => !i.papeis || (papel && i.papeis.includes(papel)))

  return (
    <nav className="flex h-full w-[236px] shrink-0 flex-col bg-mar text-creme">
      <div className="px-5 pt-6 pb-5">
        <Logo tom="claro" tamanho={22} />
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {itens.map((item) => {
          const Icone = item.icone
          return (
            <li key={item.para}>
              <NavLink
                to={item.para}
                end={item.para === '/painel'}
                onClick={aoNavegar}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-botao px-3 py-2.5 text-sm transition',
                    isActive
                      ? 'bg-white/14 font-bold text-creme'
                      : 'font-medium text-creme/72 hover:bg-white/8 hover:text-creme',
                  )
                }
              >
                <Icone size={18} strokeWidth={1.75} className="shrink-0" />
                {item.rotulo}
              </NavLink>
            </li>
          )
        })}
      </ul>

      {/* Cartão de progresso da contagem de estoque */}
      <div className="mx-3 mb-3 rounded-cartao bg-white/8 p-3.5">
        <div className="flex items-center justify-between">
          <span className="rotulo text-creme/70">Contagem de julho</span>
          <span className="mono text-xs font-bold text-sol">62%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-sol" style={{ width: '62%' }} />
        </div>
        <p className="mt-2 text-xs text-creme/65">28 de 45 itens contados</p>
      </div>

      {/* Usuário + sair */}
      <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3.5">
        {sessao && (
          <Avatar
            inicial={sessao.usuario.avatarInicial}
            cor="rgba(255,255,255,.18)"
            tamanho={32}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-creme">{sessao?.usuario.nome}</div>
          <div className="truncate text-xs text-creme/60 capitalize">{papel}</div>
        </div>
        <button
          onClick={sair}
          title="Sair da conta"
          className="grid h-8 w-8 place-items-center rounded-botao text-creme/70 transition hover:bg-white/10 hover:text-creme"
        >
          <LogOut size={17} strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  )
}
