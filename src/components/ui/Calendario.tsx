import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { nomeDoMes, mesSeguinte } from '@/data/planoMes'
import { mesAnterior } from '@/data/derive'

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

const iso = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

/** Os dias do mês ('YYYY-MM'), com buracos (null) pra começar na segunda. */
function diasDoMes(mes: string): (string | null)[] {
  const [a, m] = mes.split('-').map(Number)
  const total = new Date(a, m, 0).getDate()
  const vazio = (new Date(a, m - 1, 1).getDay() + 6) % 7 // segunda = 0
  return [...Array(vazio).fill(null), ...Array.from({ length: total }, (_, i) => iso(a, m, i + 1))]
}

/**
 * Próximo intervalo depois de um clique: o primeiro clique marca um dia só;
 * o segundo fecha o período (em qualquer ordem); o terceiro recomeça.
 */
export function proximaSelecao(atual: { de: string; ate: string } | null, dia: string): { de: string; ate: string } {
  if (!atual || atual.de !== atual.ate) return { de: dia, ate: dia }
  return dia < atual.de ? { de: dia, ate: atual.de } : { de: atual.de, ate: dia }
}

interface CalendarioProps {
  /** Dia ou período marcado. */
  selecao: { de: string; ate: string } | null
  aoClicar: (dia: string) => void
  hoje: string
  /** Mês que abre quando nada está marcado ('YYYY-MM'); sem ele, o de hoje. */
  mesInicial?: string
  /** Último dia que dá pra escolher. */
  max?: string
}

/** Calendário de um mês, semana começando na segunda (igual ao filtro Semana). */
export function Calendario({ selecao, aoClicar, hoje, mesInicial, max }: CalendarioProps) {
  const [mes, setMes] = useState(selecao?.ate.slice(0, 7) ?? mesInicial ?? hoje.slice(0, 7))
  const titulo = nomeDoMes(mes)
  const podeAvancar = !max || mesSeguinte(mes) <= max.slice(0, 7)
  const botao = 'grid h-8 w-8 place-items-center rounded-botao text-tinta-3 transition hover:bg-preenchimento hover:text-tinta disabled:opacity-30'

  return (
    <div className="w-[264px]">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setMes(mesAnterior(mes))} className={botao} aria-label="Mês anterior">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-tinta">{titulo[0].toUpperCase() + titulo.slice(1)}</span>
        <button type="button" onClick={() => setMes(mesSeguinte(mes))} disabled={!podeAvancar} className={botao} aria-label="Próximo mês">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {SEMANA.map((s) => (
          <span key={s} className="pb-1 text-[11px] font-semibold uppercase text-tinta-4">{s}</span>
        ))}
        {diasDoMes(mes).map((dia, i) => {
          if (!dia) return <span key={`v${i}`} />
          const fora = !!max && dia > max
          const ponta = !!selecao && (dia === selecao.de || dia === selecao.ate)
          const dentro = !!selecao && dia > selecao.de && dia < selecao.ate
          return (
            <button
              key={dia}
              type="button"
              disabled={fora}
              onClick={() => aoClicar(dia)}
              aria-pressed={ponta || dentro}
              aria-label={dia.split('-').reverse().join('/')}
              className={cn(
                'mx-auto grid h-9 w-full place-items-center text-sm transition disabled:opacity-30',
                ponta ? 'rounded-botao bg-mar font-bold text-creme' : dentro ? 'bg-mar/10 font-semibold text-mar' : 'rounded-botao text-tinta-2 hover:bg-preenchimento',
                !ponta && dia === hoje && 'font-bold text-mar underline underline-offset-4',
              )}
            >
              {Number(dia.slice(8, 10))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
