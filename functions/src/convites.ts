/* ------------------------------------------------------------------ *
 * Convites de equipe — link único por convite (sem e-mail/SMS: o dono
 * copia e manda por WhatsApp ou onde preferir). Fluxo:
 *   1. criarConvite  — dono/gestão escolhe EM QUAIS LOJAS a pessoa entra e
 *                      com que papel em cada uma, e gera o link.
 *   2. verConvite    — página pública /convite/:token mostra pra quem
 *                      recebeu o link "você foi convidado pra X como Y".
 *   3. aceitarConvite — depois que a pessoa loga/cria conta, entra só nas
 *                      lojas do convite, com o papel de cada uma (em vez de
 *                      ganhar um restaurante novo, que é o padrão pra
 *                      quem loga sem convite pendente).
 *
 * O acesso é por loja: a pessoa vira membro (memberUids + membros/{uid}) só
 * das lojas marcadas. Convidar a partir de uma rede NÃO dá acesso às outras
 * lojas da rede.
 * ------------------------------------------------------------------ */
import { randomBytes } from 'node:crypto'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { emailConfere, lojasDoConvite, pedidoDeLojas, podeConvidar, type ConviteDoc, type LojaDoConvite } from './convitesRegras'

const db = getFirestore()

function gerarToken(): string {
  return randomBytes(18).toString('base64url')
}

/** Gera o link de convite. Quem convida precisa ser dono/gestão de CADA loja marcada. */
export const criarConvite = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login primeiro')
  const pedido = pedidoDeLojas(req.data)

  const lojas: LojaDoConvite[] = await Promise.all(
    pedido.map(async ({ restauranteId, papel }) => {
      const [membroSnap, restauranteSnap] = await Promise.all([
        db.doc(`restaurants/${restauranteId}/membros/${uid}`).get(),
        db.doc(`restaurants/${restauranteId}`).get(),
      ])
      if (!restauranteSnap.exists) throw new HttpsError('not-found', 'Loja não encontrada')
      const nome = (restauranteSnap.data()?.nome as string) ?? 'seu restaurante'
      if (!membroSnap.exists || !podeConvidar(membroSnap.data()?.papel as string | undefined)) {
        throw new HttpsError('permission-denied', `Você não pode convidar pra ${nome}`)
      }
      return { restauranteId, restauranteNome: nome, papel }
    }),
  )

  const token = gerarToken()
  const convite: ConviteDoc = {
    lojas,
    restauranteId: lojas[0].restauranteId,
    restauranteNome: lojas[0].restauranteNome,
    papel: lojas[0].papel,
    criadoPor: uid,
    criadoEm: new Date().toISOString(),
    status: 'pendente',
  }
  await db.doc(`convites/${token}`).set(convite)
  return { token, url: `https://tanocaixa.com/convite/${token}`, lojas }
})

/** Consulta pública (sem login) de um convite — pra mostrar antes do cadastro/login. */
export const verConvite = onCall(async (req) => {
  const { token } = (req.data ?? {}) as { token?: string }
  if (!token) throw new HttpsError('invalid-argument', 'token obrigatório')
  const snap = await db.doc(`convites/${token}`).get()
  if (!snap.exists) throw new HttpsError('not-found', 'Convite não encontrado ou expirado')
  const c = snap.data() as ConviteDoc
  const lojas = lojasDoConvite(c).map((l) => ({ restauranteNome: l.restauranteNome, papel: l.papel }))
  return { restauranteNome: c.restauranteNome, papel: c.papel, lojas, valido: c.status === 'pendente' }
})

/** Aceita o convite: entra SÓ nas lojas do convite, cada uma com o seu papel. */
export const aceitarConvite = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login primeiro')
  const { token, nome: nomeInformado } = (req.data ?? {}) as { token?: string; nome?: string }
  if (!token) throw new HttpsError('invalid-argument', 'token obrigatório')

  const email = req.auth?.token.email ?? ''
  const nome = nomeInformado || (req.auth?.token.name as string) || email.split('@')[0] || 'Você'
  const inicial = (nome[0] || 'V').toUpperCase()

  const conviteRef = db.doc(`convites/${token}`)
  const userRef = db.doc(`users/${uid}`)
  return db.runTransaction(async (tx) => {
    const [snap, userSnap] = await Promise.all([tx.get(conviteRef), tx.get(userRef)])
    if (!snap.exists) throw new HttpsError('not-found', 'Convite não encontrado ou expirado')
    const c = snap.data() as ConviteDoc
    if (c.status !== 'pendente') throw new HttpsError('failed-precondition', 'Esse convite já foi usado')
    if (!emailConfere(c, email)) {
      throw new HttpsError('failed-precondition', `Esse convite é para ${c.email}. Entre com esse e-mail`)
    }
    const lojas = lojasDoConvite(c)

    // Quem já tinha conta continua abrindo na loja de antes; o seletor de
    // lojas passa a listar as do convite também.
    const ridAnterior = userSnap.data()?.restauranteId as string | undefined
    const acessos: Record<string, { nome: string; papel: string }> = {}
    if (ridAnterior && !lojas.some((l) => l.restauranteId === ridAnterior)) {
      const [rAnt, mAnt] = await Promise.all([
        tx.get(db.doc(`restaurants/${ridAnterior}`)),
        tx.get(db.doc(`restaurants/${ridAnterior}/membros/${uid}`)),
      ])
      if (rAnt.exists && mAnt.exists) {
        acessos[ridAnterior] = { nome: (rAnt.data()?.nome as string) ?? 'Minha loja', papel: (mAnt.data()?.papel as string) ?? 'dono' }
      }
    }

    for (const l of lojas) {
      tx.set(
        db.doc(`restaurants/${l.restauranteId}/membros/${uid}`),
        { nome, inicial, cor: '#2E5F73', papel: l.papel, conviteStatus: 'ativo' },
        { merge: true },
      )
      tx.set(db.doc(`restaurants/${l.restauranteId}`), { memberUids: FieldValue.arrayUnion(uid) }, { merge: true })
      acessos[l.restauranteId] = { nome: l.restauranteNome, papel: l.papel }
    }

    const restauranteId = ridAnterior ?? lojas[0].restauranteId
    tx.set(userRef, { nome, email, restauranteId, acessos }, { merge: true })
    tx.set(conviteRef, { status: 'aceito', usadoPor: uid, aceitoEm: new Date().toISOString() }, { merge: true })

    return { restauranteId, lojas: lojas.map((l) => l.restauranteId) }
  })
})
