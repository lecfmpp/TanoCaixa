import type { Permissoes } from '@/types'

export interface ItemNav {
  para: string
  rotulo: string
  /** Permissão (booleana) que libera o item no menu. */
  chave: keyof Permissoes
  /** Módulo em construção: só contas liberadas entram; as demais veem "Em breve". */
  recurso?: 'pdv'
  /** Página navegável, mas ainda sem funcionalidade: o menu mostra o selo "Em breve". */
  emBreve?: boolean
}

/** Itens do menu, cada um atrelado a uma permissão de seção. */
export const itensNav: ItemNav[] = [
  { para: '/painel/numeros', rotulo: 'Dashboard', chave: 'veNumeros' },
  { para: '/painel', rotulo: 'Início', chave: 'veInicio' },
  { para: '/painel/caixa', rotulo: 'Caixa', chave: 'veFechamento' },
  { para: '/painel/despesas', rotulo: 'Despesas', chave: 'veDespesas' },
  { para: '/painel/compras', rotulo: 'Compras', chave: 'veDespesas' },
  { para: '/painel/produtos', rotulo: 'Produtos', chave: 'veProdutos' },
  { para: '/painel/estoque', rotulo: 'Estoque', chave: 'veEstoque' },
  { para: '/painel/pdv', rotulo: 'PDV', chave: 'veInicio', recurso: 'pdv' },
  { para: '/painel/dre', rotulo: 'DRE', chave: 'veDRE' },
  { para: '/painel/cmv', rotulo: 'CMV', chave: 'veDRE', emBreve: true },
  { para: '/painel/franquias', rotulo: 'Franquias', chave: 'veRede' },
  { para: '/painel/rede', rotulo: 'Rede', chave: 'veRede' },
  { para: '/painel/metas', rotulo: 'Metas e números', chave: 'veAjustes' },
  { para: '/painel/ajustes', rotulo: 'Ajustes', chave: 'veAjustes' },
]
