import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { useUI } from '@/ui/UIProvider'
import { brl, dataCurta, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useReceitaDia, useRestaurante } from '@/data/hooks'
import { HOJE } from '@/data/derive'
import { CANAIS_APP } from '@/data/planoContas'
import type { LancamentoDeVendas, ReceitaDiaDoc } from '@/data/types'

const CORES = ['#2E5F73', '#C05437', '#2F6B4A', '#7B6A8C', '#EFAB5C']

/** Cor estável por pessoa: a mesma pessoa tem sempre o mesmo avatar. */
function corNome(nome: string): string {
  let h = 0
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % CORES.length
  return CORES[h]
}

/**
 * Trilha de quem lançou as vendas do dia. Dia antigo, de antes da trilha
 * existir, cai na autoria do documento.
 */
function lancamentosDe(r: ReceitaDiaDoc): LancamentoDeVendas[] {
  if (r.historico?.length) return r.historico
  return [{ em: r.criadoEm, porId: r.criadoPorId, porNome: r.criadoPorNome, total: r.totalDia }]
}

/** Página do Caixa: lançar as vendas do dia e conciliar. Sem DRE, gastos ou lucro. */
export function Caixa() {
  const { abrirGaveta } = useUI()
  const cfg = useRestaurante().data
  const [aberto, setAberto] = useState<string | null>(null)
  const receitas = [...(useReceitaDia().data ?? [])].sort((a, b) => (a.data < b.data ? 1 : -1))

  const soma = (r: ReceitaDiaDoc, canal: string) =>
    r.canais.filter((c) => c.canal === canal).reduce((s, c) => s + c.valorBruto, 0)
  // iFood + canais de app antigos (ex.: Rappi) que ainda existam em dias já lançados.
  const plataformas = (r: ReceitaDiaDoc) => CANAIS_APP.reduce((s, c) => s + soma(r, c), 0)
  const loja = (r: ReceitaDiaDoc) => r.recebimentos.reduce((s, x) => s + x.valor, 0)

  const hoje = receitas[0]
  const plataformasHoje = hoje ? plataformas(hoje) : 0
  const lojaHoje = hoje ? loja(hoje) : 0

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Caixa"
        subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · vendas e conciliação` : ''}
        lancar={false}
      />

      {/* Ação principal */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo px-6 py-5 cel:flex-row cel:items-center">
        <div>
          <p className="text-[15px] font-bold text-insight-texto">Lançar as vendas de hoje</p>
          <p className="text-sm text-insight-texto/80">
            Confirme o que veio do iFood e o que entrou de Pix, cartão e dinheiro na loja.
            Fica registrado quem lançou e quando.
          </p>
        </div>
        <button
          onClick={() => abrirGaveta('fechamento')}
          className="shrink-0 rounded-botao bg-telhado px-5 py-2.5 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95"
        >
          Lançar vendas
        </button>
      </div>

      {/* Resumo do caixa de hoje */}
      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <CaixaCard rotulo="Vendas de hoje" valor={hoje ? hoje.totalDia : 0} />
        <CaixaCard rotulo="Plataformas" valor={plataformasHoje} apoio="iFood" />
        <CaixaCard rotulo="Na loja" valor={lojaHoje} apoio="Pix, cartão, dinheiro" />
        <CaixaCard rotulo="Dias lançados" valor={receitas.length} apoio="com vendas registradas" contagem />
      </div>

      {/* Conciliação / histórico */}
      <Cartao className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-tinta">Conciliação dos últimos dias</h2>
          <span className="text-xs text-tinta-4">plataformas × loja × total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-y border-divisoria bg-preenchimento/40 text-left">
                <Th>Dia</Th>
                <Th className="text-right">iFood</Th>
                <Th className="text-right">Na loja</Th>
                <Th className="text-right">Total</Th>
                <Th>Lançado por</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {receitas.map((r) => {
                const plat = plataformas(r)
                const lj = loja(r)
                const conferido = Math.abs(plat + lj - r.totalDia) < 0.01
                const lancs = lancamentosDe(r)
                const ultimo = lancs[lancs.length - 1]
                const expandido = aberto === r.id
                return (
                  <Fragment key={r.id}>
                    <tr className="border-b border-divisoria last:border-0">
                      <td className="mono px-4 py-3 text-tinta-2">{dataCurta(new Date(r.data + 'T12:00:00'))}</td>
                      <td className="mono px-4 py-3 text-right text-tinta">{brl(plat)}</td>
                      <td className="mono px-4 py-3 text-right text-tinta">{brl(lj)}</td>
                      <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(r.totalDia)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => lancs.length > 1 && setAberto(expandido ? null : r.id)}
                          className={cn('flex items-center gap-2 text-left', lancs.length > 1 ? 'cursor-pointer' : 'cursor-default')}
                        >
                          <Avatar inicial={(ultimo.porNome || '?')[0]} cor={corNome(ultimo.porNome)} tamanho={26} />
                          <span className="leading-tight">
                            <span className="block text-xs font-semibold text-tinta">{ultimo.porNome}</span>
                            <span className="block text-[11px] text-tinta-4">{quando(new Date(ultimo.em), HOJE)}</span>
                          </span>
                          {lancs.length > 1 && (
                            <span className="flex items-center gap-0.5 text-[11px] font-bold text-mar">
                              {lancs.length}× {expandido ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'rounded-chip px-2 py-0.5 text-xs font-bold',
                            conferido ? 'bg-mata/12 text-mata' : 'bg-sol/20 text-insight-rotulo',
                          )}
                        >
                          {conferido ? 'conferido' : 'revisar'}
                        </span>
                      </td>
                    </tr>
                    {expandido &&
                      lancs.map((l, i) => (
                        <tr key={`${r.id}-${i}`} className="border-b border-divisoria bg-preenchimento/30 text-xs">
                          <td className="px-4 py-2 text-tinta-4">{i === 0 ? 'lançou' : 'relançou'}</td>
                          <td colSpan={2} className="px-4 py-2 text-tinta-2">{l.porNome} · {quando(new Date(l.em), HOJE)}</td>
                          <td className="mono px-4 py-2 text-right font-semibold text-tinta">{brl(l.total)}</td>
                          <td colSpan={2} />
                        </tr>
                      ))}
                  </Fragment>
                )
              })}
              {receitas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-tinta-4">
                    Nenhuma venda lançada ainda. Comece por "Lançar vendas".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  )
}

function CaixaCard({ rotulo, valor, apoio, contagem }: { rotulo: string; valor: number; apoio?: string; contagem?: boolean }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span className="mono text-tinta" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
        {contagem ? valor : brl(valor)}
      </span>
      {apoio && <span className="text-xs text-tinta-4">{apoio}</span>}
    </Cartao>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('rotulo px-4 py-2.5 text-tinta-4', className)}>{children}</th>
}
