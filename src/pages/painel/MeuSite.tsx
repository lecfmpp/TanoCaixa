import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, ImagePlus, MessageSquareQuote, Plus, Star, Trash2, EyeOff } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { Cartao } from '@/components/ui/Cartao'
import { useAuth } from '@/auth/AuthContext'
import { useSiteLiberado } from '@/auth/site'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { CelebracaoSite } from '@/components/site/CelebracaoSite'
import { useUI } from '@/ui/UIProvider'
import { usePratos, useTenant } from '@/data/hooks'
import { enviarImagemDoSite, mesmoConteudo, subdominioLivre, useDespublicarSite, usePublicarSite, useSalvarSite, useSite } from '@/data/site'
import { mensagemDeErro } from '@/lib/erros'
import { cn } from '@/lib/cn'
import {
  APPS,
  AVALIACOES_MAX,
  DOMINIO_SITES,
  PAGAMENTOS_SUGERIDOS,
  PALETAS,
  PROMO_TITULO_MAX,
  SECOES,
  agoraSP,
  erroLinkApp,
  erroSubdominio,
  erroWhatsapp,
  errosParaPublicar,
  montarItens,
  novaLoja,
  siglaDe,
  type AppId,
  type AvaliacaoItem,
  type LojaSite,
  type PaletaId,
  type SiteConfig,
} from '@site/modelo'
import { renderLinks, renderSite } from '@site/render'

type Previa = 'celular' | 'links' | 'computador'
/** Domínios: fonte encolhe no celular e o texto nunca passa de 2 linhas. */
const CLS_DOMINIO = 'line-clamp-2 text-[clamp(10px,3.1vw,13px)] leading-snug [overflow-wrap:anywhere]'
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const NOMES_DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/* ------------------------------ Peças pequenas ----------------------------- */

function Bloco({ titulo, dica, children }: { titulo: string; dica?: string; children: ReactNode }) {
  return (
    <Cartao className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-tinta">{titulo}</h2>
        {dica && <span className="text-xs text-tinta-4">{dica}</span>}
      </div>
      {children}
    </Cartao>
  )
}

function Entrada(props: React.InputHTMLAttributes<HTMLInputElement> & { erro?: string | null; rotulo?: string; contador?: string }) {
  const { erro, rotulo, contador, className, ...resto } = props
  return (
    <label className="flex min-w-0 flex-col gap-1">
      {rotulo && <span className="text-xs font-semibold text-tinta-3">{rotulo}</span>}
      <span
        className={cn(
          'flex items-center rounded-campo border bg-superficie px-3 focus-within:border-mar focus-within:ring-2 focus-within:ring-mar/15',
          erro ? 'border-telha-alerta/60' : 'border-[rgba(46,95,115,0.14)]',
        )}
      >
        <input className={cn('w-full min-w-0 bg-transparent py-2 text-sm text-tinta outline-none placeholder:text-tinta-5', className)} {...resto} />
        {contador && <span className="ml-2 shrink-0 font-mono text-xs text-tinta-4">{contador}</span>}
      </span>
      {erro && <span className="text-xs text-telha-alerta">{erro}</span>}
    </label>
  )
}

function Segmento<T extends string>({ valor, opcoes, aoTrocar }: { valor: T; opcoes: { id: T; rotulo: string }[]; aoTrocar: (v: T) => void }) {
  return (
    <div className="inline-flex w-full rounded-botao bg-preenchimento p-1">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => aoTrocar(o.id)}
          className={cn(
            'min-w-0 flex-1 rounded-[10px] px-1.5 py-1.5 text-[12px] font-bold leading-tight transition [overflow-wrap:anywhere] sm:px-3 sm:text-sm',
            valor === o.id ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta',
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

/** Endereço com link clicável (quando no ar) e botão de copiar. */
function LinhaLink({ rotulo, url, noAr }: { rotulo: string; url: string; noAr: boolean }) {
  const [copiado, setCopiado] = useState(false)
  const texto = url.replace(/^https:\/\//, '')
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      /* sem permissão de área de transferência */
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-campo bg-preenchimento/60 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-tinta-4">{rotulo}</div>
        {noAr ? (
          <a href={url} target="_blank" rel="noopener" className={cn(CLS_DOMINIO, 'font-bold text-mar underline decoration-mar/30 underline-offset-2 hover:decoration-mar')}>
            {texto}
          </a>
        ) : (
          <span className={cn(CLS_DOMINIO, 'font-bold text-tinta-3')}>{texto}</span>
        )}
      </div>
      {noAr && (
        <a href={url} target="_blank" rel="noopener" aria-label={`Abrir ${rotulo.toLowerCase()}`} title="Abrir" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-mar hover:bg-mar/10">
          <ExternalLink size={16} />
        </a>
      )}
      <button type="button" onClick={copiar} aria-label={`Copiar ${rotulo.toLowerCase()}`} title="Copiar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-mar hover:bg-mar/10">
        {copiado ? <Check size={16} className="text-mata" /> : <Copy size={16} />}
      </button>
    </div>
  )
}

/** Botão de upload que reduz a imagem e devolve a URL. */
function Upload({
  url,
  aoEnviar,
  nome,
  maxLado,
  className,
  vazio,
  redondo,
}: {
  url: string
  aoEnviar: (url: string) => void
  nome: string
  maxLado: number
  className?: string
  vazio: ReactNode
  redondo?: boolean
}) {
  const t = useTenant()
  const { adicionarToast } = useUI()
  const input = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  async function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setEnviando(true)
    try {
      aoEnviar(await enviarImagemDoSite(t, f, nome, maxLado))
    } catch (err) {
      adicionarToast({ tipo: 'sistema', titulo: 'Não deu pra enviar a imagem', texto: mensagemDeErro(err, 'Tenta de novo em instantes.') })
    } finally {
      setEnviando(false)
    }
  }
  return (
    <button
      type="button"
      onClick={() => input.current?.click()}
      className={cn(
        'group relative flex items-center justify-center overflow-hidden border border-dashed border-[rgba(46,95,115,0.25)] bg-preenchimento text-xs text-tinta-3 hover:border-mar',
        redondo ? 'rounded-full' : 'rounded-campo',
        className,
      )}
      aria-label={url ? 'Trocar imagem' : 'Enviar imagem'}
    >
      {url ? <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" /> : vazio}
      {enviando && <span className="absolute inset-0 flex items-center justify-center bg-white/70 font-semibold text-tinta">Enviando…</span>}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={escolher} />
    </button>
  )
}

/* --------------------------------- Prévia ---------------------------------- */

function JanelaPrevia({ html, modo }: { html: string; modo: Previa }) {
  const caixa = useRef<HTMLDivElement>(null)
  const [larg, setLarg] = useState(600)
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    const ro = new ResizeObserver(() => setLarg(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [modo])
  // Troca o srcdoc só depois de uma pausa na digitação (evita piscar a cada letra).
  const [doc, setDoc] = useState(html)
  useEffect(() => {
    const id = setTimeout(() => setDoc(html), 250)
    return () => clearTimeout(id)
  }, [html])

  if (modo === 'computador') {
    const escala = Math.min(1, larg / 1280)
    return (
      <div ref={caixa} className="w-full overflow-hidden rounded-[14px] border border-[rgba(46,95,115,0.14)] bg-white" style={{ height: 820 * escala }}>
        <iframe title="Prévia do site no computador" srcDoc={doc} sandbox="allow-scripts allow-popups" style={{ width: 1280, height: 820, border: 0, transform: `scale(${escala})`, transformOrigin: '0 0' }} />
      </div>
    )
  }
  return (
    <div ref={caixa} className="flex w-full justify-center">
      <div className="overflow-hidden rounded-[34px] border-[6px] border-tinta bg-white shadow-cartao" style={{ width: 390 + 12, height: 780 }}>
        <iframe title={modo === 'links' ? 'Prévia da página de links' : 'Prévia do site no celular'} srcDoc={doc} sandbox="allow-scripts allow-popups" style={{ width: 390, height: 768, border: 0 }} />
      </div>
    </div>
  )
}

/* ---------------------------------- Página ---------------------------------- */

/** Trava de teste: fora da lista de contas liberadas, volta para o painel. */
export function MeuSite() {
  const liberado = useSiteLiberado()
  const { carregando } = useAuth()
  if (carregando) return null
  if (!liberado) return <Navigate to="/painel" replace />
  return <TelaMeuSite />
}

function TelaMeuSite() {
  const t = useTenant()
  const site = useSite()
  const pratosQ = usePratos().data
  const pratos = useMemo(() => pratosQ ?? [], [pratosQ])
  const salvar = useSalvarSite()
  const publicar = usePublicarSite()
  const despublicar = useDespublicarSite()
  const { adicionarToast, confirmar } = useUI()
  const [cfg, setCfg] = useState<SiteConfig | null>(null)
  const [previa, setPrevia] = useState<Previa>('celular')
  const [livre, setLivre] = useState<boolean | 'erro' | null>(null)
  const [celula, setCelula] = useState<{ loja: string; app: AppId } | null>(null)
  const [avAberto, setAvAberto] = useState<string | null>(null)
  // Em desenvolvimento, ?comemorar abre a comemoração para ajustar o visual.
  const [festa, setFesta] = useState<{ url: string; emitindo: boolean } | null>(() =>
    import.meta.env.DEV && new URLSearchParams(window.location.search).has('comemorar') ? { url: 'https://faustoburger.tanocaixa.com.br', emitindo: true } : null,
  )

  // Carrega o rascunho uma vez; depois o que vale é o que a pessoa edita.
  useEffect(() => {
    if (site.data && !cfg) setCfg(site.data.config)
  }, [site.data, cfg])

  // Salva o rascunho sozinho, com uma pausa depois da última edição.
  const primeiro = useRef(true)
  useEffect(() => {
    if (!cfg) return
    if (primeiro.current) {
      primeiro.current = false
      return
    }
    const id = setTimeout(() => salvar.mutate(cfg), 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg])

  // Endereço livre? (lê sites/{sub}, que é público)
  const sub = cfg?.subdominio ?? ''
  const erroSub = cfg ? erroSubdominio(sub) : null
  useEffect(() => {
    if (!sub || erroSub) {
      setLivre(null)
      return
    }
    let vivo = true
    setLivre(null)
    const id = setTimeout(() => {
      subdominioLivre(sub, t)
        .then((ok) => vivo && setLivre(ok))
        .catch(() => vivo && setLivre('erro'))
    }, 400)
    return () => {
      vivo = false
      clearTimeout(id)
    }
  }, [sub, erroSub, t])

  const itens = useMemo(() => (cfg ? montarItens(pratos, cfg.itens) : []), [pratos, cfg])
  const dominio = `${sub || 'seurestaurante'}.${DOMINIO_SITES}`
  const html = useMemo(() => {
    if (!cfg) return ''
    const dados = { config: cfg, itens }
    const o = { dominio, previa: true }
    return previa === 'links' ? renderLinks(dados, o) : renderSite(dados, o)
  }, [cfg, itens, previa, dominio])

  if (!cfg) {
    return <div className="p-8 text-sm text-tinta-3">{site.isError ? 'Não deu pra carregar o site.' : 'Carregando…'}</div>
  }

  const mudar = (p: Partial<SiteConfig>) => setCfg((c) => (c ? { ...c, ...p } : c))
  const mudarLoja = (id: string, p: Partial<LojaSite>) => mudar({ lojas: cfg.lojas.map((l) => (l.id === id ? { ...l, ...p } : l)) })
  const mudarItem = (id: string, p: { fotoUrl?: string; destaque?: boolean; oculto?: boolean; avaliacoes?: AvaliacaoItem[] }) =>
    mudar({ itens: { ...cfg.itens, [id]: { ...cfg.itens[id], ...p } } })

  const publicadoCfg = site.data?.publicado?.config
  const pendente =
    !site.data?.publicado ||
    !mesmoConteudo(publicadoCfg, cfg) ||
    !mesmoConteudo(site.data.publicado.itensIds ?? [], itens.map((i) => i.id))
  const noAr = !!site.data?.publicado?.ativo
  const urlSite = noAr ? `https://${site.data!.publicado!.subdominio}.${DOMINIO_SITES}` : ''
  const errosPub = errosParaPublicar(cfg)
  const ocupado = publicar.isPending || despublicar.isPending

  /** Confere o que dá pra conferir e pede confirmação antes de pôr no ar. */
  function pedirPublicar() {
    if (!cfg) return
    if (errosPub.length) {
      adicionarToast({ tipo: 'atencao', titulo: 'Falta ajustar antes de publicar', texto: errosPub[0] })
      return
    }
    if (livre === false) {
      adicionarToast({ tipo: 'atencao', titulo: 'Endereço em uso', texto: 'Escolha outro endereço para o site.' })
      return
    }
    const onde = `${cfg.subdominio}.${DOMINIO_SITES}`
    confirmar(
      noAr
        ? {
            gravidade: 'neutro',
            titulo: 'Publicar as alterações?',
            texto: 'O que está na prévia substitui o site que está no ar. As mudanças aparecem em até 1 minuto.',
            rotuloConfirmar: 'Publicar alterações',
            onConfirmar: () => void publicarAgora(),
          }
        : {
            gravidade: 'atencao',
            titulo: 'Publicar o site?',
            texto: 'O site fica aberto para qualquer pessoa, do jeito que está na prévia. Dá pra tirar do ar quando quiser.',
            resumo: [
              { rot: 'Endereço', val: onde },
              { rot: 'Lojas', val: String(cfg.lojas.length) },
              { rot: 'Itens do cardápio', val: String(itens.length) },
            ],
            rotuloConfirmar: 'Publicar',
            onConfirmar: () => void publicarAgora(),
          },
    )
  }

  function pedirDespublicar() {
    const onde = `${site.data?.publicado?.subdominio}.${DOMINIO_SITES}`
    confirmar({
      gravidade: 'destrutivo',
      titulo: 'Tirar o site do ar?',
      texto: 'Quem abrir o endereço vai ver "site não encontrado". O que você configurou e o endereço ficam guardados: é só publicar de novo para voltar.',
      resumo: [{ rot: 'Endereço', val: onde }],
      rotuloConfirmar: 'Tirar do ar',
      onConfirmar: () =>
        void despublicar
          .mutateAsync()
          .then(() => adicionarToast({ tipo: 'sucesso', titulo: 'Site fora do ar', texto: 'Pode levar até 1 minuto para sumir de vez.' }))
          .catch((err) => adicionarToast({ tipo: 'erro', titulo: 'Não deu pra tirar do ar', texto: mensagemDeErro(err, 'Tenta de novo em instantes.') })),
    })
  }

  async function publicarAgora() {
    if (!cfg) return
    const primeiraVez = !site.data?.publicado // nunca publicou: comemora
    try {
      await salvar.mutateAsync(cfg) // garante que o servidor publica o que está na tela
      const r = await publicar.mutateAsync()
      if (primeiraVez && r.dominio !== 'erro') {
        setFesta({ url: r.url, emitindo: r.dominio === 'emitindo' })
        return
      }
      adicionarToast(
        r.dominio === 'ativo'
          ? { tipo: 'sucesso', titulo: 'Site publicado', texto: 'As mudanças aparecem em até 1 minuto.' }
          : r.dominio === 'emitindo'
            ? { tipo: 'sucesso', titulo: 'Site publicado', texto: 'O endereço está sendo ativado. Na primeira vez leva de 5 a 30 minutos.' }
            : { tipo: 'atencao', titulo: 'Site salvo, endereço pendente', texto: 'Não deu pra ativar o endereço agora. Publique de novo daqui a pouco.' },
      )
    } catch (err) {
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra publicar', texto: String((err as { code?: string }).code ?? '').startsWith('functions/') ? (err as Error).message : mensagemDeErro(err, 'Tenta de novo em instantes.') })
    }
  }

  function fecharFesta() {
    setFesta(null)
  }

  function mover(i: number, dir: -1 | 1) {
    const s = [...cfg!.secoes]
    const j = i + dir
    if (j < 0 || j >= s.length) return
    ;[s[i], s[j]] = [s[j], s[i]]
    mudar({ secoes: s })
  }

  function editarPromo(p: Partial<SiteConfig['promo']>) {
    // Mexeu no texto: a promo passa a valer hoje (some sozinha à meia-noite).
    mudar({ promo: { ...cfg!.promo, ...p, dia: agoraSP().data } })
  }

  // No ar: o endereço publicado; antes disso, o que está sendo digitado.
  const dominioLinks = noAr ? `${site.data!.publicado!.subdominio}.${DOMINIO_SITES}` : dominio

  const statusLinha = noAr ? (pendente ? 'No ar · alterações não publicadas' : 'No ar · tudo publicado') : 'Não publicado · só você vê a prévia'

  return (
    <div className="flex flex-col gap-4">
      {festa && <CelebracaoSite url={festa.url} emitindo={festa.emitindo} aoFechar={fecharFesta} />}
      {/* Cabeçalho */}
      <div className="relative overflow-clip rounded-cartao-g bg-mar px-5 py-5 text-creme sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-14 h-36 w-36 rounded-full bg-sol" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="min-w-[220px] flex-1">
            <h1 className="text-2xl font-extrabold tracking-tight">Meu site</h1>
            <p className="mt-0.5 flex items-center gap-2 text-[13px] text-creme/80 sm:text-sm">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', noAr ? (pendente ? 'bg-sol' : 'bg-[#7fd39b]') : 'bg-creme/50')} />
              <span className="line-clamp-2">
                {statusLinha}
                {salvar.isPending && <span className="text-creme/60"> · salvando…</span>}
              </span>
            </p>
            {noAr && (
              <a href={urlSite} target="_blank" rel="noopener" className={cn(CLS_DOMINIO, 'mt-0.5 font-bold text-creme underline decoration-creme/40 underline-offset-2 hover:decoration-creme')}>
                {site.data!.publicado!.subdominio}.{DOMINIO_SITES}
              </a>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Publicado / não publicado: sempre com confirmação */}
            <label className={cn('inline-flex items-center gap-2.5 rounded-botao bg-white/10 px-3.5 py-2 text-sm font-bold', ocupado && 'opacity-60')}>
              <span>{despublicar.isPending ? 'Tirando do ar…' : publicar.isPending ? 'Publicando…' : noAr ? 'Publicado' : 'Não publicado'}</span>
              <Switch ligado={noAr} rotulo="Site publicado" aoTrocar={(v) => !ocupado && (v ? pedirPublicar() : pedirDespublicar())} />
            </label>
            {urlSite && (
              <a href={urlSite} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-botao border border-creme/40 px-4 py-2.5 text-sm font-bold hover:bg-white/10">
                Ver site <ExternalLink size={14} />
              </a>
            )}
            {noAr && pendente && (
              <Button variante="lancar" onClick={pedirPublicar} disabled={ocupado}>
                Publicar alterações
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 tab:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Endereço */}
          <Bloco titulo="Endereço">
            <div
              className={cn(
                'flex items-center rounded-campo border bg-superficie px-3 text-[13px] sm:text-sm focus-within:border-mar focus-within:ring-2 focus-within:ring-mar/15',
                erroSub || livre === false ? 'border-telha-alerta/60' : 'border-[rgba(46,95,115,0.14)]',
              )}
            >
              <span className="hidden text-tinta-4 sm:inline">https://</span>
              <input
                value={sub}
                onChange={(e) => mudar({ subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) })}
                className="w-full min-w-0 bg-transparent py-2.5 font-bold text-tinta outline-none"
                aria-label="Endereço do site"
                spellCheck={false}
              />
              <span className="shrink-0 text-[11px] text-tinta-4 sm:text-sm">.{DOMINIO_SITES}</span>
            </div>
            <div className="text-xs">
              {erroSub ? (
                <span className="text-telha-alerta">{erroSub}</span>
              ) : livre === false ? (
                <span className="text-telha-alerta">Esse endereço já é de outro restaurante.</span>
              ) : livre === 'erro' ? (
                <span className="text-tinta-4">Não deu pra conferir agora. A gente confere de novo ao publicar.</span>
              ) : livre ? (
                <span className="text-mata">Endereço disponível.</span>
              ) : (
                <span className="text-tinta-4">Verificando…</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <LinhaLink rotulo="Site" url={`https://${dominioLinks}`} noAr={noAr} />
              <LinhaLink rotulo="Página de links" url={`https://${dominioLinks}/links`} noAr={noAr} />
              {!noAr && <p className="text-[11px] text-tinta-4">Os links abrem depois que o site for publicado.</p>}
            </div>
          </Bloco>

          {/* Marca */}
          <Bloco titulo="Marca">
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-1">
                <Upload
                  url={cfg.logoUrl}
                  aoEnviar={(u) => mudar({ logoUrl: u })}
                  nome="logo"
                  maxLado={400}
                  redondo
                  className="h-24 w-24"
                  vazio={<span className="flex flex-col items-center gap-1"><ImagePlus size={18} />Logo</span>}
                />
                {cfg.logoUrl && <button type="button" className="text-[11px] text-tinta-4 hover:text-telha-alerta" onClick={() => mudar({ logoUrl: '' })}>remover</button>}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Upload
                  url={cfg.capaUrl}
                  aoEnviar={(u) => mudar({ capaUrl: u })}
                  nome="capa"
                  maxLado={1600}
                  className="h-24 w-full"
                  vazio={<span className="flex flex-col items-center gap-1"><ImagePlus size={18} />Foto de capa</span>}
                />
                <span className="text-[11px] text-tinta-4">Foto de capa · use o prato que mais vende</span>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_88px] gap-2">
              <Entrada rotulo="Nome" value={cfg.nome} onChange={(e) => mudar({ nome: e.target.value, sigla: siglaDe(e.target.value) })} maxLength={40} />
              <Entrada rotulo="Sigla" value={cfg.sigla} onChange={(e) => mudar({ sigla: e.target.value.toUpperCase().slice(0, 3) })} />
            </div>
            <Entrada rotulo="Frase curta" value={cfg.slogan} placeholder="Ex.: Smash na chapa e pão brioche desde 2014." onChange={(e) => mudar({ slogan: e.target.value })} maxLength={90} />
            <span className="text-xs font-semibold text-tinta-3">Cores</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(PALETAS) as PaletaId[]).map((k) => {
                const p = PALETAS[k]
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => mudar({ paleta: k })}
                    className={cn('flex flex-col gap-1.5 rounded-campo border bg-superficie p-2 text-left text-xs font-semibold', cfg.paleta === k ? 'border-mar ring-2 ring-mar/20' : 'border-[rgba(46,95,115,0.14)]')}
                    aria-pressed={cfg.paleta === k}
                  >
                    <span className="flex h-6 overflow-hidden rounded-md border border-black/5">
                      <span className="flex-1" style={{ background: p.bg }} />
                      <span className="flex-[1.4]" style={{ background: p.pri }} />
                      <span className="flex-[0.7]" style={{ background: p.acc }} />
                    </span>
                    {p.nome}
                  </button>
                )
              })}
            </div>
          </Bloco>

          {/* Estilo */}
          <Bloco titulo="Estilo">
            <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-2 text-sm text-tinta-2 sm:grid-cols-[80px_minmax(0,1fr)] sm:gap-3">
              <span>Cardápio</span>
              <Segmento valor={cfg.cardapioModo} aoTrocar={(v) => mudar({ cardapioModo: v })} opcoes={[{ id: 'cards', rotulo: 'Cards com foto' }, { id: 'lista', rotulo: 'Lista compacta' }]} />
              <span>Cantos</span>
              <Segmento valor={cfg.cantos} aoTrocar={(v) => mudar({ cantos: v })} opcoes={[{ id: 'redondo', rotulo: 'Arredondados' }, { id: 'reto', rotulo: 'Retos' }]} />
            </div>
          </Bloco>

          {/* Seções */}
          <Bloco titulo="Seções e ordem" dica="a capa e o rodapé são fixos">
            <ol className="flex flex-col gap-2">
              {cfg.secoes.map((s, i) => (
                <li key={s.chave} className="flex items-center gap-3 rounded-campo border border-[rgba(46,95,115,0.1)] bg-superficie px-3 py-2">
                  <span className="font-mono text-xs text-tinta-4">{String(i + 1).padStart(2, '0')}</span>
                  <span className={cn('flex-1 text-sm font-semibold', !s.visivel && 'text-tinta-4')}>{SECOES.find((x) => x.chave === s.chave)?.nome}</span>
                  <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="flex h-8 w-8 items-center justify-center rounded-lg bg-preenchimento disabled:opacity-40" aria-label="Subir">
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" onClick={() => mover(i, 1)} disabled={i === cfg.secoes.length - 1} className="flex h-8 w-8 items-center justify-center rounded-lg bg-preenchimento disabled:opacity-40" aria-label="Descer">
                    <ArrowDown size={14} />
                  </button>
                  <Switch ligado={s.visivel} rotulo="Mostrar seção" aoTrocar={(v) => mudar({ secoes: cfg.secoes.map((x) => (x.chave === s.chave ? { ...x, visivel: v } : x)) })} />
                </li>
              ))}
            </ol>
          </Bloco>

          {/* Promoção */}
          <Bloco titulo="Promoção do dia">
            <Entrada
              placeholder="Nome da promoção (ex.: Terça do Smash)"
              value={cfg.promo.titulo}
              maxLength={PROMO_TITULO_MAX}
              contador={`${cfg.promo.titulo.length}/${PROMO_TITULO_MAX}`}
              onChange={(e) => editarPromo({ titulo: e.target.value.slice(0, PROMO_TITULO_MAX) })}
            />
            <Entrada placeholder="Oferta (ex.: 2 Clássicos por R$ 49,90)" value={cfg.promo.texto} onChange={(e) => editarPromo({ texto: e.target.value })} maxLength={70} />
            <Entrada placeholder="Regra (ex.: Só hoje, em todas as lojas e apps)" value={cfg.promo.regra} onChange={(e) => editarPromo({ regra: e.target.value })} maxLength={70} />
            <div className="flex items-center gap-3">
              <Upload url={cfg.promo.imagemUrl} aoEnviar={(u) => editarPromo({ imagemUrl: u })} nome="promo" maxLado={1400} className="h-16 w-24 shrink-0" vazio={<ImagePlus size={16} />} />
              <span className="text-xs text-tinta-4">Foto da promoção (sem foto, usa a capa). O texto fica sempre branco sobre um degradê escuro.</span>
            </div>
            <label className="flex items-center justify-between gap-3 text-sm text-tinta-2">
              <span>Repetir todo dia</span>
              <Switch ligado={cfg.promo.fixa} aoTrocar={(v) => mudar({ promo: { ...cfg.promo, fixa: v } })} rotulo="Repetir todo dia" />
            </label>
            <p className="text-xs text-tinta-4">
              {cfg.promo.fixa ? 'Aparece no site e na página de links todos os dias.' : 'Aparece no site e na página de links. Some sozinha à meia-noite.'}
            </p>
          </Bloco>

          {/* Lojas */}
          <Bloco titulo="Lojas" dica="horário, entrega e WhatsApp">
            {cfg.lojas.map((l) => (
              <div key={l.id} className="flex flex-col gap-2 rounded-campo border border-[rgba(46,95,115,0.1)] bg-superficie p-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Entrada rotulo="Nome da loja" value={l.nome} onChange={(e) => mudarLoja(l.id, { nome: e.target.value })} maxLength={30} />
                  </div>
                  {cfg.lojas.length > 1 && (
                    <button type="button" className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg text-tinta-4 hover:bg-preenchimento hover:text-telha-alerta" aria-label="Remover loja" onClick={() => mudar({ lojas: cfg.lojas.filter((x) => x.id !== l.id) })}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                <Entrada rotulo="Endereço" value={l.endereco} placeholder="Rua, número — bairro, cidade" onChange={(e) => mudarLoja(l.id, { endereco: e.target.value })} />
                <Entrada
                  rotulo="WhatsApp"
                  value={l.whatsapp}
                  placeholder="5521990000001"
                  inputMode="numeric"
                  erro={erroWhatsapp(l.whatsapp)}
                  onChange={(e) => mudarLoja(l.id, { whatsapp: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                />
                <div className="flex flex-wrap items-end gap-2">
                  <div className="grid w-full max-w-[252px] grid-cols-7 gap-1" role="group" aria-label="Dias abertos">
                    {DIAS.map((d, i) => {
                      const on = l.dias.includes(i)
                      return (
                        <button
                          key={i}
                          type="button"
                          title={NOMES_DIAS[i]}
                          aria-pressed={on}
                          onClick={() => mudarLoja(l.id, { dias: on ? l.dias.filter((x) => x !== i) : [...l.dias, i].sort() })}
                          className={cn('aspect-square w-full max-w-8 rounded-lg text-xs font-bold', on ? 'bg-mar text-creme' : 'bg-preenchimento text-tinta-4')}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                  <Entrada rotulo="Abre" type="time" value={l.abre} onChange={(e) => mudarLoja(l.id, { abre: e.target.value })} className="w-[84px]" />
                  <Entrada rotulo="Fecha" type="time" value={l.fecha} onChange={(e) => mudarLoja(l.id, { fecha: e.target.value })} className="w-[84px]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Entrada rotulo="Tempo de entrega" value={l.tempoEntrega} onChange={(e) => mudarLoja(l.id, { tempoEntrega: e.target.value })} maxLength={20} />
                  <Entrada rotulo="Taxa a partir de" value={l.taxa} onChange={(e) => mudarLoja(l.id, { taxa: e.target.value })} maxLength={20} />
                </div>
              </div>
            ))}
            <Button variante="secundario" onClick={() => mudar({ lojas: [...cfg.lojas, novaLoja(`Loja ${cfg.lojas.length + 1}`)] })}>
              <Plus size={15} /> Adicionar loja
            </Button>
          </Bloco>

          {/* Onde pedir */}
          <Bloco titulo="Onde pedir, por loja">
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th />
                    {APPS.map((a) => (
                      <th key={a.k} className="text-left text-xs font-bold text-tinta-2">{a.nome}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cfg.lojas.map((l) => (
                    <tr key={l.id}>
                      <td className="pr-2 font-bold text-tinta">{l.nome}</td>
                      {APPS.map((a) => {
                        const ok = !!l.apps[a.k] && !erroLinkApp(a.k, l.apps[a.k]!)
                        const aberta = celula?.loja === l.id && celula.app === a.k
                        return (
                          <td key={a.k}>
                            <button
                              type="button"
                              onClick={() => setCelula(aberta ? null : { loja: l.id, app: a.k })}
                              className={cn(
                                'w-full rounded-lg px-2 py-1.5 text-xs font-semibold',
                                ok ? 'bg-mata/10 text-mata' : l.apps[a.k] ? 'bg-telha-alerta/10 text-telha-alerta' : 'border border-[rgba(46,95,115,0.14)] bg-superficie text-tinta-4',
                                aberta && 'ring-2 ring-mar/30',
                              )}
                            >
                              {ok ? 'Conectado' : l.apps[a.k] ? 'Link inválido' : '+ link'}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {celula && (() => {
              const l = cfg.lojas.find((x) => x.id === celula.loja)
              const a = APPS.find((x) => x.k === celula.app)!
              if (!l) return null
              const v = l.apps[a.k] ?? ''
              return (
                <Entrada
                  autoFocus
                  rotulo={`Link da loja ${l.nome} no ${a.nome}`}
                  placeholder={`https://${a.dominios[0]}/…`}
                  value={v}
                  erro={erroLinkApp(a.k, v)}
                  onChange={(e) => mudarLoja(l.id, { apps: { ...l.apps, [a.k]: e.target.value.trim() || undefined } })}
                />
              )
            })()}
          </Bloco>

          {/* Cardápio */}
          <Bloco titulo="Cardápio no site" dica={`${itens.length} itens no site`}>
            <p className="text-xs text-tinta-4">Itens e preços vêm do seu Cardápio no Tá no Caixa. Aqui você põe a foto, marca os mais pedidos, cola avaliações de clientes e esconde o que não vai para o site. Tocar no prato abre os detalhes com as avaliações.</p>
            {pratos.filter((p) => p.ativo !== false).length === 0 && <p className="text-sm text-tinta-3">Nenhum prato ativo no Cardápio ainda.</p>}
            <ul className="flex max-h-[560px] flex-col gap-1.5 overflow-y-auto pr-1">
              {pratos
                .filter((p) => p.ativo !== false)
                .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome))
                .map((p) => {
                  const ex = cfg.itens[p.id] ?? {}
                  const avs = ex.avaliacoes ?? []
                  const mudarAv = (lista: AvaliacaoItem[]) => mudarItem(p.id, { avaliacoes: lista })
                  return (
                    <li key={p.id} className={cn('flex flex-col gap-2 rounded-campo border border-[rgba(46,95,115,0.1)] bg-superficie p-2', ex.oculto && 'opacity-50')}>
                    <div className="flex items-center gap-3">
                      <Upload url={ex.fotoUrl ?? ''} aoEnviar={(u) => mudarItem(p.id, { fotoUrl: u })} nome={`item-${p.id}`} maxLado={900} className="h-12 w-12 shrink-0" vazio={<ImagePlus size={14} />} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-tinta">{p.nome}</div>
                        <div className="text-xs text-tinta-4">{p.categoria} · R$ {p.preco.toFixed(2).replace('.', ',')}</div>
                      </div>
                      <button
                        type="button"
                        title="Mais pedido"
                        aria-pressed={!!ex.destaque}
                        onClick={() => mudarItem(p.id, { destaque: !ex.destaque })}
                        className={cn('flex h-8 w-8 items-center justify-center rounded-lg', ex.destaque ? 'bg-sol/30 text-insight-rotulo' : 'text-tinta-5 hover:bg-preenchimento')}
                      >
                        <Star size={15} fill={ex.destaque ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        type="button"
                        title={ex.oculto ? 'Mostrar no site' : 'Esconder do site'}
                        aria-pressed={!!ex.oculto}
                        onClick={() => mudarItem(p.id, { oculto: !ex.oculto })}
                        className={cn('flex h-8 w-8 items-center justify-center rounded-lg', ex.oculto ? 'bg-preenchimento text-tinta' : 'text-tinta-5 hover:bg-preenchimento')}
                      >
                        <EyeOff size={15} />
                      </button>
                      <button
                        type="button"
                        title="Avaliações deste prato"
                        aria-expanded={avAberto === p.id}
                        onClick={() => setAvAberto(avAberto === p.id ? null : p.id)}
                        className={cn('flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold', avs.length ? 'bg-mata/10 text-mata' : 'text-tinta-5 hover:bg-preenchimento')}
                      >
                        <MessageSquareQuote size={15} />
                        {avs.length || ''}
                      </button>
                    </div>
                    {avAberto === p.id && (
                      <div className="flex flex-col gap-2 border-t border-[rgba(46,95,115,0.1)] pt-2">
                        {avs.map((a, k) => {
                          const muda = (q: Partial<AvaliacaoItem>) => mudarAv(avs.map((x, j) => (j === k ? { ...x, ...q } : x)))
                          return (
                            <div key={k} className="flex flex-col gap-1.5 rounded-lg bg-preenchimento/60 p-2">
                              <div className="flex items-center gap-2">
                                <div className="flex" role="radiogroup" aria-label="Nota">
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <button key={n} type="button" role="radio" aria-checked={a.nota === n} aria-label={`${n} estrelas`} onClick={() => muda({ nota: n })} className={cn('px-0.5 text-lg leading-none', n <= a.nota ? 'text-[#F2B01E]' : 'text-tinta-5')}>
                                      ★
                                    </button>
                                  ))}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <Entrada placeholder="Nome (ex.: Ana, Realengo)" value={a.nome} maxLength={40} onChange={(e) => muda({ nome: e.target.value })} />
                                </div>
                                <button type="button" aria-label="Remover avaliação" className="flex h-8 w-8 items-center justify-center rounded-lg text-tinta-4 hover:text-telha-alerta" onClick={() => mudarAv(avs.filter((_, j) => j !== k))}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                              <textarea
                                value={a.texto}
                                maxLength={280}
                                rows={2}
                                placeholder="O que o cliente disse (ex.: Melhor smash da Zona Oeste, chegou quentinho!)"
                                onChange={(e) => muda({ texto: e.target.value })}
                                className="w-full rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3 py-2 text-sm text-tinta outline-none focus:border-mar"
                              />
                            </div>
                          )
                        })}
                        {avs.length < AVALIACOES_MAX && (
                          <Button variante="secundario" onClick={() => mudarAv([...avs, { nome: '', nota: 5, texto: '' }])}>
                            <Plus size={14} /> Adicionar avaliação
                          </Button>
                        )}
                        <p className="text-[11px] text-tinta-4">Use avaliações reais (do iFood, do Google ou de clientes). Até {AVALIACOES_MAX} por prato.</p>
                      </div>
                    )}
                    </li>
                  )
                })}
            </ul>
          </Bloco>

          {/* Instagram */}
          <Bloco titulo="Instagram" dica="até 6 posts">
            <Entrada rotulo="Perfil" placeholder="@seurestaurante" value={cfg.instagram.handle} onChange={(e) => mudar({ instagram: { ...cfg.instagram, handle: e.target.value.replace(/[^a-zA-Z0-9._@]/g, '').slice(0, 31) } })} />
            {cfg.instagram.posts.map((p, i) => {
              const mudarPost = (q: Partial<typeof p>) => mudar({ instagram: { ...cfg.instagram, posts: cfg.instagram.posts.map((x, j) => (j === i ? { ...x, ...q } : x)) } })
              return (
                <div key={i} className="flex items-start gap-2">
                  <Upload url={p.imagemUrl} aoEnviar={(u) => mudarPost({ imagemUrl: u })} nome={`post-${i}`} maxLado={800} className="h-[70px] w-14 shrink-0" vazio={<ImagePlus size={14} />} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Entrada placeholder="Link do post (https://www.instagram.com/p/…)" value={p.url} onChange={(e) => mudarPost({ url: e.target.value.trim() })} />
                    <Entrada placeholder="Legenda curta" value={p.legenda} onChange={(e) => mudarPost({ legenda: e.target.value })} maxLength={60} />
                  </div>
                  <button type="button" className="flex h-9 w-9 items-center justify-center rounded-lg text-tinta-4 hover:text-telha-alerta" aria-label="Remover post" onClick={() => mudar({ instagram: { ...cfg.instagram, posts: cfg.instagram.posts.filter((_, j) => j !== i) } })}>
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
            {cfg.instagram.posts.length < 6 && (
              <Button variante="secundario" onClick={() => mudar({ instagram: { ...cfg.instagram, posts: [...cfg.instagram.posts, { url: '', imagemUrl: '', legenda: '' }] } })}>
                <Plus size={15} /> Adicionar post
              </Button>
            )}
          </Bloco>

          {/* Pagamento e nota */}
          <Bloco titulo="Pagamento e avaliação">
            <div className="flex flex-wrap gap-2">
              {[...new Set([...PAGAMENTOS_SUGERIDOS, ...cfg.pagamentos])].map((p) => {
                const on = cfg.pagamentos.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => mudar({ pagamentos: on ? cfg.pagamentos.filter((x) => x !== p) : [...cfg.pagamentos, p] })}
                    className={cn('rounded-full px-3 py-1.5 text-sm font-semibold', on ? 'bg-mar text-creme' : 'bg-preenchimento text-tinta-3')}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Entrada rotulo="Nota" placeholder="4,8" value={cfg.nota.valor} onChange={(e) => mudar({ nota: { ...cfg.nota, valor: e.target.value.slice(0, 4) } })} />
              <Entrada rotulo="Avaliações" placeholder="2,1 mil" value={cfg.nota.total} onChange={(e) => mudar({ nota: { ...cfg.nota, total: e.target.value.slice(0, 12) } })} />
              <Entrada rotulo="Onde" placeholder="iFood" value={cfg.nota.fonte} onChange={(e) => mudar({ nota: { ...cfg.nota, fonte: e.target.value.slice(0, 16) } })} />
            </div>
            <p className="text-xs text-tinta-4">Sem nota preenchida, a faixa de avaliação não aparece no site.</p>
          </Bloco>
        </div>

        {/* Prévia */}
        <Cartao className="sticky top-4 flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-tinta">Prévia</h2>
            <div className="w-[300px] max-w-full">
              <Segmento<Previa> valor={previa} aoTrocar={setPrevia} opcoes={[{ id: 'celular', rotulo: 'Site celular' }, { id: 'links', rotulo: 'Links' }, { id: 'computador', rotulo: 'Computador' }]} />
            </div>
          </div>
          <JanelaPrevia html={html} modo={previa} />
          {errosPub.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-campo bg-insight-fundo/60 p-3 text-xs text-insight-texto">
              {errosPub.slice(0, 4).map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>
    </div>
  )
}
