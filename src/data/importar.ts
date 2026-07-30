/* ------------------------------------------------------------------ *
 * Configuração de importação por CSV, por entidade. Cada config define as
 * colunas (com exemplo) e linhas de exemplo para o modelo baixável.
 * O mapeamento linha → documento fica no hook useImportar (precisa da autoria).
 * ------------------------------------------------------------------ */

export type TipoImport = 'produtos' | 'despesas' | 'estoque'

export interface ColunaImport {
  chave: string // cabeçalho no CSV (minúsculo)
  rotulo: string
  exemplo: string
  obrigatorio?: boolean
}

export interface ConfigImport {
  tipo: TipoImport
  titulo: string
  descricao: string
  nomeModelo: string
  colunas: ColunaImport[]
  exemplos: string[][]
}

export const CONFIGS_IMPORT: Record<TipoImport, ConfigImport> = {
  produtos: {
    tipo: 'produtos',
    titulo: 'Produtos',
    descricao: 'Cadastre vários produtos de uma vez (base do estoque e do CMV).',
    nomeModelo: 'modelo-produtos-tanocaixa',
    colunas: [
      { chave: 'nome', rotulo: 'Nome', exemplo: 'Grão de bico seco', obrigatorio: true },
      { chave: 'categoria', rotulo: 'Categoria', exemplo: 'Secos' },
      { chave: 'unidade', rotulo: 'Unidade', exemplo: 'kg' },
      { chave: 'custo', rotulo: 'Custo (R$)', exemplo: '9,80' },
      { chave: 'estoque_minimo', rotulo: 'Estoque mínimo', exemplo: '15' },
      { chave: 'fornecedor', rotulo: 'Fornecedor', exemplo: 'Casa Líbano' },
      { chave: 'entra_no_cmv', rotulo: 'Entra no CMV (sim/não)', exemplo: 'sim' },
    ],
    exemplos: [
      ['Grão de bico seco', 'Secos', 'kg', '9,80', '15', 'Casa Líbano', 'sim'],
      ['Tomate italiano', 'Hortifrúti', 'kg', '8,90', '10', 'Hortifrúti Zona Sul', 'sim'],
      ['Marmita de alumínio', 'Embalagens', 'pacote', '0,85', '20', 'Embalagens RJ', 'não'],
    ],
  },
  despesas: {
    tipo: 'despesas',
    titulo: 'Despesas',
    descricao:
      'Importe contas e compras já pagas ou a pagar do mês. A coluna "conta" é o plano de contas do DRE — vale o código (ex.: aluguel, cmv_bebidas, contador) ou o nome por extenso.',
    nomeModelo: 'modelo-despesas-tanocaixa',
    colunas: [
      { chave: 'fornecedor', rotulo: 'Fornecedor', exemplo: 'Hortifrúti Zona Sul', obrigatorio: true },
      { chave: 'categoria', rotulo: 'Conta do DRE', exemplo: 'cmv_alimentos' },
      { chave: 'valor', rotulo: 'Valor (R$)', exemplo: '842,00', obrigatorio: true },
      { chave: 'data', rotulo: 'Data (DD/MM/AAAA)', exemplo: '26/07/2026' },
      { chave: 'forma_pagamento', rotulo: 'Pagamento (pix/dinheiro/cartao/boleto)', exemplo: 'pix' },
      { chave: 'status', rotulo: 'Situação (pago/a_pagar)', exemplo: 'pago' },
      { chave: 'descricao', rotulo: 'Observação', exemplo: 'Feira da semana' },
    ],
    exemplos: [
      ['Hortifrúti Zona Sul', 'cmv_alimentos', '842,00', '26/07/2026', 'pix', 'pago', 'Feira da semana'],
      ['Distribuidora Zona Sul', 'cmv_bebidas', '1740,00', '12/07/2026', 'cartao', 'pago', 'Bebidas'],
      ['Aluguel', 'aluguel', '3400,00', '05/07/2026', 'boleto', 'a_pagar', ''],
      ['Folha da equipe', 'folha', '9200,00', '05/07/2026', 'automatico', 'pago', 'Salários'],
      ['Contabilidade Nassar', 'contador', '780,00', '10/07/2026', 'pix', 'pago', 'Honorários'],
      ['Simples Nacional · DAS', 'imposto_vendas', '2848,00', '20/07/2026', 'boleto', 'pago', ''],
    ],
  },
  estoque: {
    tipo: 'estoque',
    titulo: 'Contagem de estoque',
    descricao: 'Atualize a quantidade contada de cada produto já cadastrado.',
    nomeModelo: 'modelo-contagem-tanocaixa',
    colunas: [
      { chave: 'produto', rotulo: 'Produto (nome cadastrado)', exemplo: 'Grão de bico seco', obrigatorio: true },
      { chave: 'quantidade', rotulo: 'Quantidade contada', exemplo: '18', obrigatorio: true },
      { chave: 'custo_unitario', rotulo: 'Custo unitário (opcional)', exemplo: '9,80' },
    ],
    exemplos: [
      ['Grão de bico seco', '18', '9,80'],
      ['Tomate italiano', '14', '8,90'],
    ],
  },
}

/** Cabeçalho e linhas do modelo CSV de uma entidade. */
export function modeloCSV(tipo: TipoImport): { cabecalho: string[]; linhas: string[][] } {
  const cfg = CONFIGS_IMPORT[tipo]
  return { cabecalho: cfg.colunas.map((c) => c.chave), linhas: cfg.exemplos }
}
