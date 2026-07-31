/* ------------------------------------------------------------------ *
 * Pedidos da franqueadora para a loja franqueada.
 *
 * Mora dentro do tenant da LOJA (restaurants/{id}/solicitacoes), não da
 * rede: quem precisa ver o pedido é o dono do restaurante, e as regras de
 * acesso da loja já valem sem nada novo.
 * ------------------------------------------------------------------ */

import { collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type TipoSolicitacao =
  | 'dre_mes'
  | 'contagem_estoque'
  | 'notas_fiscais'
  | 'folha'
  | 'abertura_cmv'
  | 'vendas_canal'
  | 'plano_margem'
  | 'visita'
  | 'outro'

export interface OpcaoSolicitacao {
  id: TipoSolicitacao
  titulo: string
  /** O que a loja precisa fazer — vai junto no pedido. */
  descricao: string
}

/** Opções padrão do menu. É de propósito uma lista curta e concreta. */
export const OPCOES_SOLICITACAO: OpcaoSolicitacao[] = [
  { id: 'dre_mes', titulo: 'DRE fechado do mês', descricao: 'Fechar o mês e enviar o demonstrativo completo.' },
  { id: 'contagem_estoque', titulo: 'Contagem de estoque fechada', descricao: 'Contar o estoque e fechar a contagem do mês.' },
  { id: 'abertura_cmv', titulo: 'Abertura do CMV', descricao: 'Detalhar o CMV por conta: alimentos, bebidas e descartáveis.' },
  { id: 'notas_fiscais', titulo: 'Notas fiscais do mês', descricao: 'Enviar os XMLs das notas de compra do período.' },
  { id: 'folha', titulo: 'Detalhamento da folha', descricao: 'Abrir a folha: salários, encargos e benefícios.' },
  { id: 'vendas_canal', titulo: 'Vendas por canal', descricao: 'Separar o faturamento entre loja, apps e delivery próprio.' },
  { id: 'plano_margem', titulo: 'Plano de ação pra margem', descricao: 'Explicar o que vai ser feito pra recuperar a margem.' },
  { id: 'visita', titulo: 'Agendar visita', descricao: 'Combinar uma visita da franqueadora na loja.' },
  { id: 'outro', titulo: 'Outro assunto', descricao: '' },
]

export const OPCAO: Record<TipoSolicitacao, OpcaoSolicitacao> = Object.fromEntries(
  OPCOES_SOLICITACAO.map((o) => [o.id, o]),
) as Record<TipoSolicitacao, OpcaoSolicitacao>

export interface SolicitacaoDoc {
  id: string
  tipo: TipoSolicitacao
  titulo: string
  /** Recado escrito pela franqueadora, opcional. */
  detalhe?: string
  status: 'aberta' | 'respondida'
  pedidoPorId: string
  pedidoPorNome: string
  /** Bandeira que pediu — a loja precisa saber de quem veio. */
  rede: string
  criadoEm: string
  respondidoEm?: string
}

export async function listarSolicitacoes(lojaId: string): Promise<SolicitacaoDoc[]> {
  const snap = await getDocs(collection(db, 'restaurants', lojaId, 'solicitacoes'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SolicitacaoDoc)
}

export async function salvarSolicitacao(lojaId: string, s: SolicitacaoDoc): Promise<void> {
  await setDoc(doc(db, 'restaurants', lojaId, 'solicitacoes', s.id), s, { merge: true })
}
