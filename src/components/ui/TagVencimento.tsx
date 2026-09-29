import { CalendarClock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'
import { rotuloVencimento, situacaoDoVencimento, type SituacaoVencimento } from '@/data/vencimentos'

const ESTILO: Record<SituacaoVencimento, string> = {
  vencido: 'bg-telha-alerta/12 text-telha-alerta',
  hoje: 'bg-sol/25 text-insight-rotulo',
  proximo: 'bg-sol/15 text-insight-rotulo',
  ok: 'bg-preenchimento text-tinta-3',
}

/** Tag de aviso: "vencido há 3 dias", "vence hoje", "vence em 5 dias". */
export function TagVencimento({ dias, className }: { dias: number; className?: string }) {
  const situacao = situacaoDoVencimento(dias)
  const Icone = situacao === 'vencido' ? AlertTriangle : CalendarClock
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-chip px-2 py-0.5 text-xs font-bold',
        ESTILO[situacao],
        className,
      )}
    >
      <Icone size={12} strokeWidth={2.4} />
      {rotuloVencimento(dias)}
    </span>
  )
}
