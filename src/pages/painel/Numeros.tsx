import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownRight, ArrowUpRight, Lock, Minus, type LucideIcon } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { brl, brlInteiro } from '@/lib/format'
import { useAuth } from '@/auth/AuthContext'
import { usePeriodo } from '@/ui/periodo'
import { ehCompra } from '@/data/compras'
import { cn } from '@/lib/cn'
import { useContexto, useRestaurante } from '@/data/hooks'
import { HOJE, dreDoMes, mesAnterior, noPeriodo, periodoAnterior, resumoInicio, MES_REF } from '@/data/derive'
import { tetosNormalizados } from '@/data/planoContas'
import { nomeDoMes } from '@/data/planoMes'

/** 'Jul' — rótulo curto da barra. */
function mesCurto(mes: string): string {
  const nome = nomeDoMes(mes).split(' de ')[0]
  return nome.charAt(0).toUpperCase() + nome.slice(1, 3)
}

type Tom = 'bom' | 'ruim' | 'neutro'

const TOM_PILULA: Record<Tom, string> = {
  bom: 'bg-mata text-creme',
  ruim: 'bg-telha-alerta text-creme',
  neutro: 'bg-preenchimento text-tinta-3',
}

/** Seta de subida/descida: a cor diz se é bom ou ruim, a seta diz pra onde foi. */
function SetaTendencia({ icone: Icone, tom, texto }: { icone: LucideIcon; tom: Tom; texto: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-chip px-2 py-0.5 text-xs font-bold', TOM_PILULA[tom])}>
      <Icone size={13} strokeWidth={2.6} />
      {texto}
    </span>
  )
}

/** Variação % contra o período anterior. `subirEhBom`: entrar mais é bom, gastar mais não. */
function tendencia(atual: number, antes: number, temBase: boolean, subirEhBom: boolean) {
  if (!temBase || antes <= 0) return null
  const v = Math.round(((atual - antes) / antes) * 100)
  if (v === 0) return { icone: Minus, tom: 'neutro' as Tom, texto: 'igual' }
  const subiu = v > 0
  return {
    icone: subiu ? ArrowUpRight : ArrowDownRight,
    tom: (subiu === subirEhBom ? 'bom' : 'ruim') as Tom,
    texto: `${subiu ? '+' : ''}${v}%`,
  }
}

export function Dashboard() {
  const [periodo, setPeriodo] = usePeriodo()
  const { ctx } = useContexto()
  const { permissoes } = useAuth()
  const restaurante = useRestaurante()
  const r = resumoInicio(ctx, periodo)
  const antes = periodoAnterior(ctx, periodo)
  const contra = periodo === 'mes' ? 'mês passado' : 'semana passada'

  /**
   * Lucro líquido dos últimos 6 meses, calculado pelo mesmo DRE da tela de DRE
   * — antes era uma série fixa no código, que não mexia por mais que o dono
   * lançasse.
   */
  const historico = useMemo(() => {
    const meses: string[] = []
    let m = MES_REF
    for (let i = 0; i < 6; i++) { meses.unshift(m); m = mesAnterior(m) }
    return meses
      .map((mes) => {
        const temLancamento =
          ctx.despesas.some((d) => d.dataCompetencia.slice(0, 7) === mes) ||
          ctx.receitaDia.some((rd) => rd.data.slice(0, 7) === mes)
        return { mes, valor: temLancamento ? dreDoMes(ctx, mes).lucroLiquido : null }
      })
      .filter((h): h is { mes: string; valor: number } => h.valor !== null)
  }, [ctx])
  const cfg = restaurante.data
  const fat = r.entrou
  const pctv = (v: number) => (fat ? (v / fat) * 100 : 0)

  // Despesas com compras: o que foi comprado em notas fiscais no período
  // (mercadoria), sem o ajuste de estoque que o CMV do DRE faz.
  const compras = ctx.despesas
    .filter((d) => noPeriodo(d.dataCompetencia, periodo) && ehCompra(d))
    .reduce((s, d) => s + d.valorTotal, 0)

  // Todo KPI é "valor do período ÷ receita bruta do mesmo período" (pctv).
  // Metas dos KPIs saem dos tetos do Plano do mês, não de número fixo.
  const tetos = tetosNormalizados(cfg?.tetos as Record<string, number> | undefined)
  const tetoCompras = tetos.cmv ?? 30
  const tetoPessoal = tetos.pessoal ?? 25
  const tetoDeducao = tetos.deducao ?? 12
  const tetoImposto = (cfg?.aliquotaImposto ?? 0.06) * 100
  const tetoOcupacao = tetos.ocupacao ?? 10

  // Meta de faturamento (definida em Metas e números): no mês é a meta inteira;
  // na semana, a fatia de 7 dias do mês.
  const diasNoMes = new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0).getDate()
  const metaMes = cfg?.metaFaturamento ?? 0
  const metaPeriodo = periodo === 'mes' ? metaMes : (metaMes * 7) / diasNoMes
  const pctMeta = metaPeriodo > 0 ? (r.entrou / metaPeriodo) * 100 : 0

  const sobrou = r.sobrouFinal
  const veFaturamento = permissoes?.veFaturamentoTotal ?? true
  const veLucro = permissoes?.veLucro ?? true

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Dashboard"
        subtitulo={cfg ? [cfg.nome, cfg.bairro, nomeDoMes(MES_REF)].filter(Boolean).join(' · ') : ''}
        periodo={periodo}
        aoTrocarPeriodo={setPeriodo}
      />

      <div className="grid grid-cols-1 gap-3.5 cel:grid-cols-3">
        <CartaoDestaque
          rotulo="Entrou"
          valor={brlInteiro(r.entrou)}
          fundo="bg-mar"
          visivel={veFaturamento}
          trend={tendencia(r.entrou, antes.entrou, antes.temBase, true)}
          contra={contra}
        />
        <CartaoDestaque
          rotulo="Saiu"
          valor={brlInteiro(r.saiu)}
          fundo="bg-telhado"
          visivel
          trend={tendencia(r.saiu, antes.saiu, antes.temBase, false)}
          contra={contra}
        />
        <CartaoDestaque
          rotulo="Sobrou"
          valor={brlInteiro(sobrou)}
          fundo={sobrou >= 0 ? 'bg-mata' : 'bg-telha-alerta'}
          visivel={veLucro}
          trend={sobrou >= 0 ? { icone: ArrowUpRight, tom: 'bom', texto: `margem ${r.margem.toFixed(1)}%` } : { icone: ArrowDownRight, tom: 'ruim', texto: 'no vermelho' }}
          contra=""
          motivo="só o dono vê o lucro"
        />
      </div>

      {veFaturamento && (
        <Cartao className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-bold text-tinta">Meta de faturamento {periodo === 'mes' ? 'do mês' : 'da semana'}</h2>
            <Link to="/painel/metas" className="text-sm font-bold text-mar hover:underline">
              {metaPeriodo > 0 ? 'Ajustar meta' : 'Definir meta'}
            </Link>
          </div>
          {metaPeriodo > 0 ? (
            <>
              <div className="h-3 w-full overflow-hidden rounded-full bg-trilho" role="img" aria-label={`${pctMeta.toFixed(0)}% da meta`}>
                <div className={cn('h-full rounded-full', pctMeta >= 100 ? 'bg-mata' : 'bg-mar')} style={{ width: `${Math.min(100, pctMeta)}%` }} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-tinta-3">
                <span><span className="mono font-bold text-tinta">{brlInteiro(r.entrou)}</span> de <span className="mono">{brlInteiro(metaPeriodo)}</span></span>
                <SetaTendencia
                  icone={pctMeta >= 100 ? ArrowUpRight : Minus}
                  tom={pctMeta >= 100 ? 'bom' : 'neutro'}
                  texto={pctMeta >= 100 ? 'meta batida' : `${pctMeta.toFixed(0)}% da meta`}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-tinta-3">Sem meta definida. Defina em Metas e números pra acompanhar aqui.</p>
          )}
        </Cartao>
      )}

      <div className="grid grid-cols-1 gap-3.5 cel:grid-cols-2 tab:grid-cols-3">
        <CartaoKpi
          rotulo="Despesas com Compras"
          valor={pctv(compras)}
          teto={tetoCompras}
          texto={compras > 0 ? `${brl(compras)} em notas de mercadoria` : 'Notas fiscais de mercadoria'}
        />
        <CartaoKpi
          rotulo="Custo de pessoal"
          valor={pctv(r.pessoal)}
          teto={tetoPessoal}
          texto="Folha, encargos e benefícios"
        />
        <CartaoKpi
          rotulo="Taxas sobre venda"
          valor={pctv(r.apps)}
          teto={tetoDeducao}
          texto="Comissão de apps e maquininha"
        />
        <CartaoKpi
          rotulo="Impostos sobre venda"
          valor={pctv(r.imposto)}
          teto={tetoImposto}
          texto={r.impostoEstimado ? 'Estimado pela alíquota — nada lançado' : 'Simples, MEI, ISS e similares'}
        />
        <CartaoKpi
          rotulo="Ocupação"
          valor={pctv(r.ocupacao)}
          teto={tetoOcupacao}
          texto="Aluguel, condomínio, luz e água"
        />
      </div>

      <Cartao className="flex flex-col">
        <h2 className="mb-6 text-[15px] font-bold text-tinta">Quanto sobrou, mês a mês</h2>
        {historico.length ? (
          <>
            <GraficoSobrou historico={historico} />
            <p className="mt-5 text-sm text-tinta-3">{leituraDoHistorico(historico)}</p>
          </>
        ) : (
          <p className="text-sm text-tinta-3">
            Assim que houver venda e despesa lançadas, o quanto sobrou de cada mês aparece aqui.
          </p>
        )}
      </Cartao>
    </div>
  )
}

/** Cartão cheio de cor pros três números que mandam: entrou, saiu, sobrou. */
function CartaoDestaque({
  rotulo,
  valor,
  fundo,
  visivel,
  trend,
  contra,
  motivo = 'só o dono vê o faturamento',
}: {
  rotulo: string
  valor: string
  fundo: string
  visivel: boolean
  trend: { icone: LucideIcon; tom: Tom; texto: string } | null
  contra: string
  motivo?: string
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-cartao p-5 text-creme', fundo)}>
      <span className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full bg-white/10" aria-hidden />
      <span className="rotulo relative text-creme/75">{rotulo}</span>
      {visivel ? (
        <div className="relative mt-2 flex flex-col gap-2.5">
          <span className="mono" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>{valor}</span>
          {trend && (
            <span className="flex flex-wrap items-center gap-2 text-sm text-creme/85">
              <span className={cn('inline-flex items-center gap-1 rounded-chip bg-creme px-2 py-0.5 text-xs font-bold', trend.tom === 'bom' ? 'text-mata' : trend.tom === 'ruim' ? 'text-telha-alerta' : 'text-tinta-3')}>
                <trend.icone size={13} strokeWidth={2.6} />
                {trend.texto}
              </span>
              {contra && <span>vs. {contra}</span>}
            </span>
          )}
        </div>
      ) : (
        <div className="relative mt-2 flex items-center gap-2 py-2 text-creme/80"><Lock size={16} /><span className="text-xs">{motivo}</span></div>
      )}
    </div>
  )
}

/** KPI em % do faturamento: barra até a meta, seta e cor dizem se está dentro dela. */
function CartaoKpi({ rotulo, valor, teto, texto }: { rotulo: string; valor: number; teto: number; texto: string }) {
  const dentro = valor <= teto
  const cor = dentro ? 'bg-mata' : 'bg-telha-alerta'
  return (
    <Cartao className="flex flex-col gap-2.5 border-l-4" style={{ borderLeftColor: dentro ? '#2F6B4A' : '#B4462F' }}>
      <span className="rotulo text-tinta-3">{rotulo}</span>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('mono', dentro ? 'text-mata' : 'text-telha-alerta')} style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {valor.toFixed(1)}%
        </span>
        <SetaTendencia icone={dentro ? ArrowDownRight : ArrowUpRight} tom={dentro ? 'bom' : 'ruim'} texto={dentro ? 'dentro da meta' : 'acima da meta'} />
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-trilho" role="img" aria-label={`${valor.toFixed(1)}% de uma meta de ${teto}%`}>
        <div className={cn('h-full rounded-full', cor)} style={{ width: `${Math.min(100, (valor / (teto * 1.5)) * 100)}%` }} />
      </div>
      <span className="text-xs text-tinta-4">meta {teto}%</span>
      <span className="text-sm text-tinta-3">{texto}</span>
    </Cartao>
  )
}

interface PontoDoHistorico { mes: string; valor: number }

/** Frase honesta sobre a série — antes era texto fixo falando de abril. */
function leituraDoHistorico(historico: PontoDoHistorico[]): string {
  const atual = historico[historico.length - 1]
  const anterior = historico[historico.length - 2]
  const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
  const nomeAtual = maiuscula(nomeDoMes(atual.mes).split(' de ')[0])
  if (!anterior) return `${nomeAtual} é o primeiro mês com números fechados aqui.`
  const nomeAnterior = nomeDoMes(anterior.mes).split(' de ')[0]
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
      ? `${seguidos} meses seguidos de alta — ${nomeAtual} sobrou ${brl(dif)} a mais que ${nomeAnterior}.`
      : `${nomeAtual} sobrou ${brl(dif)} a mais que ${nomeAnterior}.`
  }
  return `${nomeAtual} sobrou ${brl(-dif)} a menos que ${nomeAnterior}.`
}

function GraficoSobrou({ historico }: { historico: PontoDoHistorico[] }) {
  const AREA = 150
  const max = Math.max(...historico.map((m) => Math.abs(m.valor)), 1)
  return (
    <div className="flex items-end justify-between gap-2">
      {historico.map((m, i) => {
        const altura = Math.max(6, (Math.abs(m.valor) / max) * AREA)
        const prejuizo = m.valor < 0
        const anterior = i > 0 ? historico[i - 1].valor : null
        const Seta = anterior === null || m.valor === anterior ? null : m.valor > anterior ? ArrowUpRight : ArrowDownRight
        return (
          <div key={m.mes} className="flex flex-1 flex-col items-center">
            <div className="flex flex-col items-center justify-end" style={{ height: AREA + 24 }}>
              {Seta && (
                <Seta size={16} strokeWidth={2.8} className={m.valor > (anterior ?? 0) ? 'text-mata' : 'text-telha-alerta'} aria-label={m.valor > (anterior ?? 0) ? 'subiu' : 'caiu'} />
              )}
              <span className={cn('mono mb-1.5 text-[13px] font-bold', prejuizo ? 'text-telha-alerta' : 'text-mar')}>{brl(m.valor)}</span>
              <div className={cn('w-9 rounded-t-md', prejuizo ? 'bg-telha-alerta' : 'bg-mar')} style={{ height: altura }} />
            </div>
            <div className="mt-3 text-xs text-tinta-4">{mesCurto(m.mes)}</div>
          </div>
        )
      })}
    </div>
  )
}
