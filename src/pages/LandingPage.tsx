import { Link } from 'react-router-dom'
import { Check, Camera, ArrowRight, Star } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { fotos } from '@/lib/fotos'
import { cn } from '@/lib/cn'

/* Landing pública — tanocaixa.com. Fiel ao Landing.dc.html. */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-fundo-app text-tinta">
      <Nav />
      <Hero />
      <Problema />
      <ComoFunciona />
      <QuatroNumeros />
      <ServePraVoce />
      <NoBolso />
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
          <a href="#painel" className="hover:text-tinta">O que você vê</a>
          <a href="#preco" className="hover:text-tinta">Preço</a>
          <a href="#duvidas" className="hover:text-tinta">Dúvidas</a>
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
          Foto da nota, iFood e maquininha entrando sozinhos e um recado toda segunda com o que fazer. Zero planilha.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/criar" className="rounded-botao bg-telhado px-5 py-3 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95">
            Começar de graça por 14 dias
          </Link>
          <a href="#painel" className="rounded-botao border border-[rgba(46,95,115,0.2)] bg-superficie px-5 py-3 text-sm font-bold text-tinta-2 transition hover:border-mar/50">
            Ver o painel por dentro
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
      <PainelMock />
    </section>
  )
}

/** Mock do painel (prova visual). */
function PainelMock() {
  return (
    <div className="relative">
      <div className="foto-rio absolute -inset-4 -z-10 rounded-[28px] opacity-90" aria-hidden>
        <img src={fotos.cristo} alt="" />
      </div>
      <div className="rounded-cartao-g border border-[rgba(46,95,115,0.12)] bg-superficie p-5 shadow-cartao">
        <div className="flex items-center justify-between">
          <div>
            <div className="rotulo text-tinta-4">Sobrou até agora · julho</div>
            <div className="text-sm font-bold text-tinta">Zaatar Cozinha Árabe</div>
          </div>
          <span className="rounded-chip bg-mata/12 px-2 py-1 text-xs font-bold text-mata">+17,2%</span>
        </div>
        <div className="mono mt-3 text-mata" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ 8.140</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-cartao bg-preenchimento/50 p-3">
            <div className="rotulo text-tinta-4">Entrou</div>
            <div className="mono font-bold text-tinta">R$ 47.320</div>
          </div>
          <div className="rounded-cartao bg-preenchimento/50 p-3">
            <div className="rotulo text-tinta-4">Saiu</div>
            <div className="mono font-bold text-tinta">R$ 39.180</div>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-cartao bg-mar p-3.5 text-creme">
          <Check size={16} className="mt-0.5 shrink-0" strokeWidth={3} />
          <div>
            <div className="text-sm font-bold">Tá no caixa!</div>
            <div className="text-xs text-creme/80">R$ 486,30 entraram em Mercadoria. <span className="font-bold text-sol">Desfazer</span></div>
          </div>
        </div>
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
    ['Conecta uma vez', 'iFood, Rappi, maquininha e PDV. Depois disso o faturamento entra sozinho todo dia às 6 da manhã.'],
    ['Tira foto da nota', 'Fornecedor, itens, preços e categoria saem prontos em 5 segundos. Você só confere e confirma.'],
    ['Olha o painel em 3 segundos', 'Entrou, saiu, sobrou e quanto falta pro ponto de equilíbrio. Sem relatório pra rodar.'],
    ['Recebe o recado de segunda', 'Um e-mail curto com o que mudou na semana e uma coisa só pra fazer. No WhatsApp quando estoura um teto.'],
  ]
  return (
    <section id="como" className="mx-auto max-w-6xl px-5 py-16">
      <span className="rotulo text-telhado">Como funciona</span>
      <h2 className="pretty mt-2 max-w-2xl" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>
        Três coisas acontecem sozinhas. A quarta leva 40 segundos.
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

function QuatroNumeros() {
  const kpis = [
    ['Custo da comida (CMV)', '30,9%', 'Passou o teto de 30%. Vale rever o hortifrúti.', 'telha'],
    ['Ponto de equilíbrio', 'R$ 41.400', 'Virou no dia 21. Daqui pra frente é lucro.', 'mata'],
    ['Peso dos apps', '15,5%', 'R$ 7.340 em taxas. Empurre pedidos pro WhatsApp.', 'sol'],
    ['Custo da equipe', '23,0%', 'Dentro do combinado, sem hora extra.', 'mata'],
  ] as const
  return (
    <section id="painel" className="border-y border-divisoria bg-superficie/60">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <span className="rotulo text-telhado">O que você vê</span>
        <h2 className="pretty mt-2 max-w-2xl" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>
          Os quatro números que mandam no seu restaurante
        </h2>
        <p className="mt-2 max-w-xl text-tinta-3">Sem jargão. A gente escreve do jeito que se fala no balcão e sempre diz o que fazer com o número.</p>
        <div className="mt-10 grid gap-4 cel:grid-cols-2 tab:grid-cols-4">
          {kpis.map(([nome, valor, texto, cor]) => (
            <div key={nome} className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-5">
              <div className="rotulo text-tinta-4">{nome}</div>
              <div className={cn('mono mt-2', cor === 'telha' ? 'text-telha-alerta' : cor === 'mata' ? 'text-mata' : 'text-tinta')} style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>{valor}</div>
              <p className="pretty mt-2 text-sm text-tinta-3">{texto}</p>
            </div>
          ))}
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
        <div className="foto-rio filtro-sol relative overflow-hidden rounded-cartao-g p-8 text-creme">
          <img src={fotos.porDoSol} alt="" />
          <div className="pointer-events-none absolute inset-0 z-[2]" style={{ background: 'linear-gradient(180deg, rgba(22,48,58,.4), rgba(22,48,58,.7))' }} />
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

function NoBolso() {
  return (
    <section className="border-y border-divisoria bg-mar text-creme">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 py-14 tab:flex-row tab:items-center">
        <div>
          <span className="rotulo text-sol">No bolso</span>
          <h2 className="mt-2 max-w-md" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Baixe o app e lance a nota ali mesmo, no balcão</h2>
          <p className="pretty mt-2 max-w-md text-sm text-creme/80">Aponta a câmera pra baixar. Prefere não instalar nada? Funciona igual no navegador do celular.</p>
          <div className="mt-5 flex gap-3">
            <div className="rounded-botao bg-noite/40 px-4 py-2.5 text-sm"><div className="text-[10px] text-creme/70">Baixe na</div><div className="font-bold">App Store</div></div>
            <div className="rounded-botao bg-noite/40 px-4 py-2.5 text-sm"><div className="text-[10px] text-creme/70">Disponível no</div><div className="font-bold">Google Play</div></div>
          </div>
        </div>
        <div className="grid h-32 w-32 shrink-0 place-items-center rounded-cartao bg-creme text-mar"><Camera size={44} strokeWidth={1.5} /></div>
      </div>
    </section>
  )
}

function Preco() {
  const planos = [
    { titulo: 'Cozinha só', sub: 'Uma loja, você tocando sozinho', valor: '79', cta: 'Começar de graça', destaque: false },
    { titulo: 'Casa cheia', sub: 'Uma loja com equipe e gerente', valor: '149', cta: 'Testar 14 dias de graça', destaque: true },
    { titulo: 'Mais de uma casa', sub: 'De 2 a 5 lojas, com visão junta', valor: '299', cta: 'Falar com a gente', destaque: false },
  ]
  return (
    <section id="preco" className="mx-auto max-w-6xl px-5 py-16">
      <span className="rotulo text-telhado">Preço</span>
      <h2 className="mt-2" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>Menos que um dia de faturamento</h2>
      <p className="mt-2 text-tinta-3">14 dias de graça, sem cartão. Cancela quando quiser, leva seus dados junto.</p>
      <div className="mt-10 grid gap-4 tab:grid-cols-3">
        {planos.map((p) => (
          <div key={p.titulo} className={cn('flex flex-col rounded-cartao-g border p-6', p.destaque ? 'border-mar bg-mar text-creme shadow-cartao' : 'border-[rgba(46,95,115,0.12)] bg-superficie')}>
            {p.destaque && <span className="mb-3 self-start rounded-chip bg-sol px-2.5 py-1 text-xs font-bold text-noite">Mais escolhido</span>}
            <h3 style={{ fontSize: 20, fontWeight: 800 }}>{p.titulo}</h3>
            <p className={cn('mt-1 text-sm', p.destaque ? 'text-creme/80' : 'text-tinta-3')}>{p.sub}</p>
            <div className="mt-5 flex items-end gap-1">
              <span className="mono" style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ {p.valor}</span>
              <span className={cn('mb-2 text-sm', p.destaque ? 'text-creme/70' : 'text-tinta-4')}>/mês</span>
            </div>
            <Link to="/criar" className={cn('mt-6 rounded-botao px-4 py-2.5 text-center text-sm font-bold transition', p.destaque ? 'bg-sol text-noite hover:brightness-95' : 'bg-mar text-creme hover:bg-mar-escuro')}>{p.cta}</Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function FAQ() {
  const qs = [
    ['Preciso saber de contabilidade?', 'Não. A gente traduz tudo pra linguagem de balcão: entrou, saiu, sobrou. Jargão só na página de DRE, pro seu contador.'],
    ['E se eu não conectar o iFood?', 'Funciona mesmo assim. Você tira foto das notas e digita o fechamento do dia. Conectar só tira o trabalho.'],
    ['Minha equipe vê meu lucro?', 'Só quem você deixar. O gerente vê o CMV e o estoque, mas não vê o lucro, a folha nem o faturamento total.'],
    ['Meus dados ficam seguros?', 'Ficam criptografados e são seus. Cancela quando quiser e leva tudo junto. Seguimos a LGPD.'],
    ['Quanto tempo leva pra configurar?', '40 segundos pro cadastro. O resto o app puxa sozinho das integrações ou você resolve com uma foto.'],
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

function Rodape() {
  const cols: [string, string[]][] = [
    ['Produto', ['Como funciona', 'O que você vê', 'Preço', 'Integrações', 'Pro contador']],
    ['Ajuda', ['Central de dúvidas', 'WhatsApp', 'Status do sistema']],
    ['Legal', ['Termos de uso', 'Privacidade e LGPD', 'Segurança']],
  ]
  return (
    <footer className="border-t border-divisoria bg-fundo-app">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 tab:grid-cols-4">
          <div>
            <Logo tom="escuro" tamanho={18} />
            <p className="pretty mt-3 max-w-[220px] text-sm text-tinta-3">Gestão financeira para quem cozinha.</p>
          </div>
          {cols.map(([t, links]) => (
            <div key={t}>
              <div className="rotulo text-tinta-4">{t}</div>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-tinta-2">
                {links.map((l) => <li key={l}><a href="#" className="hover:text-tinta">{l}</a></li>)}
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
