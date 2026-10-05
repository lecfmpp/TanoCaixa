/* ------------------------------------------------------------------ *
 * Regras (puras) de quando cada lembrete de WhatsApp deve sair.
 * Sem Firebase: recebem os dados já carregados (Ctx) e devolvem as variáveis
 * da legenda, ou null quando não há o que lembrar. Testáveis sem rede.
 * ------------------------------------------------------------------ */
import { brl } from './whatsappTexto'
import { varsDeVencimentos } from './lembretesTexto'
import type { IdLembrete } from './lembretesCatalogo'
import type { Variaveis } from './lembretesTexto'

export interface AtividadeMin {
  acao: string
  criadoEm: string // ISO
  quem?: string
  origem?: string
}

export interface ItemMin {
  produto: string
  unidade?: string
  precoUnitario: number
  variacao?: number // % vs último preço
}

export interface DespesaMin {
  id: string
  notaId?: string
  fornecedor: string
  valorTotal: number
  dataCompetencia: string
  dataVencimento?: string
  status: string
  tipoLancamento?: string
  criadoEm?: string
  itens?: ItemMin[]
}

export interface Ctx {
  hoje: string // YYYY-MM-DD (São Paulo)
  inicioDoDia: string // ISO da meia-noite de hoje em São Paulo
  diaDoMes: number
  diaSemana: number // 0 = domingo
  restaurante: string
  despesas: DespesaMin[]
  receitaHoje: number
  pedidosPdvHoje: number
  caixasAbertos: { numero: number; dia: string; abertoEm: string }[]
  temProdutos: boolean
  ultimaContagem?: string // YYYY-MM-DD
  planoDoMesExiste: boolean
  pratos: { nome: string; ativo: boolean; tipo: string; fichaItens: number }[]
  atividades: AtividadeMin[] // últimos 14 dias
  ifood?: { status: string; ultimoSyncEm?: string }
  convitesPendentes: { papel: string; criadoEm: string }[]
}

export interface Disparo {
  vars: Variaveis
  variante?: string
}

/* ------------------------------ utilidades ------------------------------- */

const dia10 = (iso: string) => iso.slice(0, 10)
export const ddmm = (iso: string) => dia10(iso).split('-').reverse().slice(0, 2).join('/')

/** Dias de `a` até `b` pelo calendário (sem fuso). */
export function diasEntre(a: string, b: string): number {
  const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
  return Math.round((t(b) - t(a)) / 86_400_000)
}

export const mesAnterior = (mes: string): string => {
  const [a, m] = mes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}

const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const nomeDoMes = (mes: string) => NOMES_MES[Number(mes.slice(5, 7)) - 1]

const horaSP = (iso: string) => {
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  return p.replace(':', 'h')
}

const ehNota = (a: AtividadeMin) => a.acao === 'lançou a nota do'
const ehCompra = (d: DespesaMin) => d.tipoLancamento === 'compra'

/* ---------------------------- Notas do dia ------------------------------- */

/**
 * Lembrar só quem tem o hábito de lançar nota (pelo menos uma nos últimos 14
 * dias) e ainda não lançou hoje. `inicioDoDia` é o ISO da meia-noite (SP).
 */
export function deveLembrarNotasDoDia(atividades: AtividadeMin[], inicioDoDia: string): boolean {
  const notas = atividades.filter((a) => ehNota(a) && a.origem !== 'integracao')
  if (!notas.length) return false
  return !notas.some((a) => a.criadoEm >= inicioDoDia)
}

/* ------------------------------ Detectores ------------------------------- */

type Detector = (c: Ctx) => Disparo | null

const temHabitoDeVendas = (c: Ctx) =>
  c.atividades.some((a) => ['lançou as vendas de', 'lançou o pedido', 'fechou o caixa do PDV'].includes(a.acao) && a.origem !== 'integracao')

const vendasDoDia: Detector = (c) =>
  temHabitoDeVendas(c) && c.receitaHoje === 0 && c.pedidosPdvHoje === 0 ? { vars: { restaurante: c.restaurante } } : null

const caixaAberto: Detector = (c) => {
  const cx = c.caixasAbertos.filter((x) => x.dia < c.hoje).sort((a, b) => a.abertoEm.localeCompare(b.abertoEm))[0]
  if (!cx) return null
  const quando = diasEntre(cx.dia, c.hoje) === 1 ? 'ontem' : ddmm(cx.dia)
  return { vars: { n: cx.numero, aberto_desde: `${quando} às ${horaSP(cx.abertoEm)}`, restaurante: c.restaurante } }
}

const notasDoDia: Detector = (c) =>
  deveLembrarNotasDoDia(c.atividades, c.inicioDoDia) ? { vars: { restaurante: c.restaurante } } : null

/** Boleto ou nota em aberto vencido, vencendo hoje ou nos próximos 2 dias. Nota com mais de um lançamento conta uma vez. */
const vencimentos: Detector = (c) => {
  const porNota = new Map<string, { fornecedor: string; valor: number; venc: string }>()
  for (const d of c.despesas) {
    if (d.status === 'pago' || !d.dataVencimento) continue
    const chave = d.notaId ?? d.id
    const atual = porNota.get(chave)
    const venc = dia10(d.dataVencimento)
    if (atual) {
      atual.valor += d.valorTotal
      if (venc < atual.venc) atual.venc = venc
    } else porNota.set(chave, { fornecedor: d.fornecedor, valor: d.valorTotal, venc })
  }
  const itens = [...porNota.values()]
    .map((n) => ({ ...n, dias: diasEntre(c.hoje, n.venc) }))
    .filter((n) => n.dias <= 2)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 5)
  if (!itens.length) return null
  const situacao = (dias: number, venc: string) =>
    dias < 0 ? `vencido há ${-dias} ${-dias === 1 ? 'dia' : 'dias'}` : dias === 0 ? 'vence hoje' : dias === 1 ? `vence amanhã (${ddmm(venc)})` : `vence em ${dias} dias (${ddmm(venc)})`
  return {
    vars: varsDeVencimentos(
      itens.map((n) => ({ fornecedor: n.fornecedor, valor: brl(n.valor), situacao: situacao(n.dias, n.venc) })),
      c.restaurante,
    ),
  }
}

/** Item de nota recente (hoje ou ontem) com preço pelo menos 5% acima da compra anterior (o app já grava `variacao`). */
const altaDePreco: Detector = (c) => {
  let melhor: { item: ItemMin; fornecedor: string; data: string } | null = null
  for (const d of c.despesas) {
    const quando = dia10(d.criadoEm ?? d.dataCompetencia)
    if (diasEntre(quando, c.hoje) > 1 || diasEntre(quando, c.hoje) < 0) continue
    for (const it of d.itens ?? []) {
      if ((it.variacao ?? 0) >= 5 && (!melhor || (it.variacao ?? 0) > (melhor.item.variacao ?? 0))) melhor = { item: it, fornecedor: d.fornecedor, data: d.dataCompetencia }
    }
  }
  if (!melhor) return null
  const v = melhor.item.variacao ?? 0
  const novo = melhor.item.precoUnitario
  return {
    vars: {
      item: melhor.item.produto,
      pct: Math.round(v),
      fornecedor: melhor.fornecedor,
      preco_antigo: brl(novo / (1 + v / 100)),
      preco_novo: brl(novo),
      unidade: melhor.item.unidade || 'un',
      data: ddmm(melhor.data),
      restaurante: c.restaurante,
    },
  }
}

/** Dias 1 a 3: resumo das compras do mês anterior. */
const relatorioCompras: Detector = (c) => {
  if (c.diaDoMes > 3) return null
  const mes = mesAnterior(c.hoje.slice(0, 7))
  const compras = c.despesas.filter((d) => ehCompra(d) && d.dataCompetencia.startsWith(mes))
  if (!compras.length) return null
  const total = compras.reduce((s, d) => s + d.valorTotal, 0)
  const notas = new Set(compras.map((d) => d.notaId ?? d.id)).size
  const porFornecedor = new Map<string, number>()
  for (const d of compras) porFornecedor.set(d.fornecedor, (porFornecedor.get(d.fornecedor) ?? 0) + d.valorTotal)
  const [fornecedor, valor] = [...porFornecedor.entries()].sort((a, b) => b[1] - a[1])[0]
  let alta: { item: string; pct: number } | null = null
  for (const d of compras) for (const it of d.itens ?? []) if ((it.variacao ?? 0) >= 5 && (!alta || it.variacao! > alta.pct)) alta = { item: it.produto, pct: it.variacao! }
  const base = { mes: nomeDoMes(mes), total: brl(total), n_notas: notas, fornecedor, valor: brl(valor), pct: Math.round((valor / total) * 100), restaurante: c.restaurante }
  return alta ? { vars: { ...base, item: alta.item, pct_alta: Math.round(alta.pct) } } : { vars: base, variante: 'sem_alta' }
}

/** Última contagem há mais de 14 dias (quem nunca contou não recebe: conta nova). */
const contagemEstoque: Detector = (c) =>
  c.temProdutos && c.ultimaContagem && diasEntre(c.ultimaContagem, c.hoje) > 14 ? { vars: { data: ddmm(c.ultimaContagem), restaurante: c.restaurante } } : null

/** Primeiros 5 dias do mês, restaurante ativo e sem plano do mês. */
const planoDoMes: Detector = (c) =>
  c.diaDoMes <= 5 && !c.planoDoMesExiste && c.atividades.length > 0 ? { vars: { mes: nomeDoMes(c.hoje.slice(0, 7)), restaurante: c.restaurante } } : null

/** Segunda-feira: pratos ativos sem ficha técnica. */
const pratosSemFicha: Detector = (c): Disparo | null => {
  if (c.diaSemana !== 1) return null
  const sem = c.pratos.filter((p) => p.ativo && p.tipo === 'prato' && p.fichaItens === 0).map((p) => p.nome)
  if (!sem.length) return null
  if (sem.length <= 3) return { vars: { n: sem.length, pratos: sem.length === 1 ? 'prato' : 'pratos', lista: sem.join(', '), restaurante: c.restaurante }, variante: 'curto' }
  return { vars: { n: sem.length, prato_1: sem[0], prato_2: sem[1], prato_3: sem[2], resto: sem.length - 3, restaurante: c.restaurante } }
}

const CARGO: Record<string, string> = { gestao: 'gestão', caixa: 'caixa', cozinha: 'cozinha' }

/** Convite enviado há 3 dias ou mais e ainda não aceito. */
const convitePendente: Detector = (c) => {
  const velho = c.convitesPendentes.filter((v) => diasEntre(v.criadoEm, c.hoje) >= 3).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))[0]
  if (!velho) return null
  return { vars: { nome: 'um novo membro', cargo: CARGO[velho.papel] ?? velho.papel, data: ddmm(velho.criadoEm), restaurante: c.restaurante } }
}

/** iFood conectado, mas sem sincronizar há mais de 2 dias. */
const ifoodParado: Detector = (c) =>
  c.ifood && c.ifood.status === 'conectado' && c.ifood.ultimoSyncEm && diasEntre(c.ifood.ultimoSyncEm, c.hoje) > 2
    ? { vars: { data: ddmm(c.ifood.ultimoSyncEm), restaurante: c.restaurante } }
    : null

/* ------------------------------- Registro -------------------------------- */

export interface RegraLembrete {
  detectar: Detector
  /** Em qual rodada do dia o lembrete pode sair. */
  quando: 'manha' | 'noite'
  /** Dias mínimos entre dois envios do mesmo lembrete ("sem cobrança"). */
  cooldownDias: number
}

/** Ordem = prioridade (no máximo 1 lembrete por restaurante por dia). */
export const REGRAS: Partial<Record<IdLembrete, RegraLembrete>> = {
  ifood_parado: { detectar: ifoodParado, quando: 'manha', cooldownDias: 2 },
  vencimentos: { detectar: vencimentos, quando: 'manha', cooldownDias: 1 },
  caixa_aberto: { detectar: caixaAberto, quando: 'manha', cooldownDias: 1 },
  vendas_do_dia: { detectar: vendasDoDia, quando: 'noite', cooldownDias: 1 },
  notas_do_dia: { detectar: notasDoDia, quando: 'noite', cooldownDias: 1 },
  alta_de_preco: { detectar: altaDePreco, quando: 'manha', cooldownDias: 1 },
  contagem_estoque: { detectar: contagemEstoque, quando: 'manha', cooldownDias: 7 },
  pratos_sem_ficha: { detectar: pratosSemFicha, quando: 'manha', cooldownDias: 7 },
  plano_do_mes: { detectar: planoDoMes, quando: 'manha', cooldownDias: 7 },
  relatorio_compras: { detectar: relatorioCompras, quando: 'manha', cooldownDias: 28 },
  convite_pendente: { detectar: convitePendente, quando: 'manha', cooldownDias: 7 },
}

export const PRIORIDADE = Object.keys(REGRAS) as IdLembrete[]

/** Lembretes que ainda dependem de dados que só existem no app (DRE) ou de envio direto ao usuário. */
export const EM_BREVE: IdLembrete[] = ['diferenca_estoque', 'dre_mes_anterior', 'ponto_equilibrio', 'cmv_acima_meta', 'terminar_cadastro', 'assinatura']
