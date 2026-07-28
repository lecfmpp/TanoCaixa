import { useEffect, useRef, useState } from 'react'
import { Download, Plus, Receipt, Package, Boxes, CalendarCheck } from 'lucide-react'
import type { Periodo } from '@/types'
import { fotos } from '@/lib/fotos'
import { Segmentado } from '@/components/ui/Segmentado'
import { cn } from '@/lib/cn'

interface SectionHeaderProps {
  titulo: string
  subtitulo: string
  foto?: string
  periodo?: Periodo
  aoTrocarPeriodo?: (p: Periodo) => void
  exportar?: boolean
  lancar?: boolean
}

const OPCOES_LANCAR = [
  { id: 'despesa', rotulo: 'Lançar despesa', icone: Receipt, dica: 'nota, conta, boleto' },
  { id: 'produto', rotulo: 'Novo produto', icone: Package, dica: 'item do estoque' },
  { id: 'estoque', rotulo: 'Movimento de estoque', icone: Boxes, dica: 'entrada, perda' },
  { id: 'fechamento', rotulo: 'Fechar o dia', icone: CalendarCheck, dica: 'vendas do dia' },
] as const

/**
 * Cabeçalho de todas as seções: faixa com foto (filtro Mar), título e
 * subtítulo, segmentado Semana|Mês, Exportar e +Lançar. O menu do +Lançar
 * é renderizado FORA da faixa (ela tem overflow hidden).
 */
export function SectionHeader({
  titulo,
  subtitulo,
  foto = fotos.aerea,
  periodo,
  aoTrocarPeriodo,
  exportar = true,
  lancar = true,
}: SectionHeaderProps) {
  const [menuAberto, setMenuAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function fora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuAberto(false)
    }
    if (menuAberto) document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [menuAberto])

  return (
    <div className="relative" ref={ref}>
      {/* Faixa com foto (overflow hidden) */}
      <div className="foto-rio flex min-h-[86px] flex-col items-start justify-between gap-3 rounded-cartao px-5 py-4 tab:flex-row tab:items-center tab:gap-4 tab:px-6">
        <img src={foto} alt="" aria-hidden />
        <div className="relative z-10 min-w-0">
          <h1
            className="truncate text-creme"
            style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em' }}
          >
            {titulo}
          </h1>
          <p className="mt-0.5 truncate text-sm text-creme/80">{subtitulo}</p>
        </div>

        <div className="relative z-10 flex shrink-0 flex-wrap items-center gap-2.5">
          {periodo && aoTrocarPeriodo && (
            <Segmentado valor={periodo} aoTrocar={aoTrocarPeriodo} tom="claro" />
          )}
          {exportar && (
            <button className="hidden items-center gap-1.5 rounded-botao bg-white/15 px-3 py-2 text-sm font-bold text-creme backdrop-blur-sm transition hover:bg-white/25 tab:flex">
              <Download size={16} strokeWidth={2} />
              Exportar
            </button>
          )}
          {lancar && (
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="flex items-center gap-1.5 rounded-botao bg-telhado px-3.5 py-2 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95"
            >
              <Plus size={16} strokeWidth={2.5} />
              Lançar
            </button>
          )}
        </div>
      </div>

      {/* Menu do +Lançar — fora da faixa pra não ser cortado */}
      {menuAberto && (
        <div className="absolute right-6 top-[calc(100%-6px)] z-30 w-72 overflow-hidden rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie shadow-cartao">
          {OPCOES_LANCAR.map((op) => {
            const Icone = op.icone
            return (
              <button
                key={op.id}
                onClick={() => setMenuAberto(false)}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-preenchimento',
                  'border-b border-divisoria last:border-0',
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-botao bg-telhado/10 text-telhado">
                  <Icone size={18} strokeWidth={1.9} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-tinta">{op.rotulo}</span>
                  <span className="block text-xs text-tinta-4">{op.dica}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
