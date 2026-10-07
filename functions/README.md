# Integração financeira — Cloud Functions (iFood)

Puxa **faturamento, taxas, pedidos, repasses e preços de cardápio** do iFood e
grava no Firestore do Tá no Caixa. O iFood é a única plataforma integrada.

## O que faz

| Função | Gatilho | O que grava |
|---|---|---|
| `syncDiario` | cron `0 6 * * *` (São Paulo) | por loja do iFood conectada: `receita_dia` (bruto/taxa/pedidos), `despesas` (comissão em `taxas_app`), `atividades`, atualiza `integracoes/{provedor}`; e sincroniza o cardápio |
| `listarLojasIFood` | callable | lista as lojas do iFood liberadas para o app |
| `conectarIntegracao` | callable | confere a loja no iFood e salva o `merchantId` em `restaurants/{id}/integracoes/ifood` |
| `sincronizarIFoodAgora` | callable | sincroniza estado da loja e cardápio na hora (botão no painel) |
| `ifoodWebhook` | HTTP | recebe eventos de pedido (assinatura `X-IFood-Signature` validada) |

Módulo portável: `src/ifood/` — `auth` (token), `client` (chamadas HTTP),
`mapper` (API → nosso schema), `sync` (orquestração) e `EscritorFirestore`.

> Documentos antigos em `integracoes/` de outros provedores (ex.: `rappi`) são
> ignorados pelo `syncDiario`.

## Pré-requisitos

1. **Plano Blaze** no Firebase (Cloud Functions exige billing; tem tier grátis).
2. **App registrado**:
   - [Portal do iFood](https://developer.ifood.com.br) (Centralizado) — módulos
     Financial, Order, Catalog, Merchant → `clientId`/`clientSecret` (passa por homologação).
3. Segredos:
   ```bash
   firebase functions:secrets:set IFOOD_CLIENT_ID
   firebase functions:secrets:set IFOOD_CLIENT_SECRET
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

> Os nomes de campo foram modelados a partir da doc pública; confira contra o
> payload real na homologação e ajuste em `src/ifood/mapper.ts`.

## Stripe (assinatura: plano único de R$ 149/mês)

Um plano só, **R$ 149/mês por restaurante**. O teste é de **14 dias sem cartão**
(promessa da landing), contado pela criação do restaurante; o Stripe só entra
quando a pessoa decide assinar.

`src/stripe.ts` expõe quatro funções (regras puras em `src/assinatura.ts`):

| Função | O que faz |
|---|---|
| `criarCheckoutAssinatura` | callable (dono/gestão): abre o Stripe Checkout do plano único |
| `portalAssinatura` | callable (dono/gestão): abre o portal (cartão, faturas, cancelar). O cliente do Stripe vem do servidor |
| `statusAssinatura` | callable (dono/gestão): `em_teste` (dias restantes), `teste_encerrado`, `ativa`, `pagamento_falhou`, `pendente`, `cancelada` |
| `stripeWebhook` | HTTP: recebe os eventos e grava a situação em `assinaturas/{restauranteId}` |

`assinaturas/*` é coleção **só do servidor** (nenhuma regra do Firestore a libera
ao app): ninguém grava "ativa" no próprio restaurante. As URLs de retorno só
aceitam o nosso site (`tanocaixa.com`, `tanocaixa.web.app`).

> Hoje **nada bloqueia o uso** por falta de assinatura: a tela só informa a
> situação. Bloquear exige decidir o que fazer com os restaurantes que já existem.

### Setup passo a passo

#### 1. Criar o Product e o Price (modo test primeiro)

[dashboard.stripe.com](https://dashboard.stripe.com) → modo test → Products →
**New** → "Tá no Caixa" → Pricing **Recurring**, mensal, **R$ 149,00 BRL**.
Copie o Price ID (`price_…`). Em BRL, a assinatura aceita cartão.

#### 2. Guardar as chaves (secrets)

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY --project tanocaixa     # sk_test_… (ou sk_live_…)
firebase functions:secrets:set STRIPE_PRICE_UNICO --project tanocaixa    # price_… do passo 1
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project tanocaixa # whsec_… do passo 4
```

`STRIPE_SECRET_KEY` pode ser uma chave de organização: nesse caso `STRIPE_ACCOUNT_ID`
(em `src/stripe.ts`) precisa ser a conta do Tá no Caixa. **Confira esse ID.**

#### 3. Publicar

```bash
firebase deploy --only functions:criarCheckoutAssinatura,functions:portalAssinatura,functions:statusAssinatura,functions:stripeWebhook --project tanocaixa
```

#### 4. Registrar o webhook

Dashboard → Developers → Webhooks → **Add endpoint**:
- URL: `https://us-central1-tanocaixa.cloudfunctions.net/stripeWebhook`
- Eventos: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`,
  `invoice.payment_failed`
- Copie o **Signing secret** (`whsec_…`) para `STRIPE_WEBHOOK_SECRET` (passo 2) e
  republique `stripeWebhook`.

#### 5. Customer Portal

Dashboard → Settings → Billing → Customer portal → **Activate**: permitir
atualizar pagamento, ver faturas e cancelar. Sem isso `portalAssinatura` falha.

#### 6. Conta Stripe pronta para cobrar

Complete o perfil da empresa e os dados legais; sem isso `charges_enabled` fica
`false` e não há cobrança real. **Stripe Tax não cobre o Brasil**: o preço já
sai com imposto embutido e a NFS-e é emitida fora do Stripe.

### Testar (modo test)

Cartão `4242 4242 4242 4242`, qualquer data futura e CVC. Fluxo: Ajustes →
Assinatura → "Assinar" → pagar → voltar ao app: a situação passa a **Ativa** em
segundos (via webhook). Falha de pagamento: `4000 0000 0000 0341`.

### Frontend

`/painel/assinatura` mostra o plano único, a situação (teste com dias
restantes, ativa, pagamento falhou…) e o botão certo (assinar ou gerenciar). Há
um atalho em Ajustes.

## E-mail de boas-vindas (Resend)

`boasVindas` (`src/boasVindasTrigger.ts`) é um gatilho Firestore em `users/{uid}`
(criado uma única vez, no fim do primeiro cadastro) que envia o e-mail de
boas-vindas por `https://api.resend.com/emails`, remetente
`Tá no Caixa <ola@tanocaixa.com>`. Idempotência: documento
`emails_enviados/{uid}_boas_vindas` (criado com `create()`) + `Idempotency-Key`
no Resend. Se o Resend falhar, o cadeado é liberado (não há retry automático).

Segredo (nunca no código): `firebase functions:secrets:set RESEND_API_KEY`

Teste sem rede: `cd functions && npm test` (fetch e Firestore simulados).

## Publicar pela nuvem

Publicar não depende do computador de ninguém: abra o GitHub -> aba **Actions** -> escolha o workflow -> **Run workflow**. Nunca roda sozinho por push.

- **Publicar o site** (`deploy-hosting.yml`): build + `firebase deploy --only hosting`.
- **Publicar function boasVindas** (`deploy-functions.yml`): build, testes, grava `RESEND_API_KEY` no Firebase e faz deploy só de `functions:boasVindas`.

Configuração única (GitHub -> Settings -> Secrets and variables -> Actions):

1. **Variables** (valores do Console do Firebase -> app Web): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Sem elas o build falha de propósito (evita a tela branca).
2. **Secret** `FIREBASE_SERVICE_ACCOUNT`: conteúdo inteiro do JSON de uma conta de serviço do projeto `tanocaixa` com os papéis Firebase Admin (ou Firebase Hosting Admin + Cloud Functions Admin + Service Account User + Secret Manager Admin). Se a organização bloquear chaves JSON, use Workload Identity Federation: crie as **Variables** `GCP_WIF_PROVIDER` e `GCP_SERVICE_ACCOUNT` (mesmo padrão do repositório wiseleads) e dispense o secret.
3. **Secret** `RESEND_API_KEY`: a chave da API do Resend (só para o workflow das functions).
