import { cn } from '@/lib/cn'

interface AvatarProps {
  inicial: string
  cor: string
  tamanho?: number
  className?: string
}

export function Avatar({ inicial, cor, tamanho = 32, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-creme select-none',
        className,
      )}
      style={{
        width: tamanho,
        height: tamanho,
        background: cor,
        fontSize: Math.round(tamanho * 0.4),
      }}
      aria-hidden
    >
      {inicial}
    </span>
  )
}
