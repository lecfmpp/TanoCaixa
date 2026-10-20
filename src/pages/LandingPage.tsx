import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Camera, ArrowRight, Star } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { fotos } from '@/lib/fotos'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { DESCONTO_LOJA, PRECO_LOJA, PRECO_LOJA_CHEIO } from '@/data/preco'
import { cn } from '@/lib/cn'

/* Landing pública — tanocaixa.com. Fiel ao Landing.dc.html. */
export function LandingPage() {
  return (
    <div className="min-h-dvh bg-fundo-app text-tinta">
      <Nav />
      <Hero />
      <Problema />
      <ComoFunciona />
      <Funcionalidades />
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
          <a href="#painel" className="hover:text-tinta">Funcionalidades</a>
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
      <TelaReal src="/landing/dashboard.webp" alt="Dashboard do Tá no Caixa com o resultado do mês, metas e caminho até o ponto de equilíbrio" />
    </section>
  )
}

/** Print real do app (modo demonstração, restaurante de exemplo) numa moldura de navegador. */
function TelaReal({ src, alt, prioridade = false }: { src: string; alt: string; prioridade?: boolean }) {
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
        <img src={src} alt={alt} width={1400} height={Math.round(1400 * 1350 / 1806)} loading={prioridade ? 'eager' : 'lazy'} className="block h-auto w-full" />
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
    ['Lança o dia em um minuto', 'Pix, cartão, dinheiro e apps de delivery num formulário só. Integração automática com apps e maquininha: em breve.'],
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
          <div className="mt-3 grid gap-4 cel:grid-cols-2">
            {[
              ['PDV', 'Frente de caixa pra mesa, balcão e delivery, com tela de cozinha (KDS). As vendas caem direto no caixa do dia.'],
              ['CMV por ficha técnica', 'Custo de cada prato calculado pelos insumos e pelo preço da última nota. Hoje o CMV já aparece no DRE; a ficha técnica vem aí.'],
            ].map(([t, d]) => (
              <div key={t} className="rounded-cartao border border-dashed border-[rgba(46,95,115,0.3)] bg-superficie p-5">
                <div className="flex items-center gap-2"><h3 className="text-[15px] font-bold text-tinta">{t}</h3><SeloEmBreve /></div>
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
      <h2 className="mt-2" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em' }}>Um plano só, por loja</h2>
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
          <h3 style={{ fontSize: 20, fontWeight: 800 }}>Por loja</h3>
          <p className="mt-1 text-sm text-creme/80">Duas lojas? É só multiplicar por dois.</p>
          <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="mono mb-1.5 text-creme/60 line-through" style={{ fontSize: 22 }}>R$ {PRECO_LOJA_CHEIO}</span>
            <span className="mono" style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ {PRECO_LOJA}</span>
            <span className="mb-2 text-sm text-creme/70">/loja/mês</span>
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
    ['Precisa conectar o iFood?', 'Não. Você tira foto das notas e digita o fechamento do dia, apps incluídos. A integração automática com os apps está chegando.'],
    ['Minha equipe vê meu lucro?', 'Só quem você deixar. O gerente vê o CMV e o estoque, mas não vê o lucro, a folha nem o faturamento total.'],
    ['Meus dados ficam seguros?', 'Ficam criptografados e são seus. Cancela quando quiser e leva tudo junto. Seguimos a LGPD.'],
    ['Quanto custa e como é cobrado?', 'R$ 149 por loja, por mês (de R$ 249, com R$ 100 de desconto por enquanto). Duas lojas, R$ 298. A cobrança é pelo Stripe, só depois dos 14 dias de teste.'],
    ['E o PDV e o CMV por ficha técnica?', 'Estão em construção e entram como “em breve”, fora do plano de R$ 149. O que está nas telas acima já funciona hoje.'],
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

function Rodape() {
  const cols: [string, string[]][] = [
    ['Produto', ['Como funciona', 'Funcionalidades', 'Preço', 'Pro contador']],
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
