import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { brl, brlInteiro, quando, dataCurta } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContexto, useRestaurante } from '@/data/hooks'
import { despesasResumo, categoriasResumo, resumoInicio, HOJE, MES_REF } from '@/data/derive'
import { CONTA, GRUPO, GRUPOS, type GrupoDRE } from '@/data/planoContas'
import type { DespesaDoc } from '@/data/types'

const STATUS: Record<DespesaDoc['status'], { txt: string; cls: string }> = {
  pago: { txt: 'pago', cls: 'text-mata' }, a_pagar: { txt: 'a pagar', cls: 'text-tinta-4' }, vence: { txt: 'vence', cls: 'text-telha-alerta' },
}

function corNome(nome: string): string {
  if (nome.startsWith('Halim')) return '#2E5F73'
  if (nome.startsWith('Jamile')) return '#C05437'
  if (nome.startsWith('Wesley')) return '#2F6B4A'
  return '#AEB9B8'
}

export function Despesas() {
  const { ctx } = useContexto()
  const restaurante = useRestaurante()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<GrupoDRE | 'todas'>('todas')

  // A tela toda fala do mês corrente ("Saiu em julho"), então os lançamentos
  // dos meses anteriores ficam de fora — senão os cartões somam o histórico.
  const doMes = useMemo(
    () => ctx.despesas.filter((d) => d.dataCompetencia.slice(0, 7) === MES_REF),
    [ctx.despesas],
  )

  const resumo = despesasResumo(doMes)
  const fat = resumoInicio(ctx, 'mes').entrou
  const cats = categoriasResumo(doMes, fat)
  const cfg = restaurante.data

  // Só os grupos do DRE que já têm lançamento — chip vazio só atrapalha.
  const gruposUsados = useMemo(() => {
    const ids = new Set(doMes.map((d) => CONTA[d.categoria]?.grupo).filter(Boolean))
    return GRUPOS.filter((g) => ids.has(g.id))
  }, [doMes])

  const lista = useMemo(() => {
    return doMes
      .filter((d) => (filtro === 'todas' ? true : CONTA[d.categoria]?.grupo === filtro))
      .filter((d) => (busca ? (d.fornecedor + (d.descricao ?? '')).toLowerCase().includes(busca.toLowerCase()) : true))
      .sort((a, b) => (a.dataCompetencia < b.dataCompetencia ? 1 : -1))
  }, [doMes, filtro, busca])
  const totalLista = lista.reduce((s, d) => s + d.valorTotal, 0)

  const vence3 = doMes.find((d) => d.status === 'vence')

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Despesas" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''} />

      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <CartaoMini rotulo="Saiu em julho" valor={resumo.saiu} apoio={`${resumo.contagem} lançamentos`} />
        <CartaoMini rotulo="Já pago" valor={resumo.pago} apoio={`${Math.round((resumo.pago / (resumo.saiu || 1)) * 100)}% do mês`} tom="mata" />
        <CartaoMini rotulo="A pagar" valor={resumo.aPagar} apoio={`${doMes.filter((d) => d.status !== 'pago').length} contas em aberto`} />
        <CartaoMini rotulo="Vence em 3 dias" valor={resumo.vence3} apoio={vence3?.fornecedor ?? '—'} tom="telha" />
      </div>

      {/* Onde o dinheiro saiu */}
      <Cartao>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-tinta">Onde o dinheiro saiu</h2>
          <span className="text-xs text-tinta-4">% do faturamento do mês</span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-preenchimento">
          {cats.map((c) => (
            <div key={c.cat} className="h-full" style={{ width: `${(c.valor / (resumo.saiu || 1)) * 100}%`, background: c.cor }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 tab:grid-cols-4">
          {cats.map((c) => (
            <div key={c.cat} className="text-sm">
              <span className="flex items-center gap-1.5 text-tinta-3">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.cor }} />
                {c.nome}
              </span>
              <div className="mono font-bold text-tinta">{brl(c.valor)} · {c.pct.toFixed(1)}%</div>
            </div>
          ))}
        </div>
      </Cartao>

      {/* Busca + filtros */}
      <div className="flex flex-col gap-3 cel:flex-row cel:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5">
          <Search size={16} className="text-tinta-4" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar fornecedor…" className="w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-5" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip rotulo="Todas" selecionado={filtro === 'todas'} aoClicar={() => setFiltro('todas')} />
          {gruposUsados.map((g) => <Chip key={g.id} rotulo={g.simples} selecionado={filtro === g.id} aoClicar={() => setFiltro(g.id)} />)}
        </div>
      </div>

      {/* Tabela */}
      <Cartao className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                <Th>Fornecedor</Th><Th>Conta do DRE</Th><Th className="hidden tab:table-cell">Pagamento</Th><Th>Data</Th><Th>Quem lançou</Th><Th>Situação</Th><Th className="text-right">Valor</Th>
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => (
                <tr key={d.id} className="border-b border-divisoria last:border-0 hover:bg-preenchimento/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-tinta">{d.fornecedor}</div>
                    {d.descricao && <div className="text-xs text-tinta-4">{d.descricao}</div>}
                  </td>
                  <td className="px-4 py-3"><EtiquetaConta categoria={d.categoria} /></td>
                  <td className="hidden px-4 py-3 capitalize text-tinta-2 tab:table-cell">{d.formaPagamento}</td>
                  <td className="mono px-4 py-3 text-tinta-2">{dataCurta(new Date(d.dataCompetencia))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar inicial={(d.criadoPorNome || '?')[0]} cor={corNome(d.criadoPorNome)} tamanho={26} />
                      <div className="leading-tight"><div className="text-xs font-semibold text-tinta">{d.criadoPorNome}</div><div className="text-[11px] text-tinta-4">{quando(new Date(d.criadoEm), HOJE)}</div></div>
                    </div>
                  </td>
                  <td className={cn('px-4 py-3 text-xs font-bold', STATUS[d.status].cls)}>{STATUS[d.status].txt}</td>
                  <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(d.valorTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-divisoria bg-preenchimento/40 px-4 py-3 text-sm">
          <span className="text-tinta-3">{lista.length} lançamentos</span>
          <span className="mono font-bold text-tinta">{brl(totalLista)}</span>
        </div>
      </Cartao>
    </div>
  )
}

/** Conta do lançamento + o grupo do DRE em que ela cai. */
function EtiquetaConta({ categoria }: { categoria: DespesaDoc['categoria'] }) {
  const conta = CONTA[categoria]
  const grupo = GRUPO[conta?.grupo ?? 'cmv']
  return (
    <span className="flex flex-col gap-0.5">
      <span
        className="w-fit rounded-chip px-2 py-0.5 text-xs font-semibold"
        style={{ background: `${grupo.cor}1f`, color: grupo.cor }}
      >
        {conta?.nome ?? categoria}
      </span>
      <span className="text-[11px] text-tinta-4">{grupo.simples}</span>
    </span>
  )
}

function CartaoMini({ rotulo, valor, apoio, tom }: { rotulo: string; valor: number; apoio: string; tom?: 'mata' | 'telha' }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span className={cn('mono', tom === 'telha' ? 'text-telha-alerta' : tom === 'mata' ? 'text-mata' : 'text-tinta')} style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{brlInteiro(valor)}</span>
      <span className="text-xs text-tinta-4">{apoio}</span>
    </Cartao>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 rotulo text-tinta-4', className)}>{children}</th>
}
