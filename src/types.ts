/* ------------------------------------------------------------------ *
 * Tipos do domínio (ver design_handoff_tanocaixa/DATA_MODEL.md).
 * ------------------------------------------------------------------ */

/** De onde veio a ação — alimenta o histórico de autoria. */
export type Origem = 'celular' | 'computador' | 'integracao' | 'ia_foto'

/** Papel do membro no restaurante. Governa o que ele enxerga (RLS). */
export type Papel = 'dono' | 'gerente' | 'estoque' | 'lancador' | 'contador'

export type Periodo = 'semana' | 'mes'

export type CategoriaDespesa = 'mercadoria' | 'pessoal' | 'ocupacao' | 'taxas_app'

export type CanalVenda = 'ifood' | 'rappi' | 'whatsapp' | 'balcao'

export interface Usuario {
  id: string
  nome: string
  email: string
  celularWhatsapp?: string
  avatarInicial: string
  avatarCor: string
  papel: Papel
}

export interface Restaurante {
  id: string
  nome: string
  bairro: string
  cidade: string
  tipoOperacao: 'delivery' | 'delivery_salao' | 'salao' | 'buffet'
  tipoCozinha: string
}

/** Uma linha do feed "Quem mexeu no quê" / trilha de auditoria. */
export interface Atividade {
  id: string
  quem: string
  quemInicial: string
  quemCor: string
  acao: string
  entidade: string
  valor?: number
  origem: Origem
  quando: Date
}

/** Barra do gráfico entrou × saiu. */
export interface BarraPeriodo {
  rotulo: string
  entrou: number
  saiu: number
}

/** Sessão ativa (usuário + papel + restaurante). */
export interface Sessao {
  usuario: Usuario
  restaurante: Restaurante
  demo: boolean
}

/** O que um papel pode ver. Espelha o DATA_MODEL e é reforçado no banco. */
export interface Permissoes {
  veLucro: boolean
  veFolha: boolean
  veFaturamentoTotal: boolean
  veDRE: boolean
  veCMV: boolean
  lancaDespesa: boolean
  movimentaEstoque: boolean
  exporta: boolean
}

export function permissoesDoPapel(papel: Papel): Permissoes {
  switch (papel) {
    case 'dono':
      return {
        veLucro: true,
        veFolha: true,
        veFaturamentoTotal: true,
        veDRE: true,
        veCMV: true,
        lancaDespesa: true,
        movimentaEstoque: true,
        exporta: true,
      }
    case 'gerente':
      return {
        veLucro: false,
        veFolha: false,
        veFaturamentoTotal: false,
        veDRE: false,
        veCMV: true,
        lancaDespesa: true,
        movimentaEstoque: true,
        exporta: false,
      }
    case 'estoque':
      return {
        veLucro: false,
        veFolha: false,
        veFaturamentoTotal: false,
        veDRE: false,
        veCMV: false,
        lancaDespesa: false,
        movimentaEstoque: true,
        exporta: false,
      }
    case 'lancador':
      return {
        veLucro: false,
        veFolha: false,
        veFaturamentoTotal: false,
        veDRE: false,
        veCMV: false,
        lancaDespesa: true,
        movimentaEstoque: false,
        exporta: false,
      }
    case 'contador':
      return {
        veLucro: true,
        veFolha: true,
        veFaturamentoTotal: true,
        veDRE: true,
        veCMV: true,
        lancaDespesa: false,
        movimentaEstoque: false,
        exporta: true,
      }
  }
}
