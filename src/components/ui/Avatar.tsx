import { cn } from '@/lib/cn'

interface AvatarProps {
  inicial: string
  cor: string
  /** Foto de perfil, se houver — some o fallback de inicial+cor. */
  foto?: string
  tamanho?: number
  className?: string
}

export function Avatar({ inicial, cor, foto, tamanho = 32, className }: AvatarProps) {
  if (foto) {
    return (
      <img
        src={foto}
        alt=""
        className={cn('inline-block shrink-0 rounded-full object-cover select-none', className)}
        style={{ width: tamanho, height: tamanho }}
        aria-hidden
      />
    )
  }
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
