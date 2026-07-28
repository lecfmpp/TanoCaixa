import { cn } from '@/lib/cn'

interface SwitchProps {
  ligado: boolean
  aoTrocar: (v: boolean) => void
  rotulo?: string
}

/** Interruptor (canais de aviso). */
export function Switch({ ligado, aoTrocar, rotulo }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => aoTrocar(!ligado)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        ligado ? 'bg-mata' : 'bg-tinta-5/60',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-creme shadow transition-transform',
          ligado ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
