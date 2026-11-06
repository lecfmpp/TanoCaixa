import { ImageIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Logo da loja no header: caixa fixa de 5:2 (120 × 48 px), fundo claro pra
 * qualquer logo ter contraste sobre o azul, imagem "contida" (encolhe pra
 * caber, nunca estica nem corta). `reserva` desenha o espaço vazio — usado
 * só na prévia de Ajustes, pra mostrar onde a logo vai entrar.
 */
export function LogoDaLoja({ url, reserva, className }: { url?: string; reserva?: boolean; className?: string }) {
  if (!url && !reserva) return null
  return (
    <span
      className={cn(
        'relative z-10 grid h-12 w-[120px] shrink-0 place-items-center overflow-hidden rounded-campo p-1.5',
        url ? 'bg-creme/95 shadow-sm' : 'border border-dashed border-creme/50 text-creme/70',
        className,
      )}
    >
      {url ? (
        <img src={url} alt="Logo da loja" className="h-full w-full object-contain" />
      ) : (
        <ImageIcon size={18} aria-hidden />
      )}
    </span>
  )
}
