import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatoDaProporcao, type FormatoLogo } from '@/data/logo'

/**
 * Formato da logo: o gravado no envio ou, nas logos enviadas antes desse
 * campo existir, o medido pela própria imagem. Enquanto mede, horizontal.
 */
export function useFormatoDaLogo(url: string | undefined, salvo: FormatoLogo | undefined): FormatoLogo {
  const [medido, setMedido] = useState<{ url: string; formato: FormatoLogo } | null>(null)
  useEffect(() => {
    if (!url || salvo) return
    let vivo = true
    const img = new Image()
    img.onload = () => {
      if (vivo && img.naturalWidth && img.naturalHeight) {
        setMedido({ url, formato: formatoDaProporcao(img.naturalWidth, img.naturalHeight) })
      }
    }
    img.src = url
    return () => {
      vivo = false
    }
  }, [url, salvo])
  return salvo ?? (medido && medido.url === url ? medido.formato : 'horizontal')
}

/** Tamanho da caixa no header: 56 × 56 (1:1) ou 140 × 56 (5:2). */
const CAIXA: Record<FormatoLogo, string> = {
  quadrado: 'h-14 w-14',
  horizontal: 'h-14 w-[140px]',
}

/**
 * Logo da loja no header: caixa quadrada (1:1) ou horizontal (5:2) conforme a
 * logo, fundo claro pra qualquer logo ter contraste sobre o azul, imagem
 * "contida" (encolhe pra caber, nunca estica nem corta). `reserva` desenha o
 * espaço vazio — usado só na prévia de Ajustes, pra mostrar onde ela entra.
 */
export function LogoDaLoja({
  url,
  formato,
  reserva,
  className,
}: {
  url?: string
  formato?: FormatoLogo
  reserva?: boolean
  className?: string
}) {
  const f = useFormatoDaLogo(url, formato)
  if (!url && !reserva) return null
  return (
    <span
      className={cn(
        'relative z-10 grid shrink-0 place-items-center overflow-hidden rounded-campo',
        CAIXA[f],
        url ? 'bg-creme/95 shadow-sm' : 'border border-dashed border-creme/50 text-creme/70',
        className,
      )}
    >
      {url ? (
        // Posição absoluta dentro da caixa: a imagem nunca passa do tamanho dela,
        // qualquer que seja a proporção ou o tamanho do arquivo.
        <img src={url} alt="Logo da loja" className="absolute inset-1.5 h-[calc(100%-12px)] w-[calc(100%-12px)] object-contain" />
      ) : (
        <ImageIcon size={18} aria-hidden />
      )}
    </span>
  )
}
