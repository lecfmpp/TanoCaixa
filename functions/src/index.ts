/* ------------------------------------------------------------------ *
 * Cloud Functions do Tá no Caixa — integrações financeiras (iFood + Rappi).
 *
 * PRÉ-REQUISITOS (ver functions/README.md):
 *  1. Plano Blaze habilitado no Firebase (Cloud Functions exige billing).
 *  2. Apps registrados no iFood (Centralizado) e no Rappi (Partners) → chaves.
 *  3. Segredos:
 *     firebase functions:secrets:set IFOOD_CLIENT_ID / IFOOD_CLIENT_SECRET
 *     firebase functions:secrets:set RAPPI_CLIENT_ID / RAPPI_CLIENT_SECRET
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
import { ClienteRappi } from './rappi/client'
import { syncFinanceiroDiaRappi, syncCatalogoRappi } from './rappi/sync'

initializeApp()
const db = getFirestore()

const IFOOD_CLIENT_ID = defineSecret('IFOOD_CLIENT_ID')
const IFOOD_CLIENT_SECRET = defineSecret('IFOOD_CLIENT_SECRET')
const RAPPI_CLIENT_ID = defineSecret('RAPPI_CLIENT_ID')
const RAPPI_CLIENT_SECRET = defineSecret('RAPPI_CLIENT_SECRET')
const SEGREDOS = [IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET, RAPPI_CLIENT_ID, RAPPI_CLIENT_SECRET]

async function setDoc(restauranteId: string, col: string, id: string, doc: unknown) {
  await db.doc(`restaurants/${restauranteId}/${col}/${id}`).set(doc as object, { merge: true })
}

const escritor: EscritorFirestore = {
  salvarReceitaDia: (r, id, doc) => setDoc(r, 'receita_dia', id, doc),
  salvarDespesa: (r, id, doc) => setDoc(r, 'despesas', id, doc),
  salvarProdutoMenu: (r, id, doc) => setDoc(r, 'produtos_menu', id, doc),
  salvarAtividade: (r, id, doc) => setDoc(r, 'atividades', id, doc),
  atualizarIntegracao: async (r, provedor, patch) => {
    await db.doc(`restaurants/${r}/integracoes/${provedor}`).set(patch, { merge: true })
  },
}

function clienteIFood() {
  return new ClienteIFood({ clientId: IFOOD_CLIENT_ID.value(), clientSecret: IFOOD_CLIENT_SECRET.value() })
}
function clienteRappi() {
  return new ClienteRappi({ clientId: RAPPI_CLIENT_ID.value(), clientSecret: RAPPI_CLIENT_SECRET.value() })
}

function ontem(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

interface LojaConectada {
  restauranteId: string
  provedor: string
  merchantId: string
}
/** Acha o restaurante dono de um merchantId/storeId (evento de webhook → dono). */
async function restauranteDoMerchant(provedor: string, merchantId: string): Promise<string | null> {
  const snap = await db
    .collectionGroup('integracoes')
    .where('provedor', '==', provedor)
    .where('merchantId', '==', merchantId)
    .limit(1)
    .get()
  const doc = snap.docs[0]
  return doc ? doc.ref.parent.parent!.id : null
}

async function lojasConectadas(): Promise<LojaConectada[]> {
  const snap = await db.collectionGroup('integracoes').get()
  return snap.docs
    .filter((d) => d.get('merchantId') && d.get('status') !== 'desconectado')
    .map((d) => ({
      restauranteId: d.ref.parent.parent!.id,
      provedor: (d.get('provedor') as string) ?? d.id,
      merchantId: d.get('merchantId') as string,
    }))
}

/* --------------------- Sync diário 06:00 (America/Sao_Paulo) -------------- */

export const syncDiario = onSchedule(
  { schedule: '0 6 * * *', timeZone: 'America/Sao_Paulo', secrets: SEGREDOS },
  async () => {
    const data = ontem()
    const iF = clienteIFood()
    const rp = clienteRappi()
    for (const loja of await lojasConectadas()) {
      try {
        if (loja.provedor === 'ifood') {
          const ctx = { cliente: iF, escritor, merchantId: loja.merchantId, restauranteId: loja.restauranteId }
          const r = await syncFinanceiroDia(ctx, data)
          await syncCatalogo(ctx)
          console.log(`iFood ${loja.restauranteId}: ${r.pedidos} pedidos, R$ ${r.bruto}`)
        } else if (loja.provedor === 'rappi') {
          const ctx = { cliente: rp, escritor, storeId: loja.merchantId, restauranteId: loja.restauranteId }
          const r = await syncFinanceiroDiaRappi(ctx, data)
          await syncCatalogoRappi(ctx)
          console.log(`Rappi ${loja.restauranteId}: ${r.pedidos} pedidos, R$ ${r.bruto}`)
        }
      } catch (e) {
        console.error(`sync falhou (${loja.provedor}/${loja.restauranteId})`, e)
      }
    }
  },
)

/* ------------ Conectar loja (guarda o merchantId/storeId) ---------------- */

export const conectarIntegracao = onCall(async (req) => {
  const { restauranteId, provedor, merchantId } = (req.data ?? {}) as {
    restauranteId?: string
    provedor?: string
    merchantId?: string
  }
  if (!restauranteId || !provedor || !merchantId) {
    throw new HttpsError('invalid-argument', 'restauranteId, provedor e merchantId obrigatórios')
  }
  await db.doc(`restaurants/${restauranteId}/integracoes/${provedor}`).set(
    { provedor, merchantId, status: 'conectando', conectadoEm: new Date().toISOString() },
    { merge: true },
  )
  return { ok: true }
})

/* ---------------------------- Webhooks ---------------------------------- */

/** Registro na trilha de atividades: um evento de pedido em tempo real. */
function atividadeDoEventoIFood(evento: { id: string; code: string; orderId: string }) {
  return {
    id: `ifood-evento-${evento.id}`,
    quem: 'Automático',
    quemInicial: '',
    quemCor: '#AEB9B8',
    acao: 'recebeu pedido do',
    entidade: `iFood · pedido ${evento.orderId} (${evento.code})`,
    tipo: 'Pedido',
    criadoEm: new Date().toISOString(),
    criadoPorId: 'ifood',
    criadoPorNome: 'Automático',
    origem: 'integracao' as const,
  }
}

/** Webhook do iFood (modelo Centralizado) — recebe eventos de pedido de
 * várias lojas num só POST. Grava uma atividade por evento e confirma (ACK)
 * todos os ids recebidos, exigido pela API mesmo quando o processamento
 * falha em achar o restaurante dono (evita retentativas infinitas do iFood).
 * OBS: nomes de campo modelados a partir da doc pública — confira contra o
 * payload real na homologação (ver ifood/types.ts). */
export const ifoodWebhook = onRequest({ secrets: SEGREDOS }, async (req, res) => {
  const eventos = (Array.isArray(req.body) ? req.body : [req.body]) as Array<{
    id?: string
    code?: string
    orderId?: string
    merchantId?: string
  }>
  console.log('iFood webhook', JSON.stringify(eventos))

  const ids: string[] = []
  for (const evento of eventos) {
    if (evento?.id) ids.push(evento.id)
    if (!evento?.id || !evento.orderId || !evento.code || !evento.merchantId) continue
    try {
      const restauranteId = await restauranteDoMerchant('ifood', evento.merchantId)
      if (!restauranteId) {
        console.warn(`iFood webhook: nenhuma loja conectada para merchantId ${evento.merchantId}`)
        continue
      }
      const atividade = atividadeDoEventoIFood({ id: evento.id, code: evento.code, orderId: evento.orderId })
      await escritor.salvarAtividade(restauranteId, atividade.id, atividade)
    } catch (e) {
      console.error(`iFood webhook: falha ao processar evento ${evento?.id}`, e)
    }
  }

  if (ids.length) {
    try {
      await clienteIFood().ackEventos(ids)
    } catch (e) {
      console.error('iFood webhook: ACK falhou', e)
    }
  }
  res.status(202).send('ok')
})

export const rappiWebhook = onRequest({ secrets: SEGREDOS }, async (req, res) => {
  console.log('Rappi webhook', JSON.stringify(req.body))
  res.status(202).send('ok')
})

/* -------------------------- Stripe (assinaturas) ------------------------- */
export {
  criarCheckoutAssinatura,
  portalAssinatura,
  stripeWebhook,
} from './stripe'

/* ----------------------------- Convites de equipe ------------------------ */
export { criarConvite, verConvite, aceitarConvite } from './convites'
