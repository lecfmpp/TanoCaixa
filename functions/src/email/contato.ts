/* ------------------------------------------------------------------ *
 * Regra pura: dado o retrato de uma pessoa (lojas, papel em cada uma,
 * assinatura e uso), o que o contato dela no Resend deve ter
 * (propriedades) e em quais segmentos "TNC · …" ela deve estar.
 *
 * Caixa e cozinha nunca recebem dado financeiro nem de cobrança: as
 * propriedades de assinatura só existem pra dono, gestão e franqueador.
 * ------------------------------------------------------------------ */
import { fimDoTesteDaConta } from '../assinatura'
import { normalizarPapel } from '../papel'

export type PapelContato = 'dono' | 'franqueador' | 'gestao' | 'caixa' | 'cozinha'
/** Situação de uma loja vista pela cobrança. */
export type SituacaoLoja = 'isenta' | 'ativa' | 'pagamento_falhou' | 'cancelada' | 'teste' | 'sem_assinatura'

export const PREFIXO = 'TNC · '
export const SEGMENTOS = {
  todos: 'TNC · Todos',
  donos: 'TNC · Donos',
  gestao: 'TNC · Gestão',
  franqueadores: 'TNC · Franqueadores',
  caixa: 'TNC · Caixa',
  cozinha: 'TNC · Cozinha',
  donosEmTeste: 'TNC · Donos em teste',
  donosSemAssinatura: 'TNC · Donos sem assinatura',
  assinantes: 'TNC · Assinantes',
  pagamentoFalhou: 'TNC · Pagamento falhou',
  cancelados: 'TNC · Cancelados',
  inativos7: 'TNC · Inativos 7 dias',
} as const

/** Propriedades do contato e o tipo de cada uma no Resend (só existem string e number). */
export const PROPRIEDADES: Record<string, 'string' | 'number'> = {
  uid: 'string',
  papel_principal: 'string',
  papeis: 'string',
  lojas_dono: 'number',
  situacao: 'string',
  teste_ate: 'string',
  lojas_sem_assinatura: 'number',
  assinou_em: 'string',
  dias_lancados: 'number',
  ultimo_lancamento: 'string',
  tem_equipe: 'string',
  entrou_por: 'string',
  criado_em: 'string',
}

const ORDEM: PapelContato[] = ['dono', 'franqueador', 'gestao', 'caixa', 'cozinha']
const VE_COBRANCA: PapelContato[] = ['dono', 'franqueador', 'gestao']

export function papelDoMembro(p: string | undefined): PapelContato {
  return p === 'franqueador' ? 'franqueador' : normalizarPapel(p)
}

export const ehLojaDemo = (rid: string) => rid.startsWith('demo-') || rid.startsWith('rede-demo')

export interface AssinaturaDaLoja {
  status?: string
  testeAte?: string
  isenta?: boolean
  ultimaFaturaPagaEm?: string
  primeiraFaturaPagaEm?: string
}

export interface LojaDaPessoa {
  rid: string
  nome?: string
  papel: string | undefined
  assinatura?: AssinaturaDaLoja
  /** Quantos dias com venda lançada (receita_dia). */
  diasLancados?: number
  /** 'YYYY-MM-DD' do último dia lançado. */
  ultimoLancamento?: string
  membros?: number
}

export interface RetratoPessoa {
  uid: string
  email: string
  nome?: string
  criadoEm?: string
  entrouPor?: 'convite' | 'direto'
  lojas: LojaDaPessoa[]
}

export function situacaoDaLoja(a: AssinaturaDaLoja | undefined, agora: Date): SituacaoLoja {
  if (a?.isenta) return 'isenta'
  if (a?.status === 'ativa') return 'ativa'
  if (a?.status === 'pagamento_falhou') return 'pagamento_falhou'
  if (a?.status === 'cancelada') return 'cancelada'
  return Date.parse(fimDoTesteDaConta(a?.testeAte)) > agora.getTime() ? 'teste' : 'sem_assinatura'
}

/** Da pior pra melhor: a pessoa aparece com a situação que pede mais atenção. */
const GRAVIDADE: SituacaoLoja[] = ['pagamento_falhou', 'sem_assinatura', 'cancelada', 'teste', 'ativa', 'isenta']

export interface ContatoCalculado {
  email: string
  primeiroNome: string
  propriedades: Record<string, string | number | null>
  segmentos: string[]
}

export function primeiroNome(nome: string | undefined, email: string): string {
  const base = (nome ?? '').trim() || email.split('@')[0] || ''
  const p = base.split(/\s+/)[0] ?? ''
  return p ? p[0].toUpperCase() + p.slice(1) : ''
}

const dia = (iso: string | undefined) => (iso ? iso.slice(0, 10) : null)

export function calcularContato(r: RetratoPessoa, agora: Date): ContatoCalculado | null {
  const email = r.email.trim().toLowerCase()
  if (!email.includes('@')) return null
  const lojas = r.lojas.filter((l) => !ehLojaDemo(l.rid)).map((l) => ({ ...l, p: papelDoMembro(l.papel) }))
  const papeis = ORDEM.filter((p) => lojas.some((l) => l.p === p))
  const principal = papeis[0] ?? null

  // Cobrança: lojas onde é dono; sem nenhuma, as de franqueador/gestão. Caixa e cozinha: nada.
  const lojasDono = lojas.filter((l) => l.p === 'dono')
  const lojasCobranca = lojasDono.length ? lojasDono : lojas.filter((l) => VE_COBRANCA.includes(l.p))
  const situacoes = lojasCobranca.map((l) => situacaoDaLoja(l.assinatura, agora))
  const situacao = situacoes.length ? GRAVIDADE.find((s) => situacoes.includes(s))! : null
  const semAssinatura = situacoes.filter((s) => s === 'teste' || s === 'sem_assinatura' || s === 'cancelada').length
  const testeAte = lojasCobranca
    .filter((_, i) => situacoes[i] === 'teste' || situacoes[i] === 'sem_assinatura')
    .map((l) => fimDoTesteDaConta(l.assinatura?.testeAte))
    .sort()[0]
  const assinouEm = lojasCobranca
    .map((l) => l.assinatura?.primeiraFaturaPagaEm ?? l.assinatura?.ultimaFaturaPagaEm)
    .filter((x): x is string => !!x)
    .sort()[0]

  // Uso: só lojas onde lança (dono/gestão). Caixa e cozinha não somam dias lançados.
  const lojasUso = lojas.filter((l) => l.p === 'dono' || l.p === 'gestao')
  const diasLancados = lojasUso.reduce((s, l) => s + (l.diasLancados ?? 0), 0)
  const ultimo = lojasUso.map((l) => l.ultimoLancamento).filter((x): x is string => !!x).sort().pop()
  const temEquipe = lojasDono.some((l) => (l.membros ?? 1) > 1)

  const veCobranca = principal !== null && VE_COBRANCA.includes(principal)
  const propriedades: Record<string, string | number | null> = {
    uid: r.uid,
    papel_principal: principal,
    papeis: papeis.join(','),
    lojas_dono: lojasDono.length,
    situacao: veCobranca ? situacao : null,
    teste_ate: veCobranca ? dia(testeAte) : null,
    lojas_sem_assinatura: veCobranca ? semAssinatura : null,
    assinou_em: veCobranca ? dia(assinouEm) : null,
    dias_lancados: lojasUso.length ? diasLancados : null,
    ultimo_lancamento: lojasUso.length ? ultimo ?? null : null,
    tem_equipe: lojasDono.length ? (temEquipe ? 'sim' : 'nao') : null,
    entrou_por: r.entrouPor ?? null,
    criado_em: dia(r.criadoEm),
  }

  const seg = new Set<string>([SEGMENTOS.todos])
  if (papeis.includes('dono')) seg.add(SEGMENTOS.donos)
  if (papeis.includes('gestao')) seg.add(SEGMENTOS.gestao)
  if (papeis.includes('franqueador')) seg.add(SEGMENTOS.franqueadores)
  if (papeis.includes('caixa')) seg.add(SEGMENTOS.caixa)
  if (papeis.includes('cozinha')) seg.add(SEGMENTOS.cozinha)

  const sitDono = lojasDono.map((l) => situacaoDaLoja(l.assinatura, agora))
  if (sitDono.includes('teste')) seg.add(SEGMENTOS.donosEmTeste)
  if (sitDono.includes('sem_assinatura')) seg.add(SEGMENTOS.donosSemAssinatura)
  if (sitDono.includes('ativa')) seg.add(SEGMENTOS.assinantes)
  if (sitDono.includes('pagamento_falhou')) seg.add(SEGMENTOS.pagamentoFalhou)
  if (sitDono.includes('cancelada')) seg.add(SEGMENTOS.cancelados)

  // Inativo: dono/gestão com conta de 7+ dias e sem lançar há 7+ dias (ou nunca lançou).
  const seteDias = 7 * 86_400_000
  const contaVelha = r.criadoEm ? agora.getTime() - Date.parse(r.criadoEm) >= seteDias : true
  const parado = !ultimo || agora.getTime() - Date.parse(`${ultimo}T12:00:00-03:00`) >= seteDias
  if (lojasUso.length && contaVelha && parado) seg.add(SEGMENTOS.inativos7)

  return { email, primeiroNome: primeiroNome(r.nome, email), propriedades, segmentos: [...seg].sort() }
}

/** O que mudar nos segmentos "TNC · …" do contato (os de outros projetos ficam intocados). */
export function diferencaSegmentos(desejados: string[], atuais: string[]): { entrar: string[]; sair: string[] } {
  const nossos = atuais.filter((n) => n.startsWith(PREFIXO))
  return {
    entrar: desejados.filter((n) => !nossos.includes(n)),
    sair: nossos.filter((n) => !desejados.includes(n)),
  }
}

/** Impressão digital do que vai pro Resend: igual à última → não precisa chamar a API. */
export function impressao(c: ContatoCalculado): string {
  const props = Object.keys(c.propriedades).sort().map((k) => `${k}=${c.propriedades[k]}`)
  return JSON.stringify([c.email, c.primeiroNome, props, c.segmentos])
}
