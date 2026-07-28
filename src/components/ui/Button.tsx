import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variante = 'primario' | 'secundario' | 'lancar' | 'fantasma'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  bloco?: boolean
}

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-mar text-creme hover:bg-mar-escuro shadow-sm active:translate-y-px',
  secundario:
    'bg-preenchimento text-tinta-2 hover:bg-trilho border border-[rgba(46,95,115,0.10)]',
  lancar:
    'bg-telhado text-creme hover:brightness-95 shadow-telhado active:translate-y-px',
  fantasma: 'bg-transparent text-tinta-2 hover:bg-preenchimento',
}

export function Button({
  variante = 'primario',
  bloco = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-botao px-4 py-2.5',
        'text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar',
        bloco && 'w-full',
        VARIANTES[variante],
        className,
      )}
      {...props}
    />
  )
}
