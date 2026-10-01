import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Lock, CheckCircle2, ArrowRight } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { TagVencimento } from '@/components/ui/TagVencimento'
import { useAuth } from '@/auth/AuthContext'
import { useUI } from '@/ui/UIProvider'
import { brl, brlInteiro, inteiro, pct, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Periodo } from '@/types'
import { useContexto, useAtividades, useInsights, useRestaurante, useSolicitacoes, useResponderSolicitacao, useMarcarPago } from '@/data/hooks'
import { resumoInicio, diaDeHoje, HOJE } from '@/data/derive'
import { lembretes, type Vencimento } from '@/data/vencimentos'
import { mensagemDeErro } from '@/lib/erros'

const COR_MAR = '#2E5F73'
const COR_TELHADO = '#C05437'

type Tom = 'positivo' | 'negativo' | 'neutro'
const DELTAS: Record<Periodo, { entrou: [string, Tom]; saiu: [string, Tom]; ponto: [string, Tom] }> = {
  mes: { entrou: ['+8% vs. junho', 'positivo'], saiu: ['+11% vs. junho', 'negativo'], ponto: ['virou no dia 21', 'positivo'] },
  semana: { entrou: ['+6% vs. semana passada', 'positivo'], saiu: ['+3% vs. semana passada', 'negativo'], ponto: ['virou na quinta', 'positivo'] },
}

export function Inicio() {
  const { permissoes, sessao } = useAuth()
  const { abrirGaveta, confirmar, adicionarToast } = useUI()
  const marcarPago = useMarcarPago()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const { ctx } = useContexto()
  const restaurante = useRestaurante()
  const atividades = useAtividades()
  const insights = useInsights()

  const r = resumoInicio(ctx, periodo)
  const d = DELTAS[periodo]
  const cfg = restaurante.data
  const sub = cfg
    ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}${periodo === 'mes' ? ', faltam 4 dias' : ''}`
    : 'Carregando…'

  const feed = [...(atividades.data ?? [])]
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))
    .slice(0, 5)
  const insight = insights.data?.[0]
  const avisos = lembretes(ctx.despesas, diaDeHoje())

  /** Pagar direto do aviso: confirma, marca e deixa o "Desfazer" à mão. */
  function pedirPagamento(v: Vencimento) {
    confirmar({
      gravidade: 'neutro',
      titulo: `Marcar ${v.natureza === 'nota' ? 'a nota' : 'a conta'} como paga?`,
      texto: `${v.fornecedor} sai da lista de vencimentos e fica registrado como pago por você, agora.`,
      resumo: [
        { rot: 'Fornecedor', val: v.fornecedor },
        { rot: 'Valor', val: brl(v.valor) },
        { rot: 'Vencimento', val: v.vencimento.split('-').reverse().join('/') },
      ],
      rotuloConfirmar: 'Marcar como paga',
      onConfirmar: async () => {
        try {
          await marcarPago.mutateAsync({ ids: v.lancamentoIds, pago: true, fornecedor: v.fornecedor, valor: v.valor })
          adicionarToast({
            tipo: 'sucesso',
            titulo: 'Pago',
            texto: `${v.fornecedor} · ${brl(v.valor)}`,
            rotuloAcao: 'Desfazer',
            onAcao: () => marcarPago.mutate({ ids: v.lancamentoIds, pago: false, fornecedor: v.fornecedor, valor: v.valor }),
          })
        } catch (e) {
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra marcar como pago', texto: mensagemDeErro(e, 'Tente de novo.') })
        }
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Como está o mês" subtitulo={sub} periodo={periodo} aoTrocarPeriodo={setPeriodo} />

      {sessao && (
        <div className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-preenchimento/50 px-6 py-4">
          <p className="text-sm text-tinta-2">
            Opa, <span className="font-bold text-tinta">{sessao.usuario.nome.split(' ')[0]}</span>! 👋
            Aqui está o resumo do mês pra você tomar as melhores decisões.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 cel:grid-cols-2 tab:grid-cols-4">
        <CartaoValor rotulo="Entrou" valor={r.entrou} delta={d.entrou} visivel={permissoes?.veFaturamentoTotal ?? true} motivo="só o dono vê o faturamento" />
        <CartaoValor rotulo="Saiu" valor={r.saiu} delta={d.saiu} visivel />
        <CartaoSobrou valor={r.sobrouFinal} margem={r.margem} visivel={permissoes?.veLucro ?? true} />
        <CartaoValor rotulo="Ponto de equilíbrio" valor={r.pontoEquilibrio} delta={d.ponto} visivel />
      </div>

      <PedidosDaFranqueadora />

      <Vencimentos avisos={avisos} aoPagar={pedirPagamento} />

      <div className="flex flex-col items-start justify-between gap-3 rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie px-6 py-5 cel:flex-row cel:items-center">
        <div>
          <p className="text-[15px] font-bold text-tinta">Lançou as vendas de hoje?</p>
          <p className="text-sm text-tinta-3">Lance o que entrou hoje: Pix, cartão e dinheiro no balcão, apps de delivery e delivery próprio.</p>
        </div>
        <button onClick={() => abrirGaveta('fechamento')} className="shrink-0 rounded-botao bg-mar px-5 py-2.5 text-sm font-bold text-creme transition hover:bg-mar-escuro">
          Lançar vendas
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3.5 tab:grid-cols-12">
        <div className="tab:col-span-7">
          <GraficoBarras titulo={periodo === 'mes' ? 'Entrou × saiu, semana a semana' : 'Entrou × saiu, dia a dia'} barras={r.barras} />
        </div>
        <div className="flex flex-col gap-3.5 tab:col-span-5">
          {insight && <CartaoInsight texto={insight.texto} />}
          <QuemMexeu feed={feed} />
        </div>
      </div>
    </div>
  )
}

/**
 * Lembretes de vencimento: boleto e nota em aberto que já venceram ou vencem
 * nos próximos dias. Só aparece quando há algo pra avisar.
 */
function Vencimentos({ avisos, aoPagar }: { avisos: Vencimento[]; aoPagar: (v: Vencimento) => void }) {
  if (!avisos.length) return null
  const vencidos = avisos.filter((v) => v.situacao === 'vencido')
  const total = avisos.reduce((s, v) => s + v.valor, 0)
  const critico = vencidos.length > 0
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-cartao border px-5 py-4 cel:px-6 cel:py-5',
        critico ? 'border-telha-alerta/40 bg-telha-alerta/8' : 'border-[rgba(192,84,55,0.3)] bg-insight-fundo',
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className={cn('rotulo', critico ? 'text-telha-alerta' : 'text-insight-rotulo')}>
          {critico
            ? `${vencidos.length} ${vencidos.length === 1 ? 'conta vencida' : 'contas vencidas'}`
            : 'Vencimentos dos próximos dias'}
        </span>
        <span className="mono text-sm font-bold text-tinta">{brl(total)} em aberto</span>
      </div>
      <ul className="flex flex-col">
        {avisos.slice(0, 6).map((v) => (
          <li
            key={v.id}
            className="flex flex-col gap-2 border-t border-[rgba(46,95,115,0.12)] py-3 first:border-0 first:pt-0 last:pb-0 cel:flex-row cel:items-center cel:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-tinta">{v.fornecedor}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <TagVencimento dias={v.dias} />
                <span className="text-xs text-tinta-4">
                  {v.natureza === 'nota' ? 'nota fiscal' : 'conta da casa'} · vence {v.vencimento.split('-').reverse().slice(0, 2).join('/')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end cel:self-auto">
              <span className="mono font-bold text-tinta">{brl(v.valor)}</span>
              <button
                onClick={() => aoPagar(v)}
                className="inline-flex items-center gap-1.5 rounded-botao bg-mar px-3 py-1.5 text-xs font-bold text-creme transition hover:bg-mar-escuro"
              >
                <CheckCircle2 size={14} /> Marcar como pago
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-[rgba(46,95,115,0.12)] pt-3 text-sm font-bold text-mar">
        {avisos.length > 6 && <span className="font-medium text-tinta-3">e mais {avisos.length - 6}</span>}
        <Link to="/painel/compras" className="inline-flex items-center gap-1 hover:underline">Notas fiscais <ArrowRight size={14} /></Link>
        <Link to="/painel/despesas" className="inline-flex items-center gap-1 hover:underline">Contas da casa <ArrowRight size={14} /></Link>
      </div>
    </div>
  )
}

/** O que a franqueadora pediu pra esta loja. Só aparece quando há pedido aberto. */
function PedidosDaFranqueadora() {
  const pedidos = useSolicitacoes().data ?? []
  const responder = useResponderSolicitacao()
  const abertos = pedidos.filter((p) => p.status === 'aberta')
  if (!abertos.length) return null

  return (
    <div className="flex flex-col gap-3 rounded-cartao border border-[rgba(123,106,140,0.35)] bg-[rgba(123,106,140,0.08)] px-6 py-5">
      <div className="flex items-center gap-2">
        <Inbox size={16} className="text-[#7B6A8C]" />
        <span className="rotulo text-[#6A5B7A]">
          {abertos.length === 1 ? 'A franqueadora pediu uma informação' : `A franqueadora pediu ${abertos.length} informações`}
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {abertos.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 border-t border-[rgba(123,106,140,0.2)] pt-2.5 first:border-0 first:pt-0 cel:flex-row cel:items-center cel:justify-between">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-tinta">{p.titulo}</p>
              {p.detalhe && <p className="pretty text-sm text-tinta-3">{p.detalhe}</p>}
              <p className="mt-0.5 text-xs text-tinta-4">
                {p.rede} · pedido por {p.pedidoPorNome} · {quando(new Date(p.criadoEm), HOJE)}
              </p>
            </div>
            <button
              onClick={() => responder.mutate(p)}
              disabled={responder.isPending}
              className="shrink-0 rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50"
            >
              Marcar como enviado
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CartaoValor({ rotulo, valor, delta, visivel, motivo }: { rotulo: string; valor: number; delta: [string, Tom]; visivel: boolean; motivo?: string }) {
  const cor = delta[1] === 'positivo' ? 'text-mata' : delta[1] === 'negativo' ? 'text-telha-alerta' : 'text-tinta-4'
  return (
    <Cartao className="flex flex-col gap-2">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      {visivel ? (
        <>
          <span className="mono text-tinta" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>{brlInteiro(valor)}</span>
          <span className={cn('text-sm font-bold', cor)}>{delta[0]}</span>
        </>
      ) : (
        <div className="flex items-center gap-2 py-2 text-tinta-4"><Lock size={16} /><span className="text-xs">{motivo}</span></div>
      )}
    </Cartao>
  )
}

function CartaoSobrou({ valor, margem, visivel }: { valor: number; margem: number; visivel: boolean }) {
  const positivo = valor >= 0
  return (
    <div className="relative overflow-hidden rounded-cartao bg-mar p-5 text-creme">
      <span className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full" style={{ background: '#EFAB5C', opacity: 0.92 }} aria-hidden />
      <span className="relative z-10 rotulo text-creme/70">Sobrou</span>
      {visivel ? (
        <div className="relative z-10 mt-2 flex flex-col gap-2">
          <span className={cn('mono', positivo ? 'text-creme' : 'text-[#F2B8A8]')} style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>{brlInteiro(valor)}</span>
          <span className="text-sm text-creme/80">margem de <span className="mono">{pct(margem)}</span></span>
        </div>
      ) : (
        <div className="relative z-10 mt-2 flex items-center gap-2 py-2 text-creme/75"><Lock size={16} /><span className="text-xs">só o dono vê o lucro</span></div>
      )}
    </div>
  )
}

function GraficoBarras({ titulo, barras }: { titulo: string; barras: { rotulo: string; entrou: number; saiu: number }[] }) {
  const AREA = 150
  const max = Math.max(...barras.flatMap((b) => [b.entrou, b.saiu]), 1)
  return (
    <Cartao className="flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-tinta">{titulo}</h2>
        <div className="flex items-center gap-3 text-xs text-tinta-3">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-mar" /> entrou</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-telhado" /> saiu</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        {barras.map((b) => {
          const sobraB = b.entrou - b.saiu
          return (
            <div key={b.rotulo} className="flex flex-1 flex-col items-center">
              <div className="flex items-end justify-center gap-1.5" style={{ height: AREA + 24 }}>
                <ColunaBarra valor={b.entrou} max={max} area={AREA} cor={COR_MAR} />
                <ColunaBarra valor={b.saiu} max={max} area={AREA} cor={COR_TELHADO} />
              </div>
              <div className="mt-3 text-center">
                <div className="text-xs text-tinta-4">{b.rotulo}</div>
                <div className={cn('mono mt-1 text-sm font-bold', sobraB >= 0 ? 'text-mata' : 'text-telha-alerta')}>{sobraB >= 0 ? '+' : ''}{inteiro(sobraB)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </Cartao>
  )
}

function ColunaBarra({ valor, max, area, cor }: { valor: number; max: number; area: number; cor: string }) {
  const altura = Math.max(4, (valor / max) * area)
  return (
    <div className="flex flex-col items-center justify-end" style={{ height: area + 24 }}>
      <span className="mono mb-1.5 text-[13px] font-medium" style={{ color: cor }}>{inteiro(valor)}</span>
      <div className="w-7 rounded-t-md" style={{ height: altura, background: cor }} />
    </div>
  )
}

function CartaoInsight({ texto }: { texto: string }) {
  return (
    <div className="rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-5">
      <div className="mb-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-telhado" /><span className="rotulo text-insight-rotulo">O que dá pra fazer hoje</span></div>
      <p className="pretty text-[15px] leading-relaxed text-insight-texto">{texto}</p>
      <div className="mt-4 rounded-campo border border-[rgba(192,84,55,0.18)] bg-superficie/70 px-4 py-3 text-sm text-insight-texto/85">
        Esse mesmo resumo chega no seu e-mail toda segunda de manhã.
      </div>
    </div>
  )
}

function QuemMexeu({ feed }: { feed: { id: string; quem: string; quemInicial: string; quemCor: string; acao: string; entidade: string; valor?: number; criadoEm: string }[] }) {
  return (
    <Cartao className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-tinta">Quem mexeu no quê</h2>
        <Link to="/painel/ajustes#historico" className="text-sm font-bold text-mar hover:underline">Ver tudo</Link>
      </div>
      <ul className="flex flex-col">
        {feed.map((a, i) => (
          <li key={a.id} className={cn('flex items-center gap-3 py-3', i > 0 && 'border-t border-divisoria')}>
            <Avatar inicial={a.quemInicial} cor={a.quemCor} tamanho={32} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-tinta"><span className="font-bold">{a.quem}</span> <span className="text-tinta-2">{a.acao}</span> <span className="font-semibold text-tinta">{a.entidade}</span></p>
              <p className="mt-0.5 text-xs text-tinta-4">{quando(new Date(a.criadoEm), HOJE)}</p>
            </div>
            {a.valor != null && <span className="mono shrink-0 text-sm font-medium text-tinta">{brl(a.valor)}</span>}
          </li>
        ))}
      </ul>
    </Cartao>
  )
}
