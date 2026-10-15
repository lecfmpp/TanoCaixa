/* ------------------------------------------------------------------ *
 * Stripe — assinaturas (Billing) + portal do cliente. Invoicing acontece
 * automaticamente a cada ciclo da assinatura (Stripe Billing gera 1
 * invoice por período). NÃO usamos Stripe Tax: a conta é do Brasil e o
 * Stripe Tax ainda não cobre o país (a API retorna erro se tentarmos
 * habilitar automatic_tax) — os preços dos planos já devem sair com
 * imposto embutido, e NF-e/NFS-e é emitida fora do Stripe (emissor local).
 *
 * Plano ÚNICO: R$ 149/mês por restaurante (ver assinatura.ts). Crie o Product
 * "Tá no Caixa" com um Price recorrente mensal de R$ 149,00 (BRL) e coloque o ID
 * do Price em STRIPE_PRICE_UNICO. Teste de 14 dias sem cartão: contado pela
 * criação do restaurante, fora do Stripe.
 *
 * O status da assinatura fica em `assinaturas/{restauranteId}`, coleção só do
 * servidor (nenhuma regra do Firestore a libera ao app): o app pergunta pelo
 * callable `statusAssinatura`. Assim ninguém grava "ativa" no próprio restaurante.
 *
 * PRÉ-REQUISITOS: plano Blaze + segredos (ver functions/README.md):
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *   firebase functions:secrets:set STRIPE_PRICE_UNICO     (price_… do plano de R$ 149)
 *
 * Registre o endpoint do webhook (URL do `stripeWebhook` publicado) no
 * Dashboard do Stripe, ouvindo: checkout.session.completed,
 * customer.subscription.created/updated/deleted, invoice.paid,
 * invoice.payment_failed. Configure também o Customer Portal em
 * https://dashboard.stripe.com/settings/billing/portal (o que o cliente
 * pode trocar/cancelar) — sem isso, portalAssinatura falha.
 * ------------------------------------------------------------------ */
import Stripe from 'stripe'
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore } from 'firebase-admin/firestore'
import { exigirDonoOuGestao } from './acesso'
import { PLANO_UNICO, estadoDaAssinatura, statusDoStripe, urlSegura } from './assinatura'

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')
const STRIPE_PRICE_UNICO = defineSecret('STRIPE_PRICE_UNICO')

/** STRIPE_SECRET_KEY é uma Organization API key (várias contas na mesma
 * organização Stripe) — toda chamada v1 precisa dizer qual conta é o alvo,
 * via header Stripe-Context (o SDK só injeta esse header sozinho pra API v2). */
const STRIPE_ACCOUNT_ID = 'acct_1TyFRi0l2nAKb92b'
// `additionalHeaders` existe em runtime (ver stripe/cjs/utils.js) mas não está
// nos tipos das chamadas v1 — daí o cast via unknown.
const comContexto = {
  additionalHeaders: { 'Stripe-Context': STRIPE_ACCOUNT_ID },
} as unknown as Stripe.RequestOptions

// Lazy: o app do Firebase Admin só está inicializado quando uma função roda.
const db = { doc: (p: string) => getFirestore().doc(p) }
const cliente = () => new Stripe(STRIPE_SECRET_KEY.value())

const SITE = 'https://tanocaixa.com'
const refAssinatura = (rid: string) => db.doc(`assinaturas/${rid}`)

/** Inicia o checkout do plano único. Só dono/gestão do restaurante. Retorna a URL do Stripe. */
export const criarCheckoutAssinatura = onCall({ secrets: [STRIPE_SECRET_KEY, STRIPE_PRICE_UNICO] }, async (req) => {
  const { restauranteId, sucessoUrl, cancelUrl } = (req.data ?? {}) as Record<string, string | undefined>
  const rid = await exigirDonoOuGestao(req.auth?.uid, restauranteId)
  const atual = (await refAssinatura(rid).get()).data()
  if (atual?.status === 'ativa') throw new HttpsError('already-exists', 'Este restaurante já tem assinatura ativa. Use o portal para gerenciar.')

  const session = await cliente().checkout.sessions.create(
    {
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_UNICO.value(), quantity: 1 }],
      // O e-mail vem do login, não do que o navegador manda.
      customer_email: (req.auth?.token.email as string | undefined) || undefined,
      locale: 'pt-BR',
      subscription_data: { metadata: { restauranteId: rid, plano: PLANO_UNICO } },
      metadata: { restauranteId: rid, plano: PLANO_UNICO },
      success_url: urlSegura(sucessoUrl, `${SITE}/painel/assinatura?assinatura=ok`),
      cancel_url: urlSegura(cancelUrl, `${SITE}/painel/assinatura`),
    },
    comContexto,
  )
  return { url: session.url }
})

/** Abre o portal de cobrança (trocar cartão, ver faturas, cancelar). O cliente do Stripe vem do servidor. */
export const portalAssinatura = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const { restauranteId, returnUrl } = (req.data ?? {}) as Record<string, string | undefined>
  const rid = await exigirDonoOuGestao(req.auth?.uid, restauranteId)
  const customerId = (await refAssinatura(rid).get()).get('customerId') as string | undefined
  if (!customerId) throw new HttpsError('failed-precondition', 'Este restaurante ainda não tem assinatura')
  const portal = await cliente().billingPortal.sessions.create(
    { customer: customerId, return_url: urlSegura(returnUrl, `${SITE}/painel/assinatura`) },
    comContexto,
  )
  return { url: portal.url }
})

/** Situação da assinatura para a tela: em teste (dias restantes), teste encerrado, ativa, pagamento falhou… */
export const statusAssinatura = onCall(async (req) => {
  const rid = await exigirDonoOuGestao(req.auth?.uid, (req.data as { restauranteId?: string } | undefined)?.restauranteId)
  const [restaurante, assinatura] = await Promise.all([db.doc(`restaurants/${rid}`).get(), refAssinatura(rid).get()])
  const criadoEm = restaurante.createTime?.toDate().toISOString() ?? new Date().toISOString()
  return estadoDaAssinatura({
    status: assinatura.get('status') as string | undefined,
    customerId: assinatura.get('customerId') as string | undefined,
    criadoEm,
    agora: new Date().toISOString(),
  })
})

/** Metadata de `restauranteId` vem no objeto direto (session/subscription) ou,
 * para eventos de invoice, em `subscription_details.metadata` (snapshot da
 * assinatura no momento em que a invoice foi gerada). */
function metaDoEvento(tipo: string, obj: Record<string, unknown>): Record<string, string> {
  if (tipo.startsWith('invoice.')) {
    const detalhes = (obj.subscription_details ?? {}) as Record<string, unknown>
    return (detalhes.metadata ?? {}) as Record<string, string>
  }
  return (obj.metadata ?? {}) as Record<string, string>
}

const agoraIso = () => new Date().toISOString()

/** Webhook do Stripe → grava a situação da assinatura em `assinaturas/{restauranteId}`. */
export const stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const s = cliente()
  let evento: Stripe.Event
  try {
    evento = s.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'] as string, STRIPE_WEBHOOK_SECRET.value())
  } catch (e) {
    res.status(400).send(`Webhook inválido: ${(e as Error).message}`)
    return
  }

  // Stripe reenvia eventos em retries — evita processar duas vezes.
  const eventoRef = db.doc(`stripeEventos/${evento.id}`)
  if ((await eventoRef.get()).exists) {
    res.status(200).send('ok (duplicado)')
    return
  }

  const obj = evento.data.object as unknown as Record<string, unknown>
  const meta = metaDoEvento(evento.type, obj)
  const restauranteId = meta.restauranteId

  if (restauranteId) {
    const ref = refAssinatura(restauranteId)
    // Eventos podem chegar fora de ordem: um "active" atrasado não pode desfazer um "canceled".
    const ultimo = Number((await ref.get()).get('ultimoEventoEm') ?? 0)
    const quando = evento.created * 1000
    if (quando >= ultimo) {
      const base = { ultimoEventoEm: quando, atualizadoEm: agoraIso(), plano: PLANO_UNICO }
      if (evento.type === 'checkout.session.completed') {
        const pago = obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required'
        await ref.set(
          { ...base, ...(pago ? { status: 'ativa' } : {}), customerId: (obj.customer as string) ?? null, subscriptionId: (obj.subscription as string) ?? null },
          { merge: true },
        )
      } else if (evento.type.startsWith('customer.subscription.')) {
        const status = evento.type.endsWith('.deleted') ? 'cancelada' : statusDoStripe(obj.status as string | undefined)
        await ref.set(
          { ...base, status, customerId: (obj.customer as string) ?? null, subscriptionId: (obj.id as string) ?? null, cancelaNoFim: obj.cancel_at_period_end === true },
          { merge: true },
        )
      } else if (evento.type === 'invoice.paid') {
        await ref.set({ ...base, status: 'ativa', ultimaFaturaPagaEm: agoraIso() }, { merge: true })
      } else if (evento.type === 'invoice.payment_failed') {
        await ref.set({ ...base, status: 'pagamento_falhou' }, { merge: true })
      }
    }
  } else {
    console.warn(`stripeWebhook: evento ${evento.type} sem restauranteId na metadata`)
  }

  await eventoRef.set({ tipo: evento.type, recebidoEm: agoraIso() })
  res.status(200).send('ok')
})
