import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Cartao } from './Cartao'

/** Etiqueta "Pro" — o que precisa da assinatura paga. */
export function SeloPro({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-chip bg-mar/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mar',
        className,
      )}
    >
      Pro
    </span>
  )
}

/** Convite pra assinar o Pro no lugar de algo que precisa da assinatura paga. */
export function AvisoPro({
  titulo,
  texto,
  className,
  aoClicar,
}: {
  titulo: string
  texto: string
  className?: string
  /** Fecha o que estiver aberto (gaveta, modal) antes de ir pra assinatura. */
  aoClicar?: () => void
}) {
  return (
    <Cartao className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-mar" />
        <h2 className="text-[15px] font-bold text-tinta">{titulo}</h2>
        <SeloPro />
      </div>
      <p className="text-sm text-tinta-3">{texto}</p>
      <Link
        to="/painel/assinatura"
        onClick={aoClicar}
        className="mt-1 self-start rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme hover:bg-mar-escuro"
      >
        Assinar o Pro
      </Link>
    </Cartao>
  )
}
