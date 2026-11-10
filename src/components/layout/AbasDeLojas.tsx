import { Store } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLojasAcessiveis, useTenantDoLogin } from '@/data/hooks'
import { definirLojaAtiva, useLojaAtiva } from '@/data/lojaAtiva'

/**
 * Lojas no topo do painel, uma aba por loja: troca com um clique (o painel
 * inteiro passa a ser da loja escolhida). Mostra só as lojas que a pessoa
 * pode abrir (ver useLojasAcessiveis) e só com mais de uma. Com muitas lojas,
 * o seletor do menu lateral dá conta.
 */
export function AbasDeLojas() {
  const lojas = useLojasAcessiveis()
  const lojaAtiva = useLojaAtiva()
  const tenantDoLogin = useTenantDoLogin()
  if (lojas.length < 2 || lojas.length > 6) return null
  const atual = lojaAtiva ?? tenantDoLogin
  return (
    <div className="hidden border-b border-divisoria bg-superficie px-7 py-2.5 tab:block">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto" role="tablist" aria-label="Lojas">
        <Store size={16} className="shrink-0 text-tinta-4" aria-hidden />
        {lojas.map((l) => {
          const ativa = l.restauranteId === atual
          return (
            <button
              key={l.restauranteId}
              role="tab"
              aria-selected={ativa}
              onClick={() => definirLojaAtiva(l.restauranteId === tenantDoLogin ? null : l.restauranteId)}
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
    </div>
  )
}
