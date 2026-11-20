import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Aba<T extends string> {
  id: T
  rotulo: string
  /** Número pequeno ao lado do rótulo (ex.: notificações ligadas). */
  contador?: ReactNode
  /** Contador em vermelho (ex.: envios com falha). */
  alerta?: boolean
}

interface Props<T extends string> {
  abas: Aba<T>[]
  valor: T
  aoTrocar: (id: T) => void
  /** Nome do grupo de abas, para leitores de tela. */
  rotulo: string
  children: ReactNode
}

/**
 * Abas no estilo do seletor Semana/Mês do painel. Ocupam a largura toda no
 * celular (botões iguais) e ficam compactas no computador. Setas ← → trocam de aba.
 */
export function Abas<T extends string>({ abas, valor, aoTrocar, rotulo, children }: Props<T>) {
  const base = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function teclado(e: KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const n = (i + (e.key === 'ArrowRight' ? 1 : abas.length - 1)) % abas.length
    aoTrocar(abas[n].id)
    refs.current[n]?.focus()
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={rotulo} className="flex w-full rounded-botao bg-preenchimento p-1 sm:inline-flex sm:w-auto sm:self-start">
        {abas.map((a, i) => {
          const ativa = a.id === valor
          return (
            <button
              key={a.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${base}-aba-${a.id}`}
              aria-selected={ativa}
              aria-controls={`${base}-painel`}
              tabIndex={ativa ? 0 : -1}
              onClick={() => aoTrocar(a.id)}
              onKeyDown={(e) => teclado(e, i)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2.5 py-2 text-sm font-bold whitespace-nowrap transition sm:flex-none sm:px-3.5',
                ativa ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta',
              )}
            >
              {a.rotulo}
              {a.contador !== undefined && (
                <span
                  className={cn(
                    'rounded-chip px-1.5 text-[11px] whitespace-nowrap',
                    a.alerta ? 'bg-telha-alerta/15 text-telha-alerta' : ativa ? 'bg-mata/15 text-mata' : 'bg-trilho text-tinta-3',
                  )}
                >
                  {a.contador}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${base}-painel`} aria-labelledby={`${base}-aba-${valor}`}>
        {children}
      </div>
    </div>
  )
}
