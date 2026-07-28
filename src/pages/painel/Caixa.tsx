import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { useUI } from '@/ui/UIProvider'
import { brl, dataCurta } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useReceitaDia, useRestaurante } from '@/data/hooks'
import type { ReceitaDiaDoc } from '@/data/types'

/** Página do Caixa: abrir/fechar o dia e conciliar. Sem DRE, gastos ou lucro. */
export function Caixa() {
  const { abrirGaveta } = useUI()
  const cfg = useRestaurante().data
  const receitas = [...(useReceitaDia().data ?? [])].sort((a, b) => (a.data < b.data ? 1 : -1))

  const soma = (r: ReceitaDiaDoc, canal: string) =>
    r.canais.filter((c) => c.canal === canal).reduce((s, c) => s + c.valorBruto, 0)
  const loja = (r: ReceitaDiaDoc) => r.recebimentos.reduce((s, x) => s + x.valor, 0)

  const hoje = receitas[0]
  const plataformasHoje = hoje ? soma(hoje, 'ifood') + soma(hoje, 'rappi') : 0
  const lojaHoje = hoje ? loja(hoje) : 0

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Caixa"
        subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · fechamento e conciliação` : ''}
        lancar={false}
      />

      {/* Ação principal */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo px-6 py-5 cel:flex-row cel:items-center">
        <div>
          <p className="text-[15px] font-bold text-insight-texto">Fechar o caixa de hoje</p>
          <p className="text-sm text-insight-texto/80">
            Confirme o que veio do iFood, Rappi e o que entrou de Pix, cartão e dinheiro na loja.
          </p>
        </div>
        <button
          onClick={() => abrirGaveta('fechamento')}
          className="shrink-0 rounded-botao bg-telhado px-5 py-2.5 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95"
        >
          Abrir fechamento
        </button>
      </div>

      {/* Resumo do caixa de hoje */}
      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <CaixaCard rotulo="Vendas de hoje" valor={hoje ? hoje.totalDia : 0} />
        <CaixaCard rotulo="Plataformas" valor={plataformasHoje} apoio="iFood + Rappi" />
        <CaixaCard rotulo="Na loja" valor={lojaHoje} apoio="Pix, cartão, dinheiro" />
        <CaixaCard rotulo="Fechamentos" valor={receitas.length} apoio="dias registrados" contagem />
      </div>

      {/* Conciliação / histórico */}
      <Cartao className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-tinta">Conciliação dos últimos dias</h2>
          <span className="text-xs text-tinta-4">plataformas × loja × total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-divisoria bg-preenchimento/40 text-left">
                <Th>Dia</Th>
                <Th className="text-right">iFood + Rappi</Th>
                <Th className="text-right">Na loja</Th>
                <Th className="text-right">Total</Th>
                <Th>Situação</Th>
              </tr>
            </thead>
            <tbody>
              {receitas.map((r) => {
                const plat = soma(r, 'ifood') + soma(r, 'rappi')
                const lj = loja(r)
                const conferido = Math.abs(plat + lj - r.totalDia) < 0.01
                return (
                  <tr key={r.id} className="border-b border-divisoria last:border-0">
                    <td className="mono px-4 py-3 text-tinta-2">{dataCurta(new Date(r.data + 'T12:00:00'))}</td>
                    <td className="mono px-4 py-3 text-right text-tinta">{brl(plat)}</td>
                    <td className="mono px-4 py-3 text-right text-tinta">{brl(lj)}</td>
                    <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(r.totalDia)}</td>
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
                )
              })}
              {receitas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-tinta-4">
                    Nenhum caixa fechado ainda. Comece por "Abrir fechamento".
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
