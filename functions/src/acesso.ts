import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { normalizarPapel } from './papel'

/** Exige login e que a pessoa seja dono ou gestão do restaurante. Devolve o id do restaurante.
 * O dono de uma rede entra nas lojas que abriu como "franqueador" — conta como dono aqui. */
export async function exigirDonoOuGestao(uid: string | undefined, restauranteId: string | undefined): Promise<string> {
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login primeiro')
  if (!restauranteId) throw new HttpsError('invalid-argument', 'restauranteId obrigatório')
  const membro = await getFirestore().doc(`restaurants/${restauranteId}/membros/${uid}`).get()
  const bruto = membro.data()?.papel as string | undefined
  const papel = bruto === 'franqueador' ? 'dono' : normalizarPapel(bruto)
  if (!membro.exists || (papel !== 'dono' && papel !== 'gestao')) throw new HttpsError('permission-denied', 'Só dono ou gestão')
  return restauranteId
}
