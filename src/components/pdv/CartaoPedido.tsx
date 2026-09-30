import { cn } from '@/lib/cn'
import { brl } from '@/lib/format'
import { ROTULO_TIPO, corDaEspera, esperaTexto, minutosDesde } from '@/data/pdv'
import type { PedidoPdvDoc } from '@/data/types'

/** Resumo de um pedido pra fila (Pedidos e KDS): número, cliente, itens e espera. */
export function ResumoPedido({ p, agora, grande }: { p: PedidoPdvDoc; agora: number; grande?: boolean }) {
  const min = minutosDesde(p.criadoEm, agora)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={cn('font-bold text-tinta', grande ? 'text-[20px]' : 'text-[15px]')}>
            #{p.numero} <span className="font-semibold text-tinta-3">{p.cliente ?? ''}</span>
          </div>
          <div className="text-xs text-tinta-4">{ROTULO_TIPO[p.tipo]}{p.tipo === 'entrega' && p.endereco ? ` · ${p.endereco}` : ''}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="mono font-bold text-tinta">{brl(p.total)}</div>
          {(p.status === 'em_preparo' || p.status === 'pronto' || p.status === 'em_entrega') && (
            <div className={cn('mono text-xs font-bold', corDaEspera(min))}>{esperaTexto(min)}</div>
          )}
        </div>
      </div>
      <ul className={cn('flex flex-col gap-0.5', grande ? 'text-[16px]' : 'text-sm')}>
        {p.itens.map((i, idx) => (
          <li key={idx} className="text-tinta-2">
            <span className="mono font-bold text-tinta">{i.quantidade}×</span> {i.nome}
            {i.obs && <span className="block pl-6 text-xs font-semibold text-telha-alerta">↳ {i.obs}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
