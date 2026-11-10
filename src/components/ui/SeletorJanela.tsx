import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MES_REF, diaDeHoje } from '@/data/derive'
import { limitesDaJanela, moverJanela, type Janela } from '@/data/fluxo'
import { useMesRef } from '@/ui/periodo'
import { Calendario, proximaSelecao } from './Calendario'
import { Flutuante } from './Flutuante'

const JANELAS: { id: Janela; rotulo: string }[] = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
export const diaDaSemana = (iso: string) => SEMANA[new Date(iso + 'T12:00:00').getDay()]

/** Soma `n` dias a um 'YYYY-MM-DD'. */
function somarDias(dia: string, n: number): string {
  const d = new Date(dia + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 86_400_000)

/** Dia de referência que abre a tela: hoje, ou o dia 1 do mês que o painel está mostrando. */
function refInicial(hoje: string): string {
  return MES_REF === hoje.slice(0, 7) ? hoje : `${MES_REF}-01`
}

export interface EstadoJanela {
  /** 'periodo' quando o usuário escolheu as datas no calendário. */
  janela: Janela | 'periodo'
  ref: string
  de: string
  ate: string
  hoje: string
  setJanela: (j: Janela) => void
  setRef: (r: string) => void
  /** Dia ou período escolhido no calendário. Um dia só vira a janela "Dia". */
  escolherDatas: (i: { de: string; ate: string }) => void
}

/**
 * Estado do Dia | Semana | Mês das telas de lançamentos (Fluxo, Despesas, Receita).
 * Abre no mês que o painel mostra e acompanha quando esse mês é trocado.
 */
export function useJanela(inicial: Janela = 'mes'): EstadoJanela {
  const hoje = diaDeHoje()
  const mesRef = useMesRef()
  const [janela, setJanela] = useState<Janela>(inicial)
  const [ref, setRefBase] = useState(() => refInicial(hoje))
  const [periodo, setPeriodo] = useState<{ de: string; ate: string } | null>(null)
  useEffect(() => {
    setRefBase(refInicial(hoje))
    setPeriodo(null)
  }, [mesRef, hoje])
  const { de, ate } = periodo ?? limitesDaJanela(janela, ref)
  return {
    janela: periodo ? 'periodo' : janela,
    ref: periodo ? periodo.ate : ref,
    de,
    ate,
    hoje,
    setJanela: (j) => {
      if (periodo) setRefBase(periodo.de)
      setPeriodo(null)
      setJanela(j)
    },
    setRef: (r) => {
      setPeriodo(null)
      setRefBase(r)
    },
    escolherDatas: (i) => {
      if (i.de === i.ate) {
        setPeriodo(null)
        setJanela('dia')
        setRefBase(i.de)
      } else setPeriodo(i)
    },
  }
}

/** Texto curto do que a janela cobre: "Hoje · ter 27/10", "26/10 – 01/11", "outubro de 2026". */
export function tituloDaJanela({ janela, ref, de, ate, hoje }: Pick<EstadoJanela, 'janela' | 'ref' | 'de' | 'ate' | 'hoje'>): string {
  if (janela === 'dia') return ref === hoje ? `Hoje · ${diaDaSemana(ref)} ${ddmm(ref)}` : `${diaDaSemana(ref)[0].toUpperCase()}${diaDaSemana(ref).slice(1)} ${ddmm(ref)}`
  if (janela === 'semana' || janela === 'periodo') return `${ddmm(de)} – ${ddmm(ate)}`
  const mes = MESES[Number(ref.slice(5, 7)) - 1]
  return `${mes[0].toUpperCase()}${mes.slice(1)} de ${ref.slice(0, 4)}`
}

/** "hoje" / "no dia" / "na semana" / "no mês" — pra completar rótulos de cartão. */
export function nomeDaJanela({ janela, ref, hoje }: Pick<EstadoJanela, 'janela' | 'ref' | 'hoje'>): string {
  return janela === 'dia' ? (ref === hoje ? 'hoje' : 'no dia') : janela === 'semana' ? 'na semana' : janela === 'periodo' ? 'no período' : 'no mês'
}

/** Dia | Semana | Mês + setas + calendário + "Hoje" — o mesmo controle do Fluxo de caixa em todas as telas. */
export function SeletorJanela({ estado }: { estado: EstadoJanela }) {
  const { janela, ref, de, ate, hoje, setJanela, setRef, escolherDatas } = estado
  const noAgora = hoje >= de && hoje <= ate
  const [aberto, setAberto] = useState(false)
  const botaoData = useRef<HTMLButtonElement>(null)

  /** Setas: no período escolhido, anda o mesmo tanto de dias. */
  function mover(passo: -1 | 1) {
    if (janela !== 'periodo') return setRef(moverJanela(janela, ref, passo))
    const n = (diasEntre(de, ate) + 1) * passo
    escolherDatas({ de: somarDias(de, n), ate: somarDias(ate, n) })
  }

  return (
    <div className="flex flex-col gap-3 cel:flex-row cel:items-center cel:justify-between">
      <div className="flex w-fit rounded-botao bg-preenchimento p-1">
        {JANELAS.map((j) => (
          <button
            key={j.id}
            onClick={() => setJanela(j.id)}
            aria-pressed={janela === j.id}
            className={cn('rounded-[10px] px-4 py-2 text-sm font-bold transition', janela === j.id ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta')}
          >
            {j.rotulo}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => mover(-1)} aria-label="Anterior" className="rounded-botao border border-[rgba(46,95,115,0.14)] bg-superficie p-2 text-tinta-2 hover:border-mar/50">
          <ChevronLeft size={18} />
        </button>
        <button
          ref={botaoData}
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={aberto}
          title="Escolher uma data no calendário"
          className={cn(
            'flex min-w-[150px] items-center justify-center gap-1.5 rounded-botao px-2 py-1.5 text-[15px] font-bold transition hover:bg-preenchimento',
            janela === 'periodo' ? 'text-mar' : 'text-tinta',
          )}
        >
          <CalendarDays size={16} className="text-mar" />
          {tituloDaJanela(estado)}
        </button>
        <button onClick={() => mover(1)} aria-label="Próximo" className="rounded-botao border border-[rgba(46,95,115,0.14)] bg-superficie p-2 text-tinta-2 hover:border-mar/50">
          <ChevronRight size={18} />
        </button>
        {!noAgora && (
          <button onClick={() => setRef(hoje)} className="rounded-botao px-3 py-2 text-sm font-bold text-mar hover:bg-preenchimento">
            Hoje
          </button>
        )}
      </div>
      {aberto && (
        <PainelDatas
          ancora={botaoData}
          inicial={{ de, ate }}
          hoje={hoje}
          aoFechar={() => setAberto(false)}
          aoAplicar={(i) => {
            escolherDatas(i)
            setAberto(false)
          }}
        />
      )}
    </div>
  )
}

/** Calendário do filtro: um clique escolhe o dia, dois cliques um período. */
function PainelDatas({ ancora, inicial, hoje, aoFechar, aoAplicar }: {
  ancora: React.RefObject<HTMLButtonElement | null>
  inicial: { de: string; ate: string }
  hoje: string
  aoFechar: () => void
  aoAplicar: (i: { de: string; ate: string }) => void
}) {
  const [selecao, setSelecao] = useState<{ de: string; ate: string } | null>(inicial.de === inicial.ate ? inicial : null)
  return (
    <Flutuante ancora={ancora} aoFechar={aoFechar} lado="esquerda" rotulo="Escolher data">
      <Calendario selecao={selecao} hoje={hoje} mesInicial={inicial.de.slice(0, 7)} aoClicar={(d) => setSelecao(proximaSelecao(selecao, d))} />
      <p className="mt-2 text-xs text-tinta-4">
        {selecao ? `Selecionado: ${selecao.de === selecao.ate ? ddmm(selecao.de) : `${ddmm(selecao.de)} – ${ddmm(selecao.ate)}`}` : 'Toque num dia, ou em dois pra ver um período.'}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button onClick={() => aoAplicar({ de: hoje, ate: hoje })} className="px-1 text-sm font-semibold text-mar hover:underline">
          Hoje
        </button>
        <div className="flex gap-2">
          <button onClick={aoFechar} className="rounded-botao px-3 py-2 text-sm font-bold text-tinta-2 transition hover:bg-preenchimento">
            Cancelar
          </button>
          <button
            onClick={() => selecao && aoAplicar(selecao)}
            disabled={!selecao}
            className="rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </div>
    </Flutuante>
  )
}
