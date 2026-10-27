/* ------------------------------------------------------------------ *
 * Textos dos avisos de WhatsApp. Só montam strings (sem Firebase, sem rede),
 * para dar para testar e pré-visualizar sem enviar nada.
 *
 * Tom: tranquilo, profissional e sem cobrança. Cada informação aparece uma
 * única vez. Identidade: um emoji fixo por tipo de mensagem, só no título
 * (nada de emoji solto no corpo). Linha em branco só entre blocos que
 * merecem destaque.
 * ------------------------------------------------------------------ */

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Um emoji por tipo de mensagem — é a assinatura visual do Tá no Caixa no WhatsApp. */
export const EMOJI = {
  nota: '🧾',
  contagem: '📦',
  vendas: '💵',
  caixa: '🔒',
  resumo: '📊',
  lembrete: '🗓️',
  dica: '💡',
} as const

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** '2026-10-03' -> '03/10' */
const diaMes = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')

/* --------------------------- Avisos na hora ------------------------------ */

export interface Atividade {
  acao: string
  entidade: string
  quem: string
  valor?: number
  restaurante: string
  detalhes?: { vencimento?: string; formaPagamento?: string; status?: string; itens?: number }
}

const FORMA_PAGAMENTO: Record<string, string> = {
  pix: 'Pix',
  dinheiro: 'dinheiro',
  cartao: 'cartão',
  boleto: 'boleto',
  transferencia: 'transferência',
  automatico: 'débito automático',
}

/** '2026-10-15' -> '15/10/2026' */
const dataBr = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

/** Linhas extras da nota: itens, situação do pagamento e vencimento (só o que existir). */
function detalhesDaNota(d: Atividade['detalhes']): string[] {
  if (!d) return []
  const forma = d.formaPagamento ? FORMA_PAGAMENTO[d.formaPagamento] ?? d.formaPagamento : undefined
  const linhas: string[] = []
  if (d.itens) linhas.push(`Itens: ${d.itens}`)
  if (d.status === 'pago') linhas.push(`Pagamento: pago${forma ? ` (${forma})` : ''}`)
  else {
    if (d.vencimento) linhas.push(`Vencimento: ${dataBr(d.vencimento)}${forma ? ` (${forma})` : ''}`)
    else if (forma) linhas.push(`Pagamento: ${forma}`)
  }
  return linhas
}

/** null = atividade que não gera aviso. */
export function textoAviso(a: Atividade): string | null {
  const v = a.valor
  const rodape = `_${a.restaurante}_`
  switch (a.acao) {
    case 'lançou a nota do': {
      const linhas = [`${EMOJI.nota} *Nota fiscal lançada*`, a.entidade]
      if (v) linhas.push(`Valor: ${brl(v)}`)
      linhas.push(...detalhesDaNota(a.detalhes), `Lançada por ${a.quem}`, rodape)
      return linhas.join('\n')
    }
    case 'contou':
      return `${EMOJI.contagem} *Contagem de estoque feita*\n${a.quem} contou ${a.entidade}${v ? `. Estoque em ${brl(v)}` : ''}.\n${rodape}`
    case 'lançou as vendas de':
      return `${EMOJI.vendas} *Vendas do dia lançadas*\n${a.quem} lançou as vendas de ${a.entidade}${v ? `: ${brl(v)}` : ''}.\n${rodape}`
    case 'fechou o caixa do PDV':
      return `${EMOJI.caixa} *Caixa fechado*\n${a.quem} fechou o caixa (${a.entidade})${v !== undefined ? ` com faturamento de ${brl(v)}` : ''}.\n${rodape}`
    default:
      return null
  }
}

/* --------------------------- Resumo do dia ------------------------------- */

export interface ResumoUsuario {
  dia: string // YYYY-MM-DD
  usuario: string
  restaurante: string
  vendasDia: number // soma das vendas lançadas (0 = não lançou)
  pedidos: { qtd: number; total: number }
  caixa: { qtd: number; total: number }
  notas: { qtd: number; total: number }
  despesas: { qtd: number; total: number }
  contagem: { qtd: number; total: number }
  ultimaHora: string // 'HH:mm'
}

export function textoResumoUsuario(r: ResumoUsuario): string {
  const itens: string[] = []
  if (r.vendasDia) itens.push(`• Vendas do dia: ${brl(r.vendasDia)}`)
  if (r.pedidos.qtd) itens.push(`• ${plural(r.pedidos.qtd, 'pedido', 'pedidos')} no PDV: ${brl(r.pedidos.total)}`)
  if (r.caixa.qtd) itens.push(`• Caixa do PDV fechado: ${brl(r.caixa.total)}`)
  if (r.notas.qtd) itens.push(`• ${plural(r.notas.qtd, 'nota fiscal', 'notas fiscais')}: ${brl(r.notas.total)}`)
  if (r.despesas.qtd) itens.push(`• ${plural(r.despesas.qtd, 'despesa', 'despesas')}: ${brl(r.despesas.total)}`)
  if (r.contagem.qtd) itens.push(`• Contagem de estoque${r.contagem.total ? `: ${brl(r.contagem.total)}` : ' feita'}`)

  return [
    `${EMOJI.resumo} *Resumo do dia* · ${diaMes(r.dia)}`,
    '',
    `*${r.restaurante}*`,
    `${r.usuario} registrou:`,
    ...itens,
    '',
    `Última atividade às ${r.ultimaHora.replace(':', 'h')}.`,
  ].join('\n')
}

export interface MovimentoDia {
  nome: string
  vendas: number
  totalPdv: number
  totalCaixa: number
  despesas: number
  totalDespesas: number
}

export function textoResumoGeral(dia: string, comMovimento: MovimentoDia[], semMovimento: string[]): string {
  const soma = (f: (m: MovimentoDia) => number) => comMovimento.reduce((s, m) => s + f(m), 0)
  const ativas = comMovimento.length + semMovimento.length
  const pedidos = soma((m) => m.vendas)
  const entrouCaixa = soma((m) => m.totalCaixa)
  const notas = soma((m) => m.despesas)

  const linhas = [`${EMOJI.resumo} *Resumo do dia* · ${diaMes(dia)}`, '', `${comMovimento.length} de ${ativas} restaurantes lançaram hoje.`]
  if (pedidos) linhas.push(`• ${plural(pedidos, 'venda', 'vendas')} no PDV: ${brl(soma((m) => m.totalPdv))}`)
  if (entrouCaixa) linhas.push(`• Entrou no caixa: ${brl(entrouCaixa)}`)
  if (notas) linhas.push(`• ${plural(notas, 'nota ou despesa', 'notas e despesas')}: ${brl(soma((m) => m.totalDespesas))}`)

  // Só os 5 maiores, para a mensagem caber numa tela.
  const maiores = [...comMovimento]
    .sort((a, b) => b.totalPdv + b.totalCaixa - (a.totalPdv + a.totalCaixa))
    .slice(0, 5)
  if (maiores.length) {
    linhas.push('', '*Maiores do dia*')
    for (const m of maiores) {
      const v = m.totalPdv + m.totalCaixa
      linhas.push(`• ${m.nome}: ${v ? brl(v) : plural(m.despesas, 'nota', 'notas')}`)
    }
  }
  if (semMovimento.length) {
    const nomes = [...new Set(semMovimento)]
    const resto = nomes.length > 3 ? ` e mais ${nomes.length - 3}` : ''
    linhas.push('', `Ainda sem lançamentos: ${nomes.slice(0, 3).join(', ')}${resto}.`)
  }
  return linhas.join('\n')
}

/* ------------------------------ Lembretes -------------------------------- */

export const LEMBRETE_INICIO_DO_MES =
  `${EMOJI.lembrete} *Lembrete: contagem de estoque*\nO mês começou. Com a loja fechada, vale fazer a contagem: o app calcula o que saiu e o CMV do mês.`

export const LEMBRETE_FIM_DO_MES =
  `${EMOJI.lembrete} *Lembrete: contagem de estoque*\nO mês está chegando ao fim. Se puder, reserve um momento até o dia 1 para contar o estoque, assim o CMV do mês fecha certo.`

/** Uma dica por segunda-feira, em rodízio. */
export const DICAS = [
  'Lançar as vendas no fim do expediente leva cerca de um minuto e deixa o fluxo de caixa certo, além de dar mais fidelidade ao resumo da segunda.',
  'Ao fotografar uma nota, confira os itens e os preços antes de confirmar. É assim que o app avisa quando um fornecedor aumenta o preço.',
  'A contagem de estoque fica mais fiel com a loja fechada. Com movimento, é mais difícil saber o que realmente saiu.',
  'Cada pedido no PDV já baixa o estoque pela ficha técnica e fecha a receita do dia automaticamente.',
  'Lançar a nota no dia em que ela chega evita contas esquecidas e um CMV fora do real.',
  'O plano do mês mostra se mercadoria, pessoal e taxas estão dentro do teto antes de passarem do limite.',
]

export const textoDica = (semana: number) => `${EMOJI.dica} *Dica da semana*\n${DICAS[semana % DICAS.length]}`
