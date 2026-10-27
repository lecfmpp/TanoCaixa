import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight, Check, ChevronDown, Info, Lightbulb, X } from 'lucide-react'
import { Inline } from './inline'
import { slugificar } from './formatar'
import type { Bloco, Tom } from './tipos'

type De<T extends Bloco['t']> = Extract<Bloco, { t: T }>

const TOM_NUM: Record<Tom, string> = { mar: 'text-mar', telha: 'text-telhado', mata: 'text-mata', sol: 'text-[#b9741f]' }

export function Titulo2({ texto }: { texto: string }) {
  return (
    <h2 id={slugificar(texto)} className="mt-14 scroll-mt-24 text-[28px] font-extrabold leading-[1.12] tracking-[-0.025em] text-tinta tab:text-[32px]">
      {texto}
    </h2>
  )
}

export function Titulo3({ texto }: { texto: string }) {
  return <h3 className="mt-8 text-[21px] font-extrabold leading-snug tracking-tight text-tinta">{texto}</h3>
}

export function Paragrafo({ texto }: { texto: string }) {
  return (
    <p className="pretty mt-4 text-[17px] leading-[1.75] text-tinta-2">
      <Inline texto={texto} />
    </p>
  )
}

export function Lista({ itens, ordenada }: { itens: string[]; ordenada?: boolean }) {
  const Tag = ordenada ? 'ol' : 'ul'
  return (
    <Tag className={`mt-4 flex flex-col gap-2 pl-6 text-[17px] leading-[1.7] text-tinta-2 marker:font-bold marker:text-mar ${ordenada ? 'list-decimal' : 'list-disc'}`}>
      {itens.map((i) => (
        <li key={i} className="pl-1">
          <Inline texto={i} />
        </li>
      ))}
    </Tag>
  )
}

/** Resposta curta no topo: o que o Google e as IAs costumam citar. */
export function Tldr({ itens }: { itens: string[] }) {
  return (
    <aside className="my-8 rounded-cartao border border-[rgba(138,90,40,0.25)] bg-insight-fundo p-5 tab:p-6" aria-label="Resposta rápida">
      <div className="mono flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-insight-rotulo">
        <span className="h-2 w-2 rounded-full bg-sol" aria-hidden />
        Resposta rápida
      </div>
      <ul className="mt-3 flex flex-col gap-2.5 text-[16.5px] leading-[1.6] text-insight-texto">
        {itens.map((i) => (
          <li key={i} className="flex gap-2.5">
            <Check size={18} className="mt-1 shrink-0 text-mata" aria-hidden />
            <span>
              <Inline texto={i} />
            </span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function Numeros({ bloco }: { bloco: De<'numeros'> }) {
  return (
    <div className="my-8">
      <div className="grid gap-3 cel:grid-cols-3">
        {bloco.itens.map((n) => (
          <div key={n.rotulo} className="rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-5">
            <div className={`mono text-[34px] font-bold leading-none tracking-tight ${TOM_NUM[n.tom ?? 'mar']}`}>{n.valor}</div>
            <div className="mt-2.5 text-sm leading-snug text-tinta-3">{n.rotulo}</div>
          </div>
        ))}
      </div>
      {bloco.nota && <p className="mono mt-3 text-[11px] leading-snug text-tinta-4">{bloco.nota}</p>}
    </div>
  )
}

export function Tabela({ bloco }: { bloco: De<'tabela'> }) {
  const ult = bloco.linhas.length - 1
  return (
    <figure className="my-8">
      <div className="overflow-x-auto rounded-cartao border border-[rgba(46,95,115,0.16)] bg-superficie">
        <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
          <thead>
            <tr className="bg-preenchimento">
              {bloco.cabecalho.map((c, i) => (
                <th key={c} scope="col" className={`px-4 py-3 text-[12px] font-extrabold uppercase tracking-[0.06em] text-tinta-2 ${bloco.destaqueColuna === i ? 'bg-sol/30' : ''}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloco.linhas.map((l, r) => {
              const forte = bloco.ultimaEmDestaque && r === ult
              return (
                <tr key={l[0] + r} className={`border-t border-divisoria ${forte ? 'bg-preenchimento/70 font-extrabold' : ''}`}>
                  {l.map((cel, i) => (
                    <td key={i} className={`px-4 py-3 align-top leading-snug text-tinta-2 ${i === 0 ? 'font-bold text-tinta' : ''} ${bloco.destaqueColuna === i ? 'bg-sol/15' : ''} ${i > 0 && /^[R$\d−+-]/.test(cel) ? 'mono' : ''}`}>
                      <Inline texto={cel} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {(bloco.legenda || bloco.fonte) && (
        <figcaption className="mt-2.5 text-[13px] leading-snug text-tinta-3">
          {bloco.legenda}
          {bloco.legenda && bloco.fonte ? ' ' : ''}
          {bloco.fonte && <span className="mono text-[11px] text-tinta-4">{bloco.fonte}</span>}
        </figcaption>
      )}
    </figure>
  )
}

export function Comparacao({ bloco }: { bloco: De<'comparacao'> }) {
  const Sinal = ({ ok }: { ok?: boolean }) =>
    ok === undefined ? null : ok ? (
      <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-mata/15 text-mata align-[-4px]" aria-label="vantagem">
        <Check size={13} strokeWidth={3} aria-hidden />
      </span>
    ) : (
      <span className="mr-2 inline-grid h-5 w-5 place-items-center rounded-full bg-telhado/15 text-telhado align-[-4px]" aria-label="limitação">
        <X size={13} strokeWidth={3} aria-hidden />
      </span>
    )
  return (
    <div className="my-8 overflow-x-auto rounded-cartao border border-[rgba(46,95,115,0.16)] bg-superficie">
      <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
        <thead>
          <tr className="bg-preenchimento text-[12px] font-extrabold uppercase tracking-[0.06em] text-tinta-2">
            <th className="px-4 py-3" scope="col">
              &nbsp;
            </th>
            <th className="bg-sol/30 px-4 py-3" scope="col">
              {bloco.colA}
            </th>
            <th className="px-4 py-3" scope="col">
              {bloco.colB}
            </th>
          </tr>
        </thead>
        <tbody>
          {bloco.linhas.map((l) => (
            <tr key={l.dim} className="border-t border-divisoria align-top">
              <th scope="row" className="px-4 py-3 text-left font-bold text-tinta">
                {l.dim}
              </th>
              <td className="bg-sol/15 px-4 py-3 leading-snug text-tinta-2">
                <Sinal ok={l.aOk} />
                <Inline texto={l.a} />
              </td>
              <td className="px-4 py-3 leading-snug text-tinta-2">
                <Sinal ok={l.bOk} />
                <Inline texto={l.b} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Passos({ itens }: { itens: { titulo: string; texto: string }[] }) {
  return (
    <ol className="my-8 flex flex-col gap-3">
      {itens.map((p, i) => (
        <li key={p.titulo} className="flex gap-4 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-4 tab:p-5">
          <span className="mono grid h-9 w-9 shrink-0 place-items-center rounded-chip bg-noite text-[15px] font-bold text-creme">{i + 1}</span>
          <div className="min-w-0">
            <div className="text-[17px] font-extrabold leading-snug tracking-tight text-tinta">{p.titulo}</div>
            <p className="mt-1 text-[16px] leading-[1.65] text-tinta-2">
              <Inline texto={p.texto} />
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}

export function Erros({ itens }: { itens: { titulo: string; texto: string }[] }) {
  return (
    <div className="my-8 grid gap-3 cel:grid-cols-2">
      {itens.map((p) => (
        <div key={p.titulo} className="rounded-cartao border border-[rgba(192,84,55,0.25)] bg-superficie p-5">
          <span className="grid h-8 w-8 place-items-center rounded-chip bg-telhado/12 text-telhado" aria-hidden>
            <X size={17} strokeWidth={3} />
          </span>
          <div className="mt-3 text-[16.5px] font-extrabold leading-snug tracking-tight text-tinta">{p.titulo}</div>
          <p className="mt-1.5 text-[15px] leading-[1.6] text-tinta-2">
            <Inline texto={p.texto} />
          </p>
        </div>
      ))}
    </div>
  )
}

export function Checklist({ titulo, itens }: { titulo?: string; itens: string[] }) {
  return (
    <div className="my-8 rounded-cartao border border-[rgba(47,107,74,0.28)] bg-superficie p-5 tab:p-6">
      {titulo && <div className="mono mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-mata">{titulo}</div>}
      <ul className="flex flex-col gap-2.5">
        {itens.map((i) => (
          <li key={i} className="flex gap-3 text-[16px] leading-[1.6] text-tinta-2">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-mata text-creme" aria-hidden>
              <Check size={13} strokeWidth={3.5} />
            </span>
            <span>
              <Inline texto={i} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Nota({ rotulo, texto, tom = 'info' }: { rotulo?: string; texto: string; tom?: 'info' | 'alerta' | 'dica' }) {
  const cfg = {
    info: { Icone: Info, caixa: 'border-[rgba(46,95,115,0.28)] bg-mar/[0.06]', cor: 'text-mar', padrao: 'Bom saber' },
    alerta: { Icone: AlertTriangle, caixa: 'border-[rgba(192,84,55,0.32)] bg-telhado/[0.06]', cor: 'text-telhado', padrao: 'Atenção' },
    dica: { Icone: Lightbulb, caixa: 'border-[rgba(239,171,92,0.55)] bg-sol/[0.14]', cor: 'text-[#9a5f17]', padrao: 'Regra de bolso' },
  }[tom]
  return (
    <aside className={`my-7 flex gap-3.5 rounded-cartao border p-5 ${cfg.caixa}`}>
      <cfg.Icone size={21} className={`mt-0.5 shrink-0 ${cfg.cor}`} aria-hidden />
      <div className="min-w-0">
        <div className={`mono text-[11px] font-bold uppercase tracking-[0.08em] ${cfg.cor}`}>{rotulo ?? cfg.padrao}</div>
        <p className="mt-1 text-[16.5px] leading-[1.65] text-tinta">
          <Inline texto={texto} />
        </p>
      </div>
    </aside>
  )
}

export function Citacao({ texto }: { texto: string }) {
  return (
    <blockquote className="my-10 border-l-[5px] border-sol py-1 pl-6">
      <p className="text-balance text-[25px] font-extrabold leading-[1.25] tracking-[-0.02em] text-tinta tab:text-[28px]">
        <Inline texto={texto} />
      </p>
    </blockquote>
  )
}

export function Exemplo({ bloco }: { bloco: De<'exemplo'> }) {
  return (
    <div className="my-8 overflow-hidden rounded-cartao border border-[rgba(46,95,115,0.18)] bg-superficie">
      <div className="border-b border-divisoria bg-preenchimento px-5 py-3">
        <div className="mono text-[11px] font-bold uppercase tracking-[0.08em] text-tinta-3">Exemplo ilustrativo</div>
        <div className="text-[17px] font-extrabold tracking-tight text-tinta">{bloco.titulo}</div>
      </div>
      <dl className="px-5 py-2">
        {bloco.linhas.map((l) => (
          <div key={l.rotulo} className={`flex items-baseline justify-between gap-4 border-b border-divisoria py-2.5 last:border-b-0 ${l.destaque ? 'font-extrabold' : ''}`}>
            <dt className="text-[15px] text-tinta-2">
              <Inline texto={l.rotulo} />
            </dt>
            <dd className={`mono shrink-0 text-[15px] ${l.destaque ? 'text-mar' : 'font-bold text-tinta'}`}>{l.valor}</dd>
          </div>
        ))}
      </dl>
      {bloco.conclusao && (
        <p className="border-t border-divisoria bg-sol/15 px-5 py-3.5 text-[15.5px] leading-snug text-tinta">
          <Inline texto={bloco.conclusao} />
        </p>
      )}
    </div>
  )
}

/** Print real do app (modo demonstração) numa moldura de navegador. */
export function Print({ bloco }: { bloco: De<'print'> }) {
  return (
    <figure className="my-9">
      <div className="overflow-hidden rounded-cartao border border-[rgba(46,95,115,0.16)] bg-superficie shadow-cartao">
        <div className="flex items-center gap-1.5 border-b border-divisoria bg-preenchimento/60 px-4 py-2.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-telhado/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-sol/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-mata/60" />
          <span className="mono ml-3 text-[11px] text-tinta-4">{bloco.url}</span>
        </div>
        <img src={bloco.src} alt={bloco.alt} width={1400} height={1046} loading="lazy" decoding="async" className="block h-auto w-full" />
      </div>
      <figcaption className="mt-2.5 text-center text-[13px] leading-snug text-tinta-3">{bloco.legenda}</figcaption>
    </figure>
  )
}

export function CartaoLink({ href, titulo, resumo, rotulo }: { href: string; titulo: string; resumo: string; rotulo: string }) {
  return (
    <a href={href} className="group my-8 flex items-center gap-4 rounded-cartao border border-[rgba(46,95,115,0.18)] bg-superficie p-4 transition hover:border-mar/50 hover:shadow-cartao tab:p-5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-chip bg-sol/30 text-[#9a5f17]" aria-hidden>
        <ArrowRight size={20} />
      </span>
      <span className="min-w-0">
        <span className="mono block text-[10.5px] font-bold uppercase tracking-[0.08em] text-telhado">{rotulo}</span>
        <span className="mt-0.5 block text-[17px] font-extrabold leading-snug tracking-tight text-tinta group-hover:text-mar">{titulo}</span>
        <span className="mt-0.5 block text-[14px] leading-snug text-tinta-3">{resumo}</span>
      </span>
    </a>
  )
}

export function Faq({ itens }: { itens: { p: string; r: string }[] }) {
  return (
    <div className="my-6 divide-y divide-divisoria rounded-cartao border border-[rgba(46,95,115,0.16)] bg-superficie">
      {itens.map((i, idx) => (
        <details key={i.p} className="group px-5 py-4" open={idx === 0}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[17px] font-extrabold leading-snug tracking-tight text-tinta [&::-webkit-details-marker]:hidden">
            {i.p}
            <ChevronDown size={20} className="mt-0.5 shrink-0 text-mar transition group-open:rotate-180" aria-hidden />
          </summary>
          <p className="mt-2.5 text-[16px] leading-[1.7] text-tinta-2">
            <Inline texto={i.r} />
          </p>
        </details>
      ))}
    </div>
  )
}

export function Secao({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[720px]">{children}</div>
}
