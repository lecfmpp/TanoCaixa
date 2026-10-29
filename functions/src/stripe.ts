/* ------------------------------------------------------------------ *
 * Stripe — assinaturas (Billing) + portal do cliente. Invoicing acontece
 * automaticamente a cada ciclo da assinatura (Stripe Billing gera 1
 * invoice por período). NÃO usamos Stripe Tax: a conta é do Brasil e o
 * Stripe Tax ainda não cobre o país (a API retorna erro se tentarmos
 * habilitar automatic_tax) — os preços dos planos já devem sair com
 * imposto embutido, e NF-e/NFS-e é emitida fora do Stripe (emissor local).
 *
 * Planos: Grátis (sem assinatura) e Pro. O Pro custa R$ 149/mês pela primeira
 * loja e R$ 79/mês por loja extra da rede (ver assinatura.ts). A assinatura
 * tem dois itens: "loja principal" (qtd 1) e "loja extra" (qtd = lojas − 1).
 * Os dois Prices são achados pela lookup_key e criados na primeira vez que
 * faltam, então não há Price ID pra guardar em segredo. O preço "de" R$ 249 é
 * só âncora de comunicação na landing.
 *
 * Loja extra nova passa por `abrirLojaExtra`: cobra a proporção do mês na hora
 * (sem pagamento, nada de loja) e só então cria a loja, com `pagadorId`
 * apontando pra loja que paga. O webhook copia o status da assinatura pra
 * todas as lojas desse pagador.
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
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { exigirDonoOuGestao } from './acesso'
import {
  eventoEhMaisNovo,
  itensDaAssinatura,
  planoDaSituacao,
  statusDoStripe,
  urlSegura,
  MAX_LOJAS,
  PRECO_LOJA_CENTAVOS,
  PRECO_LOJA_EXTRA_CENTAVOS,
  type Situacao,
} from './assinatura'

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')

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

/* ------------------------------ Preços ---------------------------------- */

const PRECOS = {
  principal: {
    chave: 'tanocaixa_pro_loja',
    centavos: PRECO_LOJA_CENTAVOS,
    nome: 'Tá no Caixa Pro — loja principal',
    descricao: 'Gestão financeira do restaurante, plano Pro.',
  },
  extra: {
    chave: 'tanocaixa_pro_loja_extra',
    centavos: PRECO_LOJA_EXTRA_CENTAVOS,
    nome: 'Tá no Caixa Pro — loja extra',
    descricao: 'Cada loja a mais da rede.',
  },
} as const

/** Price recorrente mensal pela lookup_key; cria produto + preço na primeira vez.
 * Se o valor mudou no código, cria um preço novo e passa a lookup_key pra ele. */
async function garantirPreco(s: Stripe, tipo: keyof typeof PRECOS): Promise<Stripe.Price> {
  const p = PRECOS[tipo]
  const achados = await s.prices.list({ lookup_keys: [p.chave], active: true, limit: 1 }, comContexto)
  const atual = achados.data[0]
  if (atual && atual.unit_amount === p.centavos && atual.currency === 'brl') return atual
  const produto = typeof atual?.product === 'string'
    ? atual.product
    : (await s.products.create({ name: p.nome, description: p.descricao }, comContexto)).id
  return s.prices.create({
    product: produto,
    currency: 'brl',
    unit_amount: p.centavos,
    recurring: { interval: 'month' },
    lookup_key: p.chave,
    transfer_lookup_key: true,
  }, comContexto)
}

/** Nº de lojas cobradas = soma das quantidades dos itens da assinatura. */
function lojasDaAssinatura(obj: Record<string, unknown>): number | null {
  const itens = ((obj.items as { data?: { quantity?: number }[] } | undefined)?.data ?? [])
  const total = itens.reduce((n, i) => n + (i.quantity ?? 0), 0)
  return total || null
}

/* ------------------------------- Rede ----------------------------------- */

/** Lojas da rede que são de fato do dono: a rede lista, a loja aponta de volta pra rede
 * e o dono é membro. A lista da rede é gravada pelo app, então não basta ela sozinha. */
async function lojasDoDono(redeId: string, donoUid: string): Promise<string[]> {
  const rede = (await db.doc(`redes/${redeId}`).get()).data()
  if (!rede || rede.donoUid !== donoUid) return []
  const ids = ((rede.lojas ?? []) as { restauranteId: string }[]).map((l) => l.restauranteId)
  const docs = ids.length ? await db.getAll(...ids.map((id) => db.doc(`restaurants/${id}`))) : []
  return docs
    .filter((d) => d.exists && d.data()?.redeId === redeId && ((d.data()?.memberUids ?? []) as string[]).includes(donoUid))
    .map((d) => d.id)
}

/** Copia a situação da loja que paga pra todas as lojas extras dela. */
async function propagarParaExtras(pagadorId: string, status: Situacao, agora: string): Promise<void> {
  const extras = await db.collection('assinaturas').where('pagadorId', '==', pagadorId).get()
  if (extras.empty) return
  const lote = db.batch()
  extras.docs.forEach((d) => lote.set(d.ref, { status, plano: planoDaSituacao(status), atualizadoEm: agora }, { merge: true }))
  await lote.commit()
}

/* ----------------------------- Checkout --------------------------------- */

/** Inicia o checkout do Pro. As lojas cobradas saem da rede (no servidor), não do navegador:
 * 1 loja = R$ 149; cada outra loja da rede = + R$ 79. Retorna a URL do Stripe. */
export const criarCheckoutAssinatura = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    const { restauranteId: rid, email, sucessoUrl, cancelUrl } = (req.data ?? {}) as Record<string, string>
    const restauranteId = await exigirDonoOuGestao(req.auth?.uid, rid)
    const atual = (await db.doc(`assinaturas/${restauranteId}`).get()).data()
    if (planoDaSituacao(atual?.status as string | undefined) === 'pro') {
      throw new HttpsError('already-exists', 'Este restaurante já está no Pro. Use o portal da assinatura.')
    }

    const redeId = (await db.doc(`restaurants/${restauranteId}`).get()).data()?.redeId as string | undefined
    const daRede = redeId ? await lojasDoDono(redeId, req.auth!.uid) : []
    const lojas = Math.min(MAX_LOJAS, Math.max(1, daRede.includes(restauranteId) ? daRede.length : 1))
    const { extras } = itensDaAssinatura(lojas)

    const s = cliente()
    const [principal, extra] = await Promise.all([garantirPreco(s, 'principal'), garantirPreco(s, 'extra')])
    const meta = { restauranteId, plano: 'pro', lojas: String(lojas), ...(redeId && daRede.includes(restauranteId) ? { redeId } : {}) }
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      // Assinatura recorrente só aceita cartão; fixar evita o erro "No valid payment method types"
      // quando a conta não tem métodos ativos no painel para BRL.
      payment_method_types: ['card'],
      line_items: [
        { price: principal.id, quantity: 1 },
        ...(extras > 0 ? [{ price: extra.id, quantity: extras }] : []),
      ],
      allow_promotion_codes: true,
      customer_email: email || undefined,
      subscription_data: { metadata: meta },
      metadata: meta,
      success_url: urlSegura(sucessoUrl, 'https://tanocaixa.web.app/painel?assinatura=ok'),
      cancel_url: urlSegura(cancelUrl, 'https://tanocaixa.web.app/painel/assinatura'),
    }, comContexto)
    return { url: session.url }
  },
)

/** Abre o portal de cobrança (trocar cartão, ver faturas, cancelar). O cliente do Stripe vem do
 * servidor (`assinaturas/{restauranteId}`), nunca do navegador. Loja extra abre o portal de quem paga. */
export const portalAssinatura = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const { restauranteId: rid, returnUrl } = (req.data ?? {}) as Record<string, string>
  const restauranteId = await exigirDonoOuGestao(req.auth?.uid, rid)
  let doc = (await db.doc(`assinaturas/${restauranteId}`).get()).data()
  if (doc?.pagadorId) doc = (await db.doc(`assinaturas/${doc.pagadorId as string}`).get()).data()
  const customerId = doc?.customerId as string | undefined
  if (!customerId) throw new HttpsError('failed-precondition', 'Este restaurante ainda não tem assinatura')
  const portal = await cliente().billingPortal.sessions.create({
    customer: customerId,
    return_url: urlSegura(returnUrl, 'https://tanocaixa.web.app/painel'),
  }, comContexto)
  return { url: portal.url }
})

/* ---------------------------- Loja extra -------------------------------- */

/**
 * Abre uma loja nova na rede de quem já é Pro, cobrando + R$ 79/mês. A cobrança vem
 * primeiro (proporção do mês, na hora): se o cartão recusar, a loja não é criada.
 * Cria o tenant com o básico; o app completa a configuração (tetos, mês de abertura).
 */
export const abrirLojaExtra = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const uid = req.auth?.uid
  const { restauranteId: rid, nome, bairro, cidade, tipoNegocio } = (req.data ?? {}) as Record<string, string>
  const restauranteId = await exigirDonoOuGestao(uid, rid)
  const nomeLoja = (nome ?? '').trim().slice(0, 80)
  if (!nomeLoja) throw new HttpsError('invalid-argument', 'Dê um nome pra loja')

  const atual = (await db.doc(`restaurants/${restauranteId}`).get()).data()
  const redeId = atual?.redeId as string | undefined
  const redeSnap = redeId ? await db.doc(`redes/${redeId}`).get() : null
  const rede = redeSnap?.data()
  if (!redeId || !rede || rede.donoUid !== uid) throw new HttpsError('permission-denied', 'Só o dono da rede abre loja nova')

  // Quem paga: a própria loja, ou a loja principal se esta já é uma extra.
  const minha = (await db.doc(`assinaturas/${restauranteId}`).get()).data()
  const pagadorId = (minha?.pagadorId as string | undefined) ?? restauranteId
  const pagador = pagadorId === restauranteId ? minha : (await db.doc(`assinaturas/${pagadorId}`).get()).data()
  const status = pagador?.status as Situacao | undefined
  if (planoDaSituacao(status) !== 'pro' || !pagador?.subscriptionId) {
    throw new HttpsError('failed-precondition', 'Loja extra é do plano Pro', { motivo: 'plano_pro' })
  }
  if (((rede.lojas ?? []) as unknown[]).length >= MAX_LOJAS) {
    throw new HttpsError('resource-exhausted', `A rede já tem ${MAX_LOJAS} lojas`)
  }

  // 1. Cobra: +1 no item "loja extra" (ou cria o item), fatura a proporção agora.
  const s = cliente()
  const subscriptionId = pagador.subscriptionId as string
  try {
    const [sub, extra] = await Promise.all([
      s.subscriptions.retrieve(subscriptionId, {}, comContexto),
      garantirPreco(s, 'extra'),
    ])
    const item = sub.items.data.find((i) => i.price.lookup_key === PRECOS.extra.chave || i.price.id === extra.id)
    const cobranca = { proration_behavior: 'always_invoice', payment_behavior: 'error_if_incomplete' } as const
    if (item) {
      await s.subscriptionItems.update(item.id, { quantity: (item.quantity ?? 0) + 1, ...cobranca }, comContexto)
    } else {
      await s.subscriptionItems.create({ subscription: subscriptionId, price: extra.id, quantity: 1, ...cobranca }, comContexto)
    }
    await s.subscriptions.update(subscriptionId, { metadata: { redeId } }, comContexto)
  } catch (e) {
    console.error('abrirLojaExtra: cobrança falhou', e)
    throw new HttpsError('failed-precondition', 'O pagamento da loja extra não passou. Confira o cartão no portal da assinatura.', { motivo: 'pagamento' })
  }

  // 2. Cria a loja. Daqui pra frente a cobrança já foi feita: se algo falhar, fica no log.
  const slug = nomeLoja.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 24)
  const novoId = `${redeId}-${slug}-${Math.random().toString(36).slice(2, 6)}`
  const agora = new Date().toISOString()
  const loja = { restauranteId: novoId, nome: nomeLoja, bairro: (bairro ?? '').trim(), cidade: (cidade ?? '').trim() || 'Rio de Janeiro', propria: true }
  const lote = db.batch()
  lote.set(db.doc(`restaurants/${novoId}`), {
    nome: loja.nome,
    bairro: loja.bairro,
    cidade: loja.cidade,
    tipoOperacao: 'delivery_salao',
    tipoCozinha: '',
    cnpj: '',
    regimeTributario: 'simples',
    aliquotaImposto: 0.06,
    // Loja nova começa sem meta; o dono define no Plano do mês.
    metaFaturamento: 0,
    tipoNegocio: tipoNegocio === 'franqueada' ? 'franqueada' : 'multi_loja',
    redeId,
    bandeira: (rede.nome as string) ?? '',
    memberUids: [uid],
    criadoPor: uid,
  })
  lote.set(db.doc(`restaurants/${novoId}/membros/${uid}`), {
    nome: 'Franqueador',
    inicial: 'F',
    cor: '#7B6A8C',
    papel: 'franqueador',
    conviteStatus: 'ativo',
  })
  lote.set(db.doc(`assinaturas/${novoId}`), { plano: 'pro', status, pagadorId, criadoEm: agora, atualizadoEm: agora })
  lote.set(db.doc(`redes/${redeId}`), { lojas: FieldValue.arrayUnion(loja) }, { merge: true })
  await lote.commit()
  return loja
})

/* ------------------------------ Webhook --------------------------------- */

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

/** Webhook do Stripe → grava o status da assinatura em `assinaturas/{restauranteId}`
 * e copia pras lojas extras (`pagadorId`). */
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
      // Coleção só do servidor (nenhuma regra do app a libera pra escrita): quem é membro do
      // restaurante consegue escrever em restaurants/{id}/**, então o status não pode morar lá.
      const assinaturaRef = db.doc(`assinaturas/${restauranteId}`)
      const gravadoEm = (await assinaturaRef.get()).data()?.eventoEm as number | undefined
      const eventoEm = evento.created
      const agora = new Date().toISOString()
      let status: Situacao | null = null
      if (evento.type === 'checkout.session.completed') {
        // `status` da sessão é "complete" (não da assinatura): só guarda quem é o cliente.
        await assinaturaRef.set(
          {
            customerId: (obj.customer as string) ?? null,
            subscriptionId: (obj.subscription as string) ?? null,
            atualizadoEm: agora,
          },
          { merge: true },
        )
        // As outras lojas que já existiam na rede entram no Pro junto (foram cobradas como extra).
        const dono = meta.redeId ? ((await db.doc(`redes/${meta.redeId}`).get()).data()?.donoUid as string | undefined) : undefined
        const outras = meta.redeId && dono ? (await lojasDoDono(meta.redeId, dono)).filter((id) => id !== restauranteId) : []
        if (outras.length) {
          const lote = db.batch()
          outras.forEach((id) => lote.set(db.doc(`assinaturas/${id}`), { pagadorId: restauranteId, atualizadoEm: agora }, { merge: true }))
          await lote.commit()
          const atual = (await assinaturaRef.get()).data()?.status as Situacao | undefined
          if (atual) await propagarParaExtras(restauranteId, atual, agora)
        }
      } else if (eventoEhMaisNovo(eventoEm, gravadoEm)) {
        if (evento.type.startsWith('customer.subscription')) {
          status = evento.type === 'customer.subscription.deleted' ? 'cancelada' : statusDoStripe(obj.status as string | undefined)
          await assinaturaRef.set(
            {
              status,
              plano: planoDaSituacao(status),
              lojas: lojasDaAssinatura(obj),
              customerId: (obj.customer as string) ?? null,
              subscriptionId: (obj.id as string) ?? null,
              pagadorId: FieldValue.delete(),
              eventoEm,
              atualizadoEm: agora,
            },
            { merge: true },
          )
        } else if (evento.type === 'invoice.paid') {
          status = 'ativa'
          await assinaturaRef.set({ status, plano: 'pro', ultimaFaturaPagaEm: agora, eventoEm }, { merge: true })
        } else if (evento.type === 'invoice.payment_failed') {
          status = 'pagamento_falhou'
          await assinaturaRef.set({ status, plano: planoDaSituacao(status), atualizadoEm: agora, eventoEm }, { merge: true })
        }
        if (status) await propagarParaExtras(restauranteId, status, agora)
      }
    }

    await eventoRef.set({ tipo: evento.type, recebidoEm: new Date().toISOString() })
    res.status(200).send('ok')
  },
)
