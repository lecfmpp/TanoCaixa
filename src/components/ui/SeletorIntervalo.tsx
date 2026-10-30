import { useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { Intervalo } from '@/types'
import { cn } from '@/lib/cn'
import { diaDeHoje } from '@/data/derive'
import { rotuloIntervalo, useMesRef } from '@/ui/periodo'
import { Calendario, proximaSelecao } from './Calendario'
import { Flutuante } from './Flutuante'

interface SeletorIntervaloProps {
  /** Intervalo ativo; null quando o filtro é Semana ou Mês. */
  valor: Intervalo | null
  aoTrocar: (i: Intervalo) => void
  /** Chamado ao limpar — a página volta pro filtro de mês. */
  aoLimpar: () => void
}

/** Soma `n` dias a um 'YYYY-MM-DD'. */
function somarDias(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Seletor de datas ao lado do Semana | Mês: mesma pílula do Segmentado (tom
 * claro, sobre a foto), com o intervalo escolhido no lugar do rótulo. Abre um
 * calendário: um clique escolhe o dia, dois cliques um período.
 */
export function SeletorIntervalo({ valor, aoTrocar, aoLimpar }: SeletorIntervaloProps) {
  const [aberto, setAberto] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const ativo = valor !== null

  return (
    <div className="relative">
      <div className="inline-flex rounded-botao bg-white/10 p-1 backdrop-blur-sm">
        <button
          ref={botao}
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          className={cn(
            'flex items-center gap-1.5 rounded-[10px] px-3.5 py-1.5 text-sm font-bold transition',
            ativo ? 'bg-creme text-mar' : 'text-creme/80 hover:text-creme',
          )}
        >
          <CalendarDays size={15} strokeWidth={2.2} />
          {valor ? rotuloIntervalo(valor) : 'Datas'}
        </button>
      </div>

      {aberto && (
        <PainelIntervalo
          ancora={botao}
          valor={valor}
          aoFechar={() => setAberto(false)}
          aoLimpar={() => {
            aoLimpar()
            setAberto(false)
          }}
          aoAplicar={(i) => {
            aoTrocar(i)
            setAberto(false)
          }}
        />
      )}
    </div>
  )
}

function PainelIntervalo({ ancora, valor, aoFechar, aoLimpar, aoAplicar }: {
  ancora: React.RefObject<HTMLButtonElement | null>
  valor: Intervalo | null
  aoFechar: () => void
  aoLimpar: () => void
  aoAplicar: (i: Intervalo) => void
}) {
  const hoje = diaDeHoje()
  const mesRef = useMesRef()
  // Começa do intervalo ativo; sem ele, nada marcado.
  const [selecao, setSelecao] = useState<Intervalo | null>(valor)

  const atalhos: { rotulo: string; i: Intervalo }[] = [
    { rotulo: 'Hoje', i: { de: hoje, ate: hoje } },
    { rotulo: 'Ontem', i: { de: somarDias(hoje, -1), ate: somarDias(hoje, -1) } },
    { rotulo: '7 dias', i: { de: somarDias(hoje, -6), ate: hoje } },
    { rotulo: '30 dias', i: { de: somarDias(hoje, -29), ate: hoje } },
  ]

  return (
    <Flutuante ancora={ancora} aoFechar={aoFechar} rotulo="Escolher período">
      <div className="flex flex-wrap gap-2">
        {atalhos.map((a) => (
          <button
            key={a.rotulo}
            onClick={() => aoAplicar(a.i)}
            className="rounded-chip border border-[rgba(46,95,115,0.18)] bg-superficie px-3 py-1.5 text-sm font-semibold text-tinta-2 transition hover:border-mar/50"
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <div className="mt-3">
        <Calendario selecao={selecao} hoje={hoje} mesInicial={mesRef} aoClicar={(d) => setSelecao(proximaSelecao(selecao, d))} />
      </div>
      <p className="mt-2 text-xs text-tinta-4">
        {selecao ? `Selecionado: ${rotuloIntervalo(selecao)}` : 'Toque num dia, ou em dois pra um período.'}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={aoLimpar}
          disabled={!valor}
          className="px-1 text-sm font-semibold text-tinta-3 transition hover:text-tinta disabled:opacity-40"
        >
          Limpar
        </button>
        <button
          onClick={() => selecao && aoAplicar(selecao)}
          disabled={!selecao}
          className="rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50"
        >
          Aplicar
        </button>
      </div>
    </Flutuante>
  )
}
