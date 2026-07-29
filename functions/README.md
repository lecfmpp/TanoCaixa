# Integrações financeiras — Cloud Functions (iFood + Rappi)

Puxa **faturamento, taxas, pedidos, repasses e preços de cardápio** do iFood e do
Rappi e grava no Firestore do Tá no Caixa.

## O que faz

| Função | Gatilho | O que grava |
|---|---|---|
| `syncDiario` | cron `0 6 * * *` (São Paulo) | por loja conectada, despacha p/ iFood ou Rappi: `receita_dia` (bruto/taxa/pedidos), `despesas` (comissão em `taxas_app`), `atividades`, atualiza `integracoes/{provedor}`; e sincroniza o cardápio |
| `conectarIntegracao` | callable | salva `merchantId`/`storeId` em `restaurants/{id}/integracoes/{provedor}` |
| `ifoodWebhook` / `rappiWebhook` | HTTP | recebem eventos de pedido |

Módulos portáveis: `src/ifood/` e `src/rappi/` — cada um com `auth` (token),
`client` (chamadas HTTP), `mapper` (API → nosso schema), `sync` (orquestração).
O `EscritorFirestore` (em `ifood/sync`) é compartilhado pelos dois.

## Pré-requisitos

1. **Plano Blaze** no Firebase (Cloud Functions exige billing; tem tier grátis).
2. **Apps registrados**:
   - [Portal do iFood](https://developer.ifood.com.br) (Centralizado) — módulos
     Financial, Order, Catalog, Merchant → `clientId`/`clientSecret` (passa por homologação).
   - [Portal do Rappi](https://dev-portal.rappi.com) (Partners) — onboarding manual → `client_id`/`client_secret`.
3. Segredos:
   ```bash
   firebase functions:secrets:set IFOOD_CLIENT_ID
   firebase functions:secrets:set IFOOD_CLIENT_SECRET
   firebase functions:secrets:set RAPPI_CLIENT_ID
   firebase functions:secrets:set RAPPI_CLIENT_SECRET
   ```

## Deploy

```bash
cd functions
npm install
firebase deploy --only functions
```

Registre a URL de `ifoodWebhook` no Portal do iFood para receber eventos.

## Endpoints usados

**iFood** (`merchant-api.ifood.com.br`)
- Auth: `POST /authentication/v1.0/oauth/token` (`grantType=client_credentials`)
- Financial: `GET /financial/v3.0/merchants/{id}/sales` · `.../settlements`
- Order: `GET /order/v1.0/events:polling` · `.../orders/{id}` · `POST .../events/acknowledgment`
- Catalog: `GET /catalog/v2.0/merchants/{id}/catalogs` · `.../sellableItems`

**Rappi** (Brasil: `api.rappi.com.br` novo · `services.rappi.com.br` legado)
- Auth: `POST /restaurants/auth/v1/token/login/integrations` (JSON `client_id`/`client_secret`; header `x-authorization: bearer {token}`)
- Financeiro: `GET /restaurants/finance/v1/stores/{storeId}/payments`
- Orders: `GET /api/v2/restaurants-integrations-public-api/orders` (legado)
- Menu: `GET /restaurants/menu/v1/stores/{storeId}/menu`

> Os nomes de campo foram modelados a partir da doc pública; confira contra o
> payload real na homologação e ajuste em `src/ifood/mapper.ts` e `src/rappi/mapper.ts`.

## Stripe (assinaturas)

`src/stripe.ts` expõe `criarCheckoutAssinatura`, `portalAssinatura` e
`stripeWebhook`. Usa Billing (subscriptions), Tax (automatic_tax) e Customer
Portal. Integração multi-tenant: cada restaurante é um customer Stripe.

### Setup passo a passo

#### 1. Criar Products e Prices (modo test primeiro)

Acesse [dashboard.stripe.com](https://dashboard.stripe.com) → modo test.

**Produto 1: Cozinha só**
- Dashboard → Products → **New** → "Cozinha só"
- Pricing → **Recurring** → Monthly, R$ 79,00 BRL
- Copie o Price ID (`price_xxx`).

**Produto 2: Casa cheia**
- Dashboard → Products → **New** → "Casa cheia"
- Pricing → **Recurring** → Monthly, R$ 149,00 BRL
- Copie o Price ID.

**Produto 3: Mais de uma casa**
- Dashboard → Products → **New** → "Mais de uma casa"
- Pricing → **Recurring** → Monthly, R$ 299,00 BRL
- Copie o Price ID.

#### 2. Guardar as chaves do Stripe

Você precisa de:
- **STRIPE_SECRET_KEY**: Dashboard → Developers → API Keys → Secret key (começa com `sk_test_` em test, `sk_live_` em produção)
- **STRIPE_WEBHOOK_SECRET**: gerado após registrar webhook (próximo passo)
- **STRIPE_PRICE_COZINHA**: `price_xxx` do primeiro produto
- **STRIPE_PRICE_CASA**: `price_xxx` do segundo
- **STRIPE_PRICE_REDE**: `price_xxx` do terceiro

Rodando **localmente** (para testar antes de deploy):
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set STRIPE_PRICE_COZINHA
firebase functions:secrets:set STRIPE_PRICE_CASA
firebase functions:secrets:set STRIPE_PRICE_REDE
```

Depois do deploy para produção, você pode editar via:
```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --project tanocaixa
```

#### 3. Registrar o Webhook

Após fazer `firebase deploy --only functions`, copie a URL de `stripeWebhook`:
```
https://us-central1-tanocaixa.cloudfunctions.net/stripeWebhook
```

Dashboard → Developers → Webhooks → **Add endpoint** →
- URL: `https://us-central1-tanocaixa.cloudfunctions.net/stripeWebhook`
- Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Copie o **Signing secret** (começa com `whsec_`) e salve como `STRIPE_WEBHOOK_SECRET`

#### 4. Configurar o Customer Portal

Dashboard → Settings → Billing Portal → **Activate portal**
- Selecione que clientes podem fazer upgrade/downgrade, cancelar, atualizar
  pagamento, ver invoices.
- Use as configurações padrão ou customize com seu branding.

#### 5. Completar onboarding da conta

Dashboard → Settings → Account (abas) → **Business profile** →
- Product description: "SaaS de gestão financeira para restaurantes"
- Support phone: seu número
- Support URL: seu site
- Aceite os termos legais.

Sem isso, `charges_enabled` fica `false` e cobranças reais não funcionam.

#### 6. Deploy

```bash
cd functions
npm install
firebase deploy --only functions
```

### Frontend

A página `/painel/assinatura` mostra os 3 planos. Ao clicar "Contratar", chama
`criarCheckoutAssinatura` que retorna uma URL Stripe Checkout — o cliente é
redirecionado para `checkout.stripe.com` (hosted, feito pelo Stripe).

### Notas

- Em **modo test**, use cartões como `4242 4242 4242 4242` para testar.
- Em **modo live**, ative a chave de live (`sk_live_xxx`) antes de ir para
  produção; Stripe cobra 2.9% + R$ 0,30 por transação + % de tax/pix.
- **Tax**: `automatic_tax: { enabled: true }` no checkout — Stripe calcula
  impostos conforme localização e tipo de serviço. NF-e/NFS-e é externa.
- **Reconciliação**: webhook grava `restaurants/{id}/faturamento/assinatura`
  com status, plano, `customerId`, `subscriptionId` — sincroniza em tempo
  real.
- **Invoicing**: Stripe emite invoice automaticamente em cada ciclo (grava em
  `invoice.paid` webhook).
- **Portal**: `portalAssinatura` abre `billing.stripe.com` — cliente gerencia
  upgrade/downgrade/cancelamento/pagamento. Depende da config do portal estar
  ativa (passo 4).
