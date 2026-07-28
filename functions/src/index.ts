/* ------------------------------------------------------------------ *
 * Cloud Functions do Tá no Caixa — integração iFood (foco financeiro).
 *
 * PRÉ-REQUISITOS (ver functions/README.md):
 *  1. Plano Blaze habilitado no Firebase (Cloud Functions exige billing).
 *  2. App registrado no Portal do iFood (Centralizado) → clientId/secret.
 *  3. Segredos: firebase functions:secrets:set IFOOD_CLIENT_ID / IFOOD_CLIENT_SECRET
 *
 * Deploy:  cd functions && npm i && firebase deploy --only functions
 * ------------------------------------------------------------------ */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ClienteIFood } from './ifood/client'
import { syncFinanceiroDia, syncCatalogo, type EscritorFirestore } from './ifood/sync'

initializeApp()
const db = getFirestore()

const IFOOD_CLIENT_ID = defineSecret('IFOOD_CLIENT_ID')
const IFOOD_CLIENT_SECRET = defineSecret('IFOOD_CLIENT_SECRET')

/** Escritor do Firestore via Admin SDK. */
const escritor: EscritorFirestore = {
  salvarReceitaDia: (r, id, doc) => setDoc(r, 'receita_dia', id, doc),
  salvarDespesa: (r, id, doc) => setDoc(r, 'despesas', id, doc),
  salvarProdutoMenu: (r, id, doc) => setDoc(r, 'produtos_menu', id, doc),
  salvarAtividade: (r, id, doc) => setDoc(r, 'atividades', id, doc),
  atualizarIntegracao: async (r, patch) => {
    await db.doc(`restaurants/${r}/integracoes/ifood`).set(patch, { merge: true })
  },
}
async function setDoc(restauranteId: string, col: string, id: string, doc: unknown) {
  await db.doc(`restaurants/${restauranteId}/${col}/${id}`).set(doc as object, { merge: true })
}

function cliente() {
  return new ClienteIFood({
    clientId: IFOOD_CLIENT_ID.value(),
    clientSecret: IFOOD_CLIENT_SECRET.value(),
  })
}

function ontem(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Restaurantes com integração iFood ativa (têm merchantId salvo). */
async function restaurantesComIFood(): Promise<{ restauranteId: string; merchantId: string }[]> {
  const snap = await db.collectionGroup('integracoes').where('provedor', '==', 'ifood').get()
  return snap.docs
    .filter((d) => d.get('merchantId'))
    .map((d) => ({
      restauranteId: d.ref.parent.parent!.id,
      merchantId: d.get('merchantId') as string,
    }))
}

/* --------------------- Sync diário 06:00 (America/Sao_Paulo) -------------- */

export const syncDiarioIFood = onSchedule(
  { schedule: '0 6 * * *', timeZone: 'America/Sao_Paulo', secrets: [IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET] },
  async () => {
    const c = cliente()
    const data = ontem()
    for (const { restauranteId, merchantId } of await restaurantesComIFood()) {
      const ctx = { cliente: c, escritor, merchantId, restauranteId }
      try {
        const r = await syncFinanceiroDia(ctx, data)
        await syncCatalogo(ctx)
        console.log(`iFood ${restauranteId}: ${r.pedidos} pedidos, R$ ${r.bruto}`)
      } catch (e) {
        console.error(`iFood sync falhou (${restauranteId})`, e)
      }
    }
  },
)

/* ------------------ Conectar loja (guarda o merchantId) ------------------ */

export const conectarIFood = onCall(async (req) => {
  const { restauranteId, merchantId } = (req.data ?? {}) as { restauranteId?: string; merchantId?: string }
  if (!restauranteId || !merchantId) throw new HttpsError('invalid-argument', 'restauranteId e merchantId obrigatórios')
  await db.doc(`restaurants/${restauranteId}/integracoes/ifood`).set(
    { provedor: 'ifood', merchantId, status: 'conectando', conectadoEm: new Date().toISOString() },
    { merge: true },
  )
  return { ok: true }
})

/* ---------------------- Webhook de eventos (Centralizado) ---------------- */

export const ifoodWebhook = onRequest(
  { secrets: [IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET] },
  async (req, res) => {
    // iFood envia eventos de pedido aqui (modelo Centralizado). Recomenda-se
    // apenas enfileirar/registrar e responder rápido; o detalhamento financeiro
    // consolidado vem do sync diário da Sales API.
    console.log('iFood webhook', JSON.stringify(req.body))
    res.status(202).send('ok')
  },
)
