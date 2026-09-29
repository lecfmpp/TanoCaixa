import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { usePdvLiberado } from '@/auth/pdv'
import { useAuth } from '@/auth/AuthContext'
import { useRestaurante } from '@/data/hooks'
import { cn } from '@/lib/cn'

/** Áreas do PDV. Só o cardápio existe; o resto aparece desabilitado pra mostrar o caminho. */
const AREAS: { para?: string; rotulo: string }[] = [
  { para: '/painel/pdv/cardapio', rotulo: 'Cardápio' },
  { rotulo: 'Pedidos' },
  { rotulo: 'Caixa do PDV' },
  { rotulo: 'Histórico' },
  { rotulo: 'KDS' },
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
      <SectionHeader titulo="PDV" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · em construção` : 'em construção'} lancar={false} />
      <div className="flex flex-wrap gap-2">
        {AREAS.map((a) =>
          a.para ? (
            <NavLink
              key={a.rotulo}
              to={a.para}
              className={({ isActive }) =>
                cn(
                  'rounded-chip border px-3.5 py-2 text-sm font-semibold transition',
                  isActive ? 'border-mar bg-mar text-creme' : 'border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2 hover:border-mar/50',
                )
              }
            >
              {a.rotulo}
            </NavLink>
          ) : (
            <span
              key={a.rotulo}
              aria-disabled
              className="flex cursor-not-allowed items-center gap-1.5 rounded-chip border border-[rgba(46,95,115,0.1)] bg-preenchimento/50 px-3.5 py-2 text-sm font-semibold text-tinta-4"
            >
              {a.rotulo}
              <span className="rounded-chip bg-sol/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-insight-rotulo">em breve</span>
            </span>
          ),
        )}
      </div>
      <Outlet />
    </div>
  )
}
