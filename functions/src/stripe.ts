/* ------------------------------------------------------------------ *
 * Stripe — assinaturas (Billing) + portal do cliente. Invoicing acontece
 * automaticamente a cada ciclo da assinatura (Stripe Billing gera 1
 * invoice por período). NÃO usamos Stripe Tax: a conta é do Brasil e o
 * Stripe Tax ainda não cobre o país (a API retorna erro se tentarmos
 * habilitar automatic_tax) — os preços dos planos já devem sair com
 * imposto embutido, e NF-e/NFS-e é emitida fora do Stripe (emissor local).
 *
 * Um plano pago só, o Pro: R$ 149/mês com 1 loja. Quem tem mais lojas soma a
 * Expansão (opcional): R$ 79/mês por loja além da primeira. A assinatura tem
 * dois itens — Pro (qtd 1) e Expansão (qtd = lojas − 1, ausente com 1 loja).
 * Os Prices são achados pela lookup_key e criados na primeira vez que faltam
 * (ver `garantirPreco`), então não há Price ID pra guardar. O preço "de"
 * R$ 249 é só âncora de comunicação na landing. Valores em assinatura.ts.
 *
 * Conta de cobrança: a rede inteira paga numa assinatura só, guardada em
 * `assinaturas/{uid do dono da rede}` (o tenant da 1ª loja dele). Loja sem
 * rede paga em `assinaturas/{restauranteId}`. Mudou o nº de lojas da rede?
 * O gatilho `lojasDaRedeNaAssinatura` acerta a quantidade no Stripe.
 *
 * Teste grátis: DIAS_TESTE a partir do 1º `statusAssinatura` (conta nova ou
 * conta antiga no 1º acesso depois desta regra). Fim do teste guardado no
 * servidor (`assinaturas/*` não é gravável pelo app), então não dá pra esticar.
 *
 * PRÉ-REQUISITOS: plano Blaze + segredos (ver functions/README.md):
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *
 * Registre o endpoint do webhook (URL do `stripeWebhook` publicado) no
 * Dashboard do Stripe, ouvindo: checkout.session.completed,
 * customer.subscription.created/updated/deleted, invoice.paid,
 * invoice.payment_failed. O `stripeWebhook` também guarda a quantidade (lojas). Configure também o Customer Portal em
 * https://dashboard.stripe.com/settings/billing/portal (o que o cliente
 * pode trocar/cancelar) — sem isso, portalAssinatura falha.
 * ------------------------------------------------------------------ */
import Stripe from 'stripe'
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore } from 'firebase-admin/firestore'
import { exigirDonoOuGestao } from './acesso'
import {
  acessoDaConta,
  eventoEhMaisNovo,
  fimDoTeste,
  itensDaAssinatura,
  statusDoStripe,
  urlSegura,
  MAX_LOJAS,
  PRECO_EXPANSAO_CENTAVOS,
  PRECO_PRO_CENTAVOS,
  type Situacao,
} from './assinatura'

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET')

/** R$ 149,00 por loja/mês. Mudou o preço? Mude aqui e na landing (Preco). */

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

// Mesmas lookup_keys do esboço anterior (branch planos-gratis-pro): se os Prices
// já existem no Stripe, são reaproveitados.
const PRECOS = {
  pro: {
    chave: 'tanocaixa_pro_loja',
    centavos: PRECO_PRO_CENTAVOS,
    nome: 'Tá no Caixa Pro',
    descricao: 'Gestão financeira do restaurante, com 1 loja.',
  },
  expansao: {
    chave: 'tanocaixa_pro_loja_extra',
    centavos: PRECO_EXPANSAO_CENTAVOS,
    nome: 'Tá no Caixa Expansão',
    descricao: 'Cada loja a mais, além da primeira.',
  },
} as const

/** Price mensal pela lookup_key; cria produto + preço na primeira vez.
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

/** Nº de lojas cobradas = soma das quantidades (Pro 1 + Expansão; assinatura antiga: item único com qtd = lojas). */
function lojasDaAssinatura(obj: Record<string, unknown>): number | null {
  const itens = (obj.items as { data?: { quantity?: number }[] } | undefined)?.data ?? []
  return itens.reduce((n, i) => n + (i.quantity ?? 0), 0) || null
}

/** Quem paga por esta loja: a rede (pelo dono) ou a própria loja. E quantas lojas entram na conta. */
async function contaDeCobranca(restauranteId: string): Promise<{ contaId: string; lojas: number; donoUid: string | null }> {
  const rest = (await db.doc(`restaurants/${restauranteId}`).get()).data() ?? {}
  const redeId = rest.redeId as string | undefined
  if (redeId) {
    const rede = (await db.doc(`redes/${redeId}`).get()).data()
    const donoUid = rede?.donoUid as string | undefined
    if (donoUid && (await db.doc(`restaurants/${donoUid}`).get()).exists) {
      return { contaId: donoUid, lojas: Math.max(1, (rede?.lojas as unknown[] | undefined)?.length ?? 1), donoUid }
    }
  }
  return { contaId: restauranteId, lojas: 1, donoUid: (rest.criadoPor as string | undefined) ?? null }
}

/**
 * Situação da conta pro app: teste (com dias restantes), ativa, pagamento que
 * falhou ou bloqueada. Qualquer membro da loja consulta; o 1º acesso abre o
 * teste grátis. `responsavel` diz se quem pergunta pode assinar (dono/gestão
 * da conta que paga) — os outros só veem o aviso.
 */
export const statusAssinatura = onCall(async (req) => {
  const uid = req.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login primeiro')
  const rid = (req.data as Record<string, string> | undefined)?.restauranteId
  if (!rid) throw new HttpsError('invalid-argument', 'restauranteId obrigatório')
  const membros = (await db.doc(`restaurants/${rid}`).get()).data()?.memberUids as string[] | undefined
  if (!membros?.includes(uid)) throw new HttpsError('permission-denied', 'Você não faz parte desta loja')

  const conta = await contaDeCobranca(rid)
  const ref = db.doc(`assinaturas/${conta.contaId}`)
  const dados = await db.runTransaction(async (tx) => {
    const atual = (await tx.get(ref)).data() ?? {}
    if (atual.testeAte) return atual
    const agora = new Date()
    const novo = { testeIniciadoEm: agora.toISOString(), testeAte: fimDoTeste(agora) }
    tx.set(ref, novo, { merge: true })
    return { ...atual, ...novo }
  })

  const { acesso, diasRestantes } = acessoDaConta(dados.status as Situacao | undefined, dados.testeAte as string, new Date())
  let responsavel = false
  try {
    await exigirDonoOuGestao(uid, conta.contaId)
    responsavel = true
  } catch {
    /* gerente de uma loja da rede: vê o aviso, quem assina é o dono */
  }
  return {
    acesso,
    diasRestantes,
    testeIniciadoEm: (dados.testeIniciadoEm as string) ?? null,
    testeAte: dados.testeAte as string,
    lojas: conta.lojas,
    lojasAssinadas: (dados.lojas as number | undefined) ?? null,
    contaId: conta.contaId,
    responsavel,
  }
})

/** Inicia o checkout de assinatura (R$ 149/loja). Retorna a URL do Stripe. */
export const criarCheckoutAssinatura = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (req) => {
    const { restauranteId: rid, email, sucessoUrl, cancelUrl } = (req.data ?? {}) as Record<string, string>
    await exigirDonoOuGestao(req.auth?.uid, rid)
    // A rede paga numa conta só (a do dono), por todas as lojas cadastradas.
    const conta = await contaDeCobranca(rid)
    const restauranteId = await exigirDonoOuGestao(req.auth?.uid, conta.contaId)
    // Quem decide quantas lojas entram é o servidor (a rede), não o navegador.
    const lojas = Math.min(MAX_LOJAS, conta.lojas)
    const { expansao } = itensDaAssinatura(lojas)
    const s = cliente()
    const [pro, exp] = await Promise.all([garantirPreco(s, 'pro'), expansao ? garantirPreco(s, 'expansao') : null])
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      // Assinatura recorrente só aceita cartão; fixar evita o erro "No valid payment method types"
      // quando a conta não tem métodos ativos no painel para BRL.
      payment_method_types: ['card'],
      line_items: [
        { price: pro.id, quantity: 1 },
        ...(exp ? [{ price: exp.id, quantity: expansao }] : []),
      ],
      allow_promotion_codes: true,
      customer_email: email || undefined,
      subscription_data: { metadata: { restauranteId, plano: 'pro', lojas: String(lojas) } },
      metadata: { restauranteId, plano: 'pro', lojas: String(lojas) },
      success_url: urlSegura(sucessoUrl, 'https://tanocaixa.web.app/painel?assinatura=ok'),
      cancel_url: urlSegura(cancelUrl, 'https://tanocaixa.web.app/painel/assinatura'),
    }, comContexto)
    return { url: session.url }
  },
)

/** Abre o portal de cobrança (trocar cartão, ver faturas, cancelar). O cliente do Stripe vem do
 * servidor (`assinaturas/{restauranteId}`), nunca do navegador. */
export const portalAssinatura = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (req) => {
  const { restauranteId: rid, returnUrl } = (req.data ?? {}) as Record<string, string>
  await exigirDonoOuGestao(req.auth?.uid, rid)
  const restauranteId = await exigirDonoOuGestao(req.auth?.uid, (await contaDeCobranca(rid)).contaId)
  const customerId = (await db.doc(`assinaturas/${restauranteId}`).get()).data()?.customerId as string | undefined
  if (!customerId) throw new HttpsError('failed-precondition', 'Este restaurante ainda não tem assinatura')
  const portal = await cliente().billingPortal.sessions.create({
    customer: customerId,
    return_url: urlSegura(returnUrl, 'https://tanocaixa.web.app/painel'),
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

/** Webhook do Stripe → grava o status da assinatura em `assinaturas/{restauranteId}`. */
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
      // Coleção só do servidor (nenhuma regra do app a libera): quem é membro do restaurante
      // consegue escrever em restaurants/{id}/**, então o status não pode morar lá.
      const assinaturaRef = db.doc(`assinaturas/${restauranteId}`)
      const gravadoEm = (await assinaturaRef.get()).data()?.eventoEm as number | undefined
      const eventoEm = evento.created
      if (eventoEhMaisNovo(eventoEm, gravadoEm)) {
        const agora = new Date().toISOString()
        if (evento.type === 'checkout.session.completed') {
          // `status` da sessão é "complete" (não da assinatura): só guarda quem é o cliente.
          await assinaturaRef.set(
            {
              plano: meta.plano ?? null,
              lojas: Number(meta.lojas) || null,
              customerId: (obj.customer as string) ?? null,
              subscriptionId: (obj.subscription as string) ?? null,
              atualizadoEm: agora,
            },
            { merge: true },
          )
        } else if (evento.type.startsWith('customer.subscription')) {
          // Os itens são a fonte de verdade (o metadata fica velho quando a rede ganha loja).
          await assinaturaRef.set(
            {
              status: evento.type === 'customer.subscription.deleted' ? 'cancelada' : statusDoStripe(obj.status as string | undefined),
              plano: meta.plano ?? null,
              lojas: lojasDaAssinatura(obj) ?? (Number(meta.lojas) || null),
              customerId: (obj.customer as string) ?? null,
              subscriptionId: (obj.id as string) ?? null,
              eventoEm,
              atualizadoEm: agora,
            },
            { merge: true },
          )
        } else if (evento.type === 'invoice.paid') {
          await assinaturaRef.set({ status: 'ativa', ultimaFaturaPagaEm: agora, eventoEm }, { merge: true })
        } else if (evento.type === 'invoice.payment_failed') {
          await assinaturaRef.set({ status: 'pagamento_falhou', atualizadoEm: agora, eventoEm }, { merge: true })
        }
      }
    }

    await eventoRef.set({ tipo: evento.type, recebidoEm: new Date().toISOString() })
    res.status(200).send('ok')
  },
)

/**
 * Rede ganhou ou perdeu loja → acerta a Expansão no Stripe (com rateio no
 * próximo ciclo): cria o item na 2ª loja, ajusta a quantidade, tira quando
 * volta a 1. Sem assinatura ainda, não faz nada: o checkout já cobra pelas
 * lojas cadastradas na hora de assinar.
 */
export const lojasDaRedeNaAssinatura = onDocumentWritten(
  { document: 'redes/{redeId}', secrets: [STRIPE_SECRET_KEY] },
  async (event) => {
    const depois = event.data?.after.data()
    if (!depois) return
    const antes = event.data?.before.data()
    const lojas = Math.min(MAX_LOJAS, Math.max(1, (depois.lojas as unknown[] | undefined)?.length ?? 1))
    if (antes && ((antes.lojas as unknown[] | undefined)?.length ?? 1) === lojas) return
    const donoUid = depois.donoUid as string | undefined
    if (!donoUid) return
    const ref = db.doc(`assinaturas/${donoUid}`)
    const a = (await ref.get()).data()
    if (!a?.subscriptionId || a.status === 'cancelada' || a.lojas === lojas) return

    const s = cliente()
    const assinatura = await s.subscriptions.retrieve(a.subscriptionId as string, comContexto)
    const itens = assinatura.items.data
    const daChave = (chave: string) => itens.find((i) => i.price.lookup_key === chave)
    const itemPro = daChave(PRECOS.pro.chave)
    const itemExp = daChave(PRECOS.expansao.chave)
    const { expansao } = itensDaAssinatura(lojas)

    let mudancas: Stripe.SubscriptionUpdateParams.Item[]
    if (!itemPro && !itemExp && itens[0]) {
      // Assinatura antiga (um item, qtd = lojas): só acerta a quantidade.
      mudancas = [{ id: itens[0].id, quantity: lojas }]
    } else if (itemExp) {
      mudancas = [expansao ? { id: itemExp.id, quantity: expansao } : { id: itemExp.id, deleted: true }]
    } else if (expansao) {
      mudancas = [{ price: (await garantirPreco(s, 'expansao')).id, quantity: expansao }]
    } else {
      mudancas = []
    }
    if (mudancas.length) {
      await s.subscriptions.update(
        assinatura.id,
        { items: mudancas, proration_behavior: 'create_prorations', metadata: { ...assinatura.metadata, lojas: String(lojas) } },
        comContexto,
      )
    }
    await ref.set({ lojas, atualizadoEm: new Date().toISOString() }, { merge: true })
    console.log(`assinatura ${donoUid}: Pro + ${expansao} Expansão`)
  },
)
