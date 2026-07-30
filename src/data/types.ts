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
  produto: string
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
}

export interface ReceitaDiaDoc extends Autoria {
  id: string
  data: string // ISO dia
  canais: { canal: CanalVenda; valorBruto: number; taxa: number; pedidos: number }[]
  recebimentos: { forma: string; valor: number }[]
  sangria: number
  totalDia: number
}

export interface ContagemDoc extends Autoria {
  id: string
  mesReferencia: string // '2026-07'
  status: 'aberta' | 'fechada'
  itens: { produtoId: string; nome: string; unidade: string; custoUnitario: number; quantidade: number; contadoPor: string }[]
  valorEstoque?: number
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
