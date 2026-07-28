import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { useUI } from '@/ui/UIProvider'
import { brl, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useProdutos, useRestaurante } from '@/data/hooks'
import { HOJE } from '@/data/derive'

const CATEGORIAS = ['Hortifrúti', 'Carnes', 'Secos', 'Bebidas', 'Embalagens', 'Limpeza'] as const

function corNome(nome: string): string {
  if (nome.startsWith('Halim')) return '#2E5F73'
  if (nome.startsWith('Jamile')) return '#C05437'
  if (nome.startsWith('Wesley')) return '#2F6B4A'
  return '#AEB9B8'
}

export function Produtos() {
  const { abrirGaveta } = useUI()
  const restaurante = useRestaurante()
  const produtos = useProdutos()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<string>('Todos')

  const cfg = restaurante.data
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return (produtos.data ?? [])
      .filter((p) => (filtro === 'Todos' ? true : p.categoria === filtro))
      .filter((p) => (b ? (p.nome + ' ' + p.fornecedor).toLowerCase().includes(b) : true))
  }, [produtos.data, filtro, busca])

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Produtos" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''} />

      {/* Busca + filtros */}
      <div className="flex flex-col gap-3 cel:flex-row cel:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5">
          <Search size={16} className="text-tinta-4" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto ou fornecedor…"
            className="w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-5"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip rotulo="Todos" selecionado={filtro === 'Todos'} aoClicar={() => setFiltro('Todos')} />
          {CATEGORIAS.map((c) => (
            <Chip key={c} rotulo={c} selecionado={filtro === c} aoClicar={() => setFiltro(c)} />
          ))}
        </div>
      </div>

      {/* Tabela */}
      <Cartao className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                <Th>Produto</Th>
                <Th>Categoria</Th>
                <Th>Unid.</Th>
                <Th>Atualizado por</Th>
                <Th className="text-right">Custo</Th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-b border-divisoria last:border-0 hover:bg-preenchimento/30">
                  <td className="px-4 py-3">
                    <div className="font-bold text-tinta">{p.nome}</div>
                    {p.fornecedor && <div className="text-xs text-tinta-4">{p.fornecedor}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-chip bg-preenchimento px-2 py-0.5 text-xs font-semibold text-tinta-2">{p.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-tinta-2">{p.unidade}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar inicial={(p.criadoPorNome || '?')[0]} cor={corNome(p.criadoPorNome)} tamanho={26} />
                      <div className="leading-tight">
                        <div className="text-xs font-semibold text-tinta">{p.criadoPorNome}</div>
                        <div className="text-[11px] text-tinta-4">{quando(new Date(p.criadoEm), HOJE)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(p.custoAtual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-divisoria bg-preenchimento/40 px-4 py-3 text-sm">
          <span className="text-tinta-3">{lista.length} produtos</span>
        </div>
      </Cartao>

      <button
        onClick={() => abrirGaveta('produto')}
        className="self-start rounded-botao bg-telhado px-4 py-2.5 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95"
      >
        + Novo produto
      </button>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 rotulo text-tinta-4', className)}>{children}</th>
}
