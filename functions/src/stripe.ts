/* ------------------------------------------------------------------ *
 * Stripe — assinaturas (Billing) + portal do cliente. Invoicing acontece
 * automaticamente a cada ciclo da assinatura (Stripe Billing gera 1
 * invoice por período). NÃO usamos Stripe Tax: a conta é do Brasil e o
 * Stripe Tax ainda não cobre o país (a API retorna erro se tentarmos
 * habilitar automatic_tax) — os preços dos planos já devem sair com
 * imposto embutido, e NF-e/NFS-e é emitida fora do Stripe (emissor local).
 *
 * Plano único do Tá no Caixa: R$ 149 por loja/mês (sem PDV e CMV, que ainda
 * estão em breve). O preço "de" R$ 249 é só âncora de comunicação na landing
 * — o Stripe cobra 149. O valor entra como `price_data` no checkout (moeda,
 * valor e recorrência vivem em PRECO_LOJA_CENTAVOS abaixo), então não há
 * Price ID pra criar/guardar. A quantidade da assinatura é o nº de lojas.
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

/** R$ 149,00 por loja/mês. Mudou o preço? Mude aqui e na landing (Preco). */
const PRECO_LOJA_CENTAVOS = 14900
const MAX_LOJAS = 50

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

/** Inicia o checkout de assinatura (R$ 149/loja). Retorna a URL do Stripe. */
export const criarCheckoutAssinatura = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    const { restauranteId, email, sucessoUrl, cancelUrl } = (req.data ?? {}) as Record<string, string>
    if (!restauranteId) throw new HttpsError('invalid-argument', 'restauranteId obrigatório')
    const lojas = Math.floor(Number((req.data as Record<string, unknown>)?.lojas ?? 1))
    if (!Number.isFinite(lojas) || lojas < 1 || lojas > MAX_LOJAS) {
      throw new HttpsError('invalid-argument', `lojas deve ficar entre 1 e ${MAX_LOJAS}`)
    }
    const s = cliente()
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        quantity: lojas,
        price_data: {
          currency: 'brl',
          unit_amount: PRECO_LOJA_CENTAVOS,
          recurring: { interval: 'month' },
          product_data: { name: 'Tá no Caixa — por loja', description: 'Gestão financeira do restaurante. Sem PDV e CMV (em breve).' },
        },
      }],
      allow_promotion_codes: true,
      customer_email: email || undefined,
      subscription_data: { metadata: { restauranteId, plano: 'loja', lojas: String(lojas) } },
      metadata: { restauranteId, plano: 'loja', lojas: String(lojas) },
      success_url: sucessoUrl || 'https://tanocaixa.web.app/painel?assinatura=ok',
      cancel_url: cancelUrl || 'https://tanocaixa.web.app/painel/assinatura',
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
            lojas: Number(meta.lojas) || null,
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
