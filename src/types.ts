/* ------------------------------------------------------------------ *
 * Tipos do domínio (ver design_handoff_tanocaixa/DATA_MODEL.md).
 * ------------------------------------------------------------------ */

/** De onde veio a ação — alimenta o histórico de autoria. */
export type Origem = 'celular' | 'computador' | 'integracao' | 'ia_foto'

/** Papel do membro no restaurante. Governa o que ele enxerga e pode fazer. */
export type Papel = 'dono' | 'gestao' | 'caixa' | 'cozinha'

export const PAPEIS: { id: Papel; nome: string; desc: string }[] = [
  { id: 'dono', nome: 'Dono', desc: 'Vê tudo e gerencia usuários e permissões' },
  { id: 'gestao', nome: 'Gestão', desc: 'Vê tudo; convida usuários com aprovação do dono' },
  { id: 'caixa', nome: 'Caixa', desc: 'Só abre, fecha e concilia o caixa' },
  { id: 'cozinha', nome: 'Cozinha', desc: 'Produtos e estoque; não vê finanças' },
]

export function rotuloPapel(p: Papel): string {
  return PAPEIS.find((x) => x.id === p)?.nome ?? p
}

/** Converte papéis antigos (gerente/estoque/…) para o conjunto atual. */
export function normalizarPapel(p: string | undefined): Papel {
  if (p === 'dono') return 'dono'
  if (p === 'gestao' || p === 'gerente' || p === 'contador') return 'gestao'
  if (p === 'caixa' || p === 'lancador') return 'caixa'
  return 'cozinha'
}

/** Rota inicial de cada papel. */
export function homeDoPapel(papel: Papel): string {
  if (papel === 'caixa') return '/painel/caixa'
  if (papel === 'cozinha') return '/painel/estoque'
  return '/painel'
}

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
  /** Foto de perfil (do Google, ou enviada manualmente). Sem isso, cai no avatar de inicial+cor. */
  photoURL?: string
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
  /** Id do tenant no Firestore (uid do dono, ou o tenant demo). */
  tenantId: string
  demo: boolean
}

/** O que cada papel enxerga (seções) e pode fazer (capacidades). */
export interface Permissoes {
  // seções visíveis
  veInicio: boolean
  veDespesas: boolean
  veProdutos: boolean
  veEstoque: boolean
  vePlano: boolean
  veDRE: boolean
  veNumeros: boolean
  veFechamento: boolean // caixa: abrir/fechar/conciliar
  veAjustes: boolean
  // informações sensíveis do negócio
  veLucro: boolean
  veFaturamentoTotal: boolean
  // capacidades
  gerenciaEquipe: 'total' | 'proposta' | 'nao'
  lancaDespesa: boolean
  movimentaEstoque: boolean
}

const NADA: Permissoes = {
  veInicio: false,
  veDespesas: false,
  veProdutos: false,
  veEstoque: false,
  vePlano: false,
  veDRE: false,
  veNumeros: false,
  veFechamento: false,
  veAjustes: false,
  veLucro: false,
  veFaturamentoTotal: false,
  gerenciaEquipe: 'nao',
  lancaDespesa: false,
  movimentaEstoque: false,
}

export function permissoesDoPapel(papel: Papel): Permissoes {
  switch (papel) {
    case 'dono':
      return {
        veInicio: true, veDespesas: true, veProdutos: true, veEstoque: true,
        vePlano: true, veDRE: true, veNumeros: true, veFechamento: true, veAjustes: true,
        veLucro: true, veFaturamentoTotal: true,
        gerenciaEquipe: 'total', lancaDespesa: true, movimentaEstoque: true,
      }
    case 'gestao':
      return {
        veInicio: true, veDespesas: true, veProdutos: true, veEstoque: true,
        vePlano: true, veDRE: true, veNumeros: true, veFechamento: true, veAjustes: true,
        veLucro: true, veFaturamentoTotal: true,
        gerenciaEquipe: 'proposta', lancaDespesa: true, movimentaEstoque: true,
      }
    case 'caixa':
      // Só o fechamento de caixa (abrir/fechar/conciliar). Nada de finanças.
      return { ...NADA, veFechamento: true }
    case 'cozinha':
      // Cozinha cuida de produtos e estoque; não vê finanças.
      return { ...NADA, veProdutos: true, veEstoque: true, movimentaEstoque: true }
  }
}
