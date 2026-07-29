/* ------------------------------------------------------------------ *
 * Stripe — assinaturas (Billing) + portal do cliente. Invoicing acontece
 * automaticamente a cada ciclo da assinatura (Stripe Billing gera 1
 * invoice por período). NÃO usamos Stripe Tax: a conta é do Brasil e o
 * Stripe Tax ainda não cobre o país (a API retorna erro se tentarmos
 * habilitar automatic_tax) — os preços dos planos já devem sair com
 * imposto embutido, e NF-e/NFS-e é emitida fora do Stripe (emissor local).
 *
 * Planos do Tá no Caixa: Cozinha só (R$79) · Casa cheia (R$149) · Mais de
 * uma casa (R$299). Crie os Products/Prices no Stripe e coloque os IDs de
 * Price em STRIPE_PRICE_* (secrets/env).
 *
 * PRÉ-REQUISITOS: plano Blaze + segredos (ver functions/README.md):
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
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

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')
const STRIPE_PRICE_COZINHA = defineSecret('STRIPE_PRICE_COZINHA')
const STRIPE_PRICE_CASA = defineSecret('STRIPE_PRICE_CASA')
const STRIPE_PRICE_REDE = defineSecret('STRIPE_PRICE_REDE')

/** STRIPE_SECRET_KEY é uma Organization API key (várias contas na mesma
 * organização Stripe) — toda chamada v1 precisa dizer qual conta é o alvo,
 * via header Stripe-Context (o SDK só injeta esse header sozinho pra API v2). */
const STRIPE_ACCOUNT_ID = 'acct_1TyFRi0l2nAKb92b'
// `additionalHeaders` existe em runtime (ver stripe/cjs/utils.js) mas não está
// nos tipos das chamadas v1 — daí o cast via unknown.
const comContexto = {
  additionalHeaders: { 'Stripe-Context': STRIPE_ACCOUNT_ID },
} as unknown as Stripe.RequestOptions

const db = getFirestore()
const cliente = () => new Stripe(STRIPE_SECRET_KEY.value())

function priceDoPlano(plano: string): string {
  if (plano === 'cozinha') return STRIPE_PRICE_COZINHA.value()
  if (plano === 'casa') return STRIPE_PRICE_CASA.value()
  if (plano === 'rede') return STRIPE_PRICE_REDE.value()
  throw new HttpsError('invalid-argument', `plano inválido: ${plano}`)
}

/** Inicia o checkout de assinatura de um plano. Retorna a URL do Stripe. */
export const criarCheckoutAssinatura = onCall(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_PRICE_COZINHA, STRIPE_PRICE_CASA, STRIPE_PRICE_REDE] },
  async (req) => {
    const { restauranteId, plano, email, sucessoUrl, cancelUrl } = (req.data ?? {}) as Record<string, string>
    if (!restauranteId || !plano) throw new HttpsError('invalid-argument', 'restauranteId e plano obrigatórios')
    const s = cliente()
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceDoPlano(plano), quantity: 1 }],
      customer_email: email || undefined,
      subscription_data: { metadata: { restauranteId, plano } },
      metadata: { restauranteId, plano },
      success_url: sucessoUrl || 'https://tanocaixa.web.app/painel?assinatura=ok',
      cancel_url: cancelUrl || 'https://tanocaixa.web.app/painel',
    }, comContexto)
    return { url: session.url }
  },
)

/** Abre o portal de cobrança (trocar cartão, ver faturas, cancelar). */
export const portalAssinatura = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const { customerId, returnUrl } = (req.data ?? {}) as Record<string, string>
  if (!customerId) throw new HttpsError('invalid-argument', 'customerId obrigatório')
  const portal = await cliente().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || 'https://tanocaixa.web.app/painel',
  }, comContexto)
  return { url: portal.url }
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

/** Webhook do Stripe → grava o status da assinatura no restaurante. */
export const stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const s = cliente()
    let evento: Stripe.Event
    try {
      evento = s.webhooks.constructEvent(
        req.rawBody,
        req.headers['stripe-signature'] as string,
        STRIPE_WEBHOOK_SECRET.value(),
      )
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
      const assinaturaRef = db.doc(`restaurants/${restauranteId}/faturamento/assinatura`)
      if (evento.type === 'checkout.session.completed' || evento.type.startsWith('customer.subscription')) {
        await assinaturaRef.set(
          {
            status: (obj.status as string) ?? 'ativa',
            plano: meta.plano ?? null,
            customerId: (obj.customer as string) ?? null,
            subscriptionId: (obj.subscription as string) ?? (obj.id as string) ?? null,
            atualizadoEm: new Date().toISOString(),
          },
          { merge: true },
        )
      } else if (evento.type === 'invoice.paid') {
        await assinaturaRef.set(
          { status: 'ativa', ultimaFaturaPagaEm: new Date().toISOString() },
          { merge: true },
        )
      } else if (evento.type === 'invoice.payment_failed') {
        await assinaturaRef.set(
          { status: 'pagamento_falhou', atualizadoEm: new Date().toISOString() },
          { merge: true },
        )
      }
    }

    await eventoRef.set({ tipo: evento.type, recebidoEm: new Date().toISOString() })
    res.status(200).send('ok')
  },
)
