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
