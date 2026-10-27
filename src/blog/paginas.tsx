import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Clock, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Pagina } from './layout'
import { BlocoRender } from './BlocoRender'
import { CtaFinal, CtaTeste } from './ctas'
import { Inline, textoPuro } from './inline'
import { formatarData, slugificar } from './formatar'
import { rastrear } from './rastrear'
import { RECURSOS } from './recursos'
import { acharPost, postsDestaque } from './posts'
import type { Bloco, Post, Recurso, Tom } from './tipos'

/* ---------------------------- utilidades ---------------------------- */

export function minutosDeLeitura(p: Post): number {
  const texto = p.blocos
    .map((b) => {
      switch (b.t) {
        case 'h2':
        case 'h3':
        case 'p':
          return textoPuro(b.texto)
        case 'ul':
        case 'ol':
        case 'tldr':
        case 'checklist':
          return b.itens.map(textoPuro).join(' ')
        case 'faq':
          return b.itens.map((i) => `${i.p} ${textoPuro(i.r)}`).join(' ')
        case 'passos':
        case 'erros':
          return b.itens.map((i) => `${i.titulo} ${textoPuro(i.texto)}`).join(' ')
        case 'nota':
        case 'citacao':
          return textoPuro(b.texto)
        default:
          return ''
      }
    })
    .join(' ')
  const palavras = texto.split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.round(palavras / 200) + 1)
}

const CHIP_CAT: Record<string, string> = {
  Delivery: 'bg-telhado/12 text-telhado',
  'Custos e CMV': 'bg-mata/12 text-mata',
  'Gestão financeira': 'bg-mar/12 text-mar',
  Comparativos: 'bg-sol/30 text-[#8a5a28]',
  'Por tipo de cozinha': 'bg-noite/10 text-noite',
}

function ChipCategoria({ categoria }: { categoria: string }) {
  return <span className={`mono inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${CHIP_CAT[categoria] ?? 'bg-preenchimento text-tinta-2'}`}>{categoria}</span>
}

function CartaoPost({ p, destaque }: { p: Post; destaque?: boolean }) {
  return (
    <a href={`/blog/${p.slug}`} className={`group flex flex-col overflow-hidden rounded-cartao-g border border-[rgba(46,95,115,0.16)] bg-superficie transition hover:border-mar/45 hover:shadow-cartao ${destaque ? 'tab:col-span-2 tab:flex-row' : ''}`}>
      <img
        src={`/blog/${p.slug}.png`}
        alt={`Capa do artigo ${p.titulo}`}
        width={1200}
        height={630}
        loading={destaque ? 'eager' : 'lazy'}
        decoding="async"
        className={`block h-auto w-full bg-noite object-cover ${destaque ? 'tab:w-[52%]' : ''}`}
      />
      <div className="flex flex-1 flex-col p-5 tab:p-6">
        <div className="flex items-center gap-3">
          <ChipCategoria categoria={p.categoria} />
          <span className="mono flex items-center gap-1 text-[11px] text-tinta-4">
            <Clock size={12} aria-hidden /> {minutosDeLeitura(p)} min
          </span>
        </div>
        <h3 className={`mt-3 text-balance font-extrabold leading-[1.12] tracking-[-0.02em] text-tinta group-hover:text-mar ${destaque ? 'text-[28px]' : 'text-[21px]'}`}>{p.titulo}</h3>
        <p className="pretty mt-2 flex-1 text-[15px] leading-[1.55] text-tinta-3">{p.resumo}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-mar">
          Ler artigo <ArrowRight size={15} aria-hidden />
        </span>
      </div>
    </a>
  )
}

const TOM_BG: Record<Tom, string> = { mar: 'bg-mar text-creme', telha: 'bg-telhado text-creme', mata: 'bg-mata text-creme', sol: 'bg-sol text-noite' }

function CartaoRecurso({ r }: { r: Recurso }) {
  const Icone = r.formato === 'XLSX' ? FileSpreadsheet : FileText
  return (
    <a href={`/recursos/${r.id}`} className="group flex gap-4 rounded-cartao border border-[rgba(46,95,115,0.16)] bg-superficie p-4 transition hover:border-mar/45 hover:shadow-cartao">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-chip ${TOM_BG[r.tom]}`} aria-hidden>
        <Icone size={26} />
      </span>
      <span className="min-w-0">
        <span className="mono block text-[10.5px] font-bold uppercase tracking-[0.08em] text-telhado">Grátis · {r.formato}</span>
        <span className="mt-0.5 block text-[17px] font-extrabold leading-snug tracking-tight text-tinta group-hover:text-mar">{r.titulo}</span>
        <span className="mt-1 block text-[14px] leading-snug text-tinta-3">{r.resumo}</span>
      </span>
    </a>
  )
}

function Migalhas({ itens }: { itens: { nome: string; href?: string }[] }) {
  return (
    <nav aria-label="Você está em" className="mono flex flex-wrap items-center gap-1.5 text-[12px] text-tinta-4">
      {itens.map((i, idx) => (
        <span key={i.nome} className="flex items-center gap-1.5">
          {idx > 0 && <span aria-hidden>›</span>}
          {i.href ? (
            <a href={i.href} className="hover:text-tinta">
              {i.nome}
            </a>
          ) : (
            <span className="text-tinta-3" aria-current="page">
              {i.nome}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}

/* ------------------------------ índice ------------------------------ */

export function BlogIndex() {
  const lista = postsDestaque()
  const [destaque, ...demais] = lista
  return (
    <Pagina>
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-12 tab:pt-16">
        <Migalhas itens={[{ nome: 'Início', href: '/' }, { nome: 'Blog' }]} />
        <h1 className="mt-5 max-w-3xl text-balance text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] tab:text-[52px]">Gestão financeira para restaurante e delivery, sem complicação</h1>
        <p className="pretty mt-4 max-w-2xl text-lg leading-[1.6] text-tinta-2">
          Guias práticos, calculadoras e comparativos para dono de cozinha saber quanto entra, quanto sai e quanto sobra. Escrito do jeito que se fala no balcão.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-6" aria-label="Artigos">
        <div className="grid gap-5 tab:grid-cols-2">
          {destaque && <CartaoPost p={destaque} destaque />}
          {demais.map((p) => (
            <CartaoPost key={p.slug} p={p} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10" aria-label="Materiais gratuitos">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="rotulo text-telhado">Materiais grátis</div>
            <h2 className="mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.025em]">Planilhas e checklists para baixar</h2>
          </div>
          <a href="/recursos" className="hidden text-sm font-bold text-mar hover:underline cel:block">
            Ver todos
          </a>
        </div>
        <div className="mt-5 grid gap-4 tab:grid-cols-2">
          {RECURSOS.map((r) => (
            <CartaoRecurso key={r.id} r={r} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-6">
        <CtaTeste variante="painel" origem="indice" />
      </section>
    </Pagina>
  )
}

/* ------------------------------- post ------------------------------- */

function Sumario({ titulos }: { titulos: string[] }) {
  return (
    <nav aria-label="Neste artigo">
      <div className="rotulo text-tinta-4">Neste artigo</div>
      <ol className="mt-3 flex flex-col gap-2 border-l border-divisoria text-[14px] leading-snug">
        {titulos.map((t) => (
          <li key={t}>
            <a href={`#${slugificar(t)}`} className="-ml-px block border-l-2 border-transparent py-0.5 pl-3 text-tinta-3 hover:border-sol hover:text-tinta">
              {t}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

function Relacionados({ post }: { post: Post }) {
  const lista = post.relacionados.map(acharPost).filter((p): p is Post => !!p).slice(0, 3)
  if (lista.length === 0) return null
  return (
    <section className="mx-auto mt-16 max-w-6xl px-5" aria-label="Leia também">
      <h2 className="text-[26px] font-extrabold tracking-[-0.025em]">Leia também</h2>
      <div className="mt-5 grid gap-4 tab:grid-cols-3">
        {lista.map((p) => (
          <a key={p.slug} href={`/blog/${p.slug}`} className="group rounded-cartao border border-[rgba(46,95,115,0.16)] bg-superficie p-5 transition hover:border-mar/45 hover:shadow-cartao">
            <ChipCategoria categoria={p.categoria} />
            <div className="mt-3 text-[18px] font-extrabold leading-snug tracking-tight text-tinta group-hover:text-mar">{p.titulo}</div>
            <p className="mt-1.5 text-sm leading-snug text-tinta-3">{p.resumo}</p>
          </a>
        ))}
      </div>
    </section>
  )
}

export function PostPagina({ post }: { post: Post }) {
  const titulos = post.blocos.filter((b): b is Extract<Bloco, { t: 'h2' }> => b.t === 'h2').map((b) => b.texto)
  // O CTA do meio entra depois do 2º H2, se o autor não tiver posto um.
  return (
    <Pagina>
      <article>
        <header className="mx-auto max-w-6xl px-5 pt-10 tab:pt-14">
          <div className="mx-auto max-w-[760px]">
            <Migalhas itens={[{ nome: 'Início', href: '/' }, { nome: 'Blog', href: '/blog' }, { nome: post.categoria }]} />
            <div className="mt-5">
              <ChipCategoria categoria={post.categoria} />
            </div>
            <h1 className="mt-4 text-balance text-[36px] font-extrabold leading-[1.06] tracking-[-0.03em] tab:text-[50px]">{post.titulo}</h1>
            <p className="pretty mt-4 text-[19px] leading-[1.55] text-tinta-2">
              <Inline texto={post.resumo} />
            </p>
            <div className="mono mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-tinta-3">
              <span>Equipe Tá no Caixa</span>
              <span aria-hidden>·</span>
              <time dateTime={post.atualizadoEm}>Atualizado em {formatarData(post.atualizadoEm)}</time>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} aria-hidden /> {minutosDeLeitura(post)} min de leitura
              </span>
            </div>
          </div>
          <img
            src={`/blog/${post.slug}.png`}
            alt={`Capa do artigo: ${post.titulo}`}
            width={1200}
            height={630}
            fetchPriority="high"
            decoding="async"
            className="mx-auto mt-8 block h-auto w-full max-w-[900px] rounded-cartao-g border border-[rgba(46,95,115,0.14)] bg-noite"
          />
        </header>

        <div className="mx-auto mt-6 grid max-w-6xl gap-12 px-5 tab:grid-cols-[minmax(0,720px)_260px] tab:justify-center">
          <div className="min-w-0">
            <details className="mt-4 rounded-cartao border border-divisoria bg-superficie px-4 py-3 tab:hidden">
              <summary className="cursor-pointer text-sm font-bold text-tinta-2">Neste artigo</summary>
              <div className="mt-3">
                <Sumario titulos={titulos} />
              </div>
            </details>

            {post.blocos.map((b, i) => (
              <BlocoRender key={i} bloco={b} origem={post.slug} />
            ))}

            {post.fontes && post.fontes.length > 0 && (
              <section className="mt-12" aria-label="Fontes">
                <h2 className="text-[22px] font-extrabold tracking-tight">Fontes e como conferimos</h2>
                <ul className="mt-3 flex flex-col gap-1.5 text-[14.5px] leading-snug text-tinta-3">
                  {post.fontes.map((f) => (
                    <li key={f.url}>
                      <a href={f.url} target="_blank" rel="noopener nofollow" className="text-mar underline decoration-sol underline-offset-2 hover:text-mar-escuro">
                        {f.rotulo}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <aside className="mt-10 flex gap-4 rounded-cartao border border-divisoria bg-superficie p-5" aria-label="Sobre o conteúdo">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-chip bg-mar text-sm font-extrabold text-sol" aria-hidden>
                T
              </span>
              <p className="text-[14.5px] leading-[1.6] text-tinta-3">
                <strong className="text-tinta">Equipe Tá no Caixa.</strong> Conteúdo de quem faz gestão financeira para restaurante e delivery. Os exemplos são ilustrativos e não substituem a orientação do seu contador.
              </p>
            </aside>

            <CtaFinal principal={post.cta.principal} secundario={post.cta.secundario} origem={post.slug} />
          </div>

          <aside className="hidden tab:block" aria-label="Sumário e teste grátis">
            <div className="sticky top-24 flex flex-col gap-6">
              <Sumario titulos={titulos} />
              <div className="rounded-cartao bg-mar p-5 text-creme">
                <div className="mono text-[11px] font-bold uppercase tracking-[0.08em] text-sol">Teste grátis · 14 dias</div>
                <p className="mt-2 text-[17px] font-extrabold leading-snug tracking-tight">Veja quanto sobrou do mês em 3 segundos</p>
                <a
                  href={`/criar?origem=${encodeURIComponent(`blog-${post.slug}-lateral`)}`}
                  onClick={() => rastrear('blog_cta_teste', { variante: 'lateral', origem: post.slug })}
                  className="mt-4 inline-flex items-center gap-2 rounded-botao bg-telhado px-4 py-2.5 text-sm font-bold text-creme transition hover:brightness-95"
                >
                  Testar de graça <ArrowRight size={14} aria-hidden />
                </a>
              </div>
            </div>
          </aside>
        </div>
      </article>
      <Relacionados post={post} />
    </Pagina>
  )
}

/* ----------------------------- recursos ----------------------------- */

export function RecursosIndex() {
  return (
    <Pagina>
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-12 tab:pt-16">
        <Migalhas itens={[{ nome: 'Início', href: '/' }, { nome: 'Materiais grátis' }]} />
        <h1 className="mt-5 max-w-3xl text-balance text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] tab:text-[52px]">Materiais grátis para o seu restaurante</h1>
        <p className="pretty mt-4 max-w-2xl text-lg leading-[1.6] text-tinta-2">Planilha, guia e checklists prontos para usar hoje. Sem enrolação e sem jargão.</p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-6 tab:grid-cols-2" aria-label="Materiais">
        {RECURSOS.map((r) => (
          <CartaoRecurso key={r.id} r={r} />
        ))}
      </section>
      <section className="mx-auto max-w-4xl px-5 py-10">
        <CtaTeste variante="numero" origem="recursos" />
      </section>
    </Pagina>
  )
}

function FormularioRecurso({ r, origem }: { r: Recurso; origem: string }) {
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'ocioso' | 'enviando' | 'pronto'>('ocioso')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return
    setEstado('enviando')
    const origemFinal = new URLSearchParams(window.location.search).get('origem') ?? origem
    rastrear('recurso_download', { recurso: r.id, origem: origemFinal })
    try {
      // Melhor esforço: o download nunca fica refém da captura do e-mail.
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), recurso: r.id, origem: origemFinal }),
      })
    } catch {
      /* segue para o download */
    }
    setEstado('pronto')
    const a = document.createElement('a')
    a.href = r.arquivo
    a.download = r.arquivo.split('/').pop() ?? 'material'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (estado === 'pronto') {
    return (
      <div className="rounded-cartao border border-mata/40 bg-mata/10 p-5">
        <div className="flex items-center gap-2 text-[17px] font-extrabold text-mata">
          <Check size={20} aria-hidden /> Pronto, o download começou.
        </div>
        <p className="mt-2 text-[15px] text-tinta-2">
          Se não abriu, <a href={r.arquivo} download className="font-bold text-mar underline decoration-sol underline-offset-2">baixe aqui</a>. E se quiser ver o seu próprio número do mês, o teste do Tá no Caixa é grátis por 14 dias.
        </p>
        <a href={`/criar?origem=${encodeURIComponent(`recurso-${r.id}`)}`} className="mt-4 inline-flex items-center gap-2 rounded-botao bg-telhado px-5 py-3 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95">
          Testar de graça <ArrowRight size={15} aria-hidden />
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={enviar} className="rounded-cartao border border-[rgba(46,95,115,0.2)] bg-superficie p-5 tab:p-6">
      <label htmlFor="email-recurso" className="text-[15px] font-bold text-tinta">
        Para onde mandamos o material?
      </label>
      <div className="mt-2 flex flex-col gap-3 cel:flex-row">
        <input
          id="email-recurso"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          className="min-w-0 flex-1 rounded-campo border border-[rgba(46,95,115,0.25)] bg-white px-4 py-3 text-[16px] outline-none focus:border-mar focus:ring-2 focus:ring-mar/20"
        />
        <button type="submit" disabled={estado === 'enviando'} className="inline-flex items-center justify-center gap-2 rounded-botao bg-telhado px-6 py-3 text-[15px] font-bold text-creme shadow-telhado transition hover:brightness-95 disabled:opacity-60">
          <Download size={16} aria-hidden /> {estado === 'enviando' ? 'Enviando…' : 'Baixar grátis'}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-tinta-4">
        Ao baixar, você aceita receber, no máximo, um e-mail por semana com conteúdo de gestão para restaurante. Cancele quando quiser. Seus dados seguem a LGPD.
      </p>
    </form>
  )
}

export function RecursoPagina({ recurso: r, origem }: { recurso: Recurso; origem: string }) {
  const Icone = r.formato === 'XLSX' ? FileSpreadsheet : FileText
  const posts = r.slugsRelacionados.map(acharPost).filter((p): p is Post => !!p)
  return (
    <Pagina>
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-12 tab:pt-16">
        <Migalhas itens={[{ nome: 'Início', href: '/' }, { nome: 'Materiais grátis', href: '/recursos' }, { nome: r.titulo }]} />
        <div className="mt-6 grid gap-10 tab:grid-cols-[1.15fr_0.85fr] tab:items-start">
          <div>
            <div className="mono text-[11px] font-bold uppercase tracking-[0.08em] text-telhado">Grátis · {r.formato}</div>
            <h1 className="mt-2 text-balance text-[36px] font-extrabold leading-[1.06] tracking-[-0.03em] tab:text-[46px]">{r.titulo}</h1>
            <p className="pretty mt-4 text-[18px] leading-[1.6] text-tinta-2">{r.descricao}</p>
            <h2 className="mt-8 text-[20px] font-extrabold tracking-tight">O que vem dentro</h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {r.inclui.map((i) => (
                <li key={i} className="flex gap-3 text-[16px] leading-snug text-tinta-2">
                  <Check size={19} className="mt-0.5 shrink-0 text-mata" aria-hidden />
                  {i}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[15px] leading-snug text-tinta-3">
              <strong className="text-tinta">Para quem é:</strong> {r.paraQuem}
            </p>
          </div>
          <div className="flex flex-col gap-5">
            <div className={`flex items-center gap-4 rounded-cartao-g p-6 ${TOM_BG[r.tom]}`}>
              <span className="grid h-16 w-16 place-items-center rounded-chip bg-white/15" aria-hidden>
                <Icone size={32} />
              </span>
              <div>
                <div className="mono text-[11px] font-bold uppercase tracking-[0.08em] opacity-80">Download</div>
                <div className="mono text-[30px] font-bold leading-none">{r.formato}</div>
              </div>
            </div>
            <FormularioRecurso r={r} origem={origem} />
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-8" aria-label="Artigos relacionados">
          <h2 className="text-[24px] font-extrabold tracking-[-0.025em]">Artigos que explicam como usar</h2>
          <div className="mt-4 grid gap-4 tab:grid-cols-3">
            {posts.map((p) => (
              <a key={p.slug} href={`/blog/${p.slug}`} className="group rounded-cartao border border-[rgba(46,95,115,0.16)] bg-superficie p-5 transition hover:border-mar/45 hover:shadow-cartao">
                <ChipCategoria categoria={p.categoria} />
                <div className="mt-3 text-[17px] font-extrabold leading-snug tracking-tight text-tinta group-hover:text-mar">{p.titulo}</div>
              </a>
            ))}
          </div>
        </section>
      )}
    </Pagina>
  )
}

export function NaoEncontrada() {
  return (
    <Pagina>
      <section className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-[40px] font-extrabold tracking-[-0.03em]">Essa página não está no caixa</h1>
        <p className="mt-3 text-lg text-tinta-3">O endereço pode ter mudado. Veja os artigos do blog ou volte para o início.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/blog" className="rounded-botao bg-mar px-5 py-3 text-sm font-bold text-creme">Ver o blog</a>
          <a href="/" className="rounded-botao border border-[rgba(46,95,115,0.25)] bg-superficie px-5 py-3 text-sm font-bold text-tinta-2">Ir para o início</a>
        </div>
      </section>
    </Pagina>
  )
}

