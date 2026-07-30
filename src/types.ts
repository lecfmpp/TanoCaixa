/* ------------------------------------------------------------------ *
 * Tipos do domínio (ver design_handoff_tanocaixa/DATA_MODEL.md).
 * ------------------------------------------------------------------ */

/** De onde veio a ação — alimenta o histórico de autoria. */
export type Origem = 'celular' | 'computador' | 'integracao' | 'ia_foto'

/** Papel do membro no restaurante. Governa o que ele enxerga e pode fazer. */
export type Papel = 'franqueador' | 'dono' | 'gestao' | 'caixa' | 'cozinha'

export const PAPEIS: { id: Papel; nome: string; desc: string }[] = [
  { id: 'franqueador', nome: 'Franqueador', desc: 'Vê o consolidado da rede e o número de cada loja' },
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
  if (p === 'franqueador') return 'franqueador'
  if (p === 'dono') return 'dono'
  if (p === 'gestao' || p === 'gerente' || p === 'contador') return 'gestao'
  if (p === 'caixa' || p === 'lancador') return 'caixa'
  return 'cozinha'
}

/** Rota inicial de cada papel. */
export function homeDoPapel(papel: Papel): string {
  if (papel === 'franqueador') return '/painel/rede'
  if (papel === 'caixa') return '/painel/caixa'
  if (papel === 'cozinha') return '/painel/estoque'
  return '/painel'
}

/* ------------------------------------------------------------------ *
 * Natureza do negócio — define o que aparece no DRE e se existe rede.
 * ------------------------------------------------------------------ */

export type TipoNegocio = 'loja_unica' | 'multi_loja' | 'franqueada' | 'franqueadora'

export const TIPOS_NEGOCIO: { id: TipoNegocio; nome: string; desc: string }[] = [
  { id: 'loja_unica', nome: 'Uma loja só', desc: 'Um CNPJ, um endereço' },
  { id: 'multi_loja', nome: 'Mais de uma loja minha', desc: 'Mesma marca, sem franquia' },
  { id: 'franqueada', nome: 'Sou franqueado', desc: 'Pago royalties e fundo de promoção' },
  { id: 'franqueadora', nome: 'Sou a franqueadora', desc: 'Acompanho as lojas da rede' },
]

/** Só franqueado paga royalties e fundo — nos outros o grupo some do DRE. */
export function pagaFranqueadora(t: TipoNegocio | undefined): boolean {
  return t === 'franqueada'
}

/** Quem opera mais de uma loja ganha a visão consolidada da rede. */
export function temRede(t: TipoNegocio | undefined): boolean {
  return t === 'multi_loja' || t === 'franqueadora'
}

export type Periodo = 'semana' | 'mes'

/* O plano de contas do DRE vive em @/data/planoContas — reexportado aqui
 * porque metade do app importa esses tipos de '@/types'. */
export type { CategoriaDespesa, CanalVenda, GrupoDRE } from '@/data/planoContas'

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
  /** Consolidado da rede e comparativo entre lojas. */
  veRede: boolean
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
  veRede: false,
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
    case 'franqueador':
      // Enxerga o número de todas as lojas, mas não opera nenhuma: quem lança
      // despesa, conta estoque e fecha caixa é a equipe da loja.
      return {
        veInicio: true, veDespesas: true, veProdutos: false, veEstoque: false,
        vePlano: true, veDRE: true, veRede: true, veNumeros: true, veFechamento: false, veAjustes: true,
        veLucro: true, veFaturamentoTotal: true,
        gerenciaEquipe: 'total', lancaDespesa: false, movimentaEstoque: false,
      }
    case 'dono':
      return {
        veInicio: true, veDespesas: true, veProdutos: true, veEstoque: true,
        vePlano: true, veDRE: true, veRede: true, veNumeros: true, veFechamento: true, veAjustes: true,
        veLucro: true, veFaturamentoTotal: true,
        gerenciaEquipe: 'total', lancaDespesa: true, movimentaEstoque: true,
      }
    case 'gestao':
      return {
        veInicio: true, veDespesas: true, veProdutos: true, veEstoque: true,
        vePlano: true, veDRE: true, veRede: true, veNumeros: true, veFechamento: true, veAjustes: true,
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
