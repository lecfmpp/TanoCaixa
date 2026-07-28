import { useState } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { OrigemBadge } from '@/components/ui/OrigemBadge'
import { useAuth } from '@/auth/AuthContext'
import { brl, brlCurto, pct, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { BarraPeriodo, Periodo } from '@/types'
import {
  feedAtividades,
  insightInicio,
  resumoPorPeriodo,
} from '@/data/mock'

export function Inicio() {
  const { sessao, permissoes } = useAuth()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const dados = resumoPorPeriodo[periodo]
  const r = sessao?.restaurante
  const rotuloPeriodo = periodo === 'mes' ? 'julho de 2026' : 'esta semana'

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Início"
        subtitulo={r ? `${r.nome} · ${r.bairro} · ${rotuloPeriodo}` : ''}
        periodo={periodo}
        aoTrocarPeriodo={setPeriodo}
      />

      {/* 4 cartões */}
      <div className="grid grid-cols-1 gap-3.5 cel:grid-cols-2 tab:grid-cols-4">
        <CartaoValor
          rotulo="Entrou"
          valor={dados.entrou}
          apoio={periodo === 'mes' ? 'faturamento do mês' : 'faturamento da semana'}
          visivel={permissoes?.veFaturamentoTotal ?? false}
          motivoBloqueio="só o dono vê o faturamento total"
        />
        <CartaoValor
          rotulo="Saiu"
          valor={dados.saiu}
          apoio="tudo que foi pago e a pagar"
          visivel
        />
        <CartaoSobrou
          valor={dados.sobrou}
          margem={dados.margem}
          visivel={permissoes?.veLucro ?? false}
        />
        <CartaoValor
          rotulo="Ponto de equilíbrio"
          valor={dados.pontoEquilibrio}
          apoio={dados.viradaPonto}
          visivel
        />
      </div>

      {/* Fechou o dia? */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo px-5 py-4 cel:flex-row cel:items-center">
        <div>
          <p className="text-[15px] font-bold text-insight-texto">Fechou o dia de ontem?</p>
          <p className="text-sm text-insight-texto/80">
            Confirme o que veio do iFood, Rappi e maquininha — leva 30 segundos.
          </p>
        </div>
        <button className="flex shrink-0 items-center gap-1.5 rounded-botao bg-telhado px-4 py-2.5 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95">
          Fechar o dia
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* Gráfico + lateral (insight e feed) */}
      <div className="grid grid-cols-1 gap-3.5 tab:grid-cols-12">
        <div className="tab:col-span-7">
          <GraficoBarras barras={dados.barras} sobra={dados.sobraPeriodo} periodo={periodo} />
        </div>
        <div className="flex flex-col gap-3.5 tab:col-span-5">
          <CartaoInsight />
          <QuemMexeu />
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Cartões ----------------------------- */

function CartaoValor({
  rotulo,
  valor,
  apoio,
  visivel,
  motivoBloqueio,
}: {
  rotulo: string
  valor: number
  apoio: string
  visivel: boolean
  motivoBloqueio?: string
}) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      {visivel ? (
        <>
          <span className="mono text-tinta" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {brl(valor)}
          </span>
          <span className="text-xs text-tinta-4">{apoio}</span>
        </>
      ) : (
        <div className="flex items-center gap-2 py-1.5 text-tinta-4">
          <Lock size={16} />
          <span className="text-xs">{motivoBloqueio}</span>
        </div>
      )}
    </Cartao>
  )
}

/** Cartão "Sobrou" — destaque em fundo mar com disco solar. */
function CartaoSobrou({
  valor,
  margem,
  visivel,
}: {
  valor: number
  margem: number
  visivel: boolean
}) {
  const positivo = valor >= 0
  return (
    <div className="relative overflow-hidden rounded-cartao bg-mar p-5 text-creme shadow-cartao">
      {/* disco solar */}
      <span
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full"
        style={{ background: '#EFAB5C', opacity: 0.9 }}
        aria-hidden
      />
      <span className="relative z-10 rotulo text-creme/70">Sobrou</span>
      {visivel ? (
        <div className="relative z-10">
          <div
            className={cn('mono', positivo ? 'text-creme' : 'text-[#F2B8A8]')}
            style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}
          >
            {brl(valor)}
          </div>
          <div className="mt-1 text-xs text-creme/80">
            margem de <span className="mono">{pct(margem)}</span>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex items-center gap-2 py-1.5 text-creme/75">
          <Lock size={16} />
          <span className="text-xs">só o dono vê o lucro</span>
        </div>
      )}
    </div>
  )
}

/* ----------------------------- Gráfico ----------------------------- */

function GraficoBarras({
  barras,
  sobra,
  periodo,
}: {
  barras: BarraPeriodo[]
  sobra: number
  periodo: Periodo
}) {
  const ALT = 130
  const max = Math.max(...barras.flatMap((b) => [b.entrou, b.saiu]), 1)

  return (
    <Cartao className="flex h-full flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-tinta">Entrou × Saiu</h2>
        <div className="flex items-center gap-3 text-xs text-tinta-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-mar" /> entrou
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-telhado" /> saiu
          </span>
        </div>
      </div>
      <p className="mb-4 text-xs text-tinta-4">
        {periodo === 'mes' ? 'semana a semana' : 'dia a dia'}
      </p>

      <div className="flex flex-1 items-end justify-between gap-2">
        {barras.map((b) => {
          const sobraB = b.entrou - b.saiu
          return (
            <div key={b.rotulo} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex items-end justify-center gap-1" style={{ height: ALT }}>
                <Barra valor={b.entrou} max={max} alt={ALT} cor="var(--color-mar)" />
                <Barra valor={b.saiu} max={max} alt={ALT} cor="var(--color-telhado)" />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-bold text-tinta-3">{b.rotulo}</div>
                <div
                  className={cn(
                    'mono text-[11px] font-bold',
                    sobraB >= 0 ? 'text-mata' : 'text-telha-alerta',
                  )}
                >
                  {sobraB >= 0 ? '+' : ''}
                  {brlCurto(sobraB)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-divisoria pt-3">
        <span className="text-sm text-tinta-3">
          Sobrou {periodo === 'mes' ? 'no mês' : 'na semana'}
        </span>
        <span
          className={cn('mono text-sm font-bold', sobra >= 0 ? 'text-mata' : 'text-telha-alerta')}
        >
          {sobra >= 0 ? '+' : ''}
          {brl(sobra)}
        </span>
      </div>
    </Cartao>
  )
}

function Barra({
  valor,
  max,
  alt,
  cor,
}: {
  valor: number
  max: number
  alt: number
  cor: string
}) {
  const altura = Math.max(4, (valor / max) * alt)
  return (
    <div className="flex flex-col items-center justify-end" style={{ height: alt }}>
      <span className="mono mb-1 text-[9px] font-bold text-tinta-4">{brlCurto(valor)}</span>
      <div
        className="w-4 rounded-t-[5px] cel:w-5"
        style={{ height: altura, background: cor }}
      />
    </div>
  )
}

/* ----------------------------- Insight ----------------------------- */

function CartaoInsight() {
  return (
    <div className="rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-5">
      <span className="rotulo text-insight-rotulo">{insightInicio.rotulo}</span>
      <p className="pretty mt-2 text-[15px] leading-relaxed text-insight-texto">
        {insightInicio.texto}
      </p>
      <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-telhado hover:underline">
        {insightInicio.acaoSugerida}
        <ArrowRight size={15} strokeWidth={2.5} />
      </button>
    </div>
  )
}

/* ------------------------- Quem mexeu no quê ------------------------ */

function QuemMexeu() {
  return (
    <Cartao className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-tinta">Quem mexeu no quê</h2>
        <button className="text-xs font-bold text-mar hover:underline">ver tudo</button>
      </div>
      <ul className="flex flex-col">
        {feedAtividades.map((a, i) => (
          <li
            key={a.id}
            className={cn(
              'flex items-start gap-3 py-2.5',
              i > 0 && 'border-t border-divisoria',
            )}
          >
            <Avatar inicial={a.quemInicial} cor={a.quemCor} tamanho={30} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-tinta">
                <span className="font-bold">{a.quem}</span>{' '}
                <span className="text-tinta-2">{a.acao}</span>{' '}
                <span className="font-semibold text-tinta">{a.entidade}</span>
                {a.valor != null && (
                  <>
                    {' '}
                    <span className="mono font-bold text-tinta">{brl(a.valor)}</span>
                  </>
                )}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-4">
                <span>{quando(a.quando)}</span>
                <span aria-hidden>·</span>
                <OrigemBadge origem={a.origem} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Cartao>
  )
}
