/* ------------------------------------------------------------------ *
 * Site do cliente: modelo de dados, tokens e regras.
 *
 * Arquivo PURO (sem Firebase, sem Node, sem DOM) porque roda em dois lugares:
 *  - na Cloud Function `siteCliente`, que serve {sub}.tanocaixa.com.br;
 *  - no app (tela Meu site), para a prévia ao vivo e as validações.
 * O app importa daqui pelo alias `@site` (vite.config.ts / tsconfig.app.json).
 * ------------------------------------------------------------------ */

/** Domínio dos sites dos clientes. Separado do app (tanocaixa.com) de propósito:
 * conteúdo dos clientes não divide cookies nem reputação com o painel. */
export const DOMINIO_SITES = 'tanocaixa.com.br'

/**
 * "Meu site" está em teste. Libera para estas contas (em qualquer loja) e para
 * dono/gestão destas lojas. O app (src/auth/site.ts) e as functions usam a
 * mesma lista, então não dá para publicar por fora da interface.
 */
export const CONTAS_COM_SITE = ['lecfmpp@gmail.com', 'suporte@spoonconsultoria.com.br']
export const RESTAURANTES_COM_SITE = [
  'rede-aLLMdmXzwX-fausto-burguer-barra-oli-vxgp', // Fausto Burguer Barra Olímpica
  'fausto-burger-realengo-ccda8c', // Fausto Burger Realengo
]
export function siteLiberadoPara(email: string, restauranteId: string): boolean {
  return CONTAS_COM_SITE.includes(email.trim().toLowerCase()) || RESTAURANTES_COM_SITE.includes(restauranteId)
}

/** Nomes que nunca viram site de cliente. */
export const SUBDOMINIOS_RESERVADOS = new Set([
  'www', 'app', 'api', 'admin', 'blog', 'painel', 'mail', 'email', 'smtp', 'ftp', 'cdn', 'static',
  'assets', 'img', 'status', 'suporte', 'ajuda', 'help', 'docs', 'dev', 'staging', 'teste', 'test',
  'demo', 'site', 'sites', 'loja', 'lojas', 'links', 'tanocaixa', 'tanocaixa-sites', 'ns1', 'ns2',
])

export type PaletaId = 'fausto' | 'brasa' | 'horta' | 'mar'
export type SecaoId = 'promo' | 'destaques' | 'cardapio' | 'lojas' | 'instagram' | 'pagamento'
export type AppId = 'ifood' | 'uber' | 'n99'
export type Cantos = 'redondo' | 'reto'
export type CardapioModo = 'cards' | 'lista'

export interface Paleta {
  nome: string
  bg: string
  sup: string
  ink: string
  sub: string
  pri: string
  onPri: string
  acc: string
  onAcc: string
  soft: string
  foot: string
  line: string
}

export const PALETAS: Record<PaletaId, Paleta> = {
  fausto: { nome: 'Brasa e creme', bg: '#FBF5EC', sup: '#FFFFFF', ink: '#2A1810', sub: '#7A6457', pri: '#C8341F', onPri: '#FFFFFF', acc: '#F4B63F', onAcc: '#2A1810', soft: '#F3E6D6', foot: '#2A1810', line: 'rgba(42,24,16,.12)' },
  brasa: { nome: 'Noite e mostarda', bg: '#141414', sup: '#1F1F1F', ink: '#F5F1E8', sub: '#A8A296', pri: '#F2C230', onPri: '#141414', acc: '#F2C230', onAcc: '#141414', soft: '#262626', foot: '#0A0A0A', line: 'rgba(245,241,232,.12)' },
  horta: { nome: 'Horta e terra', bg: '#F2F3EA', sup: '#FFFFFF', ink: '#1E2B1F', sub: '#5F6B5C', pri: '#2F6B3A', onPri: '#FFFFFF', acc: '#E7774A', onAcc: '#FFFFFF', soft: '#E3E7D6', foot: '#1E2B1F', line: 'rgba(30,43,31,.12)' },
  mar: { nome: 'Azul-noite e sol', bg: '#F0EEE2', sup: '#FBFAF2', ink: '#1C2A2E', sub: '#5C6D71', pri: '#2E5F73', onPri: '#FFFFFF', acc: '#EFAB5C', onAcc: '#1C2A2E', soft: '#E6E3D3', foot: '#16303A', line: 'rgba(46,95,115,.14)' },
}

export const RAIOS: Record<Cantos, Record<'card' | 'btn' | 'btnSq' | 'chip' | 'img' | 'logo', string>> = {
  redondo: { card: '18px', btn: '999px', btnSq: '14px', chip: '999px', img: '14px', logo: '50%' },
  reto: { card: '2px', btn: '2px', btnSq: '2px', chip: '2px', img: '0px', logo: '2px' },
}

export const SECOES: { chave: SecaoId; nome: string }[] = [
  { chave: 'promo', nome: 'Promoção do dia' },
  { chave: 'destaques', nome: 'Mais pedidos' },
  { chave: 'cardapio', nome: 'Cardápio' },
  { chave: 'lojas', nome: 'Lojas e mapa' },
  { chave: 'instagram', nome: 'Posts do Instagram' },
  { chave: 'pagamento', nome: 'Formas de pagamento' },
]

/** Cores só no ponto indicador — nada de logo das marcas sem autorização. */
export const APPS: { k: AppId; nome: string; cor: string; dominios: string[] }[] = [
  { k: 'ifood', nome: 'iFood', cor: '#EA1D2C', dominios: ['ifood.com.br'] },
  { k: 'uber', nome: 'Uber Eats', cor: '#06C167', dominios: ['ubereats.com'] },
  { k: 'n99', nome: '99Food', cor: '#FFC800', dominios: ['99app.com', '99food.com.br'] },
]
export const COR_WHATSAPP = '#25D366'
export const COR_ABERTO = '#2F9E55'
export const COR_FECHADO = '#B4462F'

export const PAGAMENTOS_SUGERIDOS = ['Pix', 'Crédito', 'Débito', 'Vale-refeição', 'Dinheiro']
export const PROMO_TITULO_MAX = 18

export interface LojaSite {
  id: string
  nome: string
  endereco: string
  /** Só dígitos, com DDI (E.164 sem o +): 5521990000001. */
  whatsapp: string
  /** Dias abertos, 0 = domingo. */
  dias: number[]
  /** 'HH:MM'. Se fecha <= abre, o expediente passa da meia-noite. */
  abre: string
  fecha: string
  tempoEntrega: string
  taxa: string
  apps: Partial<Record<AppId, string>>
}

export interface PostSite {
  url: string
  imagemUrl: string
  legenda: string
}

/** Avaliação curta de um prato (o dono copia do iFood/Google ou de clientes). */
export interface AvaliacaoItem {
  nome: string
  /** 1 a 5 */
  nota: number
  texto: string
}
export const AVALIACOES_MAX = 5

/** O que o site acrescenta a um prato do Cardápio (sem mexer no prato do PDV). */
export interface ItemExtra {
  fotoUrl?: string
  destaque?: boolean
  oculto?: boolean
  avaliacoes?: AvaliacaoItem[]
}

export interface SiteConfig {
  subdominio: string
  nome: string
  sigla: string
  slogan: string
  logoUrl: string
  capaUrl: string
  paleta: PaletaId
  cantos: Cantos
  cardapioModo: CardapioModo
  /** Ordem = ordem no site. A capa e o rodapé são fixos. */
  secoes: { chave: SecaoId; visivel: boolean }[]
  promo: {
    titulo: string
    texto: string
    regra: string
    imagemUrl: string
    /** Dia (America/Sao_Paulo, AAAA-MM-DD) em que a promo vale. Some à meia-noite. */
    dia: string
    /** Vale todo dia, sem sumir à meia-noite. */
    fixa: boolean
  }
  pagamentos: string[]
  nota: { valor: string; total: string; fonte: string }
  instagram: { handle: string; posts: PostSite[] }
  lojas: LojaSite[]
  itens: Record<string, ItemExtra>
}

/** Item do cardápio como o site mostra: prato do Tá no Caixa + extras do site. */
export interface ItemSite {
  id: string
  categoria: string
  nome: string
  descricao: string
  preco: number
  fotoUrl?: string
  destaque: boolean
  avaliacoes?: AvaliacaoItem[]
}

/** Avaliações válidas (texto, nota 1–5), no máximo AVALIACOES_MAX. */
export function limparAvaliacoes(a: AvaliacaoItem[] | undefined): AvaliacaoItem[] {
  return (a ?? [])
    .map((x) => ({ nome: String(x.nome ?? '').trim().slice(0, 40), nota: Math.min(5, Math.max(1, Math.round(Number(x.nota) || 5))), texto: String(x.texto ?? '').trim().slice(0, 280) }))
    .filter((x) => x.texto)
    .slice(0, AVALIACOES_MAX)
}

/** Tudo que o render precisa. É o que fica publicado em `sites/{sub}`. */
export interface DadosSite {
  config: SiteConfig
  itens: ItemSite[]
}

/** Prato no formato mínimo que o site lê (PratoDoc do app satisfaz). */
export interface PratoBase {
  id: string
  nome: string
  categoria: string
  preco: number
  descricao?: string
  ativo: boolean
}

/* ------------------------------- Padrões -------------------------------- */

export function slugSubdominio(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 30)
}

export function siglaDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return 'TC'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

export function novaLoja(nome: string, endereco = ''): LojaSite {
  return {
    id: Math.random().toString(36).slice(2, 10),
    nome,
    endereco,
    whatsapp: '',
    dias: [0, 1, 2, 3, 4, 5, 6],
    abre: '11:30',
    fecha: '23:00',
    tempoEntrega: '30–45 min',
    taxa: 'R$ 4,99',
    apps: {},
  }
}

export function configPadrao(nome: string, bairro = ''): SiteConfig {
  return {
    subdominio: slugSubdominio(nome),
    nome,
    sigla: siglaDe(nome),
    slogan: '',
    logoUrl: '',
    capaUrl: '',
    paleta: 'mar',
    cantos: 'redondo',
    cardapioModo: 'cards',
    secoes: SECOES.map((s) => ({ chave: s.chave, visivel: true })),
    promo: { titulo: '', texto: '', regra: '', imagemUrl: '', dia: '', fixa: false },
    pagamentos: [...PAGAMENTOS_SUGERIDOS],
    nota: { valor: '', total: '', fonte: 'iFood' },
    instagram: { handle: '', posts: [] },
    lojas: [novaLoja(bairro || 'Loja principal')],
    itens: {},
  }
}

/** Completa um config lido do banco (campos novos ganham o padrão). */
export function normalizarConfig(c: Partial<SiteConfig> | undefined, nome: string, bairro = ''): SiteConfig {
  const base = configPadrao(nome, bairro)
  if (!c) return base
  const secoesSalvas = (c.secoes ?? []).filter((s) => SECOES.some((x) => x.chave === s.chave))
  const faltando = SECOES.filter((s) => !secoesSalvas.some((x) => x.chave === s.chave)).map((s) => ({ chave: s.chave, visivel: true }))
  return {
    ...base,
    ...c,
    paleta: c.paleta && c.paleta in PALETAS ? c.paleta : base.paleta,
    secoes: [...secoesSalvas, ...faltando],
    promo: { ...base.promo, ...(c.promo ?? {}) },
    nota: { ...base.nota, ...(c.nota ?? {}) },
    instagram: { ...base.instagram, ...(c.instagram ?? {}), posts: c.instagram?.posts ?? [] },
    lojas: (c.lojas ?? base.lojas).map((l) => ({ ...novaLoja(l.nome), ...l, apps: l.apps ?? {} })),
    itens: c.itens ?? {},
    pagamentos: c.pagamentos ?? base.pagamentos,
  }
}

/** Itens do site a partir dos pratos ativos, na ordem das categorias como aparecem. */
export function montarItens(pratos: PratoBase[], extras: Record<string, ItemExtra>): ItemSite[] {
  return pratos
    .filter((p) => p.ativo !== false && !extras[p.id]?.oculto && p.preco > 0)
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((p) => ({
      id: p.id,
      categoria: p.categoria?.trim() || 'Outros',
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco: p.preco,
      fotoUrl: extras[p.id]?.fotoUrl || undefined,
      destaque: !!extras[p.id]?.destaque,
      avaliacoes: limparAvaliacoes(extras[p.id]?.avaliacoes),
    }))
}

/* ------------------------------ Validação ------------------------------- */

const RE_SUB = /^[a-z0-9](-?[a-z0-9])*$/

/** Mensagem de erro ou null. Não checa se já existe (isso é com o banco). */
export function erroSubdominio(sub: string): string | null {
  if (sub.length < 3) return 'Use pelo menos 3 caracteres.'
  if (sub.length > 30) return 'Use no máximo 30 caracteres.'
  if (!RE_SUB.test(sub)) return 'Só letras minúsculas, números e hífen (sem hífen no começo ou no fim).'
  if (SUBDOMINIOS_RESERVADOS.has(sub)) return 'Esse nome é reservado. Escolha outro.'
  return null
}

export function urlSegura(u: string | undefined): string {
  if (!u) return ''
  try {
    const url = new URL(u.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

/** O link é mesmo do app certo? (evita colar o link do iFood no campo da Uber). */
export function erroLinkApp(app: AppId, u: string): string | null {
  if (!u.trim()) return null
  const url = urlSegura(u)
  if (!url) return 'Link inválido. Cole o endereço completo (https://…).'
  const host = new URL(url).hostname.replace(/^www\./, '')
  const def = APPS.find((a) => a.k === app)!
  return def.dominios.some((d) => host === d || host.endsWith('.' + d)) ? null : `Esse link não é do ${def.nome}.`
}

export function erroWhatsapp(w: string): string | null {
  if (!w) return null
  return /^\d{12,13}$/.test(w) ? null : 'Use DDI + DDD + número, só dígitos (ex.: 5521990000001).'
}

/** Problemas que impedem publicar. Lista vazia = pode publicar. */
export function errosParaPublicar(c: SiteConfig): string[] {
  const erros: string[] = []
  const es = erroSubdominio(c.subdominio)
  if (es) erros.push('Endereço: ' + es)
  if (!c.nome.trim()) erros.push('Dê um nome ao site.')
  if (c.promo.titulo.length > PROMO_TITULO_MAX) erros.push(`Nome da promoção: no máximo ${PROMO_TITULO_MAX} caracteres.`)
  if (c.lojas.length === 0) erros.push('Cadastre pelo menos uma loja.')
  for (const l of c.lojas) {
    const ew = erroWhatsapp(l.whatsapp)
    if (ew) erros.push(`${l.nome}: WhatsApp — ${ew}`)
    for (const a of APPS) {
      const e = erroLinkApp(a.k, l.apps[a.k] ?? '')
      if (e) erros.push(`${l.nome}: ${e}`)
    }
  }
  return erros
}

/* ------------------------------- Horário -------------------------------- */

/** Dia da semana (0 = dom) e minuto do dia em America/Sao_Paulo. */
export function agoraSP(d = new Date()): { dia: number; min: number; data: string } {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const o: Record<string, string> = {}
  for (const x of p) o[x.type] = x.value
  return {
    dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(o.weekday),
    min: (Number(o.hour) % 24) * 60 + Number(o.minute),
    data: `${o.year}-${o.month}-${o.day}`,
  }
}

/**
 * Textos de "aberto agora". AUTOCONTIDA de propósito (sem referência a nada de
 * fora): o render a serializa com toString() para dentro do JS do site, e o
 * navegador recalcula o status sem depender do cache do HTML.
 */
export function textosStatus(lojas: { dias: number[]; abre: string; fecha: string }[], dia: number, min: number) {
  const m = (h: string) => {
    const p = String(h || '0:0').split(':')
    return (Number(p[0]) || 0) * 60 + (Number(p[1]) || 0)
  }
  const fh = (x: number) => {
    const h = Math.floor(x / 60) % 24
    const mm = x % 60
    return h + 'h' + (mm ? (mm < 10 ? '0' : '') + mm : '')
  }
  const aberta = (l: { dias: number[]; abre: string; fecha: string }) => {
    const a = m(l.abre)
    const f = m(l.fecha)
    const vira = f <= a
    if (l.dias.indexOf(dia) >= 0 && (vira ? min >= a : min >= a && min < f)) return true
    return vira && l.dias.indexOf((dia + 6) % 7) >= 0 && min < f
  }
  const proxima = (l: { dias: number[]; abre: string }) => {
    const a = m(l.abre)
    if (l.dias.indexOf(dia) >= 0 && min < a) return 'abre às ' + fh(a)
    for (let k = 1; k <= 7; k++) {
      const d = (dia + k) % 7
      if (l.dias.indexOf(d) >= 0) return (k === 1 ? 'abre amanhã às ' : 'abre ' + ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d] + ' às ') + fh(a)
    }
    return 'sem horário'
  }
  const ls = lojas.map((l) => {
    const ab = aberta(l)
    return { aberta: ab, curto: ab ? 'Aberto' : 'Fechado', texto: ab ? 'Aberto agora · fecha às ' + fh(m(l.fecha)) : 'Fechado · ' + proxima(l) }
  })
  const n = ls.filter((x) => x.aberta).length
  const t = lojas.length
  return {
    n,
    geral: n ? 'Aberto agora' : 'Fechado agora',
    longo: t === 0 ? '' : t > 1 ? (n ? 'Aberto agora · ' + n + ' de ' + t + ' lojas' : 'Fechado agora · ' + proxima(lojas[0])) : ls[0].texto,
    resumo: t + (t === 1 ? ' loja' : ' lojas') + ' · ' + n + (n === 1 ? ' aberta' : ' abertas') + ' agora',
    lojas: ls,
  }
}

const NOMES_DIA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** [0..6] → "Todos os dias"; [1..5] → "Seg a sex"; senão a lista. */
export function textoDias(dias: number[]): string {
  const d = [...new Set(dias)].sort((a, b) => a - b)
  if (d.length === 7) return 'Todos os dias'
  if (d.length === 0) return 'Fechado'
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
  // Sequência contínua, inclusive passando pelo domingo (qua, qui, sex, sáb, dom → "Qua a dom").
  for (const ini of d) {
    const seq = d.map((_, k) => (ini + k) % 7)
    if (d.length > 2 && seq.every((x) => d.includes(x))) return cap(NOMES_DIA[ini]) + ' a ' + NOMES_DIA[seq[seq.length - 1]]
  }
  return cap(d.map((x) => NOMES_DIA[x]).join(', '))
}

export function horaTexto(h: string): string {
  const [hh, mm] = h.split(':').map(Number)
  return (hh % 24) + 'h' + (mm ? String(mm).padStart(2, '0') : '')
}

export function precoTexto(v: number): string {
  return 'R$ ' + v.toFixed(2).replace('.', ',')
}

/** A promo aparece hoje? (some à meia-noite, salvo se for fixa). */
export function promoAtiva(c: SiteConfig, hoje: string): boolean {
  return !!c.promo.texto.trim() && (c.promo.fixa || c.promo.dia === hoje)
}

/** Descobre subdomínio e página a partir do Host (ou do caminho, no modo sem DNS). */
export function resolverRota(host: string, caminho: string): { sub: string; pagina: string; base: string; dominio: string } | null {
  const h = host.toLowerCase().split(':')[0]
  const partes = caminho.split('/').filter(Boolean)
  if (h.endsWith('.' + DOMINIO_SITES)) {
    const sub = h.slice(0, -(DOMINIO_SITES.length + 1))
    if (sub.includes('.')) return null
    return { sub, pagina: partes[0] ?? '', base: '', dominio: h }
  }
  // Modo caminho: https://<function ou web.app>/{sub}/links
  if (!partes[0]) return null
  const sub = partes[0].toLowerCase()
  return { sub, pagina: partes[1] ?? '', base: '/' + sub, dominio: `${sub}.${DOMINIO_SITES}` }
}
