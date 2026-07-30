/* ------------------------------------------------------------------ *
 * Plano de contas do DRE.
 *
 * Espelha o modelo padrão ("Modelo DRE"). Toda despesa lançada no app cai
 * numa CONTA, e toda conta pertence a um GRUPO, que é uma linha do
 * demonstrativo. Não existe conta fora do DRE nem linha do DRE sem conta —
 * é isso que impede lançamento em lugar errado.
 * ------------------------------------------------------------------ */

/** Uma linha de despesa/dedução do DRE. A ordem daqui é a ordem do relatório. */
export type GrupoDRE =
  | 'deducao'
  | 'cmv'
  | 'ocupacao'
  | 'pessoal'
  | 'administrativa'
  | 'operacional'
  | 'variavel'
  | 'franqueadora'
  | 'nao_operacional'

/** Subconta — o que o usuário escolhe ao lançar. */
export type CategoriaDespesa =
  // (−) Impostos, taxas e comissões sobre vendas
  | 'comissao_marketplace'
  | 'taxa_cartao'
  | 'antecipacao'
  | 'tarifa_bancaria'
  | 'imposto_vendas'
  // CMV
  | 'cmv_alimentos'
  | 'cmv_bebidas'
  | 'cmv_descartaveis'
  // (−) Ocupação
  | 'aluguel'
  | 'condominio'
  | 'agua'
  | 'luz'
  | 'gas'
  | 'iptu'
  | 'seguro'
  // (−) Despesas com pessoal
  | 'folha'
  | 'encargos'
  | 'vale_transporte'
  | 'vale_alimentacao'
  | 'bonus'
  | 'prolabore'
  | 'rescisoes'
  | 'pessoal_outros'
  // (−) Despesas administrativas
  | 'sistemas'
  | 'contador'
  // (−) Despesas operacionais
  | 'limpeza'
  | 'detetizacao'
  | 'coleta_lixo'
  // (−) Despesas variáveis
  | 'cupons_app'
  | 'marketing'
  | 'variavel_outros'
  // (−) Despesas da franqueadora
  | 'fundo_promocao'
  | 'royalties'
  // (−) Não operacional
  | 'retiradas'
  | 'multas'

export interface GrupoInfo {
  id: GrupoDRE
  /** Nome contábil, como sai no DRE. */
  nome: string
  /** Nome no jeito que o dono fala — chips, filtros e gráficos. */
  simples: string
  cor: string
  /** Onde entra no cálculo: antes da receita líquida, no CMV, etc. */
  posicao: 'deducao' | 'cmv' | 'operacional' | 'nao_operacional'
}

export const GRUPOS: GrupoInfo[] = [
  { id: 'deducao', nome: 'Impostos, taxas e comissões sobre vendas', simples: 'Taxas e impostos', cor: '#2F6B4A', posicao: 'deducao' },
  { id: 'cmv', nome: 'CMV — custo da mercadoria vendida', simples: 'Mercadoria', cor: '#C05437', posicao: 'cmv' },
  { id: 'ocupacao', nome: 'Ocupação', simples: 'Aluguel e contas', cor: '#EFAB5C', posicao: 'operacional' },
  { id: 'pessoal', nome: 'Despesas com pessoal', simples: 'Equipe', cor: '#2E5F73', posicao: 'operacional' },
  { id: 'administrativa', nome: 'Despesas administrativas', simples: 'Administrativo', cor: '#6A7A7E', posicao: 'operacional' },
  { id: 'operacional', nome: 'Despesas operacionais', simples: 'Operação', cor: '#8AA39B', posicao: 'operacional' },
  { id: 'variavel', nome: 'Despesas variáveis', simples: 'Marketing e variáveis', cor: '#D08A5A', posicao: 'operacional' },
  { id: 'franqueadora', nome: 'Despesas da franqueadora', simples: 'Franquia', cor: '#7B6A8C', posicao: 'operacional' },
  { id: 'nao_operacional', nome: 'Outras despesas, provisões e retiradas', simples: 'Fora da operação', cor: '#A8A29A', posicao: 'nao_operacional' },
]

export const GRUPO: Record<GrupoDRE, GrupoInfo> = Object.fromEntries(
  GRUPOS.map((g) => [g.id, g]),
) as Record<GrupoDRE, GrupoInfo>

export interface ContaInfo {
  id: CategoriaDespesa
  nome: string
  grupo: GrupoDRE
  /** Exemplo curto que aparece na gaveta pra não errar o lançamento. */
  ajuda?: string
  /** Sinônimos aceitos na importação por planilha e na leitura de nota por IA. */
  aliases?: string[]
}

export const CONTAS: ContaInfo[] = [
  // (−) Impostos, taxas e comissões sobre vendas
  { id: 'comissao_marketplace', nome: 'Comissão de app', grupo: 'deducao', ajuda: 'iFood, Rappi, 99Food', aliases: ['ifood', 'rappi', 'comissao', 'taxa de app', 'taxas_app', 'marketplace', '99food', 'uber eats'] },
  { id: 'taxa_cartao', nome: 'Taxa de cartão', grupo: 'deducao', ajuda: 'maquininha, Pix taxado', aliases: ['cartao', 'maquininha', 'stone', 'cielo', 'getnet', 'pagseguro', 'adquirente'] },
  { id: 'antecipacao', nome: 'Antecipação de recebíveis', grupo: 'deducao', ajuda: 'quando você puxa o dinheiro antes', aliases: ['antecipacao', 'antecipar'] },
  { id: 'tarifa_bancaria', nome: 'Tarifas bancárias', grupo: 'deducao', ajuda: 'conta, boleto, TED', aliases: ['tarifa', 'banco', 'bancaria'] },
  { id: 'imposto_vendas', nome: 'Imposto sobre venda', grupo: 'deducao', ajuda: 'Simples Nacional, MEI, ISS', aliases: ['imposto', 'simples', 'simples nacional', 'mei', 'iss', 'das', 'tributo'] },

  // CMV
  { id: 'cmv_alimentos', nome: 'Alimentos', grupo: 'cmv', ajuda: 'hortifrúti, carnes, secos', aliases: ['mercadoria', 'alimento', 'comida', 'hortifruti', 'carne', 'secos', 'insumo', 'materia prima', 'acougue', 'frigorifico', 'padaria'] },
  { id: 'cmv_bebidas', nome: 'Bebidas', grupo: 'cmv', ajuda: 'refrigerante, cerveja, suco', aliases: ['bebida', 'refrigerante', 'cerveja', 'suco', 'agua mineral', 'distribuidora'] },
  { id: 'cmv_descartaveis', nome: 'Descartáveis e embalagens', grupo: 'cmv', ajuda: 'marmita, sacola, guardanapo', aliases: ['descartavel', 'embalagem', 'marmita', 'sacola', 'copo', 'guardanapo'] },

  // (−) Ocupação
  { id: 'aluguel', nome: 'Aluguel', grupo: 'ocupacao', aliases: ['aluguel', 'locacao', 'ocupacao'] },
  { id: 'condominio', nome: 'Condomínio', grupo: 'ocupacao', aliases: ['condominio'] },
  { id: 'agua', nome: 'Água', grupo: 'ocupacao', aliases: ['agua', 'cedae', 'sabesp', 'saneamento'] },
  { id: 'luz', nome: 'Luz', grupo: 'ocupacao', ajuda: 'energia elétrica', aliases: ['luz', 'energia', 'light', 'enel', 'eletrica'] },
  { id: 'gas', nome: 'Gás', grupo: 'ocupacao', aliases: ['gas', 'ultragaz', 'botijao', 'glp'] },
  { id: 'iptu', nome: 'IPTU', grupo: 'ocupacao', aliases: ['iptu'] },
  { id: 'seguro', nome: 'Seguro', grupo: 'ocupacao', ajuda: 'seguro do ponto, incêndio', aliases: ['seguro', 'seguradora'] },

  // (−) Despesas com pessoal
  { id: 'folha', nome: 'Folha de pagamento', grupo: 'pessoal', ajuda: 'salários da equipe', aliases: ['folha', 'salario', 'pessoal', 'equipe', 'pagamento equipe'] },
  { id: 'encargos', nome: 'Encargos', grupo: 'pessoal', ajuda: 'FGTS, INSS', aliases: ['encargo', 'fgts', 'inss', 'gps'] },
  { id: 'vale_transporte', nome: 'Vale-transporte', grupo: 'pessoal', aliases: ['vale transporte', 'vt', 'transporte', 'passagem', 'riocard'] },
  { id: 'vale_alimentacao', nome: 'Vale-alimentação', grupo: 'pessoal', ajuda: 'VA/VR e refeição da equipe', aliases: ['vale alimentacao', 'va', 'vr', 'vale refeicao', 'alimentacao da equipe'] },
  { id: 'bonus', nome: 'Bônus e gorjetas', grupo: 'pessoal', aliases: ['bonus', 'premio', 'gorjeta', 'comissao equipe'] },
  { id: 'prolabore', nome: 'Pró-labore', grupo: 'pessoal', ajuda: 'o salário dos sócios', aliases: ['prolabore', 'pro labore', 'socio'] },
  { id: 'rescisoes', nome: 'Rescisões', grupo: 'pessoal', aliases: ['rescisao', 'demissao', 'acerto'] },
  { id: 'pessoal_outros', nome: 'Outros com pessoal', grupo: 'pessoal', ajuda: 'uniforme, exame, treinamento', aliases: ['uniforme', 'exame', 'treinamento', 'freelancer', 'extra'] },

  // (−) Despesas administrativas
  { id: 'sistemas', nome: 'Sistemas', grupo: 'administrativa', ajuda: 'PDV, delivery, este app', aliases: ['sistema', 'software', 'pdv', 'assinatura', 'mensalidade sistema', 'tecnologia'] },
  { id: 'contador', nome: 'Contador', grupo: 'administrativa', ajuda: 'honorários da contabilidade', aliases: ['contador', 'contabilidade', 'escritorio contabil'] },

  // (−) Despesas operacionais
  { id: 'limpeza', nome: 'Limpeza', grupo: 'operacional', ajuda: 'produtos e material de higiene', aliases: ['limpeza', 'higiene', 'detergente', 'produto de limpeza'] },
  { id: 'detetizacao', nome: 'Detetização', grupo: 'operacional', aliases: ['detetizacao', 'dedetizacao', 'controle de pragas'] },
  { id: 'coleta_lixo', nome: 'Coleta de lixo', grupo: 'operacional', ajuda: 'inclui coleta de óleo', aliases: ['lixo', 'coleta', 'residuo', 'oleo usado', 'comlurb'] },

  // (−) Despesas variáveis
  { id: 'cupons_app', nome: 'Cupons e patrocínio no app', grupo: 'variavel', ajuda: 'promoções bancadas por você no iFood', aliases: ['cupom', 'cupons', 'patrocinio', 'promocao ifood', 'super restaurante'] },
  { id: 'marketing', nome: 'Marketing e redes sociais', grupo: 'variavel', ajuda: 'anúncios, fotos, social media', aliases: ['marketing', 'anuncio', 'ads', 'trafego', 'social', 'instagram', 'publicidade', 'design'] },
  { id: 'variavel_outros', nome: 'Outras variáveis', grupo: 'variavel', ajuda: 'o que muda com o movimento', aliases: ['outros variaveis', 'diversos'] },

  // (−) Despesas da franqueadora
  { id: 'fundo_promocao', nome: 'Fundo de promoção', grupo: 'franqueadora', aliases: ['fundo', 'fundo de promocao', 'fpp'] },
  { id: 'royalties', nome: 'Royalties', grupo: 'franqueadora', aliases: ['royalt', 'royalties', 'franqueadora', 'franquia'] },

  // (−) Não operacional
  { id: 'retiradas', nome: 'Retiradas e provisões', grupo: 'nao_operacional', ajuda: 'dinheiro que sai do caixa e não é despesa da operação', aliases: ['retirada', 'provisao', 'distribuicao de lucro', 'emprestimo', 'obra', 'investimento'] },
  { id: 'multas', nome: 'Multas e juros', grupo: 'nao_operacional', ajuda: 'atraso de conta, multa de contrato', aliases: ['multa', 'juros', 'atraso', 'mora'] },
]

export const CONTA: Record<CategoriaDespesa, ContaInfo> = Object.fromEntries(
  CONTAS.map((c) => [c.id, c]),
) as Record<CategoriaDespesa, ContaInfo>

export function contasDoGrupo(g: GrupoDRE): ContaInfo[] {
  return CONTAS.filter((c) => c.grupo === g)
}

export function grupoDaConta(c: CategoriaDespesa): GrupoDRE {
  return CONTA[c]?.grupo ?? 'cmv'
}

/** Nome curto pra mostrar numa linha de lançamento. */
export function rotuloConta(c: CategoriaDespesa): string {
  return CONTA[c]?.nome ?? c
}

/* --------------------------- Normalização --------------------------- */

/** Categorias do modelo antigo (4 baldes) → conta padrão equivalente. */
const LEGADO: Record<string, CategoriaDespesa> = {
  mercadoria: 'cmv_alimentos',
  pessoal: 'folha',
  ocupacao: 'aluguel',
  taxas_app: 'comissao_marketplace',
}

function chave(v: string): string {
  return (v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Aliases achatados, do mais específico pro mais genérico. */
const INDICE: { termo: string; id: CategoriaDespesa }[] = CONTAS.flatMap((c) => [
  { termo: chave(c.id), id: c.id },
  { termo: chave(c.nome), id: c.id },
  ...(c.aliases ?? []).map((a) => ({ termo: chave(a), id: c.id })),
]).sort((a, b) => b.termo.length - a.termo.length)

/**
 * Texto livre (planilha importada, retorno da IA, dado legado) → conta válida.
 * Nunca devolve categoria fora do plano de contas.
 */
export function normalizarCategoria(v: string | undefined): CategoriaDespesa {
  const k = chave(v ?? '')
  if (!k) return 'cmv_alimentos'
  if (k.replace(/ /g, '_') in CONTA) return k.replace(/ /g, '_') as CategoriaDespesa
  const legado = LEGADO[k.replace(/ /g, '_')]
  if (legado) return legado
  const achou = INDICE.find((i) => i.termo && (k === i.termo || k.includes(i.termo) || i.termo.includes(k)))
  if (achou) return achou.id
  const grupo = GRUPOS.find((g) => chave(g.nome).includes(k) || chave(g.simples).includes(k))
  if (grupo) return contasDoGrupo(grupo.id)[0].id
  return 'cmv_alimentos'
}

/** Categoria de produto do estoque → conta de CMV correspondente. */
export function contaDeCmvDoProduto(categoriaProduto: string | undefined): CategoriaDespesa {
  const k = chave(categoriaProduto ?? '')
  if (k.includes('bebida')) return 'cmv_bebidas'
  if (k.includes('embalagem') || k.includes('descartavel')) return 'cmv_descartaveis'
  if (k.includes('limpeza')) return 'limpeza'
  return 'cmv_alimentos'
}

/* ------------------------------- Tetos ------------------------------- */

/** Teto de gasto (% do faturamento) por grupo — base do Plano do mês. */
export type Tetos = Partial<Record<GrupoDRE, number>>

export const TETOS_PADRAO: Tetos = {
  deducao: 18,
  cmv: 30,
  pessoal: 25,
  ocupacao: 10,
  administrativa: 2,
  operacional: 2,
  variavel: 4,
}

/** Grupos que aparecem no Plano do mês (os que o dono realmente controla). */
export const GRUPOS_COM_TETO: GrupoDRE[] = [
  'deducao', 'cmv', 'pessoal', 'ocupacao', 'administrativa', 'operacional', 'variavel', 'franqueadora',
]

/** Aceita tetos no formato antigo (mercadoria/taxas_app) e devolve por grupo. */
export function tetosNormalizados(tetos: Record<string, number> | undefined): Tetos {
  if (!tetos) return { ...TETOS_PADRAO }
  const out: Tetos = { ...TETOS_PADRAO }
  for (const [k, v] of Object.entries(tetos)) {
    if (typeof v !== 'number' || Number.isNaN(v)) continue
    if (k in GRUPO) out[k as GrupoDRE] = v
    else if (k === 'mercadoria') out.cmv = v
    else if (k === 'taxas_app') out.deducao = v
    else if (k === 'pessoal') out.pessoal = v
    else if (k === 'ocupacao') out.ocupacao = v
  }
  return out
}

/* ------------------------------ Receita ------------------------------ */

export type CanalVenda = 'balcao' | 'ifood' | 'rappi' | 'whatsapp' | 'outros'

export interface LinhaReceitaInfo {
  id: string
  nome: string
  canais: CanalVenda[]
  cor: string
}

/** As quatro linhas de receita bruta do modelo padrão. */
export const LINHAS_RECEITA: LinhaReceitaInfo[] = [
  { id: 'loja', nome: 'Vendas loja própria', canais: ['balcao'], cor: '#2E5F73' },
  { id: 'delivery_app', nome: 'Vendas delivery (apps)', canais: ['ifood', 'rappi'], cor: '#C05437' },
  { id: 'delivery_proprio', nome: 'Venda delivery próprio', canais: ['whatsapp'], cor: '#2F6B4A' },
  { id: 'outras', nome: 'Outras receitas', canais: ['outros'], cor: '#EFAB5C' },
]
