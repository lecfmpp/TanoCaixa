import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Repeat, Search } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { brl, brlInteiro, quando, dataCurta, dataDoDia } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContexto, useRestaurante } from '@/data/hooks'
import { despesasResumo, categoriasResumo, resumoInicio, diaDeHoje, agora, noPeriodo } from '@/data/derive'
import { SeletorJanela, ddmm, diaDaSemana, nomeDaJanela, useJanela } from '@/components/ui/SeletorJanela'
import type { Filtro } from '@/types'
import { diasAte } from '@/data/vencimentos'
import { TagVencimento } from '@/components/ui/TagVencimento'
import { CONTA, GRUPO, GRUPOS, type GrupoDRE } from '@/data/planoContas'
import { gerarCSV, baixarCSV, arquivoDe } from '@/lib/csv'
import { ehCompra, agruparEmNotas, type Nota } from '@/data/compras'
import { AcoesLancamento } from '@/components/lancamentos/AcoesLancamento'
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

/** As duas naturezas de saída: conta da casa e mercadoria comprada. */
type Aba = 'casa' | 'compras'

/** Qual data manda no filtro do período: a da entrada (competência) ou a do vencimento. */
type BaseData = 'entrada' | 'vencimento'

/** Sem vencimento, a conta vence no dia em que entrou. */
const diaDa = (d: DespesaDoc, base: BaseData) => (base === 'vencimento' ? d.dataVencimento ?? d.dataCompetencia : d.dataCompetencia)

export function Despesas() {
  // Dia | Semana | Mês, igual ao Fluxo de caixa. Dentro do componente: MES_REF só vale depois que a sessão é resolvida.
  const estado = useJanela('mes')
  const { de, ate } = estado
  const periodo: Filtro = useMemo(() => ({ de, ate }), [de, ate])
  const nomeJanela = nomeDaJanela(estado)
  const { ctx } = useContexto()
  const restaurante = useRestaurante()
  const [busca, setBusca] = useState('')
  const [baseData, setBaseData] = useState<BaseData>('entrada')
  const [fornecedor, setFornecedor] = useState('')
  const [filtro, setFiltro] = useState<GrupoDRE | 'todas'>('todas')
  // Aluguel e compra de carne saem os dois do caixa, mas não se leem juntos:
  // um é conta fixa da casa, o outro é estoque virando prato.
  const [aba, setAba] = useState<Aba>('casa')

  // A tela toda fala do período escolhido (mês corrente ou últimos 7 dias), então
  // o que está fora dele fica de fora — senão os cartões somam o histórico.
  const doMes = useMemo(
    () => ctx.despesas.filter((d) => noPeriodo(diaDa(d, baseData), periodo)),
    [ctx.despesas, periodo, baseData],
  )

  const compras = useMemo(() => doMes.filter(ehCompra), [doMes])
  /**
   * Uma nota fiscal pode virar mais de um lançamento (alimento e bebida saem
   * em contas diferentes do DRE). Corrigir ou apagar é sempre pela nota
   * inteira — meia nota deixaria mercadoria no estoque sem ninguém ter pagado.
   */
  const notaDoLancamento = useMemo(() => {
    const mapa = new Map<string, Nota>()
    // Compra antiga, sem itens detalhados, não tem estoque atrás: ela é
    // corrigida como lançamento avulso mesmo, não pela gaveta de nota fiscal.
    for (const n of agruparEmNotas(compras)) {
      if (!n.itens.length) continue
      for (const l of n.lancamentos) mapa.set(l.id, n)
    }
    return mapa
  }, [compras])
  const contas = useMemo(() => doMes.filter((d) => !ehCompra(d)), [doMes])
  const daAba = aba === 'compras' ? compras : contas

  const resumo = despesasResumo(daAba)
  const totalCompras = compras.reduce((s, d) => s + d.valorTotal, 0)
  const totalContas = contas.reduce((s, d) => s + d.valorTotal, 0)
  const fat = resumoInicio(ctx, periodo).entrou
  const cats = categoriasResumo(daAba, fat)
  const cfg = restaurante.data

  // Só os grupos do DRE que já têm lançamento — chip vazio só atrapalha.
  const gruposUsados = useMemo(() => {
    const ids = new Set(daAba.map((d) => CONTA[d.categoria]?.grupo).filter(Boolean))
    return GRUPOS.filter((g) => ids.has(g.id))
  }, [daAba])

  const fornecedores = useMemo(
    () => [...new Set(daAba.map((d) => d.fornecedor))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [daAba],
  )

  const lista = useMemo(() => {
    return daAba
      .filter((d) => (filtro === 'todas' ? true : CONTA[d.categoria]?.grupo === filtro))
      .filter((d) => (fornecedor ? d.fornecedor === fornecedor : true))
      .filter((d) => (busca ? (d.fornecedor + (d.descricao ?? '')).toLowerCase().includes(busca.toLowerCase()) : true))
      // Por vencimento, a próxima conta a vencer vem primeiro; por entrada, a mais recente.
      .sort((a, b) => {
        const [x, y] = [diaDa(a, baseData), diaDa(b, baseData)]
        return baseData === 'vencimento' ? (x < y ? -1 : 1) : x < y ? 1 : -1
      })
  }, [daAba, filtro, fornecedor, busca, baseData])
  const totalLista = lista.reduce((s, d) => s + d.valorTotal, 0)
  /** Os lançamentos da lista, um cartão por dia (pela data que o filtro Entrada/Vencimento escolheu). */
  const porDia = useMemo(() => {
    const m = new Map<string, DespesaDoc[]>()
    for (const d of lista) {
      const dia = diaDa(d, baseData).slice(0, 10)
      m.set(dia, [...(m.get(dia) ?? []), d])
    }
    return [...m.entries()]
  }, [lista, baseData])

  const vence3 = daAba.find((d) => d.status === 'vence')
  const hoje = diaDeHoje()

  /** Lançamentos que estão na tela (filtro e busca incluídos), em CSV. */
  function exportar() {
    const linhas = lista.map((d) => [
      diaDa(d, baseData).slice(0, 10).split('-').reverse().join('/'),
      d.fornecedor,
      d.descricao ?? '',
      GRUPO[CONTA[d.categoria]?.grupo ?? 'cmv'].nome,
      CONTA[d.categoria]?.nome ?? d.categoria,
      d.formaPagamento,
      d.status,
      d.criadoPorNome,
      d.valorTotal.toFixed(2).replace('.', ','),
      (d.juros ?? 0).toFixed(2).replace('.', ','),
    ])
    baixarCSV(
      `${aba === 'compras' ? 'compras' : 'despesas'}-${de}_${ate}-${arquivoDe(cfg?.nome)}`,
      gerarCSV([baseData === 'vencimento' ? 'Vencimento' : 'Data', 'Fornecedor', 'Descrição', 'Grupo do DRE', 'Conta', 'Pagamento', 'Situação', 'Quem lançou', 'Valor (R$)', 'Juros pagos (R$)'], linhas),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Despesas" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · o que saiu e o que tem pra pagar` : ''} semMes aoExportar={lista.length ? exportar : undefined} />

      <SeletorJanela estado={estado} />

      {/* Duas naturezas, duas abas — o DRE e o caixa continuam somando as duas. */}
      <div className="flex flex-col gap-3 cel:flex-row cel:items-center cel:justify-between">
        <div className="flex rounded-botao bg-preenchimento p-1">
          <AbaBotao rotulo="Contas da casa" valor={totalContas} ativa={aba === 'casa'} aoClicar={() => { setAba('casa'); setFiltro('todas'); setFornecedor('') }} />
          <AbaBotao rotulo="Compras de mercadoria" valor={totalCompras} ativa={aba === 'compras'} aoClicar={() => { setAba('compras'); setFiltro('todas'); setFornecedor('') }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <CartaoMini rotulo={`Saiu ${nomeJanela}`} valor={resumo.saiu} apoio={`${resumo.contagem} lançamentos`} />
        <CartaoMini rotulo="Já pago" valor={resumo.pago} apoio={`${Math.round((resumo.pago / (resumo.saiu || 1)) * 100)}% do período`} tom="mata" />
        <CartaoMini rotulo="A pagar" valor={resumo.aPagar} apoio={`${daAba.filter((d) => d.status !== 'pago').length} em aberto`} />
        <CartaoMini rotulo="Vence em 3 dias" valor={resumo.vence3} apoio={vence3?.fornecedor ?? '—'} tom="telha" />
      </div>

      {/* Onde o dinheiro saiu */}
      <Cartao>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-tinta">Onde o dinheiro saiu</h2>
          <span className="text-xs text-tinta-4">% do faturamento do período</span>
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
        <div className="flex flex-1 items-center gap-2 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5 cel:min-w-[240px]">
          <Search size={16} className="text-tinta-4" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar fornecedor…" className="w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-5" />
        </div>
        <select
          value={fornecedor}
          onChange={(e) => setFornecedor(e.target.value)}
          aria-label="Filtrar por fornecedor"
          className={cn(
            'rounded-campo border bg-superficie px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-mar cel:max-w-[220px]',
            fornecedor ? 'border-mar text-mar' : 'border-[rgba(46,95,115,0.14)] text-tinta-2',
          )}
        >
          <option value="">Todos os fornecedores</option>
          {fornecedores.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="flex shrink-0 items-center gap-1 rounded-botao bg-preenchimento p-1" role="group" aria-label="Filtrar o período pela data">
          <span className="px-2 text-xs font-semibold text-tinta-4">Data:</span>
          {(['entrada', 'vencimento'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBaseData(b)}
              aria-pressed={baseData === b}
              className={cn('rounded-[10px] px-3 py-1.5 text-sm font-bold capitalize transition', baseData === b ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta')}
            >
              {b}
            </button>
          ))}
        </div>
      </div>
      <div className="-mt-1 flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          <Chip rotulo="Todas" selecionado={filtro === 'todas'} aoClicar={() => setFiltro('todas')} />
          {gruposUsados.map((g) => <Chip key={g.id} rotulo={g.simples} selecionado={filtro === g.id} aoClicar={() => setFiltro(g.id)} />)}
        </div>
      </div>

      {/* Um cartão por dia, no estilo do Fluxo de caixa */}
      {porDia.length === 0 ? (
        <Cartao>
          <p className="py-6 text-center text-sm text-tinta-4">
            {aba === 'compras'
              ? 'Nenhuma nota fiscal lançada no período. A compra de mercadoria entra item a item, ligada aos seus produtos.'
              : 'Nenhuma conta da casa lançada no período.'}
          </p>
        </Cartao>
      ) : (
        porDia.map(([dia, itens]) => {
          const totalDia = itens.reduce((s, d) => s + d.valorTotal, 0)
          const aberto = itens.filter((d) => d.status !== 'pago').reduce((s, d) => s + d.valorTotal, 0)
          return (
            <Cartao key={dia} className="p-0">
              <div className="flex items-center justify-between border-b border-divisoria bg-preenchimento/40 px-4 py-2.5">
                <span className="text-sm font-bold capitalize text-tinta">
                  {dia === hoje ? 'Hoje' : diaDaSemana(dia)} · {ddmm(dia)}
                </span>
                <span className="text-xs text-tinta-4">
                  <span className="mono font-bold text-tinta">{brl(totalDia)}</span>
                  {' · '}
                  {aberto > 0 ? <>a pagar <span className="mono font-bold text-tinta">{brl(aberto)}</span></> : <span className="font-bold text-mata">tudo pago ✓</span>}
                </span>
              </div>
              {itens.map((d) => (
                <LinhaDespesa
                  key={d.id}
                  d={d}
                  hoje={hoje}
                  baseData={baseData}
                  alvo={
                    aba === 'compras' && notaDoLancamento.get(d.id)
                      ? { tipo: 'nota', nota: notaDoLancamento.get(d.id)! }
                      : { tipo: 'conta', despesa: d }
                  }
                />
              ))}
            </Cartao>
          )
        })
      )}

      <div className="flex items-center justify-between rounded-cartao bg-preenchimento/40 px-4 py-3 text-sm">
        <span className="text-tinta-3">{lista.length} lançamentos</span>
        <span className="mono font-bold text-tinta">{brl(totalLista)}</span>
      </div>
    </div>
  )
}

/** Uma conta no estilo da linha do Fluxo de caixa: fornecedor, conta do DRE, quem lançou, situação e valor. */
function LinhaDespesa({ d, hoje, baseData, alvo }: { d: DespesaDoc; hoje: string; baseData: BaseData; alvo: React.ComponentProps<typeof AcoesLancamento>['alvo'] }) {
  return (
    <div className={cn('flex items-center gap-3 border-b border-divisoria px-4 py-3 last:border-0', d.status === 'pago' && 'bg-mata/[0.04]')}>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate font-semibold', d.status === 'pago' ? 'text-tinta-3' : 'text-tinta')}>{d.fornecedor}</div>
        {d.descricao && <div className="truncate text-xs text-tinta-4">{d.descricao}</div>}
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <EtiquetaConta categoria={d.categoria} />
          {d.recorrente && (
            <span
              className="inline-flex w-fit items-center gap-1 whitespace-nowrap rounded-chip bg-mar/10 px-2 py-0.5 text-[11px] font-bold text-mar"
              title={d.repetidaAuto ? 'Gerada sozinha pela repetição mensal' : 'Se repete todo mês'}
            >
              <Repeat size={11} strokeWidth={2.4} />
              {d.repetidaAuto ? 'repetida do mês anterior' : 'todo mês'}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {d.status === 'pago' ? (
            <span className="text-[11px] font-semibold text-mata">pago{d.pagoEm ? ` ${dataCurta(dataDoDia(d.pagoEm))}` : ''}</span>
          ) : d.dataVencimento ? (
            <TagVencimento dias={diasAte(d.dataVencimento, hoje)} />
          ) : (
            <span className={cn('text-[11px] font-bold', STATUS[d.status].cls)}>{STATUS[d.status].txt}</span>
          )}
          {baseData === 'entrada' && d.dataVencimento && <span className="text-[11px] text-tinta-4">vence {dataCurta(dataDoDia(d.dataVencimento))}</span>}
          {baseData === 'vencimento' && <span className="text-[11px] text-tinta-4">entrou {dataCurta(dataDoDia(d.dataCompetencia))}</span>}
          <span className="inline-flex items-center gap-1.5 text-[11px] text-tinta-4">
            <Avatar inicial={(d.criadoPorNome || '?')[0]} cor={corNome(d.criadoPorNome)} tamanho={16} />
            {d.criadoPorNome} · {quando(new Date(d.criadoEm), agora())}
            {d.editadoPorNome && <span className="text-telhado">· corrigido por {d.editadoPorNome}</span>}
          </span>
          {d.status !== 'pago' && (
            // Pagar é no Fluxo de caixa — lá o check pergunta se teve juros.
            <Link to="/painel/fluxo" className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-mar hover:underline">
              Pagar no fluxo <ArrowRight size={11} />
            </Link>
          )}
        </div>
      </div>
      <div className="text-right">
        <div className={cn('mono font-bold', d.status === 'pago' ? 'text-tinta-3' : 'text-tinta')} style={{ fontSize: 16 }}>{brl(d.valorTotal)}</div>
        {!!d.juros && <div className="mono text-[11px] font-bold text-telha-alerta">+ {brl(d.juros)} juros</div>}
        {d.formaPagamento && <div className="text-[11px] capitalize text-tinta-4">{d.formaPagamento}</div>}
      </div>
      <AcoesLancamento alvo={alvo} className="flex justify-end" />
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

function AbaBotao({ rotulo, valor, ativa, aoClicar }: { rotulo: string; valor: number; ativa: boolean; aoClicar: () => void }) {
  return (
    <button
      onClick={aoClicar}
      className={cn(
        'rounded-[10px] px-4 py-2 text-sm font-bold transition',
        ativa ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta',
      )}
    >
      {rotulo} <span className="mono font-bold text-tinta-4">· {brlInteiro(valor)}</span>
    </button>
  )
}
