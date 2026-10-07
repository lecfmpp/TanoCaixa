/* ------------------------------------------------------------------ *
 * Cloud Functions do Tá no Caixa — integração financeira com o iFood.
 *
 * PRÉ-REQUISITOS (ver functions/README.md):
 *  1. Plano Blaze habilitado no Firebase (Cloud Functions exige billing).
 *  2. App registrado no iFood (Centralizado) → chaves.
 *  3. Segredos:
 *     firebase functions:secrets:set IFOOD_CLIENT_ID / IFOOD_CLIENT_SECRET
 *
 * Deploy:  cd functions && npm i && firebase deploy --only functions
 * ------------------------------------------------------------------ */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ClienteIFood, ErroIFood } from './ifood/client'
import {
  syncFinanceiroDia,
  syncCatalogo,
  syncEstadoLoja,
  type EscritorFirestore,
} from './ifood/sync'

initializeApp()
const db = getFirestore()

const IFOOD_CLIENT_ID = defineSecret('IFOOD_CLIENT_ID')
const IFOOD_CLIENT_SECRET = defineSecret('IFOOD_CLIENT_SECRET')
const SEGREDOS = [IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET]

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
    for (const loja of await lojasConectadas()) {
      try {
        if (loja.provedor === 'ifood') {
          const ctx = { cliente: iF, escritor, merchantId: loja.merchantId, restauranteId: loja.restauranteId }
          const r = await syncFinanceiroDia(ctx, data)
          await syncEstadoLoja(ctx)
          await syncCatalogo(ctx)
          console.log(`iFood ${loja.restauranteId}: ${r.pedidos} pedidos, R$ ${r.bruto}`)
        } else {
          // Só o iFood é integrado. Documentos antigos de outros provedores
          // (ex.: 'rappi') ficam no Firestore mas são ignorados aqui.
          console.log(`sync ignorado: provedor '${loja.provedor}' não é mais integrado (${loja.restauranteId})`)
        }
      } catch (e) {
        console.error(`sync falhou (${loja.provedor}/${loja.restauranteId})`, e)
      }
    }
  },
)

/* --------------- Conectar loja (guarda o merchantId) --------------------- */

/**
 * Lojas do iFood às quais o aplicativo tem acesso. O dono escolhe a dele
 * numa lista em vez de digitar o merchantId à mão — é o que gera a chamada
 * real ao módulo Merchant que a homologação exige ver acontecendo.
 */
export const listarLojasIFood = onCall({ secrets: SEGREDOS }, async () => {
  try {
    const lojas = await clienteIFood().merchants()
    return {
      lojas: lojas.map((l) => ({ id: l.id, nome: l.name, razaoSocial: l.corporateName ?? '' })),
    }
  } catch (e) {
    const msg = e instanceof ErroIFood ? e.mensagemAmigavel : 'Não foi possível consultar o iFood agora.'
    throw new HttpsError('unavailable', msg)
  }
})

export const conectarIntegracao = onCall({ secrets: SEGREDOS }, async (req) => {
  const { restauranteId, provedor, merchantId } = (req.data ?? {}) as {
    restauranteId?: string
    provedor?: string
    merchantId?: string
  }
  if (!restauranteId || !provedor || !merchantId) {
    throw new HttpsError('invalid-argument', 'restauranteId, provedor e merchantId obrigatórios')
  }

  const patch: Record<string, unknown> = {
    provedor,
    merchantId,
    status: 'conectando',
    conectadoEm: new Date().toISOString(),
  }

  // No iFood, confirmamos que a loja existe e que o app tem acesso a ela
  // antes de gravar — evita conectar um código digitado errado.
  if (provedor === 'ifood') {
    try {
      const lojas = await clienteIFood().merchants()
      const loja = lojas.find((l) => l.id === merchantId)
      if (!loja) {
        throw new HttpsError(
          'not-found',
          'Essa loja não aparece entre as autorizadas para o Tá no Caixa no iFood.',
        )
      }
      patch.nomeLoja = loja.name
      patch.razaoSocial = loja.corporateName ?? ''
      patch.status = 'conectado'
    } catch (e) {
      if (e instanceof HttpsError) throw e
      const msg = e instanceof ErroIFood ? e.mensagemAmigavel : 'Não foi possível confirmar a loja no iFood.'
      throw new HttpsError('unavailable', msg)
    }
  }

  await db.doc(`restaurants/${restauranteId}/integracoes/${provedor}`).set(patch, { merge: true })
  return { ok: true }
})

/**
 * Sincronização sob demanda, disparada por um botão no painel. Existe para
 * que a homologação por vídeo possa mostrar a consulta acontecendo na hora —
 * o job das 06:00 roda sem ninguém olhando.
 */
export const sincronizarIFoodAgora = onCall({ secrets: SEGREDOS }, async (req) => {
  const { restauranteId, merchantId } = (req.data ?? {}) as {
    restauranteId?: string
    merchantId?: string
  }
  if (!restauranteId || !merchantId) {
    throw new HttpsError('invalid-argument', 'restauranteId e merchantId obrigatórios')
  }
  const ctx = { cliente: clienteIFood(), escritor, merchantId, restauranteId }
  try {
    await syncEstadoLoja(ctx)
    const itens = await syncCatalogo(ctx)
    return { ok: true, itens }
  } catch (e) {
    const msg = e instanceof ErroIFood ? e.mensagemAmigavel : 'Falha ao sincronizar com o iFood.'
    throw new HttpsError('unavailable', msg)
  }
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
/**
 * Confere o header `X-IFood-Signature`: HMAC-SHA256 do corpo CRU da
 * requisição, com o client_secret do app, em hexadecimal.
 *
 * Obrigatório para homologação — o iFood testa a integração enviando
 * eventos com assinatura inválida e espera que sejam recusados.
 */
function assinaturaValida(rawBody: Buffer | undefined, assinatura: string | undefined): boolean {
  if (!rawBody || !assinatura) return false
  const esperada = createHmac('sha256', IFOOD_CLIENT_SECRET.value()).update(rawBody).digest('hex')
  const a = Buffer.from(esperada, 'utf8')
  const b = Buffer.from(assinatura.trim().toLowerCase(), 'utf8')
  // timingSafeEqual exige mesmo tamanho; tamanhos diferentes já são inválidos.
  return a.length === b.length && timingSafeEqual(a, b)
}

export const ifoodWebhook = onRequest({ secrets: SEGREDOS }, async (req, res) => {
  const assinatura = req.header('x-ifood-signature')
  if (!assinaturaValida(req.rawBody, assinatura)) {
    console.warn('iFood webhook: assinatura inválida — requisição recusada')
    res.status(401).send('invalid signature')
    return
  }

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

/* -------------------------- Stripe (assinaturas) ------------------------- */
export {
  criarCheckoutAssinatura,
  portalAssinatura,
  statusAssinatura,
  stripeWebhook,
} from './stripe'

/* ------------------- Gemini Vision (foto → lançamento) ------------------- */
export { analisarFoto, perguntarEstoque } from './gemini'

/* ----------------------------- Convites de equipe ------------------------ */
export { criarConvite, verConvite, aceitarConvite } from './convites'

/* ----------------------- E-mail de boas-vindas (Resend) ------------------- */
export { boasVindas } from './boasVindasTrigger'
