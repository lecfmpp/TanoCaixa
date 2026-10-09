import { useEffect, useRef, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { Intervalo } from '@/types'
import { cn } from '@/lib/cn'
import { diaDeHoje } from '@/data/derive'
import { rotuloIntervalo } from '@/ui/periodo'

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
 * claro, sobre a foto), com o intervalo escolhido no lugar do rótulo. O painel
 * abre fora da faixa do cabeçalho, no mesmo estilo do menu do +Lançar.
 */
export function SeletorIntervalo({ valor, aoTrocar, aoLimpar }: SeletorIntervaloProps) {
  const [aberto, setAberto] = useState(false)
  const hoje = diaDeHoje()
  const [de, setDe] = useState(valor?.de ?? hoje)
  const [ate, setAte] = useState(valor?.ate ?? hoje)
  const ref = useRef<HTMLDivElement>(null)

  // Ao abrir, começa do intervalo ativo (ou de hoje).
  useEffect(() => {
    if (aberto) {
      setDe(valor?.de ?? hoje)
      setAte(valor?.ate ?? hoje)
    }
  }, [aberto]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  const valido = !!de && !!ate && de <= ate
  const ativo = valor !== null

  function aplicar(i: Intervalo) {
    aoTrocar(i)
    setAberto(false)
  }

  const atalhos: { rotulo: string; i: Intervalo }[] = [
    { rotulo: 'Hoje', i: { de: hoje, ate: hoje } },
    { rotulo: 'Ontem', i: { de: somarDias(hoje, -1), ate: somarDias(hoje, -1) } },
    { rotulo: '30 dias', i: { de: somarDias(hoje, -29), ate: hoje } },
  ]

  return (
    <div className="relative" ref={ref}>
      <div className="inline-flex rounded-botao bg-white/10 p-1 backdrop-blur-sm">
        <button
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
        <div
          role="dialog"
          aria-label="Escolher período"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-72 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-4 text-tinta shadow-cartao"
        >
          <div className="flex flex-wrap gap-2">
            {atalhos.map((a) => (
              <button
                key={a.rotulo}
                onClick={() => aplicar(a.i)}
                className="rounded-chip border border-[rgba(46,95,115,0.18)] bg-superficie px-3 py-1.5 text-sm font-semibold text-tinta-2 transition hover:border-mar/50"
              >
                {a.rotulo}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="rotulo text-tinta-4">De</span>
              <input
                type="date"
                value={de}
                max={ate || undefined}
                onChange={(e) => setDe(e.target.value)}
                className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-2.5 py-2 text-sm text-tinta outline-none focus:border-mar"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="rotulo text-tinta-4">Até</span>
              <input
                type="date"
                value={ate}
                min={de || undefined}
                onChange={(e) => setAte(e.target.value)}
                className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-2.5 py-2 text-sm text-tinta outline-none focus:border-mar"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                aoLimpar()
                setAberto(false)
              }}
              disabled={!ativo}
              className="px-1 text-sm font-semibold text-tinta-3 transition hover:text-tinta disabled:opacity-40"
            >
              Limpar
            </button>
            <button
              onClick={() => valido && aplicar({ de, ate })}
              disabled={!valido}
              className="rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
