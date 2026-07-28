import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'

interface MoneyProps {
  valor: number
  /** Colore verde/vermelho conforme sinal (só para dinheiro!). */
  colorido?: boolean
  className?: string
}

/**
 * Todo valor em R$ passa por aqui: JetBrains Mono, tabular, alinhado à
 * direita. Verde (mata) para positivo, vermelho (telha-alerta) para negativo
 * — cores reservadas a dinheiro.
 */
export function Money({ valor, colorido = false, className }: MoneyProps) {
  return (
    <span
      className={cn(
        'mono tabular-nums text-right whitespace-nowrap',
        colorido && (valor < 0 ? 'text-telha-alerta' : 'text-mata'),
        className,
      )}
    >
      {brl(valor)}
    </span>
  )
}
