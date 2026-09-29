import type { Origem } from './tenant'
import type { Papel, TipoNegocio } from '@/types'
import type { CategoriaDespesa, CanalVenda, Tetos } from './planoContas'

/** Campos de autoria presentes em todo documento. */
export interface Autoria {
  criadoEm: string // ISO
  criadoPorId: string
  criadoPorNome: string
  origem: Origem
}

export interface RestauranteDoc {
  nome: string
  bairro: string
  cidade: string
  tipoOperacao: string
  tipoCozinha: string
  cnpj?: string
  regimeTributario: 'simples' | 'presumido'
  aliquotaImposto: number // ex 0.06
  metaFaturamento: number
  /** Teto de gasto por grupo do DRE, em % do faturamento. */
  tetos: Tetos
  aberturaMes: string // 'julho de 2026'
  /** Natureza do negócio — decide se o DRE tem linha de franqueadora. */
  tipoNegocio?: TipoNegocio
  /** Onboarding finalizado. Enquanto for falso, o dono cai nele ao entrar. */
  onboardingConcluido?: boolean
  /** Rede/franquia a que a loja pertence. */
  redeId?: string
  /** Nome da bandeira, quando faz parte de uma rede. */
  bandeira?: string
  /** % da receita bruta cobrados pela franqueadora. Só para franqueadas. */
  taxasFranquia?: { royalties: number; fundoPromocao: number }
}

export interface MembroDoc {
  nome: string
  inicial: string
  cor: string
  papel: Papel
  celular?: string
  conviteStatus?: 'ativo' | 'convite_enviado' | 'aguardando_dono'
}

export interface ProdutoDoc extends Autoria {
  id: string
  nome: string
  categoria: string // hortifruti, carnes, secos, bebidas, embalagens, limpeza
  unidade: string // kg, un, pacote, caixa, L, g
  custoAtual: number
  fornecedor: string
  estoqueMinimo?: number
  entraNoCmv: boolean
}

export interface ItemNota {
  /** Liga ao cadastro de produtos — item de nota sem produto não existe. */
  produtoId: string
  produto: string
  unidade?: string
  quantidade: number
  precoUnitario: number
  variacao?: number // % vs último preço
}

export interface DespesaDoc extends Autoria {
  id: string
  fornecedor: string
  descricao?: string
  categoria: CategoriaDespesa
  valorTotal: number
  dataCompetencia: string // ISO (dia)
  dataVencimento?: string
  formaPagamento: 'pix' | 'dinheiro' | 'cartao' | 'boleto' | 'transferencia' | 'automatico'
  status: 'pago' | 'a_pagar' | 'vence'
  recorrente: boolean
  observacao?: string
  itens?: ItemNota[]
  origemNota?: boolean // veio de foto/IA
  /**
   * Natureza do lançamento. 'compra' é mercadoria que entrou no estoque (vem
   * de nota fiscal); 'conta' é despesa da casa (aluguel, luz, folha). Os dois
   * somam no caixa e no DRE — só não se misturam na tela.
   * Lançamento antigo não tem o campo: classifica pela conta do DRE.
   */
  tipoLancamento?: 'conta' | 'compra'
  /** Agrupa os lançamentos gerados pela mesma nota fiscal. */
  notaId?: string
  /** Quando e por quem foi marcado como pago (o lançamento nasce 'a pagar'). */
  pagoEm?: string
  pagoPorNome?: string
  /** Última edição do lançamento (a autoria original não muda). */
  editadoEm?: string
  editadoPorNome?: string
}

/** Uma vez que alguém lançou (ou relançou) as vendas do dia. */
export interface LancamentoDeVendas {
  em: string // ISO
  porId: string
  porNome: string
  total: number
}

export interface ReceitaDiaDoc extends Autoria {
  id: string
  data: string // ISO dia
  /** Trilha de quem lançou as vendas do dia e quando — do primeiro ao último. */
  historico?: LancamentoDeVendas[]
  canais: { canal: CanalVenda; valorBruto: number; taxa: number; pedidos: number }[]
  recebimentos: { forma: string; valor: number }[]
  sangria: number
  totalDia: number
}

export interface ContagemDoc extends Autoria {
  id: string
  mesReferencia: string // '2026-07'
  /**
   * Dia em que o estoque foi contado ('YYYY-MM-DD'). Contagem antiga, do
   * tempo em que havia uma por mês, não tem o campo.
   */
  data?: string
  status: 'aberta' | 'fechada'
  itens: { produtoId: string; nome: string; unidade: string; custoUnitario: number; quantidade: number; contadoPor: string }[]
  valorEstoque?: number
}

export interface MovimentoDoc extends Autoria {
  id: string
  /** 'Entrou mercadoria' (vem de nota), 'Perda ou quebra', 'Contagem do mês', 'Transferência'. */
  tipo: string
  /** Dia do fato (a nota manda a data dela). ISO 'YYYY-MM-DD'. */
  data?: string
  produtoId: string
  produto: string
  quantidade: number
  custoUnitario: number
  valor: number
  /** Preenchido quando o movimento nasceu de uma nota fiscal. */
  notaId?: string
  /** Quem entregou — só nos movimentos que vieram de nota. */
  fornecedor?: string
  observacao?: string
}

export interface AtividadeDoc extends Autoria {
  id: string
  quem: string
  quemInicial: string
  quemCor: string
  acao: string
  entidade: string
  tipo: string // Despesa, Produto, Estoque, Fechamento...
  valor?: number
}

export interface InsightDoc {
  id: string
  rotulo: string
  texto: string
  acaoSugerida?: string
  criadoEm: string
}
