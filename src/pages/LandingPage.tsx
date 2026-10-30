import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowRight, Star, Volume2, VolumeX } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { fotos } from '@/lib/fotos'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { DESCONTO_LOJA, PRECO_EXPANSAO, PRECO_LOJA, PRECO_LOJA_CHEIO } from '@/data/preco'
import { cn } from '@/lib/cn'

/** Demonstração publicada no canal do YouTube (é a mesma que toca no hero). */
const VIDEO_HERO = {
  youtubeId: 't0oa-2wGEoo',
  titulo: 'Software de Gestão para Restaurante e Delivery | Tá no Caixa',
  descricao:
    'Software de gestão para restaurante e delivery que mostra quanto sobrou no mês: lance nota fiscal, despesas e vendas e veja o lucro crescer no dashboard.',
  enviadoEm: '2026-10-21',
  duracao: 'PT35S',
} as const

/* Landing pública — tanocaixa.com. Fiel ao Landing.dc.html. */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-fundo-app text-tinta">
      {/* Dados estruturados: o Google associa o vídeo do YouTube a esta página (elegível a resultado em vídeo). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'VideoObject',
            name: VIDEO_HERO.titulo,
            description: VIDEO_HERO.descricao,
            thumbnailUrl: [`https://i.ytimg.com/vi/${VIDEO_HERO.youtubeId}/maxresdefault.jpg`],
            uploadDate: VIDEO_HERO.enviadoEm,
            duration: VIDEO_HERO.duracao,
            contentUrl: `https://www.youtube.com/watch?v=${VIDEO_HERO.youtubeId}`,
            embedUrl: `https://www.youtube.com/embed/${VIDEO_HERO.youtubeId}`,
            inLanguage: 'pt-BR',
          }),
        }}
      />
      <Nav />
      <Hero />
      <Problema />
      <ComoFunciona />
      <Funcionalidades />
      <ServePraVoce />
      <NoCelular />
      <Preco />
      <FAQ />
      <CTAFinal />
      <Rodape />
    </div>
  )
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-divisoria/70 bg-fundo-app/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo tom="escuro" tamanho={18} />
        <nav className="hidden items-center gap-7 text-sm font-semibold text-tinta-2 tab:flex">
          <a href="#como" className="hover:text-tinta">Como funciona</a>
          <a href="#painel" className="hover:text-tinta">Funcionalidades</a>
          <a href="#preco" className="hover:text-tinta">Preço</a>
          <a href="#duvidas" className="hover:text-tinta">Dúvidas</a>
          <a href="/blog" className="hover:text-tinta">Blog</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <Link to="/entrar" className="hidden text-sm font-bold text-tinta-2 hover:text-tinta cel:block">Entrar</Link>
          <Link to="/criar" className="rounded-botao bg-telhado px-4 py-2 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95">Testar de graça</Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 tab:grid-cols-2 tab:py-20">
      <div>
        <h1 className="text-tinta" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          Saber se sobrou dinheiro não pode dar trabalho
        </h1>
        <p className="pretty mt-5 max-w-md text-lg text-tinta-2">
          Foto da nota, fechamento do dia em um minuto e um recado toda segunda com o que fazer. Zero planilha.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/criar" className="rounded-botao bg-telhado px-5 py-3 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95">
            Começar de graça por 14 dias
          </Link>
          <a href="#painel" className="rounded-botao border border-[rgba(46,95,115,0.2)] bg-superficie px-5 py-3 text-sm font-bold text-tinta-2 transition hover:border-mar/50">
            Ver as telas por dentro
          </a>
        </div>
        <div className="mt-9 flex gap-8">
          {[['40s', 'pra lançar uma nota'], ['3s', 'pra saber se sobrou'], ['0', 'planilha pra manter']].map(([n, t]) => (
            <div key={t}>
              <div className="mono text-tinta" style={{ fontSize: 26, fontWeight: 700 }}>{n}</div>
              <div className="mt-1 max-w-[92px] text-xs text-tinta-3">{t}</div>
            </div>
          ))}
        </div>
      </div>
      <TelaReal
        src="/landing/hero-demo-poster.webp"
        video="/landing/hero-demo.mp4"
        youtubeId={VIDEO_HERO.youtubeId}
        prioridade
        alt="Demonstração em vídeo: lançar uma nota fiscal e uma despesa no Tá no Caixa e ver o lucro do mês crescer no dashboard"
      />
    </section>
  )
}

/**
 * Print real do app (modo demonstração, restaurante de exemplo) numa moldura de navegador.
 * Com `video`, toca a demonstração animada (feita dos prints reais) em loop; `src` vira o poster.
 * `youtubeId` é a mesma demonstração publicada no canal: vira um link "Ver no YouTube" na moldura
 * (o embed do YouTube cobriria a abertura com a barra de título e de canal, por isso o hero toca o MP4).
 * Quem pede menos movimento no sistema vê só o quadro estático.
 */
function TelaReal({ src, alt, prioridade = false, video, youtubeId }: { src: string; alt: string; prioridade?: boolean; video?: string; youtubeId?: string }) {
  const reduzirMovimento = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mudo, setMudo] = useState(true)
  // Navegador só libera autoplay mudo; o som liga num clique (gesto do usuário).
  function alternarSom() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMudo(v.muted)
    if (!v.muted && v.paused) void v.play()
  }
  return (
    <div className="relative">
      <div className="foto-rio absolute -inset-4 -z-10 rounded-[28px] opacity-90" aria-hidden>
        <img src={fotos.cristo} alt="" />
      </div>
      <div className="overflow-hidden rounded-cartao-g border border-[rgba(46,95,115,0.12)] bg-superficie shadow-cartao">
        <div className="flex items-center gap-1.5 border-b border-divisoria bg-preenchimento/60 px-4 py-2.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-telhado/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-sol/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-mata/60" />
          <span className="mono ml-3 text-[11px] text-tinta-4">app.tanocaixa.com</span>
        </div>
        {video && !reduzirMovimento ? (
          <div className="relative">
            <video
              ref={videoRef}
              src={video}
              poster={src}
              role="img"
              aria-label={alt}
              width={1280}
              height={800}
              autoPlay
              muted
              loop
              playsInline
              preload={prioridade ? 'auto' : 'metadata'}
              className="block h-auto w-full"
            />
            {youtubeId && (
              <a
                href={`https://youtu.be/${youtubeId}`}
                target="_blank"
                rel="noopener"
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-noite/85 px-3 py-1.5 text-xs font-bold text-creme backdrop-blur transition hover:bg-noite"
              >
                Ver no YouTube <ArrowRight size={13} aria-hidden />
              </a>
            )}
            <button
              type="button"
              onClick={alternarSom}
              aria-pressed={!mudo}
              aria-label={mudo ? 'Ligar o som do vídeo' : 'Desligar o som do vídeo'}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-noite/85 px-3 py-1.5 text-xs font-bold text-creme shadow-cartao backdrop-blur transition hover:bg-noite"
            >
              {mudo ? <VolumeX size={14} aria-hidden /> : <Volume2 size={14} aria-hidden />}
              {mudo ? 'Ligar som' : 'Som ligado'}
            </button>
          </div>
        ) : (
          <img src={src} alt={alt} width={1400} height={Math.round(1400 * 1350 / 1806)} loading={prioridade ? 'eager' : 'lazy'} className="block h-auto w-full" />
        )}
      </div>
    </div>
  )
}

function Problema() {
  const itens = [
    ['O sistema é do tempo do computador de mesa', 'Cheio de aba, campo e relatório que ninguém abre. Você vive no salão, não na frente da tela.'],
    ['A nota fica no bolso do avental', 'Quando chega a hora de digitar, já passou uma semana. Aí ninguém digita mais.'],
    ['O app come a margem calado', 'Cada R$ 100 no iFood viram R$ 73 no seu bolso — e isso não aparece em lugar nenhum.'],
    ['Resultado: você opera no escuro', 'Descobre que o mês foi ruim quando o dinheiro já foi. A gente existe pra te avisar no dia 12, não no dia 31.'],
  ]
  return (
    <section className="border-y border-divisoria bg-superficie/60">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <span className="rotulo text-telhado">O problema</span>
        <h2 className="pretty mt-2 max-w-2xl" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>
          Todo mundo sabe o que vendeu. Quase ninguém sabe o que sobrou.
        </h2>
        <p className="mt-2 max-w-xl text-tinta-3">Enquanto o serviço roda, ninguém para pra digitar nota em sistema.</p>
        <div className="mt-10 grid gap-4 cel:grid-cols-2 tab:grid-cols-4">
          {itens.map(([t, d]) => (
            <div key={t} className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-5">
              <h3 className="text-[15px] font-bold text-tinta">{t}</h3>
              <p className="pretty mt-2 text-sm text-tinta-3">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ComoFunciona() {
  const passos = [
    ['Lança o dia em um minuto', 'Pix, cartão, dinheiro e apps de delivery num formulário só. Integração automática com iFood, Uber Eats e maquininha: em breve.'],
    ['Tira foto da nota', 'Fornecedor, itens, preços e categoria saem prontos em 5 segundos. Você só confere e confirma.'],
    ['Olha o painel em 3 segundos', 'Entrou, saiu, sobrou e quanto falta pro ponto de equilíbrio. Sem relatório pra rodar.'],
    ['Recebe o recado de segunda', 'Um e-mail curto com o que mudou na semana e uma coisa só pra fazer. No WhatsApp quando estoura um teto.'],
  ]
  return (
    <section id="como" className="mx-auto max-w-6xl px-5 py-16">
      <span className="rotulo text-telhado">Como funciona</span>
      <h2 className="pretty mt-2 max-w-2xl" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>
        Quatro passos curtos. Nenhum vira planilha.
      </h2>
      <div className="mt-10 grid gap-4 tab:grid-cols-4">
        {passos.map(([t, d], i) => (
          <div key={t} className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-5">
            <div className="mono grid h-9 w-9 place-items-center rounded-full bg-mar text-sm font-bold text-creme">{i + 1}</div>
            <h3 className="mt-3 text-[15px] font-bold text-tinta">{t}</h3>
            <p className="pretty mt-2 text-sm text-tinta-3">{d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

const FUNCIONALIDADES = [
  { id: 'dashboard', nome: 'Dashboard', texto: 'Quanto sobrou, entrou e saiu no mês, metas por categoria e o caminho até o ponto de equilíbrio.', img: 'dashboard' },
  { id: 'inicio', nome: 'Início', texto: 'Como está o mês num relance: contas vencendo, resumo da semana e uma coisa pra fazer hoje.', img: 'inicio' },
  { id: 'caixa', nome: 'Caixa', texto: 'Lança as vendas do dia — Pix, cartão, dinheiro e apps de delivery — num formulário só.', img: 'caixa' },
  { id: 'compras', nome: 'Compras', texto: 'Notas fiscais por foto, preço por item, fornecedores e aviso de nota vencendo.', img: 'compras' },
  { id: 'despesas', nome: 'Despesas', texto: 'Pra onde o dinheiro foi, por categoria: o que já foi pago, o que falta pagar e o que vence.', img: 'despesas' },
  { id: 'produtos', nome: 'Produtos', texto: 'Cadastro de insumos com custo atual, fornecedor e quem atualizou por último.', img: 'produtos' },
  { id: 'estoque', nome: 'Estoque', texto: 'Entradas por nota, contagem e uma pergunta pra IA sobre o que sobrou ou foi embora.', img: 'estoque' },
  { id: 'dre', nome: 'DRE', texto: 'O resultado do mês no plano de contas, com a explicação do CMV, pronto pra mandar pro contador.', img: 'dre' },
  { id: 'plano', nome: 'Plano do mês', texto: 'Meta de faturamento e teto de cada gasto, com o realizado ao lado.', img: 'plano-do-mes' },
  { id: 'franquias', nome: 'Franquias e rede', texto: 'Cada loja com seu resultado e a visão do todo junto, pra quem tem duas casas ou mais.', img: 'franquias' },
] as const

function Funcionalidades() {
  const [ativa, setAtiva] = useState<(typeof FUNCIONALIDADES)[number]['id']>('dashboard')
  const atual = FUNCIONALIDADES.find((f) => f.id === ativa) ?? FUNCIONALIDADES[0]
  return (
    <section id="painel" className="border-y border-divisoria bg-superficie/60">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <span className="rotulo text-telhado">Funcionalidades</span>
        <h2 className="pretty mt-2 max-w-2xl" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>
          Tudo isso já funciona hoje
        </h2>
        <p className="mt-2 max-w-xl text-tinta-3">Prints reais do app, com os dados de um restaurante de exemplo. Sem jargão: a gente escreve do jeito que se fala no balcão.</p>

        <div className="mt-10 grid items-start gap-8 tab:grid-cols-[260px_1fr]">
          <div role="tablist" aria-label="Telas do Tá no Caixa" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 tab:mx-0 tab:flex-col tab:gap-1 tab:overflow-visible tab:px-0">
            {FUNCIONALIDADES.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={f.id === ativa}
                onClick={() => setAtiva(f.id)}
                className={cn(
                  'shrink-0 rounded-botao px-4 py-2.5 text-left text-sm font-bold transition',
                  f.id === ativa ? 'bg-mar text-creme' : 'bg-superficie text-tinta-2 hover:bg-preenchimento tab:bg-transparent',
                )}
              >
                {f.nome}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            <p className="pretty mb-4 max-w-xl text-[15px] text-tinta-2"><span className="font-bold text-tinta">{atual.nome}.</span> {atual.texto}</p>
            <TelaReal key={atual.id} src={`/landing/${atual.img}.webp`} alt={`Tela ${atual.nome} do Tá no Caixa`} />
          </div>
        </div>

        <div className="mt-14">
          <span className="rotulo text-telhado">Chegando</span>
          <div className="mt-3 grid gap-4 cel:grid-cols-2 tab:grid-cols-4">
            {([
              ['PDV', 'Frente de caixa pra mesa, balcão e delivery, com tela de cozinha (KDS). As vendas caem direto no caixa do dia.', null],
              ['CMV por ficha técnica', 'Custo de cada prato pelos insumos e pelo preço da última nota. O CMV já aparece no DRE; a ficha técnica vem aí.', null],
              ['iFood', 'Vendas e taxas do iFood entrando sozinhas no caixa, sem digitar o fechamento dos apps.', { src: '/integracoes/ifood.svg', alt: 'iFood' }],
              ['Uber Eats', 'Vendas e taxas do Uber Eats entrando sozinhas, junto com o resto do delivery.', { src: '/integracoes/ubereats.svg', alt: 'Uber Eats' }],
            ] as const).map(([t, d, logo]) => (
              <div key={t} className="rounded-cartao border border-dashed border-[rgba(46,95,115,0.3)] bg-superficie p-5">
                {logo && <img src={logo.src} alt={logo.alt} className="mb-3 h-7 w-auto" />}
                <div className="flex flex-wrap items-center gap-2"><h3 className="text-[15px] font-bold text-tinta">{logo ? `Integração ${t}` : t}</h3><SeloEmBreve /></div>
                <p className="pretty mt-2 text-sm text-tinta-3">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ServePraVoce() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-10 tab:grid-cols-2">
        <div>
          <span className="rotulo text-telhado">Serve pra você</span>
          <h2 className="pretty mt-2" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>
            Delivery, boteco, rede de duas lojas — o trabalho é o mesmo.
          </h2>
          <div className="mt-6 flex flex-col gap-3">
            {[['Dark kitchen', 'Delivery-first, tudo pelo app'], ['Boteco de bairro', 'Balcão, mesa e uns pedidos no WhatsApp'], ['À la carte', 'Cozinha árabe, japonesa, pizza'], ['2 a 5 lojas', 'Visão de cada uma e do todo junto']].map(([t, d]) => (
              <div key={t} className="flex items-start gap-3">
                <Check size={18} className="mt-0.5 shrink-0 text-mata" strokeWidth={2.5} />
                <div><span className="font-bold text-tinta">{t}</span> <span className="text-tinta-3">— {d}</span></div>
              </div>
            ))}
          </div>
        </div>
        <div className="foto-rio filtro-sol relative min-h-[380px] overflow-hidden rounded-cartao-g p-8 text-creme">
          <img src={fotos.cristo} alt="" style={{ objectPosition: '50% 38%' }} />
          <div className="pointer-events-none absolute inset-0 z-[2]" style={{ background: 'linear-gradient(180deg, rgba(22,48,58,0) 35%, rgba(22,48,58,.78))' }} />
          <div className="relative z-10 flex h-full flex-col justify-end">
            <div className="flex gap-1 text-sol">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}</div>
            <p className="pretty mt-3 text-lg font-semibold">“Parei de descobrir o resultado no fim do mês. Agora sei no dia 12 se o hortifrúti tá me comendo.”</p>
            <div className="mt-4">
              <div className="font-bold">Halim Nassar</div>
              <div className="text-sm text-creme/80">Zaatar Cozinha Árabe · Botafogo</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const TELAS_CELULAR = [
  { id: 'inicio', rotulo: 'Como está o mês', alt: 'Tela Início no celular, com entrou, saiu e sobrou do mês' },
  { id: 'lancar', rotulo: 'Lançar nota ou despesa', alt: 'Menu de lançamento no celular: nota fiscal, despesa, produto e vendas' },
  { id: 'notas', rotulo: 'Notas e compras', alt: 'Tela Compras no celular, com notas do mês e fornecedores' },
  { id: 'despesas', rotulo: 'Despesas', alt: 'Tela Despesas no celular, com o que saiu no mês' },
  { id: 'caixa', rotulo: 'Fechar o caixa', alt: 'Tela Caixa no celular, para lançar as vendas do dia' },
  { id: 'dashboard', rotulo: 'Dashboard', alt: 'Dashboard no celular, com sobrou, entrou e saiu' },
] as const

function NoCelular() {
  const [ativa, setAtiva] = useState<(typeof TELAS_CELULAR)[number]['id']>('inicio')
  const atual = TELAS_CELULAR.find((t) => t.id === ativa) ?? TELAS_CELULAR[0]
  return (
    <section className="overflow-hidden border-y border-divisoria bg-mar text-creme">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-14 tab:grid-cols-[1fr_auto] tab:gap-16">
        <div className="pb-2 tab:pb-14">
          <span className="rotulo text-sol">No celular</span>
          <h2 className="pretty mt-2 max-w-md" style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.025em' }}>Controle tudo do seu celular</h2>
          <p className="pretty mt-3 max-w-md text-creme/80">Lança nota, despesa e receita, fecha o caixa e confere o resultado do mês sem sentar no computador. É a mesma tela do painel, no navegador do celular.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {TELAS_CELULAR.map((t) => (
              <button
                key={t.id}
                onClick={() => setAtiva(t.id)}
                aria-pressed={t.id === ativa}
                className={cn(
                  'rounded-chip px-3.5 py-2 text-sm font-bold transition',
                  t.id === ativa ? 'bg-sol text-noite' : 'bg-noite/30 text-creme hover:bg-noite/50',
                )}
              >
                {t.rotulo}
              </button>
            ))}
          </div>
        </div>
        {/* Só os 70% de cima do iPhone aparecem; o resto fica cortado pela borda da seção. */}
        <div className="mx-auto h-[459px] w-[316px] overflow-hidden">
          <div className="relative h-[656px] w-[316px] rounded-[52px] bg-[#16303A] p-[12px] shadow-[0_0_0_2px_#2b4c59,0_30px_60px_rgba(0,0,0,.35)]">
            <span className="absolute -left-[3px] top-[110px] h-8 w-[3px] rounded-l bg-[#2b4c59]" aria-hidden />
            <span className="absolute -left-[3px] top-[160px] h-14 w-[3px] rounded-l bg-[#2b4c59]" aria-hidden />
            <span className="absolute -right-[3px] top-[170px] h-20 w-[3px] rounded-r bg-[#2b4c59]" aria-hidden />
            <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[40px] bg-fundo-app">
              <div className="mono flex h-[42px] shrink-0 items-center justify-between px-7 pt-1 text-[12px] font-bold text-tinta" aria-hidden>
                <span>9:41</span>
                <span className="tracking-widest">•••</span>
              </div>
              <img key={atual.id} src={`/landing/mobile/${atual.id}.webp`} alt={atual.alt} width={780} height={1688} className="block min-h-0 w-full flex-1 object-cover object-top" />
              <span className="absolute left-1/2 top-[9px] h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-[#0b161b]" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Preco() {
  const itens = [
    'Dashboard, metas e caminho até o equilíbrio',
    'Lançamento do dia e foto da nota com IA',
    'Compras, despesas, produtos e estoque',
    'DRE e plano do mês',
    'Rede e franquias, com a visão de cada loja',
    'Recado de segunda por e-mail',
    'Equipe com permissões (o gerente não vê o lucro)',
  ]
  return (
    <section id="preco" className="mx-auto max-w-6xl px-5 py-16">
      <span className="rotulo text-telhado">Preço</span>
      <h2 className="mt-2" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>Um plano só: o Pro</h2>
      <p className="mt-2 text-tinta-3">14 dias de graça, sem cartão. Cancela quando quiser, leva seus dados junto.</p>
      <div className="mt-10 grid items-stretch gap-4 tab:grid-cols-[1fr_380px]">
        <div className="rounded-cartao-g border border-[rgba(46,95,115,0.12)] bg-superficie p-6">
          <h3 className="text-[15px] font-bold text-tinta">O que está incluso</h3>
          <ul className="mt-4 flex flex-col gap-3">
            {itens.map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm text-tinta-2"><Check size={17} className="mt-0.5 shrink-0 text-mata" strokeWidth={2.5} />{t}</li>
            ))}
          </ul>
          <div className="mt-6 border-t border-divisoria pt-5">
            <div className="rotulo text-tinta-4">Fora do plano, em breve</div>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-tinta-3">
              <li className="flex items-center gap-2">PDV <SeloEmBreve /></li>
              <li className="flex items-center gap-2">CMV por ficha técnica <SeloEmBreve /></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col rounded-cartao-g border border-mar bg-mar p-6 text-creme shadow-cartao">
          <span className="mb-3 self-start rounded-chip bg-sol px-2.5 py-1 text-xs font-bold text-noite">R$ {DESCONTO_LOJA} de desconto por enquanto</span>
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>Pro</h3>
          <p className="mt-1 text-sm text-creme/80">Tudo liberado, com 1 loja.</p>
          <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="mono mb-1.5 text-creme/60 line-through" style={{ fontSize: 22 }}>R$ {PRECO_LOJA_CHEIO}</span>
            <span className="mono" style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ {PRECO_LOJA}</span>
            <span className="mb-2 text-sm text-creme/70">/mês</span>
          </div>
          <div className="mt-4 rounded-botao border border-white/15 bg-white/8 px-3.5 py-2.5 text-sm">
            <span className="font-bold">Expansão</span> <span className="text-creme/70">· opcional</span>
            <div className="text-creme/80">+ R$ {PRECO_EXPANSAO}/mês por loja a mais.</div>
          </div>
          <p className="mt-2 text-xs text-creme/70">Preço de lançamento. Quem assina agora trava esse valor.</p>
          <Link to="/criar" className="mt-auto rounded-botao bg-sol px-4 py-3 text-center text-sm font-bold text-noite transition hover:brightness-95" style={{ marginTop: 28 }}>Testar 14 dias de graça</Link>
          <p className="mt-3 text-center text-xs text-creme/70">Pagamento seguro pelo Stripe, depois do teste.</p>
        </div>
      </div>
    </section>
  )
}

function FAQ() {
  const qs = [
    ['Preciso saber de contabilidade?', 'Não. A gente traduz tudo pra linguagem de balcão: entrou, saiu, sobrou. Jargão só na página de DRE, pro seu contador.'],
    ['Precisa conectar o iFood?', 'Não. Você tira foto das notas e digita o fechamento do dia, apps incluídos. A integração automática com iFood e Uber Eats está chegando.'],
    ['Minha equipe vê meu lucro?', 'Só quem você deixar. O gerente vê o CMV e o estoque, mas não vê o lucro, a folha nem o faturamento total.'],
    ['Meus dados ficam seguros?', 'Ficam criptografados e são seus. Cancela quando quiser e leva tudo junto. Seguimos a LGPD.'],
    ['Quanto custa e como é cobrado?', 'O Pro custa R$ 149 por mês com 1 loja (de R$ 249, com R$ 100 de desconto por enquanto). Tem mais lojas? A Expansão, opcional, soma R$ 79 por loja a mais: duas lojas, R$ 228. A cobrança é pelo Stripe, só depois dos 14 dias de teste.'],
    ['E o PDV e o CMV por ficha técnica?', 'Estão em construção e entram como “em breve”, fora do Pro. O que está nas telas acima já funciona hoje.'],
    ['Quanto tempo leva pra configurar?', '40 segundos pro cadastro. O resto você resolve com uma foto ou importando a sua planilha.'],
  ]
  return (
    <section id="duvidas" className="border-y border-divisoria bg-superficie/60">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <span className="rotulo text-telhado">Dúvidas</span>
        <h2 className="mt-2" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.025em' }}>O que todo dono pergunta antes de assinar</h2>
        <p className="mt-2 text-tinta-3">Ficou outra coisa na cabeça? Chama no WhatsApp que a gente responde de gente pra gente.</p>
        <div className="mt-8 flex flex-col gap-3">
          {qs.map(([q, a]) => (
            <details key={q} className="group rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-4">
              <summary className="flex cursor-pointer items-center justify-between text-[15px] font-bold text-tinta">
                {q}
                <span className="text-tinta-4 transition group-open:rotate-45">+</span>
              </summary>
              <p className="pretty mt-2 text-sm text-tinta-3">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTAFinal() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-20 text-center">
      <h2 className="pretty mx-auto max-w-2xl" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em' }}>
        Começa hoje e na segunda você já recebe o primeiro recado
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-tinta-3">Cadastro em 40 segundos, sem cartão. Se não valer a pena, você sai levando seus dados.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/criar" className="rounded-botao bg-telhado px-6 py-3.5 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95">Testar de graça por 14 dias</Link>
        <a href="#" className="inline-flex items-center gap-1.5 rounded-botao border border-[rgba(46,95,115,0.2)] bg-superficie px-6 py-3.5 text-sm font-bold text-tinta-2 hover:border-mata/60">Falar no WhatsApp <ArrowRight size={15} /></a>
      </div>
    </section>
  )
}

const DESTINOS_RODAPE: Record<string, string> = {
  Blog: '/blog',
  'Sistema para restaurante': '/blog/sistema-para-restaurante',
  'Taxa do iFood': '/blog/taxa-do-ifood',
  'Como calcular o CMV': '/blog/como-calcular-cmv-restaurante',
  'Materiais grátis': '/recursos',
}

function Rodape() {
  const cols: [string, string[]][] = [
    ['Produto', ['Como funciona', 'Funcionalidades', 'Preço', 'Pro contador']],
    ['Aprenda', ['Blog', 'Sistema para restaurante', 'Taxa do iFood', 'Como calcular o CMV', 'Materiais grátis']],
    ['Ajuda', ['Central de dúvidas', 'WhatsApp', 'Status do sistema']],
    ['Legal', ['Termos de uso', 'Privacidade e LGPD', 'Segurança']],
  ]
  return (
    <footer className="border-t border-divisoria bg-fundo-app">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 tab:grid-cols-5">
          <div>
            <Logo tom="escuro" tamanho={18} />
            <p className="pretty mt-3 max-w-[220px] text-sm text-tinta-3">Gestão financeira para quem cozinha.</p>
          </div>
          {cols.map(([t, links]) => (
            <div key={t}>
              <div className="rotulo text-tinta-4">{t}</div>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-tinta-2">
                {links.map((l) => <li key={l}><a href={DESTINOS_RODAPE[l] ?? '#'} className="hover:text-tinta">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-divisoria pt-6 text-xs text-tinta-4">
          tanocaixa.com · Rio de Janeiro, RJ. Gestão financeira para quem cozinha. · Fotos de cozinha: Pexels (uso livre).
        </div>
      </div>
    </footer>
  )
}
