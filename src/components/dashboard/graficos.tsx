/* ------------------------------------------------------------------ *
 * Peças dos gráficos do Dashboard. SVG/CSS próprios, sem biblioteca:
 * linhas de grade tracejadas com valores no eixo esquerdo (mono 10px),
 * linha de base contínua e frase de leitura calculada no rodapé.
 * ------------------------------------------------------------------ */
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Cartao } from '@/components/ui/Cartao'
import { MAR, MATA, SOL, TELHA } from '@/data/dashboard'

const TINTA_4 = '#8A9698'
const TRILHO = '#E8E6D7'
const MAR_30 = 'rgba(46,95,115,.3)'

/* ------------------------------- Escala ------------------------------ */

export interface Escala {
  lo: number
  hi: number
  ticks: number[]
}

/** Escala "redonda" (passos 1/2/2,5/5 × 10ⁿ) que cobre [min, max], com até ~4 divisões. */
export function escala(min: number, max: number, incluiZero = true): Escala {
  const lo0 = incluiZero ? Math.min(0, min) : min
  const hi0 = incluiZero ? Math.max(0, max) : max
  const span = hi0 - lo0 || 1
  const bruto = span / 4
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)))
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? 10 * pot
  const lo = Math.floor(lo0 / passo) * passo
  const hi = Math.max(Math.ceil(hi0 / passo) * passo, lo + passo)
  const ticks: number[] = []
  for (let v = lo; v <= hi + passo / 1000; v += passo) ticks.push(Math.round(v * 1000) / 1000)
  return { lo, hi, ticks }
}

/** 56k, 7,5k, 800 — rótulo do eixo. */
export function compacto(n: number): string {
  const a = Math.abs(n)
  const sinal = n < 0 ? '-' : ''
  if (a >= 1000) {
    const k = a / 1000
    return `${sinal}${(Number.isInteger(k) ? String(k) : k.toFixed(1)).replace('.', ',')}k`
  }
  return `${sinal}${Math.round(a)}`
}

/** 8,1k — valor sobre a barra (sempre com 1 casa, sem "R$": cabe em 390px). */
export function curtoK(n: number): string {
  const a = Math.abs(n)
  const sinal = n < 0 ? '-' : ''
  return a >= 1000 ? `${sinal}${(a / 1000).toFixed(1).replace('.', ',')}k` : `${sinal}${Math.round(a)}`
}

const yPct = (v: number, e: Escala) => ((e.hi - v) / (e.hi - e.lo)) * 100

/* ----------------------------- Estrutura ----------------------------- */

export function CartaoGrafico({ titulo, sub, direita, children, className, style }: {
  titulo: string
  sub?: string
  direita?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <Cartao className={cn('min-w-0', className)} style={style}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div>
          <h2 className="text-[15px] font-bold text-tinta">{titulo}</h2>
          {sub && <p className="mt-0.5 text-xs text-tinta-4">{sub}</p>}
        </div>
        {direita}
      </div>
      {children}
    </Cartao>
  )
}

/** Frase de leitura do gráfico, separada por um filete tracejado. */
export function Leitura({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="pretty mt-3.5 border-t border-dashed border-[rgba(46,95,115,.2)] pt-3 text-sm leading-relaxed text-tinta-3">
      {children}
    </p>
  )
}

export function VazioGrafico({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-sm text-tinta-3">{children}</p>
}

/** Área do gráfico: coluna de 44px do eixo à esquerda + grade tracejada. */
function AreaGrafico({ altura, e, fmt = compacto, children, direita = 0, className }: {
  altura: number
  e: Escala
  fmt?: (n: number) => string
  children: ReactNode
  direita?: number
  className?: string
}) {
  return (
    <div className={cn('relative', className)} style={{ height: altura, paddingLeft: 44, paddingRight: direita }}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {e.ticks.map((t) => (
          <div key={t} className="absolute left-0 right-0" style={{ top: `${yPct(t, e)}%` }}>
            <span className="mono absolute left-0 -translate-y-1/2 text-[10px] text-tinta-4">{fmt(t)}</span>
            <span
              className="absolute right-0 block"
              style={{
                left: 44,
                borderTop: t === 0 ? `1px solid ${TRILHO}` : `1px dashed ${TRILHO}`,
                borderTopColor: t === 0 ? '#C9CDC4' : TRILHO,
              }}
            />
          </div>
        ))}
      </div>
      <div className="relative h-full">{children}</div>
    </div>
  )
}

/* ---------------------------- Barras verticais ------------------------ */

export interface BarraItem {
  rot: string
  valor: number
  /** Texto sobre a barra. */
  rotValor: string
  cor: string
  destaque?: boolean
}

export function BarrasVerticais({ itens, fmtEixo, altura = 150, gap = 8 }: {
  itens: BarraItem[]
  fmtEixo?: (n: number) => string
  altura?: number
  gap?: number
}) {
  const e = escala(Math.min(0, ...itens.map((i) => i.valor)), Math.max(0, ...itens.map((i) => i.valor)))
  const y0 = yPct(0, e)
  return (
    <div className="mt-5">
      <AreaGrafico altura={altura} e={e} fmt={fmtEixo}>
        <div className="flex h-full" style={{ gap }}>
          {itens.map((i) => {
            const y = yPct(Math.max(i.valor, 0), e)
            const h = (Math.abs(i.valor) / (e.hi - e.lo)) * 100
            return (
              <div key={i.rot} className="relative min-w-0 flex-1">
                <div
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    width: 'min(70%, 48px)',
                    top: i.valor >= 0 ? `${y}%` : `${y0}%`,
                    height: `${Math.max(h, 0.8)}%`,
                    background: i.cor,
                    borderRadius: i.valor >= 0 ? '6px 6px 0 0' : '0 0 6px 6px',
                  }}
                />
                <span
                  className={cn('mono absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px]', i.destaque ? 'font-bold text-tinta' : 'text-tinta-3')}
                  style={i.valor >= 0 ? { bottom: `calc(${100 - y}% + 4px)` } : { top: `calc(${y0 + h}% + 4px)` }}
                >
                  {i.rotValor}
                </span>
              </div>
            )
          })}
        </div>
      </AreaGrafico>
      <div className="flex" style={{ paddingLeft: 44, gap, marginTop: 8 }}>
        {itens.map((i) => (
          <div key={i.rot} className="min-w-0 flex-1 text-center text-xs text-tinta-4">{i.rot}</div>
        ))}
      </div>
    </div>
  )
}

/** Barras agrupadas entrou × saiu, com o saldo de cada uma embaixo. */
export function BarrasEntrouSaiu({ barras }: { barras: { rotulo: string; entrou: number; saiu: number }[] }) {
  const e = escala(0, Math.max(...barras.flatMap((b) => [b.entrou, b.saiu]), 1))
  return (
    <div className="mt-5">
      <AreaGrafico altura={150} e={e}>
        <div className="flex h-full gap-1.5">
          {barras.map((b) => (
            <div key={b.rotulo} className="relative flex min-w-0 flex-1 items-end justify-center gap-1">
              {[
                { v: b.entrou, cor: MAR },
                { v: b.saiu, cor: TELHA },
              ].map((x, i) => (
                <div
                  key={i}
                  style={{ width: 'min(36%, 22px)', height: `${Math.max(x.v > 0 ? 1 : 0, (x.v / e.hi) * 100)}%`, background: x.cor, borderRadius: '5px 5px 0 0' }}
                />
              ))}
            </div>
          ))}
        </div>
      </AreaGrafico>
      <div className="flex gap-1.5" style={{ paddingLeft: 44, marginTop: 8 }}>
        {barras.map((b) => {
          const saldo = b.entrou - b.saiu
          return (
            <div key={b.rotulo} className="min-w-0 flex-1 text-center">
              <div className="text-xs text-tinta-4">{b.rotulo}</div>
              <div className="mono text-[11px] font-bold" style={{ color: saldo >= 0 ? MATA : '#B4462F' }}>
                {saldo >= 0 ? '+' : '-'}{compacto(Math.abs(saldo))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------ Linha (%) ----------------------------- */

export function LinhaComTeto({ pontos, teto, fmtMes }: {
  pontos: { mes: string; valor: number }[]
  teto: number
  fmtMes: (mes: string) => string
}) {
  const vals = pontos.map((p) => p.valor)
  const e = escala(Math.min(...vals, teto) - 0.5, Math.max(...vals, teto) + 0.5, false)
  const n = pontos.length
  // Pontos recuados das bordas pra o valor sobre o primeiro/último não invadir o eixo.
  const x = (i: number) => (n === 1 ? 50 : 4 + (i / (n - 1)) * 92)
  const y = (v: number) => yPct(v, e)
  const d = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.valor)}`).join(' ')
  const pct = (v: number) => `${v.toFixed(1).replace('.', ',')}%`
  return (
    <div className="mt-5">
      <AreaGrafico altura={150} e={e} fmt={(t) => `${String(Math.round(t * 10) / 10).replace('.', ',')}%`} direita={12}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          <line x1="0" x2="100" y1={y(teto)} y2={y(teto)} stroke={TELHA} strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          {n > 1 && <path d={d} fill="none" stroke={MAR} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        <span className="mono absolute -translate-y-1/2 text-[10px] font-bold" style={{ left: -44, top: `${y(teto)}%`, color: TELHA }}>teto</span>
        {pontos.map((p, i) => {
          const acima = p.valor > teto
          return (
            <div key={p.mes} className="absolute" style={{ left: `${x(i)}%`, top: `${y(p.valor)}%` }}>
              <span
                className="absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-superficie"
                style={{ border: `3px solid ${acima ? TELHA : MAR}` }}
              />
              <span
                className="mono absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-bold"
                style={{ bottom: 9, color: acima ? TELHA : '#45585D' }}
              >
                {pct(p.valor)}
              </span>
            </div>
          )
        })}
      </AreaGrafico>
      <div className="relative h-4 text-xs text-tinta-4" style={{ marginLeft: 44, marginRight: 12, marginTop: 10 }}>
        {pontos.map((p, i) => (
          <span key={p.mes} className="absolute -translate-x-1/2" style={{ left: `${x(i)}%` }}>{fmtMes(p.mes)}</span>
        ))}
      </div>
    </div>
  )
}

/* --------------------------- Caminho até o PE ------------------------- */

export function CaminhoEquilibrio({ acum, proj, ultimoDia, hojeDia, pontoEquilibrio, meta, cruzouDia }: {
  acum: number[]
  proj: number[]
  ultimoDia: number
  hojeDia: number
  pontoEquilibrio: number
  meta: number
  cruzouDia: number | null
}) {
  const topo = Math.max(pontoEquilibrio, meta, ...acum, ...proj, 1)
  const e = escala(0, topo * 1.05)
  const W = 640
  const H = 240
  const X = (d: number) => (ultimoDia <= 1 ? 0 : ((d - 1) / (ultimoDia - 1)) * W)
  const Y = (v: number) => (yPct(v, e) / 100) * H
  const linhaD = acum.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i + 1)} ${Y(v)}`).join(' ')
  const areaD = acum.length ? `${linhaD} L${X(acum.length)} ${H} L${X(1)} ${H} Z` : ''
  const projD = proj.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(hojeDia + i)} ${Y(v)}`).join(' ')
  const pctX = (d: number) => `${(X(d) / W) * 100}%`
  const pctY = (v: number) => `${yPct(v, e)}%`
  const marcos = [1, 7, 14, 21, 28].filter((d) => d < ultimoDia - 1 || d === 1)
  const eixo = [...new Set([...marcos, ultimoDia])]
  const hojeV = acum[acum.length - 1] ?? 0
  const rotulo = (txt: string, v: number, cor: string): ReactNode => (
    <span
      className="mono absolute left-1.5 -translate-y-[calc(100%+3px)] whitespace-nowrap rounded-chip border bg-superficie px-1.5 py-px text-[10px] font-bold"
      style={{ top: pctY(v), color: cor, borderColor: `${cor}55` }}
    >
      {txt}
    </span>
  )
  return (
    <div className="mt-4">
      <AreaGrafico altura={240} e={e}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 block h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="gAcum" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={MAR} stopOpacity=".28" />
              <stop offset="1" stopColor={MAR} stopOpacity="0" />
            </linearGradient>
          </defs>
          {pontoEquilibrio > 0 && <line x1="0" x2={W} y1={Y(pontoEquilibrio)} y2={Y(pontoEquilibrio)} stroke={TELHA} strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />}
          {meta > 0 && <line x1="0" x2={W} y1={Y(meta)} y2={Y(meta)} stroke={MATA} strokeWidth="1.5" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />}
          {areaD && <path d={areaD} fill="url(#gAcum)" />}
          {proj.length > 1 && <path d={projD} fill="none" stroke={MAR} strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
          {acum.length > 1 && <path d={linhaD} fill="none" stroke={MAR} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {pontoEquilibrio > 0 && rotulo(`ponto de equilíbrio · R$ ${Math.round(pontoEquilibrio).toLocaleString('pt-BR')}`, pontoEquilibrio, TELHA)}
        {meta > 0 && rotulo(`meta · R$ ${Math.round(meta).toLocaleString('pt-BR')}`, meta, MATA)}
        {cruzouDia && (
          <span
            className="absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-superficie"
            style={{ left: pctX(cruzouDia), top: pctY(acum[cruzouDia - 1]), border: `3px solid ${TELHA}` }}
            title={`Ponto de equilíbrio coberto no dia ${cruzouDia}`}
          />
        )}
        {acum.length > 0 && (
          <span
            className="absolute block h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: pctX(hojeDia), top: pctY(hojeV), background: SOL, border: `3px solid ${'#FBFAF2'}`, boxShadow: `0 0 0 1.5px ${SOL}` }}
            title="Hoje"
          />
        )}
      </AreaGrafico>
      <div className="relative h-[18px] text-xs text-tinta-4" style={{ marginLeft: 44, marginTop: 8 }}>
        {eixo.map((d) => (
          <span key={d} className="absolute -translate-x-1/2" style={{ left: pctX(d) }}>{d}</span>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------- Rosca ------------------------------- */

export function Rosca({ fatias, centro }: { fatias: { cor: string; valor: number }[]; centro: ReactNode }) {
  const total = fatias.reduce((s, f) => s + f.valor, 0) || 1
  let ac = 0
  const stops = fatias.map((f) => {
    const a = (ac / total) * 360
    ac += f.valor
    const b = (ac / total) * 360
    // 1,2° de vão entre as fatias.
    return `${f.cor} ${a}deg ${Math.max(a, b - 1.2)}deg, #FBFAF2 ${Math.max(a, b - 1.2)}deg ${b}deg`
  })
  return (
    <div className="relative mx-auto h-44 w-44 flex-none">
      <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${stops.join(', ')})` }} />
      <div className="absolute inset-[34px] flex flex-col items-center justify-center rounded-full bg-superficie text-center">{centro}</div>
    </div>
  )
}

/* ----------------------------- Barra de meta -------------------------- */

export function BarraMeta({ nome, desc, valor, teto, semVendas }: { nome: string; desc: string; valor: number; teto: number; semVendas: boolean }) {
  const ok = valor <= teto
  const max = teto * 1.6
  const cor = ok ? MATA : TELHA
  const txtCor = ok ? MATA : '#B4462F'
  const dif = (valor - teto).toFixed(1).replace('.', ',')
  return (
    <div className="flex min-w-0 flex-col gap-[9px]">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-tinta">{nome}</div>
          <div className="mt-px text-xs text-tinta-4">{desc}</div>
        </div>
        <div className="mono text-xl font-bold" style={{ letterSpacing: '-0.02em', color: semVendas ? TINTA_4 : txtCor }}>
          {semVendas ? '—' : `${valor.toFixed(1).replace('.', ',')}%`}
        </div>
      </div>
      <div className="relative h-2.5 rounded-[5px]" style={{ background: TRILHO }}>
        {!semVendas && <div className="absolute inset-y-0 left-0 rounded-[5px]" style={{ background: cor, width: `${Math.min(100, (valor / max) * 100)}%` }} />}
        <div className="absolute -inset-y-1 w-[3px] rounded-sm bg-tinta" style={{ left: `calc(${(teto / max) * 100}% - 1px)` }} />
      </div>
      <div className="flex justify-between gap-2.5 text-xs">
        <span className="text-tinta-4">meta {String(Math.round(teto * 10) / 10).replace('.', ',')}%</span>
        <span className="font-bold" style={{ color: semVendas ? TINTA_4 : txtCor }}>
          {semVendas ? 'sem vendas no período' : ok ? 'dentro da meta' : `+${dif} p.p. acima`}
        </span>
      </div>
    </div>
  )
}

export { MAR_30 }
