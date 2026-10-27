import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MES_REF, diaDeHoje } from '@/data/derive'
import { limitesDaJanela, moverJanela, type Janela } from '@/data/fluxo'
import { useMesRef } from '@/ui/periodo'

const JANELAS: { id: Janela; rotulo: string }[] = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

export const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
export const diaDaSemana = (iso: string) => SEMANA[new Date(iso + 'T12:00:00').getDay()]

/** Dia de referência que abre a tela: hoje, ou o dia 1 do mês que o painel está mostrando. */
function refInicial(hoje: string): string {
  return MES_REF === hoje.slice(0, 7) ? hoje : `${MES_REF}-01`
}

export interface EstadoJanela {
  janela: Janela
  ref: string
  de: string
  ate: string
  hoje: string
  setJanela: (j: Janela) => void
  setRef: (r: string) => void
}

/**
 * Estado do Dia | Semana | Mês das telas de lançamentos (Fluxo, Despesas, Receita).
 * Abre no mês que o painel mostra e acompanha quando esse mês é trocado.
 */
export function useJanela(inicial: Janela = 'mes'): EstadoJanela {
  const hoje = diaDeHoje()
  const mesRef = useMesRef()
  const [janela, setJanela] = useState<Janela>(inicial)
  const [ref, setRef] = useState(() => refInicial(hoje))
  useEffect(() => {
    setRef(refInicial(hoje))
  }, [mesRef, hoje])
  const { de, ate } = limitesDaJanela(janela, ref)
  return { janela, ref, de, ate, hoje, setJanela, setRef }
}

/** Texto curto do que a janela cobre: "Hoje · ter 27/10", "26/10 – 01/11", "outubro de 2026". */
export function tituloDaJanela({ janela, ref, de, ate, hoje }: Pick<EstadoJanela, 'janela' | 'ref' | 'de' | 'ate' | 'hoje'>): string {
  if (janela === 'dia') return ref === hoje ? `Hoje · ${diaDaSemana(ref)} ${ddmm(ref)}` : `${diaDaSemana(ref)[0].toUpperCase()}${diaDaSemana(ref).slice(1)} ${ddmm(ref)}`
  if (janela === 'semana') return `${ddmm(de)} – ${ddmm(ate)}`
  const mes = MESES[Number(ref.slice(5, 7)) - 1]
  return `${mes[0].toUpperCase()}${mes.slice(1)} de ${ref.slice(0, 4)}`
}

/** "hoje" / "no dia" / "na semana" / "no mês" — pra completar rótulos de cartão. */
export function nomeDaJanela({ janela, ref, hoje }: Pick<EstadoJanela, 'janela' | 'ref' | 'hoje'>): string {
  return janela === 'dia' ? (ref === hoje ? 'hoje' : 'no dia') : janela === 'semana' ? 'na semana' : 'no mês'
}

/** Dia | Semana | Mês + setas + "Hoje" — o mesmo controle do Fluxo de caixa em todas as telas. */
export function SeletorJanela({ estado }: { estado: EstadoJanela }) {
  const { janela, ref, de, ate, hoje, setJanela, setRef } = estado
  const noAgora = hoje >= de && hoje <= ate
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
        <button onClick={() => setRef(moverJanela(janela, ref, -1))} aria-label="Anterior" className="rounded-botao border border-[rgba(46,95,115,0.14)] bg-superficie p-2 text-tinta-2 hover:border-mar/50">
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[150px] text-center text-[15px] font-bold text-tinta">{tituloDaJanela(estado)}</span>
        <button onClick={() => setRef(moverJanela(janela, ref, 1))} aria-label="Próximo" className="rounded-botao border border-[rgba(46,95,115,0.14)] bg-superficie p-2 text-tinta-2 hover:border-mar/50">
          <ChevronRight size={18} />
        </button>
        {!noAgora && (
          <button onClick={() => setRef(hoje)} className="rounded-botao px-3 py-2 text-sm font-bold text-mar hover:bg-preenchimento">
            Hoje
          </button>
        )}
      </div>
    </div>
  )
}
