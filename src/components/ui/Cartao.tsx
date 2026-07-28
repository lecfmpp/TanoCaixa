import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

/** Cartão padrão: superfície, borda sutil, raio 18, padding 20. */
export function Cartao({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-5',
        className,
      )}
      {...props}
    />
  )
}
