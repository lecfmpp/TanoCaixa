import { ArrowRight, Check, Download, FileSpreadsheet, FileText, X } from 'lucide-react'
import { acharRecurso } from './recursos'
import { rastrear } from './rastrear'
import type { RefCta, Tom, VarianteTeste } from './tipos'

/**
 * Blocos de chamada reutilizáveis. Entram no meio do texto (compactos) e no fim do post.
 * Dois tipos: baixar uma isca digital (`recurso`) ou testar o app (`teste`, com 5 variantes
 * para os posts não repetirem a mesma chamada).
 */

const TESTE: Record<
  VarianteTeste,
  { etiqueta: string; titulo: string; texto: string; compacto: string; imagem?: { src: string; alt: string; url: string } }
> = {
  painel: {
    etiqueta: 'Teste grátis por 14 dias',
    titulo: 'Veja quanto sobrou do mês em 3 segundos',
    texto: 'Entrou, saiu e sobrou no mesmo painel, com a meta do mês e o caminho até o ponto de equilíbrio. Você lança o dia em um minuto e a nota por foto.',
    compacto: 'Veja quanto sobrou do mês em 3 segundos, no painel do Tá no Caixa.',
    imagem: { src: '/landing/dashboard.webp', alt: 'Dashboard do Tá no Caixa com entrou, saiu e sobrou do mês', url: 'app.tanocaixa.com/painel' },
  },
  numero: {
    etiqueta: 'Comece hoje',
    titulo: 'Descubra o seu número em 40 segundos',
    texto: 'Faça o cadastro, lance o fechamento de ontem e veja quanto sobrou. Sem cartão. Depois do teste de 14 dias, o plano é R$ 149 por loja, por mês.',
    compacto: 'Descubra o seu número em 40 segundos: cadastro sem cartão e 14 dias de teste.',
  },
  nota: {
    etiqueta: 'Nota fiscal por foto',
    titulo: 'Tire a foto da nota. O resto sai pronto.',
    texto: 'Fornecedor, itens, preços e categoria saem prontos em 5 segundos. Você só confere e confirma, e o custo do prato se atualiza com a compra.',
    compacto: 'Lance a nota fiscal por foto: fornecedor, itens e preços saem prontos em 5 segundos.',
    imagem: { src: '/landing/compras.webp', alt: 'Tela de compras do Tá no Caixa com notas fiscais e preço por item', url: 'app.tanocaixa.com/painel/compras' },
  },
  comparacao: {
    etiqueta: 'Planilha ou painel?',
    titulo: 'Planilha dá trabalho. O painel já nasce pronto.',
    texto: 'Se a sua planilha vive desatualizada, o problema não é você: é digitar tudo, conferir fórmula e lembrar de lançar. No Tá no Caixa a nota entra por foto e o painel mostra o resultado.',
    compacto: 'Cansou de planilha? Teste o painel do Tá no Caixa por 14 dias, sem cartão.',
  },
  rede: {
    etiqueta: 'Mais de uma loja',
    titulo: 'Cada loja com o seu resultado, e o todo junto',
    texto: 'Para quem tem duas casas ou mais: a visão de cada loja e a do conjunto, lado a lado. O plano é R$ 149 por loja, e duas lojas custam R$ 298.',
    compacto: 'Tem mais de uma loja? Veja o resultado de cada uma e o do conjunto no Tá no Caixa.',
    imagem: { src: '/landing/franquias.webp', alt: 'Tela de franquias e rede do Tá no Caixa com o resultado de cada loja', url: 'app.tanocaixa.com/painel/franquias' },
  },
}

function hrefCadastro(origem: string) {
  return `/criar?origem=${encodeURIComponent(`blog-${origem}`)}`
}

function Comparativo() {
  const itens: [string, string][] = [
    ['Digitar cada nota', 'Foto da nota, 5 segundos'],
    ['Conferir fórmula quebrada', 'Painel pronto, sem fórmula'],
    ['Lembrar de abrir a planilha', 'Recado toda segunda-feira'],
  ]
  return (
    <div className="grid gap-2.5 rounded-cartao bg-creme/10 p-4 text-sm">
      {itens.map(([a, b]) => (
        <div key={a} className="grid grid-cols-2 gap-3">
          <span className="flex items-start gap-2 text-creme/75">
            <X size={15} className="mt-0.5 shrink-0 text-sol" aria-hidden />
            {a}
          </span>
          <span className="flex items-start gap-2 font-semibold text-creme">
            <Check size={15} className="mt-0.5 shrink-0 text-sol" aria-hidden />
            {b}
          </span>
        </div>
      ))}
    </div>
  )
}

function Numeros40() {
  const n: [string, string][] = [
    ['40s', 'para lançar uma nota'],
    ['3s', 'para saber se sobrou'],
    ['0', 'planilha para manter'],
  ]
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {n.map(([v, t]) => (
        <div key={t} className="rounded-cartao bg-creme/10 p-3.5">
          <div className="mono text-[26px] font-bold leading-none text-sol">{v}</div>
          <div className="mt-1.5 text-xs leading-snug text-creme/80">{t}</div>
        </div>
      ))}
    </div>
  )
}

export function CtaTeste({ variante, origem, compacto }: { variante: VarianteTeste; origem: string; compacto?: boolean }) {
  const c = TESTE[variante]
  const clique = () => rastrear('blog_cta_teste', { variante, origem })

  if (compacto) {
    return (
      <aside className="my-9 flex flex-wrap items-center justify-between gap-4 rounded-cartao bg-mar px-5 py-4 text-creme tab:px-6" aria-label="Teste grátis">
        <p className="min-w-0 max-w-[460px] text-[16px] font-bold leading-snug">{c.compacto}</p>
        <a href={hrefCadastro(origem)} onClick={clique} className="inline-flex shrink-0 items-center gap-2 rounded-botao bg-telhado px-5 py-3 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95">
          Testar de graça <ArrowRight size={15} aria-hidden />
        </a>
      </aside>
    )
  }

  return (
    <section className="relative isolate overflow-hidden rounded-cartao-g bg-mar text-creme" aria-label="Teste grátis do Tá no Caixa">
      <span className="absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-sol" aria-hidden />
      <div className="grid gap-7 p-6 tab:grid-cols-[1.1fr_0.9fr] tab:items-center tab:p-10">
        <div>
          <div className="mono text-[11px] font-bold uppercase tracking-[0.08em] text-sol">{c.etiqueta}</div>
          <h2 className="mt-2 text-balance text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] tab:text-[36px]">{c.titulo}</h2>
          <p className="pretty mt-3 max-w-md text-[16.5px] leading-[1.6] text-creme/85">{c.texto}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href={hrefCadastro(origem)} onClick={clique} className="inline-flex items-center gap-2 rounded-botao bg-telhado px-6 py-3.5 text-[15px] font-bold text-creme shadow-telhado transition hover:brightness-95">
              Testar de graça por 14 dias <ArrowRight size={16} aria-hidden />
            </a>
            <a href="/#como" className="rounded-botao border border-creme/35 px-5 py-3.5 text-[15px] font-bold text-creme transition hover:bg-creme/10">
              Ver como funciona
            </a>
          </div>
          <p className="mt-3 text-[13px] text-creme/70">Cadastro em 40 segundos, sem cartão. Se não valer a pena, você sai levando seus dados.</p>
        </div>
        <div className="min-w-0">
          {variante === 'comparacao' && <Comparativo />}
          {variante === 'numero' && <Numeros40 />}
          {c.imagem && (
            <div className="overflow-hidden rounded-cartao border border-creme/25 bg-superficie shadow-modal">
              <div className="flex items-center gap-1.5 border-b border-divisoria bg-preenchimento/70 px-3 py-2" aria-hidden>
                <span className="h-2 w-2 rounded-full bg-telhado/60" />
                <span className="h-2 w-2 rounded-full bg-sol/80" />
                <span className="h-2 w-2 rounded-full bg-mata/60" />
                <span className="mono ml-2 text-[10px] text-tinta-4">{c.imagem.url}</span>
              </div>
              <img src={c.imagem.src} alt={c.imagem.alt} width={1400} height={1046} loading="lazy" decoding="async" className="block h-auto w-full" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

const FUNDO_TOM: Record<Tom, string> = { mar: 'bg-mar text-creme', telha: 'bg-telhado text-creme', mata: 'bg-mata text-creme', sol: 'bg-sol text-noite' }

export function CtaRecurso({ id, origem, compacto }: { id: string; origem: string; compacto?: boolean }) {
  const r = acharRecurso(id)
  if (!r) return null
  const clique = () => rastrear('blog_cta_recurso', { recurso: r.id, origem })
  const Icone = r.formato === 'XLSX' ? FileSpreadsheet : FileText
  const href = `/recursos/${r.id}?origem=${encodeURIComponent(`blog-${origem}`)}`

  if (compacto) {
    return (
      <aside className="my-9 flex flex-wrap items-center gap-4 rounded-cartao border border-[rgba(46,95,115,0.2)] bg-superficie px-5 py-4 tab:px-6" aria-label="Material gratuito">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-chip ${FUNDO_TOM[r.tom]}`} aria-hidden>
          <Icone size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-telhado">Grátis · {r.formato}</div>
          <div className="text-[16.5px] font-extrabold leading-snug tracking-tight text-tinta">{r.titulo}</div>
        </div>
        <a href={href} onClick={clique} className="inline-flex shrink-0 items-center gap-2 rounded-botao bg-mar px-5 py-3 text-sm font-bold text-creme transition hover:bg-mar-escuro">
          <Download size={15} aria-hidden /> Baixar
        </a>
      </aside>
    )
  }

  return (
    <section className="overflow-hidden rounded-cartao-g border border-[rgba(46,95,115,0.2)] bg-superficie shadow-cartao" aria-label="Material gratuito">
      <div className="grid tab:grid-cols-[0.42fr_1fr]">
        <div className={`flex flex-col justify-between gap-6 p-6 tab:p-8 ${FUNDO_TOM[r.tom]}`}>
          <span className="grid h-14 w-14 place-items-center rounded-chip bg-white/15" aria-hidden>
            <Icone size={28} />
          </span>
          <div>
            <div className="mono text-[11px] font-bold uppercase tracking-[0.08em] opacity-80">Material gratuito</div>
            <div className="mono mt-1 text-[34px] font-bold leading-none">{r.formato}</div>
          </div>
        </div>
        <div className="p-6 tab:p-8">
          <h2 className="text-balance text-[27px] font-extrabold leading-[1.1] tracking-[-0.025em] text-tinta">{r.titulo}</h2>
          <p className="pretty mt-2.5 text-[16px] leading-[1.6] text-tinta-2">{r.resumo}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {r.inclui.slice(0, 3).map((i) => (
              <li key={i} className="flex gap-2.5 text-[15px] leading-snug text-tinta-2">
                <Check size={17} className="mt-0.5 shrink-0 text-mata" aria-hidden />
                {i}
              </li>
            ))}
          </ul>
          <a href={href} onClick={clique} className="mt-6 inline-flex items-center gap-2 rounded-botao bg-telhado px-6 py-3.5 text-[15px] font-bold text-creme shadow-telhado transition hover:brightness-95">
            <Download size={16} aria-hidden /> Baixar grátis
          </a>
        </div>
      </div>
    </section>
  )
}

export function CtaPorRef({ cta, origem, compacto }: { cta: RefCta; origem: string; compacto?: boolean }) {
  return cta.tipo === 'recurso' ? <CtaRecurso id={cta.id} origem={origem} compacto={compacto} /> : <CtaTeste variante={cta.variante} origem={origem} compacto={compacto} />
}

/** Fim do post: o principal em destaque e o secundário logo abaixo. */
export function CtaFinal({ principal, secundario, origem }: { principal: RefCta; secundario?: RefCta; origem: string }) {
  return (
    <div className="mt-14 flex flex-col gap-5">
      <CtaPorRef cta={principal} origem={origem} />
      {secundario && <CtaPorRef cta={secundario} origem={origem} compacto />}
    </div>
  )
}
