import { Store } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useRede, useTenantDoLogin } from '@/data/hooks'
import { definirLojaAtiva, useLojaAtiva } from '@/data/lojaAtiva'

/**
 * Lojas da conta no topo do painel: o dono vê todas e troca com um clique (o
 * painel inteiro passa a ser da loja escolhida). Quem é gestor de uma loja só
 * não lê a rede, então não vê o seletor.
 */
export function SeletorLoja({ compacto }: { compacto?: boolean }) {
  const rede = useRede().data
  const lojaAtiva = useLojaAtiva()
  const tenantDoLogin = useTenantDoLogin()
  if (!rede || rede.lojas.length < 2) return null
  const atual = lojaAtiva ?? tenantDoLogin
  const trocar = (id: string) => definirLojaAtiva(id === tenantDoLogin ? null : id)

  if (compacto || rede.lojas.length > 5) {
    return (
      <label className="flex min-w-0 items-center gap-2">
        <Store size={16} className="shrink-0 text-tinta-4" aria-hidden />
        <span className="sr-only">Loja</span>
        <select
          value={atual}
          onChange={(e) => trocar(e.target.value)}
          className="min-w-0 max-w-[220px] truncate rounded-botao border border-[rgba(46,95,115,0.14)] bg-superficie px-2.5 py-1.5 text-sm font-semibold text-tinta outline-none focus:border-mar"
        >
          {rede.lojas.map((l) => (
            <option key={l.restauranteId} value={l.restauranteId}>
              {l.nome}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto" role="tablist" aria-label="Lojas">
      <Store size={16} className="shrink-0 text-tinta-4" aria-hidden />
      {rede.lojas.map((l) => {
        const ativa = l.restauranteId === atual
        return (
          <button
            key={l.restauranteId}
            role="tab"
            aria-selected={ativa}
            onClick={() => trocar(l.restauranteId)}
            className={cn(
              'shrink-0 rounded-chip px-3 py-1.5 text-sm transition',
              ativa ? 'bg-mar font-bold text-creme' : 'bg-preenchimento font-semibold text-tinta-2 hover:bg-trilho',
            )}
          >
            {l.nome}
          </button>
        )
      })}
    </div>
  )
}
