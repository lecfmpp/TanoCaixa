import type { Periodo } from '@/types'
import { cn } from '@/lib/cn'

interface SegmentadoProps {
  valor: Periodo
  aoTrocar: (p: Periodo) => void
  /** Sobre foto (claro) ou sobre fundo claro (escuro). */
  tom?: 'claro' | 'escuro'
}

export function Segmentado({ valor, aoTrocar, tom = 'claro' }: SegmentadoProps) {
  const opcoes: { id: Periodo; rotulo: string }[] = [
    { id: 'semana', rotulo: 'Semana' },
    { id: 'mes', rotulo: 'Mês' },
  ]
  return (
    <div
      className={cn(
        'inline-flex rounded-botao p-1',
        tom === 'claro' ? 'bg-white/10 backdrop-blur-sm' : 'bg-preenchimento',
      )}
    >
      {opcoes.map((op) => {
        const ativo = valor === op.id
        return (
          <button
            key={op.id}
            onClick={() => aoTrocar(op.id)}
            className={cn(
              'rounded-[10px] px-3.5 py-1.5 text-sm font-bold transition',
              ativo
                ? tom === 'claro'
                  ? 'bg-creme text-mar'
                  : 'bg-superficie text-tinta shadow-sm'
                : tom === 'claro'
                  ? 'text-creme/80 hover:text-creme'
                  : 'text-tinta-3 hover:text-tinta',
            )}
          >
            {op.rotulo}
          </button>
        )
      })}
    </div>
  )
}
