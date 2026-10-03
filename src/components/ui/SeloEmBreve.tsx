import { cn } from '@/lib/cn'

/** Etiqueta "Em breve" — funcionalidade visível, mas ainda desligada. */
export function SeloEmBreve({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-chip bg-sol/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-insight-rotulo',
        className,
      )}
    >
      Em breve
    </span>
  )
}
