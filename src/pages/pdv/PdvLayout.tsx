import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { usePdvLiberado } from '@/auth/pdv'
import { useAuth } from '@/auth/AuthContext'
import { useRestaurante } from '@/data/hooks'
import { cn } from '@/lib/cn'

/** Áreas do PDV. */
const AREAS: { para: string; rotulo: string }[] = [
  { para: '/painel/pdv/pedidos', rotulo: 'Pedidos' },
  { para: '/painel/pdv/caixa', rotulo: 'Caixa do PDV' },
  { para: '/painel/pdv/historico', rotulo: 'Histórico' },
  { para: '/painel/pdv/kds', rotulo: 'KDS' },
  { para: '/painel/pdv/cardapio', rotulo: 'Cardápio' },
]

/** Casca do módulo PDV: trava de acesso, cabeçalho e navegação entre as áreas. */
export function PdvLayout() {
  const liberado = usePdvLiberado()
  const { carregando } = useAuth()
  const cfg = useRestaurante().data

  if (carregando) return null
  if (!liberado) return <Navigate to="/painel" replace />

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="PDV" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · em beta` : 'em beta'} lancar={false} />
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {AREAS.map((a) => (
            <NavLink
              key={a.rotulo}
              to={a.para}
              className={({ isActive }) =>
                cn(
                  'shrink-0 whitespace-nowrap rounded-chip border px-3.5 py-2 text-sm font-semibold transition',
                  isActive ? 'border-mar bg-mar text-creme' : 'border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2 hover:border-mar/50',
                )
              }
            >
              {a.rotulo}
            </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  )
}
