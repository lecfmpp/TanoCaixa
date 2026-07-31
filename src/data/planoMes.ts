/* ------------------------------------------------------------------ *
 * Plano de um mês: meta de faturamento e teto de cada grupo do DRE.
 *
 * Fica em restaurants/{id}/planos/{YYYY-MM} porque o plano é do MÊS, não
 * do restaurante — em agosto o dono aperta o CMV, em dezembro ele afrouxa,
 * e no fim do ano dá pra olhar o que ele prometeu contra o que fez.
 * Sem plano do mês, o Plano do mês cai nos tetos gerais do restaurante.
 * ------------------------------------------------------------------ */

import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Tetos } from './planoContas'

export interface PlanoMesDoc {
  /** 'YYYY-MM' — também é o id do documento. */
  mes: string
  metaFaturamento: number
  tetos: Tetos
  criadoEm: string
  criadoPorNome: string
}

export async function getPlanoMes(tenant: string, mes: string): Promise<PlanoMesDoc | null> {
  const snap = await getDoc(doc(db, 'restaurants', tenant, 'planos', mes))
  return snap.exists() ? ({ ...snap.data(), mes } as PlanoMesDoc) : null
}

export async function listarPlanos(tenant: string): Promise<PlanoMesDoc[]> {
  const snap = await getDocs(collection(db, 'restaurants', tenant, 'planos'))
  return snap.docs.map((d) => ({ ...d.data(), mes: d.id }) as PlanoMesDoc)
}

export async function salvarPlanoMes(tenant: string, p: PlanoMesDoc): Promise<void> {
  await setDoc(doc(db, 'restaurants', tenant, 'planos', p.mes), p, { merge: true })
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** '2026-08' → 'agosto de 2026'. */
export function nomeDoMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MESES[Number(m) - 1] ?? ''} de ${ano}`
}

/** '2026-07' → '2026-08'. */
export function mesSeguinte(mes: string): string {
  const [a, m] = mes.split('-').map(Number)
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`
}
