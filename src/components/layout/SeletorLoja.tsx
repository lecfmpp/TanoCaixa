import { useEffect, useRef, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Check, ChevronDown, Store } from 'lucide-react'
import { cn } from '@/lib/cn'
import { getRestaurante } from '@/data/repo'
import type { LojaAcessivel } from '@/data/hooks'
import type { FormatoLogo } from '@/data/logo'
import { useFormatoDaLogo } from './LogoDaLoja'

/**
 * Miniatura da logo: 20 × 20 (quadrada) ou 50 × 20 (horizontal). Sem logo,
 * um ícone de loja no espaço quadrado.
 */
function Miniatura({ url, formato, claro }: { url?: string; formato?: FormatoLogo; claro?: boolean }) {
  const f = useFormatoDaLogo(url, formato)
  const quadrada = !!url && f === 'quadrado'
  return (
    <span
      className={cn(
        'relative grid h-5 shrink-0 place-items-center overflow-hidden rounded-[5px]',
        quadrada || !url ? 'w-5' : 'w-[50px]',
        url ? 'bg-creme' : claro ? 'bg-white/10 text-creme/70' : 'bg-preenchimento text-tinta-4',
      )}
    >
      {url ? <img src={url} alt="" className="absolute inset-0.5 h-[calc(100%-4px)] w-[calc(100%-4px)] object-contain" /> : <Store size={13} aria-hidden />}
    </span>
  )
}

/**
 * Troca de loja no topo do menu lateral: logo em miniatura + nome. Lista só
 * as lojas que a pessoa pode abrir (ver useLojasAcessiveis).
 */
export function SeletorLoja({
  lojas,
  ativa,
  aoEscolher,
}: {
  lojas: LojaAcessivel[]
  ativa: string
  aoEscolher: (restauranteId: string) => void
}) {
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  // Mesma chave de cache da página da loja: abrir a loja não busca de novo.
  const docs = useQueries({
    queries: lojas.map((l) => ({
      queryKey: [l.restauranteId, 'restaurante'],
      queryFn: () => getRestaurante(l.restauranteId),
      staleTime: 5 * 60_000,
    })),
  })
  const logoDe = (i: number) => docs[i]?.data?.logoUrl
  const formatoDe = (i: number) => docs[i]?.data?.logoFormato
  const iAtiva = Math.max(0, lojas.findIndex((l) => l.restauranteId === ativa))
  const atual = lojas[iAtiva]

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  return (
    <div className="relative" ref={caixa}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className="flex w-full items-center gap-2.5 rounded-botao border border-white/15 bg-white/10 px-2.5 py-2 text-left text-sm font-semibold text-creme outline-none transition hover:bg-white/15 focus-visible:border-white/40"
      >
        <Miniatura url={logoDe(iAtiva)} formato={formatoDe(iAtiva)} claro />
        <span className="min-w-0 flex-1 truncate">{atual?.nome ?? 'Loja'}</span>
        <ChevronDown size={16} className={cn('shrink-0 text-creme/70 transition', aberto && 'rotate-180')} />
      </button>

      {aberto && (
        <ul
          role="listbox"
          aria-label="Lojas"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[60vh] overflow-y-auto rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie py-1 shadow-cartao"
        >
          {lojas.map((l, i) => {
            const selecionada = l.restauranteId === ativa
            return (
              <li key={l.restauranteId} role="option" aria-selected={selecionada}>
                <button
                  type="button"
                  onClick={() => {
                    setAberto(false)
                    if (!selecionada) aoEscolher(l.restauranteId)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-preenchimento',
                    selecionada ? 'font-bold text-tinta' : 'font-medium text-tinta-2',
                  )}
                >
                  <Miniatura url={logoDe(i)} formato={formatoDe(i)} />
                  <span className="min-w-0 flex-1 truncate">{l.nome}</span>
                  {selecionada && <Check size={15} className="shrink-0 text-mar" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
