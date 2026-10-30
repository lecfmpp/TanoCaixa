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
import { normalizarPapel } from './papel'

const db = getFirestore()
const RESEND_API_KEY = defineSecret('RESEND_API_KEY')

interface ConviteDoc {
  restauranteId: string
  restauranteNome: string
  papel: string
  criadoPor: string
  criadoEm: string
  status: 'pendente' | 'aceito' | 'revogado'
  usadoPor?: string
  aceitoEm?: string
  /** Convite de gestor: só quem entrar com este e-mail aceita. */
  email?: string
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
  const bruto = membroSnap.data()?.papel as string | undefined
  const papelDoCriador = bruto === 'franqueador' ? 'dono' : normalizarPapel(bruto)
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
    if (c.email && c.email !== email.trim().toLowerCase()) {
      throw new HttpsError('failed-precondition', `Esse convite é para ${c.email}. Entre com esse e-mail`)
    }

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
