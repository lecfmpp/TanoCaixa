/* ------------------------------------------------------------------ *
 * Grátis × Pro. O plano vem de `assinaturas/{restauranteId}`, que só o
 * servidor grava (webhook do Stripe e functions); o app só lê. As travas que
 * importam (foto com IA, lembretes, convites, loja extra) também são checadas
 * nas Cloud Functions — aqui é a cara da coisa. Espelha functions/src/assinatura.ts.
 * ------------------------------------------------------------------ */

import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export type Plano = 'gratis' | 'pro'

/** Recursos que o Grátis não tem. */
export type RecursoPro = 'dre_completo' | 'foto_ia' | 'lembretes_whatsapp' | 'rede' | 'equipe_ilimitada'

import { LIMITE_EQUIPE_GRATIS } from './preco'
export { LIMITE_EQUIPE_GRATIS }

export const NOME_RECURSO: Record<RecursoPro, string> = {
  dre_completo: 'DRE completo, conta por conta, e planilha pro contador',
  foto_ia: 'Foto da nota com IA',
  lembretes_whatsapp: 'Lembretes no grupo do WhatsApp',
  rede: 'Rede de lojas, com loja extra a R$ 79/mês',
  equipe_ilimitada: 'Equipe sem limite de pessoas',
}

/** O que o Grátis tem (tudo da loja única, menos os recursos do Pro). */
export const INCLUI_GRATIS = [
  'Uma loja',
  'Lançamento do dia, despesas, compras e contas a pagar',
  'Dashboard, metas e plano do mês',
  'Resumo do DRE (os grandes grupos e o lucro)',
  'Produtos e estoque',
  `Equipe de até ${LIMITE_EQUIPE_GRATIS} pessoas`,
]

export interface AssinaturaDoc {
  status?: 'ativa' | 'pagamento_falhou' | 'pendente' | 'cancelada' | 'gratis'
  plano?: string
  lojas?: number | null
  /** Loja extra da rede: id da loja que paga a assinatura. */
  pagadorId?: string
  customerId?: string
}

/** Só assinatura ativa libera o Pro (pagamento que falhou segura enquanto o Stripe tenta de novo). */
export function planoDaAssinatura(a: AssinaturaDoc | null | undefined): Plano {
  return a?.status === 'ativa' || a?.status === 'pagamento_falhou' ? 'pro' : 'gratis'
}

export async function getAssinatura(restauranteId: string): Promise<AssinaturaDoc | null> {
  const snap = await getDoc(doc(db, 'assinaturas', restauranteId))
  return snap.exists() ? (snap.data() as AssinaturaDoc) : null
}

/** Erro de uma Cloud Function que barrou por plano (details.motivo = 'plano_pro'). */
export function ehErroDePlano(e: unknown): boolean {
  const d = (e as { details?: { motivo?: string } } | undefined)?.details
  return d?.motivo === 'plano_pro'
}
