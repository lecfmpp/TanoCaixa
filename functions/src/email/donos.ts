import type { Firestore } from 'firebase-admin/firestore'
import { primeiroNome } from './contato'

export interface Dono {
  uid: string
  email: string
  primeiroNome: string
}

/** Donos de uma loja (quem paga), com e-mail do cadastro. */
export async function donosDaLoja(db: Firestore, rid: string): Promise<Dono[]> {
  const membros = await db.collection(`restaurants/${rid}/membros`).where('papel', '==', 'dono').get()
  const donos = await Promise.all(
    membros.docs.map(async (m) => {
      const u = (await db.doc(`users/${m.id}`).get()).data() ?? {}
      const email = ((u.email as string | undefined) ?? '').trim().toLowerCase()
      return email.includes('@') ? { uid: m.id, email, primeiroNome: primeiroNome(u.nome as string | undefined, email) } : null
    }),
  )
  return donos.filter((d): d is Dono => d !== null)
}
