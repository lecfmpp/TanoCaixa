import type { Papel } from '@/types'

export interface ItemNav {
  para: string
  rotulo: string
  /** Papéis que enxergam o item. Vazio = todos. */
  papeis?: Papel[]
}

/** 8 itens do menu, na ordem do handoff. */
export const itensNav: ItemNav[] = [
  { para: '/painel', rotulo: 'Início' },
  { para: '/painel/despesas', rotulo: 'Despesas' },
  { para: '/painel/produtos', rotulo: 'Produtos' },
  { para: '/painel/estoque', rotulo: 'Estoque' },
  { para: '/painel/plano', rotulo: 'Plano do mês', papeis: ['dono', 'contador'] },
  { para: '/painel/dre', rotulo: 'DRE', papeis: ['dono', 'contador'] },
  { para: '/painel/numeros', rotulo: 'Números', papeis: ['dono', 'gerente', 'contador'] },
  { para: '/painel/ajustes', rotulo: 'Ajustes' },
]
