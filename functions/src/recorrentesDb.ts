/* ------------------------------------------------------------------ *
 * Gravação das repetições. Recebe o banco por parâmetro (só o pedaço do Firestore
 * que usa), pra testar a idempotência e o "apaguei e não voltou" sem emulador.
 * ------------------------------------------------------------------ */
import { planejarRepeticoes, type DespesaMin } from './recorrentes'

export interface BancoRec {
  collection(caminho: string): {
    where(campo: string, op: string, valor: unknown): { get(): Promise<{ docs: { id: string; data(): unknown }[] }> }
  }
  doc(caminho: string): unknown
  batch(): { create(ref: unknown, dados: unknown): unknown; commit(): Promise<unknown> }
}

const ALREADY_EXISTS = 6

/** Séries novas (têm serieId) e lançamentos antigos marcados como recorrentes (sem serieId). */
async function lancamentosDeSerie(db: BancoRec, rid: string): Promise<DespesaMin[]> {
  const col = db.collection(`restaurants/${rid}/despesas`)
  const [comSerie, legado] = await Promise.all([col.where('serieId', '>', '').get(), col.where('recorrente', '==', true).get()])
  const porId = new Map<string, DespesaMin>()
  for (const snap of [...comSerie.docs, ...legado.docs]) porId.set(snap.id, { ...(snap.data() as Omit<DespesaMin, 'id'>), id: snap.id })
  return [...porId.values()]
}

/**
 * Gera o que falta no mês de `hoje` num restaurante. Cada repetição vai junto com um
 * marcador em `recorrencias/{id}` no mesmo lote: se a pessoa apagar a despesa do mês, o
 * marcador impede que ela volte no dia seguinte. Devolve quantas criou.
 */
export async function repetirDoRestaurante(db: BancoRec, rid: string, hoje: string, agora: string): Promise<number> {
  const planejadas = planejarRepeticoes(await lancamentosDeSerie(db, rid), hoje, agora)
  let criadas = 0
  for (const r of planejadas) {
    const lote = db.batch()
    lote.create(db.doc(`restaurants/${rid}/recorrencias/${r.id}`), { serieId: r.serieId, mes: r.mes, criadoEm: agora })
    lote.create(db.doc(`restaurants/${rid}/despesas/${r.id}`), r.doc)
    try {
      await lote.commit()
      criadas++
    } catch (e) {
      // Já existe a despesa ou o marcador (a pessoa apagou a do mês): respeita.
      if ((e as { code?: number }).code !== ALREADY_EXISTS) throw e
    }
  }
  return criadas
}
