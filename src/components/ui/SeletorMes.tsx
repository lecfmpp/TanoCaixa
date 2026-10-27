import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { escolherMesRef, mesAnterior, mesAtual } from '@/data/derive'
import { mesSeguinte, nomeDoMes } from '@/data/planoMes'
import { useMesRef } from '@/ui/periodo'

interface SeletorMesProps {
  /** false quando o filtro da página é Semana ou um intervalo: o mês não manda. */
  ativo?: boolean
  /** Chamado ao trocar de mês — a página volta pro filtro "Mês". */
  aoEscolher?: () => void
}

/**
 * ‹ julho de 2026 › — o mês que o painel inteiro mostra (números, relatórios,
 * listas). Vai até o mês que vem; clicar no nome volta pro mês de hoje.
 */
export function SeletorMes({ ativo = true, aoEscolher }: SeletorMesProps) {
  const mes = useMesRef()
  const hoje = mesAtual()
  const limite = mesSeguinte(hoje)

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
        onClick={() => ir(hoje)}
        title="Voltar pro mês de hoje"
        className={cn(
          'min-w-[8.5rem] rounded-[10px] px-2.5 py-1.5 text-center text-sm font-bold capitalize transition',
          ativo ? 'bg-creme text-mar' : 'text-creme/80 hover:text-creme',
        )}
      >
        {nomeDoMes(mes)}
      </button>
      <button onClick={() => ir(mesSeguinte(mes))} disabled={mes >= limite} className={botao} aria-label="Próximo mês">
        <ChevronRight size={16} strokeWidth={2.4} />
      </button>
    </div>
  )
}
