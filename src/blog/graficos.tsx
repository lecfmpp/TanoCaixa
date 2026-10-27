import type { ReactNode } from 'react'
import { formatarBRL, formatarNumero, formatarPct } from './formatar'
import type { BlocoGrafico, Tom } from './tipos'

const COR: Record<Tom | 'areia' | 'noite' | 'cinza', string> = {
  noite: '#16303a',
  cinza: '#8a9698',
  mar: '#2e5f73',
  telha: '#c05437',
  mata: '#2f6b4a',
  sol: '#efab5c',
  areia: '#cdccb8',
}

function formatar(v: number, f: 'brl' | 'pct' | 'num' = 'num'): string {
  if (f === 'brl') return formatarBRL(v)
  if (f === 'pct') return formatarPct(v)
  return formatarNumero(v)
}

/** R$ 40 mil, R$ 1,2 mi: rótulo curto para os eixos. */
function compacto(v: number, f: 'brl' | 'num' = 'num'): string {
  const abs = Math.abs(v)
  const n = abs >= 1_000_000 ? `${formatarNumero(v / 1_000_000)} mi` : abs >= 1000 ? `${formatarNumero(v / 1000)} mil` : formatarNumero(v)
  return f === 'brl' ? `R$ ${n}` : n
}

function Moldura({ titulo, subtitulo, fonte, children }: { titulo: string; subtitulo?: string; fonte?: string; children: ReactNode }) {
  return (
    <figure className="my-8 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-5 tab:p-6">
      <figcaption className="mb-4">
        <div className="text-[17px] font-extrabold leading-snug tracking-tight text-tinta">{titulo}</div>
        {subtitulo && <div className="mt-0.5 text-sm text-tinta-3">{subtitulo}</div>}
      </figcaption>
      {children}
      {fonte && <div className="mono mt-4 text-[11px] leading-snug text-tinta-4">{fonte}</div>}
    </figure>
  )
}

export function Grafico({ bloco }: { bloco: BlocoGrafico }) {
  if (bloco.tipo === 'barras') {
    const max = Math.max(...bloco.dados.map((d) => d.valor), 1)
    return (
      <Moldura titulo={bloco.titulo} subtitulo={bloco.subtitulo} fonte={bloco.fonte}>
        <ul className="flex flex-col gap-3">
          {bloco.dados.map((d) => (
            <li key={d.rotulo} className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 cel:grid-cols-[minmax(0,12rem)_1fr_auto]">
              <div className="min-w-0 text-sm font-semibold leading-tight text-tinta">
                {d.rotulo}
                {d.nota && <div className="mt-0.5 text-xs font-normal text-tinta-3">{d.nota}</div>}
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-trilho" aria-hidden>
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, (d.valor / max) * 100)}%`, background: d.destaque ? COR.sol : COR.mar }} />
              </div>
              <div className="mono min-w-[4.5rem] text-right text-sm font-bold text-tinta">{formatar(d.valor, bloco.formato)}</div>
            </li>
          ))}
        </ul>
      </Moldura>
    )
  }

  if (bloco.tipo === 'empilhada') {
    const total = bloco.partes.reduce((s, p) => s + p.valor, 0) || 1
    return (
      <Moldura titulo={bloco.titulo} subtitulo={bloco.subtitulo} fonte={bloco.fonte}>
        <div className="flex h-11 w-full overflow-hidden rounded-chip" role="img" aria-label={bloco.partes.map((p) => `${p.rotulo}: ${formatar(p.valor, bloco.formato)}`).join('; ')}>
          {bloco.partes.map((p) => (
            <div
              key={p.rotulo}
              className="mono flex items-center justify-center text-[11px] font-bold"
              style={{ width: `${(p.valor / total) * 100}%`, background: COR[p.tom], color: p.tom === 'sol' || p.tom === 'areia' || p.tom === 'cinza' ? '#1c2a2e' : '#f7f5ea' }}
            >
              {p.valor / total >= 0.09 ? formatar(p.valor, bloco.formato) : ''}
            </div>
          ))}
        </div>
        <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm cel:grid-cols-2">
          {bloco.partes.map((p) => (
            <li key={p.rotulo} className="flex items-center justify-between gap-3 border-b border-divisoria pb-1.5">
              <span className="flex items-center gap-2 text-tinta-2">
                <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ background: COR[p.tom] }} aria-hidden />
                {p.rotulo}
              </span>
              <span className="mono font-bold text-tinta">{formatar(p.valor, bloco.formato)}</span>
            </li>
          ))}
        </ul>
      </Moldura>
    )
  }

  // linhas
  const L = 640
  const A = 300
  const m = { e: 62, d: 18, t: 16, b: 38 }
  const xs = bloco.x
  const todos = bloco.series.flatMap((s) => s.y)
  const yMax = niceMax(Math.max(...todos, 1))
  const xMin = xs[0]
  const xMax = xs[xs.length - 1]
  const px = (x: number) => m.e + ((x - xMin) / (xMax - xMin || 1)) * (L - m.e - m.d)
  const py = (y: number) => A - m.b - (y / yMax) * (A - m.t - m.b)
  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax)
  return (
    <Moldura titulo={bloco.titulo} subtitulo={bloco.subtitulo} fonte={bloco.fonte}>
      <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label={`${bloco.titulo}. ${bloco.series.map((s) => s.rotulo).join(' e ')}.`}>
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={m.e} x2={L - m.d} y1={py(t)} y2={py(t)} stroke="#e1dfce" strokeWidth="1" />
            <text x={m.e - 8} y={py(t) + 4} textAnchor="end" fontSize="11" fill="#6a7a7e" fontFamily="var(--font-mono)">
              {compacto(t, bloco.formatoY)}
            </text>
          </g>
        ))}
        {xs.map((x, i) =>
          i % Math.ceil(xs.length / 5) === 0 || i === xs.length - 1 ? (
            <text key={x} x={px(x)} y={A - 14} textAnchor="middle" fontSize="11" fill="#6a7a7e" fontFamily="var(--font-mono)">
              {compacto(x, bloco.formatoX)}
            </text>
          ) : null,
        )}
        {bloco.marcaX && (
          <g>
            <line x1={px(bloco.marcaX.x)} x2={px(bloco.marcaX.x)} y1={m.t} y2={A - m.b} stroke="#c05437" strokeWidth="1.5" strokeDasharray="5 5" />
            <rect x={px(bloco.marcaX.x) - 64} y={m.t - 2} width="128" height="22" rx="11" fill="#c05437" />
            <text x={px(bloco.marcaX.x)} y={m.t + 13} textAnchor="middle" fontSize="11" fontWeight="700" fill="#f7f5ea" fontFamily="var(--font-mono)">
              {bloco.marcaX.rotulo}
            </text>
          </g>
        )}
        {bloco.series.map((s) => (
          <polyline
            key={s.rotulo}
            fill="none"
            stroke={COR[s.tom]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.tracejada ? '7 6' : undefined}
            points={xs.map((x, i) => `${px(x)},${py(s.y[i])}`).join(' ')}
          />
        ))}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-tinta-2">
        {bloco.series.map((s) => (
          <li key={s.rotulo} className="flex items-center gap-2">
            <span className="h-[3px] w-6 rounded" style={{ background: COR[s.tom] }} aria-hidden />
            {s.rotulo}
          </li>
        ))}
      </ul>
    </Moldura>
  )
}

function niceMax(v: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return n * exp
}
