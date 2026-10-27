import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * Largura (px) do elemento, acompanhando redimensionamento e zoom. 0 = ainda não
 * medida. Gráficos usam isso pra escolher quanto texto cabe (valores, rótulos)
 * em vez de deixar o conteúdo passar da borda do cartão.
 */
export function useLargura<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [largura, setLargura] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setLargura(el.clientWidth)
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, largura]
}
