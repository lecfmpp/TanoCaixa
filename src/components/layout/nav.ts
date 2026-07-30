import type { Permissoes } from '@/types'

export interface ItemNav {
  para: string
  rotulo: string
  /** Permissão (booleana) que libera o item no menu. */
  chave: keyof Permissoes
}

/** Itens do menu, cada um atrelado a uma permissão de seção. */
export const itensNav: ItemNav[] = [
  { para: '/painel', rotulo: 'Início', chave: 'veInicio' },
  { para: '/painel/caixa', rotulo: 'Caixa', chave: 'veFechamento' },
  { para: '/painel/despesas', rotulo: 'Despesas', chave: 'veDespesas' },
  { para: '/painel/produtos', rotulo: 'Produtos', chave: 'veProdutos' },
  { para: '/painel/estoque', rotulo: 'Estoque', chave: 'veEstoque' },
  { para: '/painel/plano', rotulo: 'Plano do mês', chave: 'vePlano' },
  { para: '/painel/dre', rotulo: 'DRE', chave: 'veDRE' },
  { para: '/painel/rede', rotulo: 'Rede', chave: 'veRede' },
  { para: '/painel/numeros', rotulo: 'Números', chave: 'veNumeros' },
  { para: '/painel/ajustes', rotulo: 'Ajustes', chave: 'veAjustes' },
]
