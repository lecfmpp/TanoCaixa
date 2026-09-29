import { useMemo, useState } from 'react'
import { Search, Pencil, Trash2 } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { useUI } from '@/ui/UIProvider'
import { brl, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useProdutos, useRemoverProduto, useRestaurante } from '@/data/hooks'
import { HOJE } from '@/data/derive'
import { CATEGORIAS_PRODUTO as CATEGORIAS, CONTA, contaDeCmvDoProduto } from '@/data/planoContas'
import { mensagemDeErro } from '@/lib/erros'
import type { ProdutoDoc } from '@/data/types'

function corNome(nome: string): string {
  if (nome.startsWith('Halim')) return '#2E5F73'
  if (nome.startsWith('Jamile')) return '#C05437'
  if (nome.startsWith('Wesley')) return '#2F6B4A'
  return '#AEB9B8'
}

export function Produtos() {
  const { abrirGaveta, confirmar, adicionarToast } = useUI()
  const remover = useRemoverProduto()
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

  function pedirExclusao(p: ProdutoDoc) {
    confirmar({
      gravidade: 'destrutivo',
      titulo: `Excluir ${p.nome}?`,
      texto:
        'O produto sai do cadastro e some das próximas notas e contagens. O histórico de compras e entradas no estoque que já existem continua guardado.',
      resumo: [
        { rot: 'Produto', val: p.nome },
        { rot: 'Categoria', val: p.categoria },
        { rot: 'Custo', val: `${brl(p.custoAtual)} / ${p.unidade}` },
      ],
      rotuloCancelar: 'Manter produto',
      rotuloConfirmar: 'Excluir produto',
      onConfirmar: async () => {
        try {
          await remover.mutateAsync(p)
          adicionarToast({ tipo: 'sucesso', titulo: 'Produto excluído', texto: p.nome })
        } catch (e) {
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra excluir', texto: mensagemDeErro(e, 'O produto continua no cadastro.') })
        }
      },
    })
  }

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

      {/* Lista — cartões no celular, tabela a partir do tablet. Editar e excluir sempre à vista. */}
      <Cartao className="overflow-hidden p-0">
        <ul className="flex flex-col tab:hidden">
          {lista.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 border-b border-divisoria px-4 py-3.5 last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-tinta">{p.nome}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-tinta-4">
                    <span className="rounded-chip bg-preenchimento px-2 py-0.5 font-semibold text-tinta-2">{p.categoria}</span>
                    {p.fornecedor && <span>{p.fornecedor}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="mono font-bold text-tinta">{brl(p.custoAtual)}</div>
                  <div className="text-[11px] text-tinta-4">por {p.unidade}</div>
                </div>
              </div>
              <AcoesProduto produto={p} aoEditar={() => abrirGaveta('produto', { produto: p })} aoExcluir={() => pedirExclusao(p)} />
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto tab:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                <Th>Produto</Th>
                <Th>Categoria</Th>
                <Th>Unid.</Th>
                <Th>Atualizado por</Th>
                <Th className="text-right">Custo</Th>
                <Th className="text-right">Ações</Th>
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
                    <div className="mt-1 text-[11px] text-tinta-4">{CONTA[contaDeCmvDoProduto(p.categoria)].nome}</div>
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
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <AcoesProduto produto={p} aoEditar={() => abrirGaveta('produto', { produto: p })} aoExcluir={() => pedirExclusao(p)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-tinta-4">
            {(produtos.data ?? []).length ? 'Nenhum produto com esse filtro.' : 'Nenhum produto cadastrado ainda.'}
          </p>
        )}
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

/** Editar e excluir: botões com texto, sempre visíveis (nada escondido em hover). */
function AcoesProduto({ produto, aoEditar, aoExcluir }: { produto: ProdutoDoc; aoEditar: () => void; aoExcluir: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={aoEditar}
        aria-label={`Editar ${produto.nome}`}
        className="inline-flex items-center gap-1.5 rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie px-3 py-1.5 text-xs font-bold text-tinta-2 transition hover:border-mar/50"
      >
        <Pencil size={13} /> Editar
      </button>
      <button
        onClick={aoExcluir}
        aria-label={`Excluir ${produto.nome}`}
        className="inline-flex items-center gap-1.5 rounded-botao border border-telha-alerta/30 bg-superficie px-3 py-1.5 text-xs font-bold text-telha-alerta transition hover:bg-telha-alerta/8"
      >
        <Trash2 size={13} /> Excluir
      </button>
    </div>
  )
}
