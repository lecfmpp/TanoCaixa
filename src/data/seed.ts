import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getRestaurante, setRestaurante, repo } from './repo'
import { TETOS_PADRAO } from './planoContas'
import { getRede, salvarRede } from './rede'
import { DEMO_TENANT, LOJAS_DEMO, REDE_DEMO } from './tenant'
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

/** Versão dos dados da demonstração.
 *  2 = plano de contas do DRE padrão. 3 = rede com três lojas. */
const SEED_VERSAO = 3

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

/** Uma linha de receita por canal — as quatro linhas de receita bruta do DRE. */
const R = (
  id: string,
  d: number,
  v: { ifood: [number, number, number]; balcao: [number, number]; whatsapp?: number; outros?: number },
): ReceitaDiaDoc => {
  const canais = [
    { canal: 'ifood' as const, valorBruto: v.ifood[0], taxa: v.ifood[1], pedidos: v.ifood[2] },
    { canal: 'balcao' as const, valorBruto: v.balcao[0], taxa: 0, pedidos: v.balcao[1] },
    ...(v.whatsapp ? [{ canal: 'whatsapp' as const, valorBruto: v.whatsapp, taxa: 0, pedidos: 0 }] : []),
    ...(v.outros ? [{ canal: 'outros' as const, valorBruto: v.outros, taxa: 0, pedidos: 0 }] : []),
  ]
  return {
    id,
    data: dia(d),
    canais,
    recebimentos: [],
    sangria: 0,
    totalDia: canais.reduce((s, c) => s + c.valorBruto, 0),
    ...autor('Automático', 'sistema', 'integracao', d),
  }
}

const receita: ReceitaDiaDoc[] = [
  R('r1', 4, { ifood: [7000, 1610, 92], balcao: [4240, 61], whatsapp: 1180 }),
  R('r2', 11, { ifood: [8000, 1840, 104], balcao: [5240, 72], whatsapp: 1420 }),
  R('r3', 18, { ifood: [6500, 1495, 85], balcao: [3860, 54], whatsapp: 980 }),
  R('r4', 25, { ifood: [7500, 1725, 98], balcao: [4980, 69], whatsapp: 1320, outros: 900 }),
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
  // (−) Impostos, taxas e comissões sobre vendas = 10.943,20
  D('d17', 'Taxa iFood · julho', 'comissao_marketplace', 4980, 27, 'pago', 'automatico', { ...autor('Automático', 'sistema', 'integracao', 27) }),
  D('d18', 'Taxa Rappi · julho', 'comissao_marketplace', 1310, 27, 'pago', 'automatico', { ...autor('Automático', 'sistema', 'integracao', 27) }),
  D('d19', 'Maquininha Stone', 'taxa_cartao', 1050, 27, 'pago', 'automatico', { ...autor('Automático', 'sistema', 'integracao', 27) }),
  D('d20', 'Antecipação Stone', 'antecipacao', 320, 27, 'pago', 'automatico', { descricao: 'recebíveis de julho' }),
  D('d21', 'Tarifas · Banco do Brasil', 'tarifa_bancaria', 96, 27, 'pago', 'automatico', { recorrente: true }),
  D('d22', 'Simples Nacional · DAS', 'imposto_vendas', 3187.2, 20, 'pago', 'boleto', { descricao: '6% sobre o faturamento' }),

  // CMV — compras do mês = 14.640
  D('d1', 'Hortifrúti Zona Sul', 'cmv_alimentos', 842, 26, 'pago', 'pix', { descricao: 'Feira da semana', origemNota: true, ...autor('Jamile', 'jamile', 'ia_foto', 26) }),
  D('d2', 'Frigorífico Salomão', 'cmv_alimentos', 1284, 28, 'pago', 'pix', { descricao: 'Carnes', origemNota: true, ...autor('Jamile', 'jamile', 'ia_foto', 28) }),
  D('d3', 'Casa Líbano', 'cmv_alimentos', 2450, 3, 'pago', 'boleto', { descricao: 'Secos e grãos' }),
  D('d4', 'Hortifrúti Cadeg', 'cmv_alimentos', 1960, 10, 'pago', 'pix'),
  D('d5', 'Distribuidora Zona Sul', 'cmv_bebidas', 1740, 12, 'pago', 'cartao', { descricao: 'Refrigerantes e cervejas' }),
  D('d6', 'Frigorífico Salomão', 'cmv_alimentos', 3180, 17, 'pago', 'boleto', { descricao: 'Carnes halal' }),
  D('d7', 'Embalagens RJ', 'cmv_descartaveis', 1120, 19, 'a_pagar', 'boleto', { dataVencimento: dia(29) }),
  D('d8', 'Hortifrúti do Zé', 'cmv_alimentos', 2064, 6, 'pago', 'pix'),

  // (−) Ocupação = 6.710
  D('d12', 'Aluguel', 'aluguel', 3400, 1, 'a_pagar', 'boleto', { recorrente: true, dataVencimento: dia(5), descricao: 'todo dia 5' }),
  D('d13', 'Light · conta de luz', 'luz', 1240, 14, 'vence', 'boleto', { recorrente: true, dataVencimento: dia(31), descricao: 'todo dia 31' }),
  D('d14', 'Ultragaz', 'gas', 680, 10, 'pago', 'pix', { recorrente: true }),
  D('d16', 'Condomínio', 'condominio', 660, 8, 'pago', 'boleto'),
  D('d23', 'Cedae', 'agua', 310, 12, 'pago', 'boleto', { recorrente: true }),
  D('d24', 'IPTU · parcela 7', 'iptu', 240, 10, 'pago', 'boleto', { recorrente: true }),
  D('d25', 'Seguro do ponto', 'seguro', 180, 5, 'pago', 'automatico', { recorrente: true }),

  // (−) Despesas com pessoal = 11.220
  D('d9', 'Folha da equipe', 'folha', 8400, 5, 'pago', 'automatico', { descricao: 'Salários', ...autor('Automático', 'sistema', 'integracao', 5) }),
  D('d26', 'FGTS e INSS', 'encargos', 1120, 7, 'pago', 'boleto', { descricao: 'Encargos da folha' }),
  D('d10', 'Vale-transporte', 'vale_transporte', 900, 5, 'pago', 'automatico'),
  D('d11', 'Alimentação da equipe', 'vale_alimentacao', 800, 15, 'pago', 'dinheiro'),

  // (−) Despesas administrativas = 1.249
  D('d15', 'Internet e telefone', 'sistemas', 320, 18, 'pago', 'automatico', { recorrente: true, descricao: 'todo dia 18' }),
  D('d27', 'TanoCaixa · plano Casa cheia', 'sistemas', 149, 3, 'pago', 'cartao', { recorrente: true }),
  D('d28', 'Contabilidade Nassar', 'contador', 780, 10, 'pago', 'pix', { recorrente: true, descricao: 'Honorários de julho' }),

  // (−) Despesas operacionais = 830
  D('d29', 'Atacadão · material de limpeza', 'limpeza', 380, 9, 'pago', 'cartao'),
  D('d30', 'Dedetizadora Botafogo', 'detetizacao', 260, 16, 'pago', 'pix', { descricao: 'Visita trimestral' }),
  D('d31', 'Coleta de óleo e lixo', 'coleta_lixo', 190, 22, 'pago', 'pix', { recorrente: true }),

  // (−) Despesas variáveis = 1.540
  D('d32', 'Cupons iFood', 'cupons_app', 640, 27, 'pago', 'automatico', { descricao: 'Promoção do fim de semana' }),
  D('d33', 'Social media · Larissa', 'marketing', 900, 12, 'pago', 'pix', { recorrente: true }),

  // (−) Outras despesas, provisões e retiradas = 1.587
  D('d34', 'Retirada dos sócios', 'retiradas', 1500, 20, 'pago', 'transferencia'),
  D('d35', 'Juros · conta de luz de junho', 'multas', 87, 8, 'pago', 'boleto'),
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

/** Contagem de um mês. Fechada, ela vira o estoque que fecha o CMV do DRE. */
const C = (mes: string, quantidades: number[], valorEstoque: number, d: number): ContagemDoc => ({
  id: mes,
  mesReferencia: mes,
  status: 'fechada',
  itens: produtos.map((p, i) => ({
    produtoId: p.id,
    nome: p.nome,
    unidade: p.unidade,
    custoUnitario: p.custoAtual,
    quantidade: quantidades[i] ?? 0,
    contadoPor: 'Wesley',
  })),
  valorEstoque,
  ...autor('Wesley', 'wesley', 'celular', d),
})

// Estoque no fim de junho = estoque inicial de julho. Sem ele o CMV é só compra.
const contagens: ContagemDoc[] = [
  C('2026-06', [16, 12, 8, 10, 6, 44, 290, 10], 11840, 1),
  C('2026-07', [18, 14, 9, 11, 7, 48, 320, 12], 12418.2, 26),
]

/* --------------------- Rede de demonstração --------------------------- *
 * A matriz (Botafogo) é a franqueadora; as outras duas são franqueadas, com
 * royalties e fundo de promoção. Cada uma é um tenant próprio — é exatamente
 * assim que a rede de um cliente real fica.
 * ------------------------------------------------------------------------ */

const escalar = (v: number, f: number) => Math.round(v * f * 100) / 100

/** Copia os dados da matriz numa loja da rede, com o movimento escalado. */
async function seedLojaDaRede(l: (typeof LOJAS_DEMO)[number]): Promise<void> {
  await setRestaurante(l.id, {
    seedVersao: SEED_VERSAO,
    nome: l.nome,
    bairro: l.bairro,
    cidade: 'Rio de Janeiro',
    tipoOperacao: 'delivery_salao',
    tipoCozinha: 'Árabe',
    cnpj: '',
    regimeTributario: 'simples',
    aliquotaImposto: 0.06,
    metaFaturamento: Math.round(50000 * l.fator),
    tetos: TETOS_PADRAO,
    aberturaMes: 'julho de 2026',
    tipoNegocio: 'franqueada',
    redeId: REDE_DEMO,
    bandeira: 'Zaatar',
    taxasFranquia: { royalties: 5, fundoPromocao: 2 },
  } as never)

  await Promise.all([
    ...receita.map((r) =>
      repo.receitaDia.salvar(l.id, r.id, {
        ...r,
        canais: r.canais.map((c) => ({ ...c, valorBruto: escalar(c.valorBruto, l.fator), taxa: escalar(c.taxa, l.fator) })),
        totalDia: escalar(r.totalDia, l.fator),
      }),
    ),
    // O imposto acompanha o faturamento; o resto escala junto.
    ...despesas.map((d) => repo.despesas.salvar(l.id, d.id, { ...d, valorTotal: escalar(d.valorTotal, l.fator) })),
    ...contagens.map((c) =>
      repo.contagens.salvar(l.id, c.id, { ...c, valorEstoque: escalar(c.valorEstoque ?? 0, l.fator) }),
    ),
  ])
}

/** Idempotente e independente do tenant matriz: se a rede não existe, cria. */
async function seedRedeDemo(): Promise<void> {
  if (await getRede(REDE_DEMO)) return
  await Promise.all(LOJAS_DEMO.map(seedLojaDaRede))
  await salvarRede(REDE_DEMO, {
    id: REDE_DEMO,
    nome: 'Zaatar',
    tipo: 'franquia',
    donoUid: 'halim',
    lojas: [
      { restauranteId: DEMO_TENANT, nome: 'Zaatar Botafogo', bairro: 'Botafogo', cidade: 'Rio de Janeiro', propria: true },
      ...LOJAS_DEMO.map((l) => ({ restauranteId: l.id, nome: l.nome, bairro: l.bairro, cidade: 'Rio de Janeiro' })),
    ],
    criadoEm: `${dia(1)}T09:00:00.000Z`,
  })
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

  // Rede de demonstração — garantida à parte, pelo mesmo motivo das
  // integrações: independe do estado do tenant matriz.
  await seedRedeDemo()

  // Sobe a versão sempre que os dados da demo mudarem de forma (aqui: plano de
  // contas do DRE) — senão o tenant demo antigo fica preso no modelo velho.
  const existente = await getRestaurante(tenant)
  if ((existente as { seedVersao?: number } | null)?.seedVersao === SEED_VERSAO) return

  await setRestaurante(tenant, {
    seedVersao: SEED_VERSAO,
    nome: 'Zaatar Cozinha Árabe',
    bairro: 'Botafogo',
    cidade: 'Rio de Janeiro',
    tipoOperacao: 'delivery_salao',
    tipoCozinha: 'Árabe',
    cnpj: '',
    regimeTributario: 'simples',
    aliquotaImposto: 0.06,
    metaFaturamento: 50000,
    tetos: TETOS_PADRAO,
    aberturaMes: 'julho de 2026',
    // A matriz é a franqueadora da rede — não paga royalties, mas enxerga
    // o consolidado das lojas.
    tipoNegocio: 'franqueadora',
    redeId: REDE_DEMO,
    bandeira: 'Zaatar',
  } as never)

  await Promise.all([
    ...membros.map((m) => repo.membros.salvar(tenant, m.id, m)),
    ...produtos.map((p) => repo.produtos.salvar(tenant, p.id, p)),
    ...receita.map((r) => repo.receitaDia.salvar(tenant, r.id, r)),
    ...despesas.map((d) => repo.despesas.salvar(tenant, d.id, d)),
    ...atividades.map((a) => repo.atividades.salvar(tenant, a.id, a)),
    ...insights.map((i) => repo.insights.salvar(tenant, i.id, i)),
    ...contagens.map((c) => repo.contagens.salvar(tenant, c.id, c)),
  ])
}
