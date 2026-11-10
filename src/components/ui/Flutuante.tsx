import { useEffect, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface FlutuanteProps {
  /** O botão que abre o painel — o painel abre embaixo dele. */
  ancora: RefObject<HTMLElement | null>
  aoFechar: () => void
  /** Encosta o painel na borda direita (cabeçalho) ou esquerda (filtros da página) do botão. */
  lado?: 'direita' | 'esquerda'
  rotulo: string
  className?: string
  children: ReactNode
}

/**
 * Painel que abre embaixo de um botão (calendário, escolher mês). Vai pro
 * <body>: a faixa do cabeçalho tem overflow hidden e cortava o painel. Fecha
 * com Esc ou clique fora.
 */
export function Flutuante({ ancora, aoFechar, lado = 'direita', rotulo, className, children }: FlutuanteProps) {
  const [painel, setPainel] = useState<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    const medir = () => {
      const r = ancora.current?.getBoundingClientRect()
      if (!r) return
      const largura = painel?.offsetWidth ?? 300
      // Encosta no lado pedido, mas nunca sai da tela.
      const desejado = lado === 'direita' ? r.right - largura : r.left
      setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(desejado, window.innerWidth - largura - 8)) })
    }
    medir()
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [ancora, lado, painel])

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node
      if (!ancora.current?.contains(alvo) && !painel?.contains(alvo)) aoFechar()
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [ancora, painel, aoFechar])

  return createPortal(
    <div
      ref={setPainel}
      style={pos ?? { top: -9999, left: -9999 }}
      role="dialog"
      aria-label={rotulo}
      className={`fixed z-[70] rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-4 text-tinta shadow-cartao ${className ?? ''}`}
    >
      {children}
    </div>,
    document.body,
  )
}
