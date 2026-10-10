import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { fotos } from '@/lib/fotos'
import { brlInteiro, inteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAuth } from '@/auth/AuthContext'
import { usePeriodo } from '@/ui/periodo'
import { ehCompra } from '@/data/compras'
import { useContexto, usePlanoMes, useRestaurante } from '@/data/hooks'
import { HOJE, MES_REF, diasDoFiltro, noPeriodo, periodoAnterior, resumoInicio, type Contexto } from '@/data/derive'
import type { PlanoMesDoc } from '@/data/planoMes'
import type { RestauranteDoc } from '@/data/types'
import type { Filtro, Permissoes } from '@/types'
import { tetosNormalizados } from '@/data/planoContas'
import { nomeDoMes } from '@/data/planoMes'
import {
  MATA, MAR, SOL, TELHA,
  acumuladoDoMes, gastosPorGrupo, historicoCompras, historicoSobrou, leituraAcumulado, leituraBarras, leituraCanais,
  leituraCompras, leituraDias, leituraGastos, mediaPorDiaDaSemana, nomeCurtoDoMes, recDoPeriodo, recDoPeriodoAnterior,
  rotuloDoPeriodo, vendasPorCanal,
} from '@/data/dashboard'
import {
  BarraMeta, BarrasEntrouSaiu, BarrasVerticais, CaminhoEquilibrio, CartaoGrafico, Leitura, LinhaComTeto, Rosca, VazioGrafico,
  curtoK, type BarraItem,
} from '@/components/dashboard/graficos'

/** 'Jul' — rótulo curto do eixo dos meses. */
function mesCurto(mes: string): string {
  const nome = nomeDoMes(mes).split(' de ')[0]
  return nome.charAt(0).toUpperCase() + nome.slice(1, 3)
}

const COR_RUIM = '#B4462F'

/** "+8% vs. junho": a cor diz se a variação é boa ou ruim (entrar mais é bom, gastar mais não). */
function variacao(atual: number, antes: number, temBase: boolean, contra: string, subirEhBom: boolean): { texto: string; cor: string } {
  if (!temBase || antes <= 0) return { texto: atual > 0 ? `sem base em ${contra} pra comparar` : 'nada lançado ainda', cor: '#8A9698' }
  const v = Math.round(((atual - antes) / antes) * 100)
  if (v === 0) return { texto: `igual a ${contra}`, cor: '#8A9698' }
  return { texto: `${v > 0 ? '+' : ''}${v}% vs. ${contra}`, cor: v > 0 === subirEhBom ? MATA : COR_RUIM }
}

const GRADE = (min: number) => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))` }) as const

/** Frase de leitura do histórico de lucro — calculada, nunca texto fixo. */
function leituraDoHistorico(historico: { mes: string; valor: number }[]): string {
  const atual = historico[historico.length - 1]
  const anterior = historico[historico.length - 2]
  const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
  const nomeAtual = maiuscula(nomeCurtoDoMes(atual.mes))
  if (!anterior) return `${nomeAtual} é o primeiro mês com números fechados aqui.`
  const nomeAnterior = nomeCurtoDoMes(anterior.mes)
  const dif = atual.valor - anterior.valor
  if (Math.abs(dif) < 1) return `${nomeAtual} está no mesmo patamar de ${nomeAnterior}.`
  // Quantos meses seguidos de alta — só conta enquanto cada mês supera o anterior.
  let seguidos = 0
  for (let i = historico.length - 1; i > 0; i--) {
    if (historico[i].valor > historico[i - 1].valor) seguidos++
    else break
  }
  if (dif > 0) {
    return seguidos > 1
      ? `${seguidos} meses seguidos de alta — ${nomeAtual} sobrou ${brlInteiro(dif)} a mais que ${nomeAnterior}.`
      : `${nomeAtual} sobrou ${brlInteiro(dif)} a mais que ${nomeAnterior}.`
  }
  return `${nomeAtual} sobrou ${brlInteiro(-dif)} a menos que ${nomeAnterior}.`
}

export function Dashboard() {
  const [periodo, setPeriodo] = usePeriodo()
  const { ctx } = useContexto()
  const { permissoes } = useAuth()
  const cfg = useRestaurante().data ?? null
  const planoDoMes = usePlanoMes(MES_REF).data ?? null
  return <DashboardView ctx={ctx} cfg={cfg} planoDoMes={planoDoMes} permissoes={permissoes} periodo={periodo} setPeriodo={setPeriodo} />
}

/** A tela em si, sem buscar nada: recebe o contexto pronto. */
export function DashboardView({ ctx, cfg, planoDoMes, permissoes, periodo, setPeriodo }: {
  ctx: Contexto
  cfg: RestauranteDoc | null
  planoDoMes: PlanoMesDoc | null
  permissoes: Permissoes | null | undefined
  periodo: Filtro
  setPeriodo: (f: Filtro) => void
}) {

  const r = resumoInicio(ctx, periodo)
  const antes = periodoAnterior(ctx, periodo)
  const contra = periodo === 'mes' ? nomeCurtoDoMes(antes.mes) : periodo === 'semana' ? 'semana passada' : 'período anterior'
  const fat = r.entrou // receita bruta do período: base de TODOS os percentuais
  const pctv = (v: number) => (fat ? (v / fat) * 100 : 0)

  const veFaturamento = permissoes?.veFaturamentoTotal ?? true
  const veLucro = permissoes?.veLucro ?? true

  // Despesas com compras: notas fiscais de mercadoria do período, sem o ajuste de estoque do CMV do DRE.
  const compras = ctx.despesas
    .filter((d) => noPeriodo(d.dataCompetencia, periodo) && ehCompra(d))
    .reduce((s, d) => s + d.valorTotal, 0)

  // Tetos das metas: o que foi salvo em Metas e números.
  const tetos = tetosNormalizados(cfg?.tetos as Record<string, number> | undefined)
  const metas = [
    { nome: 'Despesas com compras', desc: 'Notas fiscais de mercadoria', valor: pctv(compras), teto: tetos.cmv ?? 30 },
    { nome: 'Custo de pessoal', desc: 'Folha, encargos e benefícios', valor: pctv(r.pessoal), teto: tetos.pessoal ?? 25 },
    { nome: 'Taxas sobre venda', desc: 'Comissão de apps e maquininha', valor: pctv(r.apps), teto: tetos.deducao ?? 12 },
    {
      nome: 'Impostos sobre venda',
      desc: r.impostoEstimado ? 'Estimado pela alíquota — nada lançado' : 'Simples, MEI, ISS e similares',
      valor: pctv(r.imposto),
      teto: (cfg?.aliquotaImposto ?? 0.06) * 100,
    },
    { nome: 'Ocupação', desc: 'Aluguel, condomínio, luz e água', valor: pctv(r.ocupacao), teto: tetos.ocupacao ?? 10 },
  ]

  // Meta de faturamento do mês: a do Plano do mês, se existir; senão a de Metas e números.
  const metaMes = planoDoMes?.metaFaturamento ?? cfg?.metaFaturamento ?? 0
  const diasNoMes = new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0).getDate()
  const metaPeriodo = periodo === 'mes' ? metaMes : (metaMes * diasDoFiltro(periodo)) / diasNoMes
  const pctMeta = metaPeriodo > 0 ? Math.round((fat / metaPeriodo) * 100) : 0

  const entrouVar = variacao(r.entrou, antes.entrou, antes.temBase, contra, true)
  const saiuVar = variacao(r.saiu, antes.saiu, antes.temBase, contra, false)

  const recPeriodo = useMemo(() => recDoPeriodo(ctx, periodo), [ctx, periodo])
  const recAnterior = useMemo(() => recDoPeriodoAnterior(ctx, periodo), [ctx, periodo])
  const despPeriodo = useMemo(() => ctx.despesas.filter((d) => noPeriodo(d.dataCompetencia, periodo)), [ctx.despesas, periodo])
  const gastos = gastosPorGrupo(despPeriodo)
  const canais = vendasPorCanal(recPeriodo, recAnterior)

  const acumulado = useMemo(() => acumuladoDoMes(ctx.receitaDia, r.pontoEquilibrio), [ctx.receitaDia, r.pontoEquilibrio])
  const dias = mediaPorDiaDaSemana(ctx.receitaDia)
  const maiores = [...dias].sort((a, b) => b.media - a.media).slice(0, 2).map((d) => d.rot)
  const historicoCmv = historicoCompras(ctx)
  const historico = historicoSobrou(ctx)
  const maxSobrou = Math.max(...historico.map((h) => Math.abs(h.valor)), 0)

  const semDados = ctx.despesas.length === 0 && ctx.receitaDia.length === 0
  const vazio = 'Assim que houver venda e despesa lançadas, este gráfico aparece aqui.'

  const subtitulo = cfg
    ? [cfg.nome, cfg.bairro, periodo === 'mes' ? nomeDoMes(MES_REF) : rotuloDoPeriodo(periodo)].filter(Boolean).join(' · ')
    : ''

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <SectionHeader titulo="Dashboard" subtitulo={subtitulo} foto={fotos.bondinho} periodo={periodo} aoTrocarPeriodo={setPeriodo} />

      {/* KPIs: Sobrou (único preenchido) · Entrou · Saiu */}
      <div className="gap-3.5" style={GRADE(250)}>
        <div className="relative flex flex-col gap-2 overflow-hidden rounded-cartao bg-mar p-5 text-creme">
          <span className="pointer-events-none absolute -right-8 -top-9 h-[104px] w-[104px] rounded-full" style={{ background: SOL, opacity: 0.92 }} aria-hidden />
          <span className="rotulo relative text-creme/70">Sobrou</span>
          {veLucro ? (
            <>
              <span className={cn('mono relative', r.sobrouFinal >= 0 ? 'text-creme' : 'text-[#F2B8A8]')} style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                {brlInteiro(r.sobrouFinal)}
              </span>
              <span className="relative text-sm text-creme/80">
                margem de <span className="mono">{r.margem.toFixed(1).replace('.', ',')}%</span>
              </span>
            </>
          ) : (
            <span className="relative flex items-center gap-2 py-2 text-creme/80"><Lock size={16} /><span className="text-xs">só o dono vê o lucro</span></span>
          )}
        </div>

        <CartaoKpi
          rotulo="Entrou"
          valor={brlInteiro(r.entrou)}
          visivel={veFaturamento}
          motivo="só o dono vê o faturamento"
          mini={r.barras.map((b) => b.entrou)}
          cor={MAR}
          variacao={entrouVar}
          rodape={
            metaPeriodo > 0 ? (
              <span className="text-xs text-tinta-3"><span className="mono font-bold text-tinta">{pctMeta}%</span> da meta de <span className="mono">{brlInteiro(metaPeriodo)}</span></span>
            ) : (
              <Link to="/painel/metas" className="text-xs font-bold text-mar hover:underline">Definir meta de faturamento</Link>
            )
          }
        />
        <CartaoKpi rotulo="Saiu" valor={brlInteiro(r.saiu)} visivel mini={r.barras.map((b) => b.saiu)} cor={TELHA} variacao={saiuVar} />
      </div>

      {/* Metas */}
      <Cartao className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2.5 gap-y-1">
          <h2 className="text-[15px] font-bold text-tinta">Metas {periodo === 'mes' ? 'do mês' : 'do período'}</h2>
          <span className="text-xs text-tinta-4">a marca vertical é a meta definida em <Link to="/painel/metas" className="font-semibold text-mar hover:underline">Metas e números</Link></span>
        </div>
        <div className="mt-[18px] gap-x-8 gap-y-5" style={GRADE(340)}>
          {metas.map((m) => (
            <BarraMeta key={m.nome} nome={m.nome} desc={m.desc} valor={m.valor} teto={m.teto} semVendas={fat <= 0} />
          ))}
        </div>
      </Cartao>

      <div className="gap-3.5" style={GRADE(460)}>
        {/* Gráfico principal: caminho até o equilíbrio (mês) ou entrou × saiu (semana / intervalo) */}
        {periodo === 'mes' ? (
          <CartaoGrafico
            className="col-span-full"
            titulo="Caminho até o ponto de equilíbrio"
            sub="quanto já vendeu no mês, dia a dia"
            direita={
              <div className="flex flex-wrap items-center gap-3.5 text-xs text-tinta-2">
                <span className="flex items-center gap-1.5"><span className="h-[3px] w-3.5 rounded-sm bg-mar" />vendido</span>
                <span className="flex items-center gap-1.5"><span className="w-3.5 border-t-[3px] border-dotted border-mar" />projeção</span>
              </div>
            }
          >
            {acumulado.acum[acumulado.acum.length - 1] > 0 || r.pontoEquilibrio > 0 ? (
              <>
                <CaminhoEquilibrio
                  acum={acumulado.acum}
                  proj={acumulado.proj}
                  ultimoDia={acumulado.ultimoDia}
                  hojeDia={acumulado.hojeDia}
                  pontoEquilibrio={r.pontoEquilibrio}
                  meta={metaMes}
                  cruzouDia={acumulado.cruzouDia}
                />
                <Leitura>{leituraAcumulado(acumulado, r.pontoEquilibrio, metaMes)}</Leitura>
              </>
            ) : (
              <VazioGrafico>{vazio}</VazioGrafico>
            )}
          </CartaoGrafico>
        ) : (
          <CartaoGrafico
            className="col-span-full"
            titulo={periodo === 'semana' ? 'Entrou × saiu, dia a dia' : 'Entrou × saiu no período'}
            sub={rotuloDoPeriodo(periodo)}
            direita={
              <div className="flex items-center gap-3.5 text-xs text-tinta-2">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mar" />entrou</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-telhado" />saiu</span>
              </div>
            }
          >
            {r.barras.some((b) => b.entrou > 0 || b.saiu > 0) ? (
              <>
                <BarrasEntrouSaiu barras={r.barras} />
                <Leitura>{leituraBarras(r.barras)}</Leitura>
              </>
            ) : (
              <VazioGrafico>{vazio}</VazioGrafico>
            )}
          </CartaoGrafico>
        )}

        {/* Para onde foi o dinheiro */}
        <CartaoGrafico titulo="Para onde foi o dinheiro" sub="tudo que saiu, por grupo do DRE">
          {gastos.length ? (
            <>
              <div className="mt-[18px] flex flex-wrap items-center gap-6">
                <Rosca
                  fatias={gastos}
                  centro={
                    <>
                      <span className="rotulo text-[11px] text-tinta-4">Saiu</span>
                      <span className="mono mt-0.5 whitespace-nowrap text-[17px] font-bold" style={{ letterSpacing: '-0.02em' }}>{brlInteiro(r.saiu)}</span>
                    </>
                  }
                />
                <ul className="flex min-w-[190px] flex-1 flex-col gap-[11px]">
                  {gastos.map((g) => (
                    <li key={g.grupo} className="flex items-center gap-2.5">
                      <span className="h-3 w-3 flex-none rounded" style={{ background: g.cor }} />
                      <span className="min-w-0 flex-1 text-sm font-semibold text-tinta">{g.nome}</span>
                      <span className="flex-none whitespace-nowrap text-right">
                        <span className="mono block text-[13px] font-bold text-tinta">{brlInteiro(g.valor)}</span>
                        <span className="block text-[11px] text-tinta-4">{g.pct.toFixed(1).replace('.', ',')}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Leitura>{leituraGastos(gastos)}</Leitura>
            </>
          ) : (
            <VazioGrafico>{vazio}</VazioGrafico>
          )}
        </CartaoGrafico>

        {/* De onde vêm as vendas */}
        <CartaoGrafico titulo="De onde vêm as vendas" sub="por canal de venda">
          {canais.length ? (
            <>
              <div className="mt-5 flex h-[22px] gap-[3px] overflow-hidden rounded-[11px]">
                {canais.map((c) => (
                  <div key={c.canal} className="h-full" style={{ background: c.cor, width: `${c.pct}%` }} title={`${c.nome} · ${c.pct.toFixed(1)}%`} />
                ))}
              </div>
              <ul className="mt-2 flex flex-col">
                {canais.map((c) => (
                  <li key={c.canal} className="flex items-center gap-2.5 border-b border-preenchimento py-3 last:border-0">
                    <span className="h-3 w-3 flex-none rounded-full" style={{ background: c.cor }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-tinta">{c.nome}</div>
                      <div className="text-xs text-tinta-4">{c.pct.toFixed(1).replace('.', ',')}% das vendas</div>
                    </div>
                    <div className="flex-none whitespace-nowrap text-right">
                      <div className="mono text-[13px] font-bold text-tinta">{brlInteiro(c.valor)}</div>
                      {c.variacao !== null && (
                        <div className="text-[11px] font-bold" style={{ color: c.variacao >= 0 ? MATA : COR_RUIM }}>
                          {c.variacao >= 0 ? '+' : ''}{c.variacao.toFixed(1).replace('.', ',')}% vs. {contra}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <Leitura>{leituraCanais(canais, contra)}</Leitura>
            </>
          ) : (
            <VazioGrafico>{vazio}</VazioGrafico>
          )}
        </CartaoGrafico>

        {/* Quais dias vendem mais */}
        <CartaoGrafico titulo="Quais dias vendem mais" sub={`média por dia da semana, em ${nomeCurtoDoMes(MES_REF)}`}>
          {dias.some((d) => d.media > 0) ? (
            <>
              <BarrasVerticais
                itens={dias.map<BarraItem>((d) => ({
                  rot: d.rot,
                  valor: d.media,
                  rotValor: inteiro(d.media),
                  cor: maiores.includes(d.rot) ? MAR : 'rgba(46,95,115,.3)',
                  destaque: maiores.includes(d.rot),
                }))}
              />
              <Leitura>{leituraDias(dias)}</Leitura>
            </>
          ) : (
            <VazioGrafico>{vazio}</VazioGrafico>
          )}
        </CartaoGrafico>

        {/* Despesas com compras, mês a mês */}
        <CartaoGrafico titulo="Despesas com compras, mês a mês" sub="quanto das vendas virou mercadoria">
          {historicoCmv.length ? (
            <>
              <LinhaComTeto pontos={historicoCmv} teto={tetos.cmv ?? 30} fmtMes={mesCurto} />
              <Leitura>{leituraCompras(historicoCmv, tetos.cmv ?? 30)}</Leitura>
            </>
          ) : (
            <VazioGrafico>{vazio}</VazioGrafico>
          )}
        </CartaoGrafico>

        {/* Quanto sobrou, mês a mês */}
        <CartaoGrafico className="col-span-full" titulo="Quanto sobrou, mês a mês">
          {historico.length && !semDados ? (
            <>
              <BarrasVerticais
                gap={10}
                itens={historico.map<BarraItem>((h, i) => ({
                  rot: mesCurto(h.mes),
                  valor: h.valor,
                  rotValor: maxSobrou >= 1000 ? curtoK(h.valor) : String(Math.round(h.valor)),
                  cor: h.valor < 0 ? TELHA : i === historico.length - 1 ? MAR : 'rgba(46,95,115,.3)',
                  destaque: i === historico.length - 1,
                }))}
              />
              <Leitura>{leituraDoHistorico(historico)}</Leitura>
            </>
          ) : (
            <VazioGrafico>Assim que houver venda e despesa lançadas, o quanto sobrou de cada mês aparece aqui.</VazioGrafico>
          )}
        </CartaoGrafico>
      </div>
    </div>
  )
}

/** Cartão claro de KPI, com mini barras do período e a variação contra o período anterior. */
function CartaoKpi({ rotulo, valor, visivel, motivo, mini, cor, variacao: v, rodape }: {
  rotulo: string
  valor: string
  visivel: boolean
  motivo?: string
  mini: number[]
  cor: string
  variacao: { texto: string; cor: string }
  rodape?: React.ReactNode
}) {
  const mx = Math.max(...mini, 1)
  return (
    <Cartao className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2.5">
        <span className="rotulo text-tinta-4">{rotulo}</span>
        {visivel && (
          <span className="flex h-7 items-end gap-1" aria-hidden>
            {mini.slice(0, 10).map((m, i) => (
              <span key={i} className="w-[7px] rounded-t-[3px]" style={{ background: cor, height: Math.max(4, (m / mx) * 28) }} />
            ))}
          </span>
        )}
      </div>
      {visivel ? (
        <>
          <span className="mono text-tinta" style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{valor}</span>
          <span className="text-sm font-bold" style={{ color: v.cor }}>{v.texto}</span>
          {rodape}
        </>
      ) : (
        <span className="flex items-center gap-2 py-2 text-tinta-4"><Lock size={16} /><span className="text-xs">{motivo}</span></span>
      )}
    </Cartao>
  )
}
