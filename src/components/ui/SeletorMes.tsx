import { useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { escolherMesRef, mesAnterior, mesAtual } from '@/data/derive'
import { mesSeguinte, nomeDoMes } from '@/data/planoMes'
import { useMesRef } from '@/ui/periodo'
import { Flutuante } from './Flutuante'

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

interface SeletorMesProps {
  /** false quando o filtro da página é Semana ou um intervalo: o mês não manda. */
  ativo?: boolean
  /** Chamado ao trocar de mês — a página volta pro filtro "Mês". */
  aoEscolher?: () => void
}

/**
 * ‹ julho de 2026 › — o mês que o painel inteiro mostra (números, relatórios,
 * listas). Vai até o mês que vem; clicar no nome abre o calendário de meses.
 */
export function SeletorMes({ ativo = true, aoEscolher }: SeletorMesProps) {
  const mes = useMesRef()
  const hoje = mesAtual()
  const limite = mesSeguinte(hoje)
  const [aberto, setAberto] = useState(false)
  const botaoMes = useRef<HTMLButtonElement>(null)

  function ir(novo: string) {
    escolherMesRef(novo)
    aoEscolher?.()
  }

  const botao = 'grid h-8 w-8 place-items-center rounded-[10px] text-creme/80 transition hover:text-creme disabled:opacity-30'
  return (
    <div className="inline-flex items-center rounded-botao bg-white/10 p-1 backdrop-blur-sm">
      <button onClick={() => ir(mesAnterior(mes))} className={botao} aria-label="Mês anterior">
        <ChevronLeft size={16} strokeWidth={2.4} />
      </button>
      <button
        ref={botaoMes}
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        title="Escolher o mês"
        className={cn(
          'flex min-w-[8.5rem] items-center justify-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-center text-sm font-bold capitalize transition',
          ativo ? 'bg-creme text-mar' : 'text-creme/80 hover:text-creme',
        )}
      >
        <CalendarDays size={14} strokeWidth={2.2} />
        {nomeDoMes(mes)}
      </button>
      <button onClick={() => ir(mesSeguinte(mes))} disabled={mes >= limite} className={botao} aria-label="Próximo mês">
        <ChevronRight size={16} strokeWidth={2.4} />
      </button>
      {aberto && (
        <PainelMeses
          ancora={botaoMes}
          mes={mes}
          hoje={hoje}
          limite={limite}
          aoFechar={() => setAberto(false)}
          aoEscolher={(m) => {
            ir(m)
            setAberto(false)
          }}
        />
      )}
    </div>
  )
}

/** Os 12 meses do ano, com setas pra trocar de ano. */
function PainelMeses({ ancora, mes, hoje, limite, aoFechar, aoEscolher }: {
  ancora: React.RefObject<HTMLButtonElement | null>
  mes: string
  hoje: string
  limite: string
  aoFechar: () => void
  aoEscolher: (m: string) => void
}) {
  const [ano, setAno] = useState(Number(mes.slice(0, 4)))
  const botao = 'grid h-8 w-8 place-items-center rounded-botao text-tinta-3 transition hover:bg-preenchimento hover:text-tinta disabled:opacity-30'
  return (
    <Flutuante ancora={ancora} aoFechar={aoFechar} rotulo="Escolher o mês" className="w-[264px]">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => setAno(ano - 1)} className={botao} aria-label="Ano anterior">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-bold text-tinta">{ano}</span>
        <button type="button" onClick={() => setAno(ano + 1)} disabled={`${ano + 1}-01` > limite} className={botao} aria-label="Próximo ano">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MESES_CURTOS.map((rot, i) => {
          const m = `${ano}-${String(i + 1).padStart(2, '0')}`
          return (
            <button
              key={m}
              type="button"
              disabled={m > limite}
              onClick={() => aoEscolher(m)}
              aria-pressed={m === mes}
              className={cn(
                'rounded-botao py-2 text-sm font-semibold capitalize transition disabled:opacity-30',
                m === mes ? 'bg-mar text-creme' : m === hoje ? 'text-mar ring-1 ring-mar/40 hover:bg-preenchimento' : 'text-tinta-2 hover:bg-preenchimento',
              )}
            >
              {rot}
            </button>
          )
        })}
      </div>
      <button onClick={() => aoEscolher(hoje)} className="mt-3 px-1 text-sm font-semibold text-mar hover:underline">
        Este mês
      </button>
    </Flutuante>
  )
}
