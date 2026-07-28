import { cn } from '@/lib/cn'

interface ChipProps {
  rotulo: string
  selecionado: boolean
  aoClicar: () => void
}

/** Chip de opção (onboarding: como opera, tipo de comida). */
export function Chip({ rotulo, selecionado, aoClicar }: ChipProps) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      className={cn(
        'rounded-chip border px-3.5 py-2 text-sm font-semibold transition',
        selecionado
          ? 'border-mar bg-mar text-creme'
          : 'border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2 hover:border-mar/50',
      )}
    >
      {rotulo}
    </button>
  )
}
