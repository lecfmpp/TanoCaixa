import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getRestaurante, setRestaurante, repo } from './repo'
import type {
  DespesaDoc,
  ProdutoDoc,
  ReceitaDiaDoc,
  MembroDoc,
  AtividadeDoc,
  ContagemDoc,
  InsightDoc,
} from './types'
import type { Origem } from './tenant'

const dia = (d: number) => `2026-07-${String(d).padStart(2, '0')}`
const autor = (nome: string, id: string, o: Origem = 'computador', d = 27) => ({
  criadoEm: `${dia(d)}T12:00:00.000Z`,
  criadoPorId: id,
  criadoPorNome: nome,
  origem: o,
})

const HALIM = { id: 'halim', nome: 'Halim', inicial: 'H', cor: '#2E5F73' }
const JAMILE = { id: 'jamile', nome: 'Jamile', inicial: 'J', cor: '#C05437' }
const WESLEY = { id: 'wesley', nome: 'Wesley', inicial: 'W', cor: '#2F6B4A' }

const membros: (MembroDoc & { id: string })[] = [
  { id: HALIM.id, nome: 'Halim Nassar', inicial: 'H', cor: '#2E5F73', papel: 'dono', celular: '(21) 99814-2207', conviteStatus: 'ativo' },
  { id: JAMILE.id, nome: 'Jamile Rocha', inicial: 'J', cor: '#C05437', papel: 'gestao', celular: '(21) 99640-1188', conviteStatus: 'ativo' },
  { id: WESLEY.id, nome: 'Wesley Lima', inicial: 'W', cor: '#2F6B4A', papel: 'caixa', celular: '(21) 99512-7788', conviteStatus: 'ativo' },
]

const produtos: ProdutoDoc[] = [
  { id: 'p1', nome: 'Grão de bico seco', categoria: 'Secos', unidade: 'kg', custoAtual: 9.8, fornecedor: 'Casa Líbano', estoqueMinimo: 15, entraNoCmv: true, ...autor('Halim', 'halim') },
  { id: 'p2', nome: 'Tomate italiano', categoria: 'Hortifrúti', unidade: 'kg', custoAtual: 8.9, fornecedor: 'Hortifrúti Zona Sul', estoqueMinimo: 10, entraNoCmv: true, ...autor('Jamile', 'jamile', 'ia_foto') },
  { id: 'p3', nome: 'Berinjela', categoria: 'Hortifrúti', unidade: 'kg', custoAtual: 7.2, fornecedor: 'Hortifrúti Zona Sul', estoqueMinimo: 8, entraNoCmv: true, ...autor('Jamile', 'jamile', 'ia_foto') },
  { id: 'p4', nome: 'Carne moída patinho', categoria: 'Carnes', unidade: 'kg', custoAtual: 38, fornecedor: 'Frigorífico Salomão', estoqueMinimo: 12, entraNoCmv: true, ...autor('Halim', 'halim') },
  { id: 'p5', nome: 'Pão sírio', categoria: 'Secos', unidade: 'pacote', custoAtual: 6.5, fornecedor: 'Padaria Líbano', entraNoCmv: true, ...autor('Halim', 'halim') },
  { id: 'p6', nome: 'Coca-Cola lata', categoria: 'Bebidas', unidade: 'un', custoAtual: 3.2, fornecedor: 'Distribuidora Zona Sul', entraNoCmv: true, ...autor('Wesley', 'wesley', 'celular') },
  { id: 'p7', nome: 'Marmita de alumínio', categoria: 'Embalagens', unidade: 'pacote', custoAtual: 0.85, fornecedor: 'Embalagens RJ', entraNoCmv: false, ...autor('Wesley', 'wesley', 'celular') },
  { id: 'p8', nome: 'Detergente neutro', categoria: 'Limpeza', unidade: 'un', custoAtual: 4.5, fornecedor: 'Atacadão', entraNoCmv: false, ...autor('Wesley', 'wesley', 'celular') },
]

const receita: ReceitaDiaDoc[] = [
  { id: 'r1', data: dia(4), canais: [{ canal: 'ifood', valorBruto: 7000, taxa: 1610, pedidos: 92 }, { canal: 'balcao', valorBruto: 4240, taxa: 0, pedidos: 61 }], recebimentos: [], sangria: 0, totalDia: 11240, ...autor('Automático', 'sistema', 'integracao', 4) },
  { id: 'r2', data: dia(11), canais: [{ canal: 'ifood', valorBruto: 8000, taxa: 1840, pedidos: 104 }, { canal: 'balcao', valorBruto: 5240, taxa: 0, pedidos: 72 }], recebimentos: [], sangria: 0, totalDia: 13240, ...autor('Automático', 'sistema', 'integracao', 11) },
  { id: 'r3', data: dia(18), canais: [{ canal: 'ifood', valorBruto: 6500, taxa: 1495, pedidos: 85 }, { canal: 'balcao', valorBruto: 3860, taxa: 0, pedidos: 54 }], recebimentos: [], sangria: 0, totalDia: 10360, ...autor('Automático', 'sistema', 'integracao', 18) },
  { id: 'r4', data: dia(25), canais: [{ canal: 'ifood', valorBruto: 7500, taxa: 1725, pedidos: 98 }, { canal: 'balcao', valorBruto: 4980, taxa: 0, pedidos: 69 }], recebimentos: [], sangria: 0, totalDia: 12480, ...autor('Automático', 'sistema', 'integracao', 25) },
]

const D = (
  id: string,
  fornecedor: string,
  categoria: DespesaDoc['categoria'],
  valorTotal: number,
  d: number,
  status: DespesaDoc['status'],
  forma: DespesaDoc['formaPagamento'],
  extra: Partial<DespesaDoc> = {},
): DespesaDoc => ({
  id,
  fornecedor,
  categoria,
  valorTotal,
  dataCompetencia: dia(d),
  formaPagamento: forma,
  status,
  recorrente: false,
  ...autor('Halim', 'halim', 'computador', d),
  ...extra,
})

const despesas: DespesaDoc[] = [
  // Mercadoria (CMV) = 14.640
  D('d1', 'Hortifrúti Zona Sul', 'mercadoria', 842, 26, 'pago', 'pix', { descricao: 'Feira da semana', origemNota: true, ...autor('Jamile', 'jamile', 'ia_foto', 26) }),
  D('d2', 'Frigorífico Salomão', 'mercadoria', 1284, 28, 'pago', 'pix', { descricao: 'Carnes', origemNota: true, ...autor('Jamile', 'jamile', 'ia_foto', 28) }),
  D('d3', 'Casa Líbano', 'mercadoria', 2450, 3, 'pago', 'boleto', { descricao: 'Secos e grãos' }),
  D('d4', 'Hortifrúti Cadeg', 'mercadoria', 1960, 10, 'pago', 'pix'),
  D('d5', 'Distribuidora Zona Sul', 'mercadoria', 1740, 12, 'pago', 'cartao', { descricao: 'Bebidas' }),
  D('d6', 'Frigorífico Salomão', 'mercadoria', 3180, 17, 'pago', 'boleto', { descricao: 'Carnes halal' }),
  D('d7', 'Embalagens RJ', 'mercadoria', 1120, 19, 'a_pagar', 'boleto', { dataVencimento: dia(29) }),
  D('d8', 'Hortifrúti do Zé', 'mercadoria', 2064, 6, 'pago', 'pix'),
  // Pessoal = 10.900
  D('d9', 'Folha da equipe', 'pessoal', 9200, 5, 'pago', 'automatico', { descricao: 'Salários', ...autor('Automático', 'sistema', 'integracao', 5) }),
  D('d10', 'Vale-transporte', 'pessoal', 900, 5, 'pago', 'automatico'),
  D('d11', 'Alimentação da equipe', 'pessoal', 800, 15, 'pago', 'dinheiro'),
  // Ocupação = 6.300
  D('d12', 'Aluguel', 'ocupacao', 3400, 1, 'a_pagar', 'boleto', { recorrente: true, dataVencimento: dia(5), descricao: 'todo dia 5' }),
  D('d13', 'Light · conta de luz', 'ocupacao', 1240, 14, 'vence', 'boleto', { recorrente: true, dataVencimento: dia(31), descricao: 'todo dia 31' }),
  D('d14', 'Ultragaz', 'ocupacao', 680, 10, 'pago', 'pix', { recorrente: true }),
  D('d15', 'Internet e telefone', 'ocupacao', 320, 18, 'pago', 'automatico', { recorrente: true, descricao: 'todo dia 18' }),
  D('d16', 'Condomínio', 'ocupacao', 660, 8, 'pago', 'boleto'),
  // Taxas de app = 7.340
  D('d17', 'Taxa iFood · julho', 'taxas_app', 4980, 27, 'pago', 'automatico', { ...autor('Automático', 'sistema', 'integracao', 27) }),
  D('d18', 'Taxa Rappi · julho', 'taxas_app', 1310, 27, 'pago', 'automatico', { ...autor('Automático', 'sistema', 'integracao', 27) }),
  D('d19', 'Maquininha Stone', 'taxas_app', 1050, 27, 'pago', 'automatico', { ...autor('Automático', 'sistema', 'integracao', 27) }),
]

const atividades: AtividadeDoc[] = [
  { id: 'at1', quem: 'Jamile', quemInicial: 'J', quemCor: '#C05437', acao: 'lançou a nota do', entidade: 'Frigorífico Salomão', tipo: 'Despesa', valor: 1284, ...autor('Jamile', 'jamile', 'ia_foto', 28) },
  { id: 'at2', quem: 'Wesley', quemInicial: 'W', quemCor: '#2F6B4A', acao: 'contou', entidade: '12 itens do estoque', tipo: 'Estoque', valor: 4180.6, ...autor('Wesley', 'wesley', 'celular', 28) },
  { id: 'at3', quem: 'Automático', quemInicial: '', quemCor: '#AEB9B8', acao: 'puxou as vendas do', entidade: 'iFood e da Rappi', tipo: 'Fechamento', valor: 928.9, ...autor('Automático', 'sistema', 'integracao', 28) },
  { id: 'at4', quem: 'Halim', quemInicial: 'H', quemCor: '#2E5F73', acao: 'fechou o caixa de', entidade: 'sábado', tipo: 'Fechamento', valor: 1412.3, ...autor('Halim', 'halim', 'computador', 27) },
]

const insights: InsightDoc[] = [
  {
    id: 'i1',
    rotulo: 'O que dá pra fazer hoje',
    texto:
      'O hortifrúti subiu 12% na semana. Tomate e berinjela puxaram — os dois entram no Beirute e no prato de kafta.',
    acaoSugerida: 'Pedir preço no Cadeg antes da próxima compra',
    criadoEm: `${dia(28)}T09:00:00.000Z`,
  },
]

const contagem: ContagemDoc = {
  id: '2026-07',
  mesReferencia: '2026-07',
  status: 'aberta',
  itens: produtos.map((p, i) => ({
    produtoId: p.id,
    nome: p.nome,
    unidade: p.unidade,
    custoUnitario: p.custoAtual,
    quantidade: [18, 14, 9, 11, 7, 48, 320, 12][i] ?? 0,
    contadoPor: 'Wesley',
  })),
  valorEstoque: 12418.2,
  ...autor('Wesley', 'wesley', 'celular', 26),
}

/** Cria os dados da demonstração se o tenant ainda estiver vazio. */
export async function seedDemoSeVazio(tenant: string): Promise<void> {
  // Integrações — sempre garantidas (idempotente), independente do resto.
  await setDoc(
    doc(db, 'restaurants', tenant, 'integracoes', 'ifood'),
    {
      provedor: 'ifood',
      status: 'conectado',
      merchantId: 'demo-merchant',
      ultimoSyncEm: `${dia(28)}T06:00:00.000Z`,
      pedidosUltimoDia: 38,
      faturamentoUltimoDia: 742.5,
    },
    { merge: true },
  )
  await setDoc(
    doc(db, 'restaurants', tenant, 'integracoes', 'rappi'),
    { provedor: 'rappi', status: 'conectando', pedidosUltimoDia: 9, faturamentoUltimoDia: 186.4 },
    { merge: true },
  )

  const existente = await getRestaurante(tenant)
  if (existente) return

  await setRestaurante(tenant, {
    nome: 'Zaatar Cozinha Árabe',
    bairro: 'Botafogo',
    cidade: 'Rio de Janeiro',
    tipoOperacao: 'delivery_salao',
    tipoCozinha: 'Árabe',
    cnpj: '',
    regimeTributario: 'simples',
    aliquotaImposto: 0.06,
    metaFaturamento: 50000,
    tetos: { mercadoria: 30, pessoal: 25, ocupacao: 15, taxas_app: 12 },
    aberturaMes: 'julho de 2026',
  })

  await Promise.all([
    ...membros.map((m) => repo.membros.salvar(tenant, m.id, m)),
    ...produtos.map((p) => repo.produtos.salvar(tenant, p.id, p)),
    ...receita.map((r) => repo.receitaDia.salvar(tenant, r.id, r)),
    ...despesas.map((d) => repo.despesas.salvar(tenant, d.id, d)),
    ...atividades.map((a) => repo.atividades.salvar(tenant, a.id, a)),
    ...insights.map((i) => repo.insights.salvar(tenant, i.id, i)),
    repo.contagens.salvar(tenant, contagem.id, contagem),
  ])
}
