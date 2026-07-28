import { cn } from '@/lib/cn'

interface LogoProps {
  /** 'claro' sobre fundo escuro (foto/sidebar), 'escuro' sobre fundo claro. */
  tom?: 'claro' | 'escuro'
  tamanho?: number
  className?: string
}

/** Marca "Tá no Caixa": tile telhado arredondado + wordmark. */
export function Logo({ tom = 'escuro', tamanho = 22, className }: LogoProps) {
  const corTexto = tom === 'claro' ? '#F7F5EA' : '#1C2A2E'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className="inline-block shrink-0"
        style={{
          width: tamanho * 1.35,
          height: tamanho * 1.35,
          borderRadius: tamanho * 0.4,
          background: '#C05437',
        }}
        aria-hidden
      />
      <span
        className="leading-none"
        style={{ color: corTexto, fontWeight: 700, fontSize: tamanho, letterSpacing: '-0.01em' }}
      >
        Tá no Caixa
      </span>
    </span>
  )
}
