import { Copy } from 'lucide-react'
import { Switch } from './Switch'
import { cn } from '@/lib/cn'

export interface DiaHorario {
  dia: string // 'seg', 'ter', ...
  rotulo: string // 'Segunda'
  aberto: boolean
  abre: string // 'HH:MM'
  fecha: string
}

export const HORARIO_PADRAO: DiaHorario[] = [
  { dia: 'seg', rotulo: 'Segunda', aberto: true, abre: '09:00', fecha: '17:00' },
  { dia: 'ter', rotulo: 'Terça', aberto: true, abre: '09:00', fecha: '17:00' },
  { dia: 'qua', rotulo: 'Quarta', aberto: true, abre: '09:00', fecha: '17:00' },
  { dia: 'qui', rotulo: 'Quinta', aberto: true, abre: '09:00', fecha: '17:00' },
  { dia: 'sex', rotulo: 'Sexta', aberto: true, abre: '09:00', fecha: '17:00' },
  { dia: 'sab', rotulo: 'Sábado', aberto: true, abre: '09:00', fecha: '17:00' },
  { dia: 'dom', rotulo: 'Domingo', aberto: false, abre: '09:00', fecha: '17:00' },
]

interface Props {
  valor: DiaHorario[]
  aoMudar: (v: DiaHorario[]) => void
}

export function HorarioSemana({ valor, aoMudar }: Props) {
  function alterar(i: number, patch: Partial<DiaHorario>) {
    aoMudar(valor.map((d, j) => (j === i ? { ...d, ...patch } : d)))
  }
  function copiarPraSemana(i: number) {
    const base = valor[i]
    aoMudar(valor.map((d) => ({ ...d, aberto: base.aberto, abre: base.abre, fecha: base.fecha })))
  }

  return (
    <div className="rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie">
      {valor.map((d, i) => (
        <div
          key={d.dia}
          className={cn(
            'flex items-center gap-3 px-4 py-2.5',
            i > 0 && 'border-t border-divisoria',
          )}
        >
          <Switch ligado={d.aberto} aoTrocar={(v) => alterar(i, { aberto: v })} rotulo={d.rotulo} />
          <span className={cn('w-20 shrink-0 text-sm font-semibold', d.aberto ? 'text-tinta' : 'text-tinta-4')}>
            {d.rotulo}
          </span>

          {d.aberto ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                type="time"
                value={d.abre}
                onChange={(e) => alterar(i, { abre: e.target.value })}
                className="mono rounded-campo border border-[rgba(46,95,115,0.14)] bg-fundo-app px-2 py-1.5 text-sm text-tinta outline-none focus:border-mar"
              />
              <span className="text-xs text-tinta-4">às</span>
              <input
                type="time"
                value={d.fecha}
                onChange={(e) => alterar(i, { fecha: e.target.value })}
                className="mono rounded-campo border border-[rgba(46,95,115,0.14)] bg-fundo-app px-2 py-1.5 text-sm text-tinta outline-none focus:border-mar"
              />
            </div>
          ) : (
            <span className="flex-1 text-sm text-tinta-4">Fechado</span>
          )}

          <button
            type="button"
            onClick={() => copiarPraSemana(i)}
            title="Copiar esse horário pros outros dias"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-botao text-tinta-4 transition hover:bg-preenchimento hover:text-mar"
          >
            <Copy size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}
