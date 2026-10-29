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

## Despesa que se repete todo mês

O interruptor "Isso se repete todo mês" do lançamento de despesa só gravava `recorrente`;
nada lia o campo. Agora `repetirDespesasRecorrentes` (todo dia, 00h10 de São Paulo) gera a
despesa do mês que acabou de virar. Regras em `src/recorrentes.ts`, gravação em
`src/recorrentesDb.ts`, ambas testadas (`npm test`).

- **Série:** lançamentos com o mesmo `serieId`. Lançamento antigo marcado como recorrente (sem
  `serieId`) é agrupado por fornecedor + conta, pra não gerar uma cópia por mês de histórico.
- **Vale o último lançamento da série:** se ele continua recorrente e é de um mês anterior ao
  atual, gera o do mês atual: mesmo valor, mesmo dia (31 em fevereiro cai no 28 e volta ao 31),
  vencimento deslocado pela mesma distância, **a pagar**. Corrigir o valor nele vale pros próximos.
- **Parar de repetir:** desligar o interruptor no último lançamento da série.
- **Só conta da casa** (aluguel, luz, folha…): compra de mercadoria (nota de fornecedor, conta de CMV) nunca se repete.
- **Só o mês atual:** não preenche meses que ficaram pra trás.
- **Idempotente:** id fixo `{serieId}_{AAAA-MM}` e `create`. Cada repetição grava também um
  marcador em `restaurants/{id}/recorrencias/{mesmo id}` no mesmo lote: se a pessoa apagar a do
  mês, ela não volta no dia seguinte.
- Restaurantes de demonstração são ignorados.

Publicar: `firebase deploy --only functions:repetirDespesasRecorrentes`. Para rodar já, sem
esperar a madrugada: Cloud Scheduler → `firebase-schedule-repetirDespesasRecorrentes-us-central1` → Forçar execução.

## Stripe (assinaturas): Grátis × Pro

`src/stripe.ts` expõe `criarCheckoutAssinatura`, `portalAssinatura`,
`abrirLojaExtra` e `stripeWebhook`. Sem Stripe Tax (não cobre o Brasil):
o preço já sai com imposto embutido e a NF é emitida fora do Stripe.

**Planos** (`src/assinatura.ts`, espelhado em `src/data/planos.ts` e `src/data/preco.ts` do app):
- **Grátis**: sem assinatura. Tudo da loja única, menos DRE completo, foto da
  nota com IA e lembretes no WhatsApp. Equipe até 2 pessoas.
- **Pro**: R$ 149/mês a primeira loja + R$ 79/mês por loja extra da rede.
  Assinatura com dois itens (Prices com lookup_key `tanocaixa_pro_loja` e
  `tanocaixa_pro_loja_extra`, criados sozinhos na primeira chamada).

**Onde mora o plano**: `assinaturas/{restauranteId}` (só o servidor grava; a
equipe da loja lê pelas regras). Pro = `status` `ativa` ou `pagamento_falhou`.
Loja extra tem `pagadorId` (a loja que paga) e o webhook copia o status pra ela.
As travas valem no servidor: `analisarFoto`, `lembretesWhatsappSalvar` e a
rodada dos lembretes, `criarConvite` (limite de equipe) e `abrirLojaExtra`.

**Loja extra**: `abrirLojaExtra` soma 1 no item "loja extra" com
`proration_behavior: always_invoice` + `payment_behavior: error_if_incomplete`.
Cartão recusado = erro e nenhuma loja criada.

**Migração** pra deixar todo mundo no Grátis: `node scripts/migrar-plano-gratis.cjs`
(só mostra) e `--aplicar` (grava). Quem tem assinatura ativa fica de fora.

### Setup

1. Segredos: `firebase functions:secrets:set STRIPE_SECRET_KEY` (chave da
   organização; a conta alvo vai no header `Stripe-Context`, ver
   `STRIPE_ACCOUNT_ID` em `src/stripe.ts`) e `STRIPE_WEBHOOK_SECRET`.
2. Webhook: `https://us-central1-tanocaixa.cloudfunctions.net/stripeWebhook`,
   eventos `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.paid`, `invoice.payment_failed`.
3. Customer Portal ativo em Settings → Billing → Customer portal (sem isso,
   `portalAssinatura` falha).
4. Deploy: `firebase deploy --only functions,firestore:rules`.

### Teste em modo de teste

1. Com `sk_test_…` e o `whsec_…` do webhook de teste, entre numa conta real
   (não a demo) e abra `/painel/assinatura` → "Assinar o Pro".
2. Cartão `4242 4242 4242 4242`, validade futura, CVC qualquer.
3. Volta pra `/painel/assinatura?assinatura=ok`; em `assinaturas/{id}` o
   `status` vira `ativa` e a página mostra "Você está no Pro".
4. Rede → "Abrir loja": a assinatura ganha o item "loja extra" (qtd 1) e sai uma
   invoice proporcional. Com `4000 0000 0000 0341` no portal, a loja não abre.
5. "Gerenciar assinatura" abre o portal; cancelar → `status` `cancelada` → Grátis.

## Avisos no WhatsApp (Green-API)

Avisa o grupo do Tá no Caixa — mesma instância Green-API do RetroFoot (plano
Developer, até 3 conversas; este grupo é a 2ª). Código em `src/whatsapp.ts`.

| Função | Gatilho | Mensagem |
|---|---|---|
| `avisoAtividade` | cria doc em `restaurants/{id}/atividades` | nota fiscal lançada · contagem de estoque feita · vendas do dia lançadas (fluxo de caixa) · caixa do PDV fechado |
| `resumoDoDia` | cron 21:30 (São Paulo) | por restaurante: nº de vendas no PDV, entrada do fluxo de caixa, notas/despesas do dia; lista quem não lançou nada |
| `lembretes` | cron 09:00 (São Paulo) | contagem de estoque nos dias 1 e 28; dica de uso toda segunda |

Contas `demo-*` / `rede-demo*` e atividades de integração (iFood/Rappi) não geram aviso.

### Configurar (uma vez)

Os segredos do **Firebase** são separados dos do GitHub — as Cloud Functions não leem
os secrets do repositório. Os valores vêm de console.green-api.com → instância → `apiUrl`,
`idInstance`, `apiTokenInstance`:

```bash
firebase functions:secrets:set GREEN_API_URL
firebase functions:secrets:set GREEN_API_ID
firebase functions:secrets:set GREEN_API_TOKEN
```

O `chatId` do grupo (termina em `@g.us`) vai em `functions/.env` (não é segredo):

```
WHATSAPP_GRUPO=1203630xxxxxxxxx@g.us
```

Para descobrir o chatId, com a instância já no grupo:
`curl "$GREEN_API_URL/waInstance$GREEN_API_ID/getContacts/$GREEN_API_TOKEN"` e procure o
item com `"type":"group"` e o nome do grupo.
Depois: `firebase deploy --only functions`. Sem segredos ou sem grupo, a função só
escreve no log e não envia nada.

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
