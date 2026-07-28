import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string
  /** Conteúdo à direita dentro do campo (ex.: botão "mostrar"). */
  acessorio?: ReactNode
  destaque?: boolean
}

/** Campo de texto com rótulo — padrão de formulário do projeto. */
export const Campo = forwardRef<HTMLInputElement, CampoProps>(function Campo(
  { rotulo, acessorio, destaque, className, id, ...props },
  ref,
) {
  const campoId = id || props.name
  return (
    <label className="flex flex-col gap-1.5" htmlFor={campoId}>
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span
        className={cn(
          'flex items-center rounded-campo border bg-superficie px-3.5',
          'focus-within:border-mar focus-within:ring-2 focus-within:ring-mar/15',
          destaque
            ? 'border-telhado/40 bg-insight-fundo/40'
            : 'border-[rgba(46,95,115,0.14)]',
        )}
      >
        <input
          ref={ref}
          id={campoId}
          className={cn(
            'w-full bg-transparent py-2.5 text-[15px] text-tinta outline-none',
            'placeholder:text-tinta-5',
            className,
          )}
          {...props}
        />
        {acessorio}
      </span>
    </label>
  )
})
