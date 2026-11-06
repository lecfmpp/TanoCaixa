import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Logo da loja no header: caixa fixa de 5:2 (140 × 56 px), fundo claro pra
 * qualquer logo ter contraste sobre o azul, imagem "contida" (encolhe pra
 * caber, nunca estica nem corta). `reserva` desenha o espaço vazio — usado
 * só na prévia de Ajustes, pra mostrar onde a logo vai entrar.
 */
export function LogoDaLoja({ url, reserva, className }: { url?: string; reserva?: boolean; className?: string }) {
  if (!url && !reserva) return null
  return (
    <span
      className={cn(
        'relative z-10 grid h-14 w-[140px] shrink-0 place-items-center overflow-hidden rounded-campo',
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
