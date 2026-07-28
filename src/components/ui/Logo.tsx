import { cn } from '@/lib/cn'

interface LogoProps {
  /** 'claro' sobre fundo escuro (foto/sidebar), 'escuro' sobre fundo claro. */
  tom?: 'claro' | 'escuro'
  tamanho?: number
  className?: string
}

/** Marca "Tá no Caixa": disco solar + wordmark. */
export function Logo({ tom = 'escuro', tamanho = 22, className }: LogoProps) {
  const corTexto = tom === 'claro' ? '#F7F5EA' : '#1C2A2E'
  const corApoio = tom === 'claro' ? 'rgba(247,245,234,.62)' : '#6A7A7E'
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className="relative inline-block shrink-0 rounded-full"
        style={{
          width: tamanho,
          height: tamanho,
          background: 'radial-gradient(circle at 35% 30%, #EFAB5C, #C05437)',
          boxShadow: '0 2px 8px rgba(192,84,55,.4)',
        }}
        aria-hidden
      />
      <span className="leading-none" style={{ letterSpacing: '-0.02em' }}>
        <span style={{ color: corTexto, fontWeight: 800, fontSize: tamanho * 0.82 }}>
          Tá no{' '}
        </span>
        <span style={{ color: corApoio, fontWeight: 800, fontSize: tamanho * 0.82 }}>
          Caixa
        </span>
      </span>
    </span>
  )
}
