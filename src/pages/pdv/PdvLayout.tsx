import { NavLink, Outlet } from 'react-router-dom'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { usePdvLiberado } from '@/auth/pdv'
import { useAuth } from '@/auth/AuthContext'
import { useRestaurante } from '@/data/hooks'
import { cn } from '@/lib/cn'
import { Cartao } from '@/components/ui/Cartao'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'

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
  if (!liberado) return <PdvEmBreve />

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

/** O que vem no PDV — o que já existe em beta pras contas liberadas. */
const PREPARANDO: { titulo: string; texto: string }[] = [
  { titulo: 'Pedidos', texto: 'Balcão, mesa e delivery num lugar só, com o pedido indo direto pra cozinha.' },
  { titulo: 'Caixa do PDV', texto: 'Abertura, sangria e fechamento do caixa, com o que entrou em cada forma de pagamento.' },
  { titulo: 'KDS', texto: 'Tela da cozinha com a fila de pedidos, do preparo à entrega.' },
  { titulo: 'Cardápio', texto: 'Pratos e preços, ligados aos produtos do estoque.' },
  { titulo: 'Tudo nos seus números', texto: 'Cada venda entra sozinha na Receita, no DRE e dá baixa no estoque.' },
]

/** PDV ainda não liberado pra esta conta: a página existe no menu, mas só avisa o que vem aí. */
function PdvEmBreve() {
  const cfg = useRestaurante().data
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="PDV" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro}` : ''} lancar={false} semMes />
      <Cartao className="flex flex-col items-center gap-3 py-12 text-center">
        <SeloEmBreve />
        <h2 className="text-[17px] font-bold text-tinta">Frente de caixa do Tá no Caixa</h2>
        <p className="pretty max-w-md text-sm text-tinta-3">
          Estamos preparando o PDV pra você vender e já ver o resultado nos seus números, sem digitar nada duas vezes.
        </p>
        <ul className="mt-3 grid w-full max-w-2xl gap-2.5 text-left cel:grid-cols-2">
          {PREPARANDO.map((p) => (
            <li key={p.titulo} className="rounded-cartao bg-preenchimento/50 px-4 py-3 cel:last:col-span-2">
              <span className="block text-sm font-bold text-tinta">{p.titulo}</span>
              <span className="block text-xs text-tinta-3">{p.texto}</span>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  )
}
