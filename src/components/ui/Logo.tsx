import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface LogoProps {
  /** 'claro' sobre fundo escuro (foto/sidebar), 'escuro' sobre fundo claro. */
  tom?: 'claro' | 'escuro'
  tamanho?: number
  className?: string
  /** Para onde a logo leva ao clicar. */
  href?: string
}

/** Marca "Tá no Caixa": lockup oficial (ícone sol + wordmark), clicável. */
export function Logo({ tom = 'escuro', tamanho = 22, className, href = '/' }: LogoProps) {
  const arquivo = tom === 'claro' ? '/logo/tanocaixa-claro.png' : '/logo/tanocaixa-escuro.png'
  return (
    <Link to={href} className={cn('inline-block w-auto shrink-0', className)}>
      <img src={arquivo} alt="Tá no Caixa" className="block h-full w-auto" style={{ height: tamanho * 2.08 }} />
    </Link>
  )
}
