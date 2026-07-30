import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Título + subtítulo de um passo. */
export function TituloPasso({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-tinta" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
        {titulo}
      </h2>
      <p className="pretty mt-1.5 text-[15px] text-tinta-3">{sub}</p>
    </div>
  )
}

/** Caixa de resultado ao vivo (ex.: ponto de equilíbrio, sobra prevista). */
export function CaixaViva({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="mt-6 rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-5">
      <span className="rotulo text-insight-rotulo">{rotulo}</span>
      <p className="pretty mt-2 text-[15px] leading-relaxed text-insight-texto">{children}</p>
    </div>
  )
}

/** Rótulo de campo. */
export function Rotulo({ children }: { children: ReactNode }) {
  return <span className="rotulo mb-1.5 block text-tinta-4">{children}</span>
}

/** Separador com linha pontilhada — marca a virada entre receita, despesa,
 * taxa de app e sobra num passo com vários blocos de dinheiro. */
export function LinhaPontilhada({ rotulo }: { rotulo?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-0 flex-1 border-t border-dashed border-[rgba(46,95,115,0.28)]" />
      {rotulo && <span className="rotulo shrink-0 text-tinta-4">{rotulo}</span>}
      <span className="h-0 flex-1 border-t border-dashed border-[rgba(46,95,115,0.28)]" />
    </div>
  )
}

/** Campo de texto simples (não controlado por padrão). */
export function CampoTexto({
  rotulo,
  prefixo,
  className,
  destaque,
  grande,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string
  prefixo?: string
  destaque?: boolean
  /** Campo maior e com texto em destaque — pros números que mais importam. */
  grande?: boolean
}) {
  return (
    <label className="block">
      <Rotulo>{rotulo}</Rotulo>
      <span
        className={cn(
          'flex items-center gap-1.5 rounded-campo border bg-superficie px-3.5',
          'focus-within:border-mar focus-within:ring-2 focus-within:ring-mar/15',
          destaque ? 'border-telhado/40 bg-insight-fundo/40' : 'border-[rgba(46,95,115,0.14)]',
        )}
      >
        {prefixo && (
          <span className={cn('mono text-tinta-4', grande ? 'text-lg font-bold' : 'text-sm')}>{prefixo}</span>
        )}
        <input
          className={cn(
            'w-full bg-transparent text-tinta outline-none placeholder:text-tinta-5',
            grande ? 'py-3.5 text-xl font-bold' : 'py-2.5 text-[15px]',
            className,
          )}
          {...props}
        />
      </span>
    </label>
  )
}
