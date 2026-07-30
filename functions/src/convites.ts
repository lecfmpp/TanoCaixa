/* ------------------------------------------------------------------ *
 * Convites de equipe — link único por convite (sem e-mail/SMS: o dono
 * copia e manda por WhatsApp ou onde preferir). Fluxo:
 *   1. criarConvite  — dono/gestão gera o link (papel já definido).
 *   2. verConvite    — página pública /convite/:token mostra pra quem
 *                      recebeu o link "você foi convidado pra X como Y".
 *   3. aceitarConvite — depois que a pessoa loga/cria conta, entra no
 *                      restaurante certo com o papel certo (em vez de
 *                      ganhar um restaurante novo, que é o padrão pra
 *                      quem loga sem convite pendente).
 * ------------------------------------------------------------------ */
import { randomBytes } from 'node:crypto'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { normalizarPapel } from './papel'

const db = getFirestore()

interface ConviteDoc {
  restauranteId: string
  restauranteNome: string
  papel: string
  criadoPor: string
  criadoEm: string
  status: 'pendente' | 'aceito' | 'revogado'
  usadoPor?: string
  aceitoEm?: string
}

function gerarToken(): string {
  return randomBytes(18).toString('base64url')
}

/** Gera o link de convite pro restaurante. Só quem é dono ou gestão. */
export const criarConvite = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login primeiro')
  const { restauranteId, papel } = (req.data ?? {}) as { restauranteId?: string; papel?: string }
  if (!restauranteId || !papel) throw new HttpsError('invalid-argument', 'restauranteId e papel obrigatórios')
  if (!['gestao', 'caixa', 'cozinha'].includes(papel)) {
    throw new HttpsError('invalid-argument', `papel inválido: ${papel}`)
  }

  const [membroSnap, restauranteSnap] = await Promise.all([
    db.doc(`restaurants/${restauranteId}/membros/${uid}`).get(),
    db.doc(`restaurants/${restauranteId}`).get(),
  ])
  if (!restauranteSnap.exists) throw new HttpsError('not-found', 'Restaurante não encontrado')
  const papelDoCriador = normalizarPapel(membroSnap.data()?.papel as string | undefined)
  if (papelDoCriador !== 'dono' && papelDoCriador !== 'gestao') {
    throw new HttpsError('permission-denied', 'Só dono ou gestão podem convidar')
  }

  const token = gerarToken()
  const convite: ConviteDoc = {
    restauranteId,
    restauranteNome: (restauranteSnap.data()?.nome as string) ?? 'seu restaurante',
    papel,
    criadoPor: uid,
    criadoEm: new Date().toISOString(),
    status: 'pendente',
  }
  await db.doc(`convites/${token}`).set(convite)
  return { token, url: `https://tanocaixa.com/convite/${token}` }
})

/** Consulta pública (sem login) de um convite — pra mostrar antes do cadastro/login. */
export const verConvite = onCall(async (req) => {
  const { token } = (req.data ?? {}) as { token?: string }
  if (!token) throw new HttpsError('invalid-argument', 'token obrigatório')
  const snap = await db.doc(`convites/${token}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Convite não encontrado ou expirado')
  const c = snap.data() as ConviteDoc
  return { restauranteNome: c.restauranteNome, papel: c.papel, valido: c.status === 'pendente' }
})

/** Aceita o convite: entra pro restaurante convidado, com o papel definido. */
export const aceitarConvite = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login primeiro')
  const { token, nome: nomeInformado } = (req.data ?? {}) as { token?: string; nome?: string }
  if (!token) throw new HttpsError('invalid-argument', 'token obrigatório')

  const email = req.auth?.token.email ?? ''
  const nome = nomeInformado || (req.auth?.token.name as string) || email.split('@')[0] || 'Você'
  const inicial = (nome[0] || 'V').toUpperCase()

  const conviteRef = db.doc(`convites/${token}`)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(conviteRef)
    if (!snap.exists) throw new HttpsError('not-found', 'Convite não encontrado ou expirado')
    const c = snap.data() as ConviteDoc
    if (c.status !== 'pendente') throw new HttpsError('failed-precondition', 'Esse convite já foi usado')

    const restauranteRef = db.doc(`restaurants/${c.restauranteId}`)
    const membroRef = db.doc(`restaurants/${c.restauranteId}/membros/${uid}`)
    const userRef = db.doc(`users/${uid}`)

    tx.set(membroRef, { nome, inicial, cor: '#2E5F73', papel: c.papel, conviteStatus: 'ativo' }, { merge: true })
    tx.set(restauranteRef, { memberUids: FieldValue.arrayUnion(uid) }, { merge: true })
    tx.set(userRef, { nome, email, restauranteId: c.restauranteId }, { merge: true })
    tx.set(conviteRef, { status: 'aceito', usadoPor: uid, aceitoEm: new Date().toISOString() }, { merge: true })

    return { restauranteId: c.restauranteId }
  })
})
