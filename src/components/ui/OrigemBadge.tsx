import type { Origem } from '@/types'
import { cn } from '@/lib/cn'

const MAPA: Record<Origem, { texto: string; classe: string }> = {
  ia_foto: { texto: 'foto lida pela IA', classe: 'bg-insight-fundo text-insight-rotulo' },
  celular: { texto: 'no celular', classe: 'bg-preenchimento text-tinta-2' },
  computador: { texto: 'no computador', classe: 'bg-preenchimento text-tinta-2' },
  integracao: { texto: 'integração', classe: 'bg-mar/10 text-mar' },
}

/** Selo de origem — quem/como a ação entrou (autoria). */
export function OrigemBadge({ origem, className }: { origem: Origem; className?: string }) {
  const m = MAPA[origem]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip px-2 py-0.5 text-[11px] font-semibold',
        m.classe,
        className,
      )}
    >
      {m.texto}
    </span>
  )
}
