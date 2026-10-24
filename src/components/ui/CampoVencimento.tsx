import { Campo } from '@/components/ui/Campo'
import { cn } from '@/lib/cn'

/** Soma `n` dias a um 'YYYY-MM-DD' (meio-dia local, sem sofrer com fuso). */
function somarDias(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ATALHOS = [7, 15, 30, 45, 60]

interface CampoVencimentoProps {
  rotulo?: string
  valor: string
  aoTrocar: (iso: string) => void
  /** Data de partida dos atalhos "+30 dias" (a data da nota/despesa). */
  base: string
  obrigatorio?: boolean
  apoio?: string
}

/**
 * Vencimento livre: qualquer dia de qualquer mês (inclusive meses à frente),
 * com atalhos de prazo contados a partir da data do lançamento.
 */
export function CampoVencimento({ rotulo = 'Vencimento', valor, aoTrocar, base, obrigatorio, apoio }: CampoVencimentoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Campo
        rotulo={obrigatorio ? rotulo : `${rotulo} · opcional`}
        type="date"
        value={valor}
        onChange={(e) => aoTrocar(e.target.value)}
        acessorio={
          valor ? (
            <button type="button" onClick={() => aoTrocar('')} className="rotulo shrink-0 text-mar hover:underline">
              limpar
            </button>
          ) : undefined
        }
      />
      <div className="flex flex-wrap gap-1.5">
        {ATALHOS.map((n) => {
          const alvo = somarDias(base, n)
          return (
            <button
              key={n}
              type="button"
              onClick={() => aoTrocar(alvo)}
              className={cn(
                'rounded-chip border px-2.5 py-1 text-xs font-semibold transition',
                valor === alvo
                  ? 'border-mar bg-mar/10 text-mar'
                  : 'border-[rgba(46,95,115,0.18)] text-tinta-3 hover:border-mar/50',
              )}
            >
              +{n} dias
            </button>
          )
        })}
      </div>
      {apoio && <p className="text-xs text-tinta-4">{apoio}</p>}
    </div>
  )
}
