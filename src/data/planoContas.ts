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

/** As contas que já vêm no modelo padrão do DRE. */
export type CategoriaPadrao =
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

/**
 * Subconta — o que o usuário escolhe ao lançar.
 *
 * Aberto a string porque a loja pode criar conta própria (id `c-…`). As contas
 * do modelo continuam sugeridas no autocompletar; o que garante que ninguém
 * lance numa conta inexistente é o `normalizarCategoria`, não o tipo.
 */
export type CategoriaDespesa = CategoriaPadrao | (string & {})

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
  { id: 'deducao', nome: 'Impostos, taxas e comissões sobre vendas', simples: 'Impostos, taxas e comissões sobre vendas', cor: '#2F6B4A', posicao: 'deducao' },
  { id: 'cmv', nome: 'CMV', simples: 'CMV', cor: '#C05437', posicao: 'cmv' },
  { id: 'ocupacao', nome: 'Ocupação', simples: 'Ocupação', cor: '#EFAB5C', posicao: 'operacional' },
  { id: 'pessoal', nome: 'Despesas com pessoal', simples: 'Despesas com pessoal', cor: '#2E5F73', posicao: 'operacional' },
  { id: 'administrativa', nome: 'Despesas Administrativas', simples: 'Despesas Administrativas', cor: '#6A7A7E', posicao: 'operacional' },
  { id: 'operacional', nome: 'Despesas Operacionais', simples: 'Despesas Operacionais', cor: '#8AA39B', posicao: 'operacional' },
  { id: 'variavel', nome: 'Despesas Variáveis', simples: 'Despesas Variáveis', cor: '#D08A5A', posicao: 'operacional' },
  { id: 'franqueadora', nome: 'Despesas Franqueadora', simples: 'Despesas Franqueadora', cor: '#7B6A8C', posicao: 'operacional' },
  { id: 'nao_operacional', nome: 'Outras despesas / provisões / retiradas', simples: 'Outras despesas / provisões / retiradas', cor: '#A8A29A', posicao: 'nao_operacional' },
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
  /** Conta criada pela loja — só ela pode ser apagada de vez. */
  propria?: boolean
  /**
   * Conta do modelo que a loja escondeu. Some das listas de lançamento, mas
   * continua existindo: o que já foi lançado nela segue somando no DRE.
   */
  arquivada?: boolean
}

/** O modelo padrão. Nunca muda — a loja personaliza por cima dele. */
export const CONTAS_PADRAO: ContaInfo[] = [
  // (−) Impostos, taxas e comissões sobre vendas
  // Aliases de outros apps ficam só para classificar notas/CSV antigos nesta conta.
  { id: 'comissao_marketplace', nome: 'Comissão iFood', grupo: 'deducao', ajuda: 'comissão e taxas do app de delivery', aliases: ['ifood', 'rappi', 'comissao', 'taxa de app', 'taxas_app', 'marketplace', '99food', 'uber eats', 'comissao de app'] },
  { id: 'tarifa_bancaria', nome: 'Tarifas bancárias', grupo: 'deducao', ajuda: 'conta, boleto, TED', aliases: ['tarifa', 'banco', 'bancaria'] },
  { id: 'antecipacao', nome: 'Antecipação', grupo: 'deducao', ajuda: 'quando você puxa o dinheiro antes', aliases: ['antecipacao', 'antecipar', 'antecipacao de recebiveis'] },
  { id: 'taxa_cartao', nome: 'Taxas de cartão', grupo: 'deducao', ajuda: 'maquininha, Pix taxado', aliases: ['taxa de cartao', 'cartao', 'maquininha', 'stone', 'cielo', 'getnet', 'pagseguro', 'adquirente'] },
  { id: 'imposto_vendas', nome: 'Simples Nacional / MEI / ISS / outros', grupo: 'deducao', ajuda: 'DAS, MEI, ISS e outros impostos sobre a venda', aliases: ['imposto', 'imposto sobre venda', 'simples', 'simples nacional', 'mei', 'iss', 'das', 'tributo'] },

  // CMV
  { id: 'cmv_alimentos', nome: 'CMV - Matéria Prima (alimentos)', grupo: 'cmv', ajuda: 'hortifrúti, carnes, secos', aliases: ['alimentos', 'mercadoria', 'alimento', 'comida', 'hortifruti', 'carne', 'secos', 'insumo', 'materia prima', 'acougue', 'frigorifico', 'padaria'] },
  { id: 'cmv_bebidas', nome: 'CMV - Matéria Prima (bebidas)', grupo: 'cmv', ajuda: 'refrigerante, cerveja, suco', aliases: ['bebidas', 'bebida', 'refrigerante', 'cerveja', 'suco', 'agua mineral', 'distribuidora'] },
  { id: 'cmv_descartaveis', nome: 'CMV - Matéria Prima (descartáveis)', grupo: 'cmv', ajuda: 'marmita, sacola, guardanapo', aliases: ['descartaveis', 'descartavel', 'embalagem', 'embalagens', 'marmita', 'sacola', 'copo', 'guardanapo'] },

  // (−) Ocupação
  { id: 'aluguel', nome: 'Aluguel', grupo: 'ocupacao', aliases: ['aluguel', 'locacao', 'ocupacao'] },
  { id: 'condominio', nome: 'Condomínio', grupo: 'ocupacao', aliases: ['condominio'] },
  { id: 'agua', nome: 'Água', grupo: 'ocupacao', aliases: ['agua', 'cedae', 'sabesp', 'saneamento'] },
  { id: 'luz', nome: 'Luz', grupo: 'ocupacao', ajuda: 'energia elétrica', aliases: ['luz', 'energia', 'light', 'enel', 'eletrica'] },
  { id: 'gas', nome: 'Gás', grupo: 'ocupacao', aliases: ['gas', 'ultragaz', 'botijao', 'glp'] },
  { id: 'iptu', nome: 'IPTU', grupo: 'ocupacao', aliases: ['iptu'] },
  { id: 'seguro', nome: 'Seguro', grupo: 'ocupacao', ajuda: 'seguro do ponto, incêndio', aliases: ['seguro', 'seguradora'] },

  // (−) Despesas com pessoal
  { id: 'folha', nome: 'Folha de Pagamento', grupo: 'pessoal', ajuda: 'salários da equipe', aliases: ['folha', 'salario', 'pessoal', 'equipe', 'pagamento equipe', 'folha de pagamento'] },
  { id: 'encargos', nome: 'Encargos (FGTS)', grupo: 'pessoal', ajuda: 'FGTS, INSS', aliases: ['encargo', 'encargos', 'fgts', 'inss', 'gps'] },
  { id: 'vale_transporte', nome: 'Vale Transporte', grupo: 'pessoal', aliases: ['vale transporte', 'vale-transporte', 'vt', 'transporte', 'passagem', 'riocard'] },
  { id: 'vale_alimentacao', nome: 'Vale Alimentação', grupo: 'pessoal', ajuda: 'VA/VR e refeição da equipe', aliases: ['vale alimentacao', 'vale-alimentacao', 'va', 'vr', 'vale refeicao', 'alimentacao da equipe'] },
  { id: 'bonus', nome: 'Bônus', grupo: 'pessoal', ajuda: 'prêmios, gorjetas repassadas', aliases: ['bonus', 'premio', 'gorjeta', 'comissao equipe'] },
  { id: 'prolabore', nome: 'Prólabore', grupo: 'pessoal', ajuda: 'o salário dos sócios', aliases: ['prolabore', 'pro labore', 'socio'] },
  { id: 'rescisoes', nome: 'Rescisões', grupo: 'pessoal', aliases: ['rescisao', 'demissao', 'acerto'] },
  { id: 'pessoal_outros', nome: 'Outros', grupo: 'pessoal', ajuda: 'uniforme, exame, treinamento', aliases: ['outros com pessoal', 'uniforme', 'exame', 'treinamento', 'freelancer', 'extra'] },

  // (−) Despesas Administrativas
  { id: 'sistemas', nome: 'Sistemas', grupo: 'administrativa', ajuda: 'PDV, delivery, este app', aliases: ['sistema', 'software', 'pdv', 'assinatura', 'mensalidade sistema', 'tecnologia'] },
  { id: 'contador', nome: 'Contador', grupo: 'administrativa', ajuda: 'honorários da contabilidade', aliases: ['contador', 'contabilidade', 'escritorio contabil'] },

  // (−) Despesas Operacionais
  { id: 'limpeza', nome: 'Limpeza', grupo: 'operacional', ajuda: 'produtos e material de higiene', aliases: ['limpeza', 'higiene', 'detergente', 'produto de limpeza'] },
  { id: 'detetizacao', nome: 'Detetização', grupo: 'operacional', aliases: ['detetizacao', 'dedetizacao', 'controle de pragas'] },
  { id: 'coleta_lixo', nome: 'Coleta de Lixo', grupo: 'operacional', ajuda: 'inclui coleta de óleo', aliases: ['lixo', 'coleta', 'residuo', 'oleo usado', 'comlurb'] },

  // (−) Despesas Variáveis
  { id: 'cupons_app', nome: 'Cupons iFood (Marketing)', grupo: 'variavel', ajuda: 'promoções bancadas por você no iFood', aliases: ['cupom', 'cupons', 'patrocinio', 'promocao ifood', 'super restaurante', 'cupons ifood'] },
  { id: 'marketing', nome: 'Marketing / redes sociais', grupo: 'variavel', ajuda: 'anúncios, fotos, social media', aliases: ['marketing', 'anuncio', 'ads', 'trafego', 'social', 'instagram', 'publicidade', 'design', 'redes sociais'] },
  { id: 'variavel_outros', nome: 'Outros', grupo: 'variavel', ajuda: 'o que muda com o movimento', aliases: ['outros variaveis', 'outras variaveis', 'diversos'] },

  // (−) Despesas Franqueadora
  { id: 'fundo_promocao', nome: 'Fundo de Promoção', grupo: 'franqueadora', aliases: ['fundo', 'fundo de promocao', 'fpp'] },
  { id: 'royalties', nome: 'Royalties', grupo: 'franqueadora', aliases: ['royalt', 'royalties', 'franqueadora', 'franquia'] },

  // Depois do lucro operacional
  { id: 'retiradas', nome: 'Outras despesas / provisões / retiradas', grupo: 'nao_operacional', ajuda: 'dinheiro que sai do caixa e não é despesa da operação', aliases: ['retirada', 'retiradas', 'provisao', 'distribuicao de lucro', 'emprestimo', 'obra', 'investimento', 'outras despesas'] },
  { id: 'multas', nome: 'Multas, atrasos', grupo: 'nao_operacional', ajuda: 'atraso de conta, multa de contrato', aliases: ['multa', 'multas', 'juros', 'atraso', 'mora', 'multas e juros'] },
]

/* ------------------- Plano de contas em vigor ------------------------- *
 * O modelo padrão mais o que a loja personalizou. É `let` de propósito: o
 * painel carrega as contas da loja no boot e reescreve o registro aqui, e
 * como o ES Module tem ligação viva, quem importou `CONTA`/`CONTAS` passa a
 * ler a versão nova sem precisar receber nada por prop.
 * --------------------------------------------------------------------- */

export let CONTAS: ContaInfo[] = [...CONTAS_PADRAO]

export let CONTA: Record<string, ContaInfo> = Object.fromEntries(CONTAS.map((c) => [c.id, c]))

/** Personalização gravada pela loja, em `restaurants/{t}/contas`. */
export interface ContaPersonalizada {
  id: string
  nome?: string
  grupo?: GrupoDRE
  ajuda?: string
  aliases?: string[]
  propria?: boolean
  arquivada?: boolean
}

/**
 * Aplica a personalização da loja sobre o modelo padrão. Conta com id de
 * conta padrão vira edição dela (nome, grupo, ajuda); id novo vira conta
 * própria, no fim do grupo dela.
 */
export function aplicarPlanoDeContas(personalizadas: ContaPersonalizada[]) {
  const porId = new Map(personalizadas.map((c) => [c.id, c]))
  const editadas = CONTAS_PADRAO.map((c) => {
    const p = porId.get(c.id)
    if (!p) return c
    porId.delete(c.id)
    return {
      ...c,
      ...(p.nome ? { nome: p.nome } : {}),
      ...(p.grupo ? { grupo: p.grupo } : {}),
      ...(p.ajuda === undefined ? {} : { ajuda: p.ajuda }),
      ...(p.aliases ? { aliases: [...(c.aliases ?? []), ...p.aliases] } : {}),
      arquivada: p.arquivada ?? false,
    }
  })
  const proprias: ContaInfo[] = [...porId.values()].map((p) => ({
    id: p.id,
    nome: p.nome || 'Conta sem nome',
    grupo: p.grupo ?? 'nao_operacional',
    ajuda: p.ajuda,
    aliases: p.aliases,
    propria: true,
    arquivada: p.arquivada ?? false,
  }))
  // Ordem do DRE: as contas próprias entram no fim do grupo delas.
  CONTAS = GRUPOS.flatMap((g) => [
    ...editadas.filter((c) => c.grupo === g.id),
    ...proprias.filter((c) => c.grupo === g.id),
  ])
  CONTA = Object.fromEntries(CONTAS.map((c) => [c.id, c]))
  INDICE = montarIndice()
}

/**
 * Todas as contas do grupo, arquivadas incluídas — é o que o DRE precisa,
 * porque conta escondida hoje pode ter lançamento de meses atrás.
 */
export function contasDoGrupo(g: GrupoDRE): ContaInfo[] {
  return CONTAS.filter((c) => c.grupo === g)
}

/** Só as contas que ainda aceitam lançamento novo — a lista dos chips. */
export function contasParaLancar(g: GrupoDRE): ContaInfo[] {
  return CONTAS.filter((c) => c.grupo === g && !c.arquivada)
}

/** Prefixo dos ids de conta criada pela loja. */
export const PREFIXO_CONTA_PROPRIA = 'c-'

export function novaContaId(): string {
  return `${PREFIXO_CONTA_PROPRIA}${Math.random().toString(36).slice(2, 9)}`
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
function montarIndice(): { termo: string; id: CategoriaDespesa }[] {
  // "Outros" existe em pessoal e em variáveis: sozinho, não identifica conta.
  const repetidos = new Set(CONTAS.map((c) => chave(c.nome)).filter((n, i, todos) => todos.indexOf(n) !== i))
  return CONTAS.flatMap((c) => [
    { termo: chave(c.id), id: c.id },
    ...(repetidos.has(chave(c.nome)) ? [] : [{ termo: chave(c.nome), id: c.id }]),
    ...(c.aliases ?? []).map((a) => ({ termo: chave(a), id: c.id })),
  ]).sort((a, b) => b.termo.length - a.termo.length)
}

let INDICE = montarIndice()

/**
 * Texto livre (planilha importada, retorno da IA, dado legado) → conta válida.
 * Nunca devolve categoria fora do plano de contas.
 */
export function normalizarCategoria(v: string | undefined): CategoriaDespesa {
  // Conta própria da loja passa direto: o registro pode ainda não ter
  // carregado, e transformar 'c-xyz' em Alimentos jogaria o lançamento numa
  // linha errada do DRE só por causa de uma corrida de boot.
  if (v?.startsWith(PREFIXO_CONTA_PROPRIA)) return v
  const k = chave(v ?? '')
  if (!k) return 'cmv_alimentos'
  if (k.replace(/ /g, '_') in CONTA) return k.replace(/ /g, '_')
  const legado = LEGADO[k.replace(/ /g, '_')]
  if (legado) return legado
  const achou = INDICE.find((i) => i.termo && (k === i.termo || k.includes(i.termo) || i.termo.includes(k)))
  if (achou) return achou.id
  const grupo = GRUPOS.find((g) => chave(g.nome).includes(k) || chave(g.simples).includes(k))
  if (grupo) return contasDoGrupo(grupo.id)[0].id
  return 'cmv_alimentos'
}

/* --------------------- Vocabulário do estoque ------------------------ *
 * Usado no cadastro de produto, na importação por planilha e na leitura de
 * foto por IA. Fica aqui pra não existirem três listas divergentes.
 * --------------------------------------------------------------------- */

export const CATEGORIAS_PRODUTO = ['Hortifrúti', 'Carnes', 'Secos', 'Bebidas', 'Embalagens', 'Limpeza'] as const
export type CategoriaProduto = (typeof CATEGORIAS_PRODUTO)[number]

export const UNIDADES_PRODUTO = ['kg', 'g', 'L', 'un', 'pacote', 'caixa'] as const
export type UnidadeProduto = (typeof UNIDADES_PRODUTO)[number]

const APELIDOS_CATEGORIA: Record<CategoriaProduto, string[]> = {
  'Hortifrúti': ['hortifruti', 'hortifrutigranjeiro', 'legume', 'verdura', 'fruta', 'tempero', 'folha'],
  Carnes: ['carne', 'frango', 'boi', 'bovino', 'suino', 'peixe', 'frios', 'acougue', 'proteina'],
  Secos: ['seco', 'grao', 'farinha', 'arroz', 'feijao', 'massa', 'enlatado', 'mercearia', 'pao'],
  Bebidas: ['bebida', 'refrigerante', 'cerveja', 'suco', 'agua', 'vinho', 'destilado'],
  Embalagens: ['embalagem', 'descartavel', 'marmita', 'sacola', 'copo', 'guardanapo', 'papel'],
  Limpeza: ['limpeza', 'higiene', 'detergente', 'desinfetante', 'sabao', 'alvejante'],
}

const APELIDOS_UNIDADE: Record<UnidadeProduto, string[]> = {
  kg: ['kg', 'quilo', 'kilo', 'quilograma', 'kgs'],
  g: ['g', 'grama', 'gr', 'gramas'],
  L: ['l', 'litro', 'litros', 'lt', 'ml'],
  un: ['un', 'und', 'unidade', 'uni', 'peca', 'pc', 'item'],
  pacote: ['pacote', 'pct', 'pack', 'fardo', 'saco'],
  caixa: ['caixa', 'cx', 'engradado', 'bandeja'],
}

/** Texto livre (IA, planilha) → uma das categorias de produto válidas. */
export function normalizarCategoriaProduto(v: string | undefined): CategoriaProduto {
  const k = chave(v ?? '')
  if (!k) return 'Secos'
  const exata = CATEGORIAS_PRODUTO.find((c) => chave(c) === k)
  if (exata) return exata
  for (const [cat, apelidos] of Object.entries(APELIDOS_CATEGORIA)) {
    if (apelidos.some((a) => k.includes(a) || a.includes(k))) return cat as CategoriaProduto
  }
  return 'Secos'
}

/** Texto livre → unidade de medida válida ('quilo' → 'kg', 'litro' → 'L'). */
export function normalizarUnidade(v: string | undefined): UnidadeProduto {
  const k = chave(v ?? '')
  if (!k) return 'un'
  for (const [uni, apelidos] of Object.entries(APELIDOS_UNIDADE)) {
    if (apelidos.includes(k)) return uni as UnidadeProduto
  }
  for (const [uni, apelidos] of Object.entries(APELIDOS_UNIDADE)) {
    if (apelidos.some((a) => k.startsWith(a))) return uni as UnidadeProduto
  }
  return 'un'
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

export type CanalVenda = 'balcao' | 'ifood' | 'whatsapp' | 'outros'

/**
 * Canais de app que não são mais integrados, mas podem estar gravados em
 * `receita_dia` antigos (ex.: 'rappi'). Só leitura: continuam somando na
 * receita para o histórico não "sumir"; nada novo é gravado com eles.
 */
export const CANAIS_APP_LEGADOS: readonly string[] = ['rappi']

/** Canais que entram como venda de app de delivery (hoje só o iFood). */
export const CANAIS_APP: readonly string[] = ['ifood', ...CANAIS_APP_LEGADOS]

export interface LinhaReceitaInfo {
  id: string
  nome: string
  canais: CanalVenda[]
  /** Canais antigos que ainda contam nesta linha ao ler dados gravados. */
  canaisLegados?: readonly string[]
  cor: string
}

/** As quatro linhas de receita bruta do modelo padrão. */
export const LINHAS_RECEITA: LinhaReceitaInfo[] = [
  { id: 'loja', nome: 'Vendas loja própria', canais: ['balcao'], cor: '#2E5F73' },
  { id: 'delivery_app', nome: 'Vendas delivery', canais: ['ifood'], canaisLegados: CANAIS_APP_LEGADOS, cor: '#C05437' },
  { id: 'delivery_proprio', nome: 'Venda delivery próprio', canais: ['whatsapp'], cor: '#2F6B4A' },
  { id: 'outras', nome: 'Outras receitas', canais: ['outros'], cor: '#EFAB5C' },
]
