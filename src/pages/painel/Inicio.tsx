import { useState } from 'react'
import { Lock } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/auth/AuthContext'
import { useUI } from '@/ui/UIProvider'
import { brl, brlInteiro, inteiro, pct, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Periodo } from '@/types'
import { useContexto, useAtividades, useInsights, useRestaurante } from '@/data/hooks'
import { resumoInicio, HOJE } from '@/data/derive'

const COR_MAR = '#2E5F73'
const COR_TELHADO = '#C05437'

type Tom = 'positivo' | 'negativo' | 'neutro'
const DELTAS: Record<Periodo, { entrou: [string, Tom]; saiu: [string, Tom]; ponto: [string, Tom] }> = {
  mes: { entrou: ['+8% vs. junho', 'positivo'], saiu: ['+11% vs. junho', 'negativo'], ponto: ['virou no dia 21', 'positivo'] },
  semana: { entrou: ['+6% vs. semana passada', 'positivo'], saiu: ['+3% vs. semana passada', 'negativo'], ponto: ['virou na quinta', 'positivo'] },
}

export function Inicio() {
  const { permissoes } = useAuth()
  const { abrirGaveta } = useUI()
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

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Como está o mês" subtitulo={sub} periodo={periodo} aoTrocarPeriodo={setPeriodo} />

      <div className="grid grid-cols-1 gap-3.5 cel:grid-cols-2 tab:grid-cols-4">
        <CartaoValor rotulo="Entrou" valor={r.entrou} delta={d.entrou} visivel={permissoes?.veFaturamentoTotal ?? true} motivo="só o dono vê o faturamento" />
        <CartaoValor rotulo="Saiu" valor={r.saiu} delta={d.saiu} visivel />
        <CartaoSobrou valor={r.sobrou} margem={r.margem} visivel={permissoes?.veLucro ?? true} />
        <CartaoValor rotulo="Ponto de equilíbrio" valor={r.pontoEquilibrio} delta={d.ponto} visivel />
      </div>

      <div className="flex flex-col items-start justify-between gap-3 rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie px-6 py-5 cel:flex-row cel:items-center">
        <div>
          <p className="text-[15px] font-bold text-tinta">Fechou o dia?</p>
          <p className="text-sm text-tinta-3">iFood e Rappi já entraram. Falta confirmar o que veio de Pix, cartão e dinheiro no balcão.</p>
        </div>
        <button onClick={() => abrirGaveta('fechamento')} className="shrink-0 rounded-botao bg-mar px-5 py-2.5 text-sm font-bold text-creme transition hover:bg-mar-escuro">
          Fechar o caixa de hoje
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
        <button className="text-sm font-bold text-mar hover:underline">Ver tudo</button>
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
