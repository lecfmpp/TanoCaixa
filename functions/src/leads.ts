/* ------------------------------------------------------------------ *
 * Captura de e-mail das iscas digitais do blog (planilhas e checklists).
 *
 * POST /api/lead   { email, recurso, origem, website? }
 *  - `website` é um campo escondido (honeypot): preenchido por robô, descartamos em silêncio.
 *  - Grava em `leads/{hash(email)}` (um documento por e-mail; os recursos baixados viram uma lista).
 *  - Nunca falha o download no site: o cliente segue em frente de qualquer jeito.
 *
 * Só o servidor (Admin SDK) escreve em `leads`; as regras do Firestore continuam fechando o acesso do cliente.
 * ------------------------------------------------------------------ */
import { createHash } from 'node:crypto'
import { onRequest } from 'firebase-functions/v2/https'
import { initializeApp, getApps } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

if (getApps().length === 0) initializeApp()
const db = getFirestore()

const RECURSOS_VALIDOS = new Set([
  'planilha-cmv-ficha-tecnica',
  'guia-lucro-por-pedido-ifood',
  'checklist-fechamento-de-caixa',
  'checklist-escolher-sistema-restaurante',
])

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const capturarLead = onRequest({ cors: false, maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false })
    return
  }
  const corpo = (typeof req.body === 'object' && req.body ? req.body : {}) as Record<string, unknown>
  if (typeof corpo.website === 'string' && corpo.website.trim() !== '') {
    res.status(200).json({ ok: true }) // robô: finge que deu certo
    return
  }

  const email = typeof corpo.email === 'string' ? corpo.email.trim().toLowerCase().slice(0, 160) : ''
  const recurso = typeof corpo.recurso === 'string' ? corpo.recurso : ''
  const origem = typeof corpo.origem === 'string' ? corpo.origem.slice(0, 120) : ''
  if (!EMAIL.test(email) || !RECURSOS_VALIDOS.has(recurso)) {
    res.status(400).json({ ok: false })
    return
  }

  const id = createHash('sha256').update(email).digest('hex').slice(0, 40)
  await db.doc(`leads/${id}`).set(
    {
      email,
      recursos: FieldValue.arrayUnion(recurso),
      origens: FieldValue.arrayUnion(origem || 'direto'),
      ultimoEm: FieldValue.serverTimestamp(),
      criadoEm: FieldValue.serverTimestamp(),
      consentimento: 'ao baixar, aceitou receber e-mails com conteúdo de gestão (cancelável)',
    },
    { merge: true },
  )
  res.status(200).json({ ok: true })
})
