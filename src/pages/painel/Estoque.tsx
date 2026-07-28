import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { useUI } from '@/ui/UIProvider'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContagens, useRestaurante } from '@/data/hooks'

export function Estoque() {
  const { abrirGaveta, confirmar } = useUI()
  const restaurante = useRestaurante()
  const contagens = useContagens()

  const cfg = restaurante.data
  const contagem = contagens.data?.find((c) => c.mesReferencia === '2026-07') ?? contagens.data?.[0]
  const itens = contagem?.itens ?? []

  const [quantidades, setQuantidades] = useState<Record<string, number>>(() =>
    Object.fromEntries(itens.map((i) => [i.produtoId, i.quantidade])),
  )

  const qtdDe = (produtoId: string, fallback: number) =>
    quantidades[produtoId] ?? fallback

  const ajustar = (produtoId: string, fallback: number, delta: number) =>
    setQuantidades((q) => {
      const atual = q[produtoId] ?? fallback
      return { ...q, [produtoId]: Math.max(0, atual + delta) }
    })

  const valorLive = useMemo(
    () => itens.reduce((s, i) => s + qtdDe(i.produtoId, i.quantidade) * i.custoUnitario, 0),
    [itens, quantidades],
  )

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Estoque" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''} />

      <div className="grid grid-cols-1 gap-3.5 tab:grid-cols-12">
        {/* Coluna principal — contagem */}
        <div className="tab:col-span-8">
          <Cartao className="flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-tinta">Contagem de julho</h2>
              <span className="text-xs text-tinta-4">{itens.length} itens</span>
            </div>
            <ul className="flex flex-col">
              {itens.map((item, idx) => {
                const qtd = qtdDe(item.produtoId, item.quantidade)
                const subtotal = qtd * item.custoUnitario
                return (
                  <li
                    key={item.produtoId}
                    className={cn('flex items-center gap-3 py-3', idx > 0 && 'border-t border-divisoria')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-tinta">{item.nome}</div>
                      <div className="text-xs text-tinta-4">contado por {item.contadoPor}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => ajustar(item.produtoId, item.quantidade, -1)}
                        className="grid h-8 w-8 place-items-center rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2 transition hover:border-mar/50"
                        aria-label="Diminuir"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="mono w-12 text-center text-[15px] font-bold text-tinta">{qtd}</span>
                      <button
                        type="button"
                        onClick={() => ajustar(item.produtoId, item.quantidade, 1)}
                        className="grid h-8 w-8 place-items-center rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2 transition hover:border-mar/50"
                        aria-label="Aumentar"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <div className="w-28 shrink-0 text-right">
                      <div className="mono font-bold text-tinta">{brl(subtotal)}</div>
                      <div className="mono text-[11px] text-tinta-4">{brl(item.custoUnitario)} / {item.unidade}</div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <button
              onClick={() => abrirGaveta('estoque')}
              className="mt-4 self-start rounded-botao bg-telhado px-4 py-2.5 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95"
            >
              + Entrada de estoque
            </button>
          </Cartao>
        </div>

        {/* Lateral — valor contado */}
        <div className="flex flex-col gap-3.5 tab:col-span-4">
          <Cartao className="flex flex-col gap-2">
            <span className="rotulo text-tinta-4">Valor contado</span>
            <span className="mono text-tinta" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>
              {brl(valorLive)}
            </span>
            <span className="text-sm text-tinta-4">mês passado: R$ 11.870</span>
          </Cartao>

          <Cartao className="flex flex-col">
            <span className="mb-3 rotulo text-tinta-4">Estoque fechado</span>
            <ul className="flex flex-col">
              <li className="flex items-center justify-between py-2 text-sm">
                <span className="text-tinta-3">Maio</span>
                <span className="mono font-semibold text-tinta">{brlInteiro(10940)}</span>
              </li>
              <li className="flex items-center justify-between border-t border-divisoria py-2 text-sm">
                <span className="text-tinta-3">Junho</span>
                <span className="mono font-semibold text-tinta">{brlInteiro(11870)}</span>
              </li>
              <li className="flex items-center justify-between border-t border-divisoria py-2 text-sm">
                <span className="font-bold text-tinta">Julho · contando</span>
                <span className="mono font-bold text-mar">{brl(valorLive)}</span>
              </li>
            </ul>
          </Cartao>

          <div className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-preenchimento/50 px-4 py-3 text-sm text-tinta-3">
            No estoque, dá pra contar direto do celular andando pelas prateleiras.
          </div>

          <button
            onClick={() =>
              confirmar({
                gravidade: 'destrutivo',
                titulo: 'Fechar a contagem de julho?',
                texto: 'Depois de fechar, esse valor vira o estoque do mês e entra no CMV. Só o dono consegue reabrir.',
                resumo: [
                  { rot: 'Itens contados', val: `${itens.length} de ${itens.length}` },
                  { rot: 'Valor do estoque', val: brl(valorLive) },
                ],
                rotuloCancelar: 'Continuar contando',
                rotuloConfirmar: 'Fechar mês',
                onConfirmar: () => {},
              })
            }
            className="rounded-botao bg-mar px-4 py-2.5 text-sm font-bold text-creme transition hover:bg-mar-escuro"
          >
            Fechar contagem
          </button>
        </div>
      </div>
    </div>
  )
}
