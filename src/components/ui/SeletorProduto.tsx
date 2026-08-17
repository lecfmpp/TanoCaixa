import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { ProdutoDoc } from '@/data/types'

interface SeletorProdutoProps {
  rotulo: string
  produtos: ProdutoDoc[]
  valor: string
  aoTrocar: (produtoId: string) => void
  destaque?: boolean
}

/**
 * Escolha de produto por lista, nunca por texto livre: é o que impede o
 * mesmo tomate virar três itens diferentes no estoque. Sem produto
 * cadastrado não há o que escolher — quem chama mostra o caminho do cadastro.
 */
export function SeletorProduto({ rotulo, produtos, valor, aoTrocar, destaque }: SeletorProdutoProps) {
  const categorias = [...new Set(produtos.map((p) => p.categoria))].sort()
  return (
    <label className="flex flex-col gap-1.5">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span
        className={cn(
          'relative flex items-center rounded-campo border bg-superficie px-3.5',
          'focus-within:border-mar focus-within:ring-2 focus-within:ring-mar/15',
          destaque ? 'border-telhado/40 bg-insight-fundo/40' : 'border-[rgba(46,95,115,0.14)]',
        )}
      >
        <select
          value={valor}
          onChange={(e) => aoTrocar(e.target.value)}
          className="w-full appearance-none bg-transparent py-2.5 pr-6 text-[15px] text-tinta outline-none"
        >
          <option value="">Escolha o produto…</option>
          {categorias.map((cat) => (
            <optgroup key={cat} label={cat}>
              {produtos
                .filter((p) => p.categoria === cat)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} · {p.unidade}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3.5 text-tinta-4" />
      </span>
    </label>
  )
}
