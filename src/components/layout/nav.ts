import {
  Home,
  Receipt,
  Package,
  ClipboardList,
  Target,
  FileText,
  TrendingUp,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface ItemNav {
  para: string
  rotulo: string
  icone: LucideIcon
  /** Papéis que enxergam o item. Vazio = todos. */
  papeis?: import('@/types').Papel[]
}

/** 8 itens do menu, na ordem do handoff. */
export const itensNav: ItemNav[] = [
  { para: '/painel', rotulo: 'Início', icone: Home },
  { para: '/painel/despesas', rotulo: 'Despesas', icone: Receipt },
  { para: '/painel/produtos', rotulo: 'Produtos', icone: Package },
  { para: '/painel/estoque', rotulo: 'Estoque', icone: ClipboardList },
  { para: '/painel/plano', rotulo: 'Plano do mês', icone: Target, papeis: ['dono', 'contador'] },
  { para: '/painel/dre', rotulo: 'DRE', icone: FileText, papeis: ['dono', 'contador'] },
  { para: '/painel/numeros', rotulo: 'Números', icone: TrendingUp, papeis: ['dono', 'gerente', 'contador'] },
  { para: '/painel/ajustes', rotulo: 'Ajustes', icone: Settings },
]
