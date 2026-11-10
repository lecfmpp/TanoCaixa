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
 *
 * Gestor de loja (convidarGestor): o dono cadastra um e-mail por loja. O
 * convite vai por e-mail (Resend), já com papel "gestao", e só pode ser
 * aceito por quem entrar com aquele e-mail.
 * ------------------------------------------------------------------ */
import { randomBytes } from 'node:crypto'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import { REMETENTE, RESPONDER_PARA } from './boasVindas'
import { emailConfere, lojasDoConvite, pedidoDeLojas, podeConvidar, type ConviteDoc, type LojaDoConvite } from './convitesRegras'

const db = getFirestore()
const RESEND_API_KEY = defineSecret('RESEND_API_KEY')

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

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapaHtml(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/**
 * Cadastra o gestor de uma loja: guarda o e-mail na loja, gera o convite
 * (papel gestão, preso ao e-mail) e manda o link por e-mail. Sem chave do
 * Resend, devolve o link pro dono mandar por WhatsApp.
 */
export const convidarGestor = onCall({ secrets: [RESEND_API_KEY] }, async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login primeiro')
  const { restauranteId, email: bruto } = (req.data ?? {}) as { restauranteId?: string; email?: string }
  const email = (bruto ?? '').trim().toLowerCase()
  if (!restauranteId) throw new HttpsError('invalid-argument', 'restauranteId obrigatório')
  if (!EMAIL_OK.test(email)) throw new HttpsError('invalid-argument', 'E-mail do gestor inválido')

  const [membroSnap, restauranteSnap] = await Promise.all([
    db.doc(`restaurants/${restauranteId}/membros/${uid}`).get(),
    db.doc(`restaurants/${restauranteId}`).get(),
  ])
  if (!restauranteSnap.exists) throw new HttpsError('not-found', 'Loja não encontrada')
  const papel = membroSnap.data()?.papel as string | undefined
  if (papel !== 'dono' && papel !== 'franqueador') throw new HttpsError('permission-denied', 'Só o dono cadastra o gestor da loja')

  const lojaNome = (restauranteSnap.data()?.nome as string) ?? 'sua loja'
  const token = gerarToken()
  const convite: ConviteDoc = {
    restauranteId,
    restauranteNome: lojaNome,
    papel: 'gestao',
    criadoPor: uid,
    criadoEm: new Date().toISOString(),
    status: 'pendente',
    email,
  }
  await db.doc(`convites/${token}`).set(convite)
  await db.doc(`restaurants/${restauranteId}`).set({ gestorEmail: email, gestorConvite: token }, { merge: true })
  const url = `https://tanocaixa.com/convite/${token}`

  const chave = RESEND_API_KEY.value()
  if (!chave) return { url, enviado: false }
  const quem = (req.auth?.token.name as string) || 'O dono'
  const texto = `${quem} cadastrou você como gestor da loja ${lojaNome} no Tá no Caixa. Entre com este e-mail (${email}) pelo link: ${url}`
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1d2b2a;max-width:520px">` +
    `<p>${escapaHtml(quem)} cadastrou você como <strong>gestor da loja ${escapaHtml(lojaNome)}</strong> no Tá no Caixa.</p>` +
    `<p>Entre com este e-mail (${escapaHtml(email)}) para aceitar.</p>` +
    `<p><a href="${url}" style="display:inline-block;background:#2E5F73;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">Aceitar convite</a></p>` +
    `<p>Equipe Tá no Caixa</p></div>`
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json', 'Idempotency-Key': `gestor/${token}` },
      body: JSON.stringify({ from: REMETENTE, to: [email], reply_to: RESPONDER_PARA, subject: `Você é gestor da loja ${lojaNome}`, html, text: texto }),
    })
    if (!resp.ok) console.error(`convite gestor: resend http ${resp.status}`)
    return { url, enviado: resp.ok }
  } catch (e) {
    console.error('convite gestor:', e)
    return { url, enviado: false }
  }
})
