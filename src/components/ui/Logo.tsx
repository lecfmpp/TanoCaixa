import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

interface LogoProps {
  /** 'claro' sobre fundo escuro (foto/sidebar/mar), 'escuro' sobre fundo claro (papel/cartão). */
  tom?: 'claro' | 'escuro'
  /** Mantém a escala antiga do componente: o símbolo mede `tamanho × 1,7` px. */
  tamanho?: number
  className?: string
  /** Para onde a logo leva ao clicar. */
  href?: string
  /** Só o símbolo (espaços quadrados, ícones). */
  soSimbolo?: boolean
}

/**
 * A marca em si (símbolo + nome), sem link. Usada pelo `Logo` (com roteador) e pelo blog,
 * que roda fora do `react-router` e navega com links comuns.
 *
 * Marca oficial "Tá no Caixa" (Guia de Marca v1): o T com um sorriso embaixo, dentro de um quadrado
 * de cantos 30%, e o nome em Archivo 800 (−0,02em) sempre à direita, sem quebra de linha.
 * Três traços da mesma espessura (13% do lado), pontas arredondadas: não redesenhar nem separar o sorriso.
 *
 * Versões: Sol (quadrado sol, T azul #1E4354, nome creme) em fundos escuros e fotos;
 * Principal (quadrado mar, T sol, nome tinta) em fundos claros.
 */
export function MarcaLogo({ tom = 'escuro', tamanho = 22, soSimbolo = false }: Pick<LogoProps, 'tom' | 'tamanho' | 'soSimbolo'>) {
  const lado = Math.round(tamanho * 1.7)
  const emFundoEscuro = tom === 'claro'
  const quadrado = emFundoEscuro ? '#EFAB5C' : '#2E5F73'
  const traco = emFundoEscuro ? '#1E4354' : '#EFAB5C'
  const nome = emFundoEscuro ? '#F7F5EA' : '#1C2A2E'
  return (
    <>
      <svg viewBox="0 0 100 100" width={lado} height={lado} aria-hidden className="block shrink-0">
        <rect width="100" height="100" rx="30" fill={quadrado} />
        <g fill="none" stroke={traco} strokeWidth="13" strokeLinecap="round">
          <path d="M27 24 H73" />
          <path d="M50 24 V52" />
          <path d="M33 68 Q50 82 67 68" />
        </g>
      </svg>
      {!soSimbolo && (
        <span
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 800,
            fontSize: Math.round(lado * 0.62),
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: nome,
            whiteSpace: 'nowrap',
            marginTop: -Math.round(lado * 0.04),
          }}
        >
          Tá no Caixa
        </span>
      )}
    </>
  )
}

export function Logo({ tom = 'escuro', tamanho = 22, className, href = '/', soSimbolo = false }: LogoProps) {
  const lado = Math.round(tamanho * 1.7)
  return (
    <Link
      to={href}
      aria-label="Tá no Caixa"
      className={cn('inline-flex w-auto shrink-0 items-center', className)}
      style={{ gap: Math.round(lado * 0.28) }}
    >
      <MarcaLogo tom={tom} tamanho={tamanho} soSimbolo={soSimbolo} />
    </Link>
  )
}
