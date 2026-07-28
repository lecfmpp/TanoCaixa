# Integração iFood — Cloud Functions (financeiro)

Puxa **faturamento, taxas, pedidos, repasses e preços de cardápio** do iFood e
grava no Firestore do Tá no Caixa. Modelo **Centralizado** (uma credencial,
várias lojas, webhook).

## O que faz

| Função | Gatilho | O que grava |
|---|---|---|
| `syncDiarioIFood` | cron `0 6 * * *` (São Paulo) | `receita_dia` (bruto/taxa/pedidos), `despesas` (comissão em `taxas_app`), `atividades`, atualiza `integracoes/ifood`; e sincroniza o cardápio |
| `conectarIFood` | callable | salva o `merchantId` da loja em `restaurants/{id}/integracoes/ifood` |
| `ifoodWebhook` | HTTP | recebe eventos de pedido (Centralizado) |

Módulo portável em `src/ifood/`: `auth` (token OAuth), `client` (Sales/Settlement/
Order/Catalog), `mapper` (iFood → nosso schema), `sync` (orquestração).

## Pré-requisitos

1. **Plano Blaze** no Firebase (Cloud Functions exige billing; tem tier grátis).
2. **App no [Portal do iFood](https://developer.ifood.com.br)** (Centralizado) com
   acesso aos módulos **Financial, Order, Catalog, Merchant** → `clientId`/`clientSecret`.
   O modelo Centralizado passa por homologação do iFood.
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

## Endpoints iFood usados

- Auth: `POST /authentication/v1.0/oauth/token` (`grantType=client_credentials`)
- Financial: `GET /financial/v3.0/merchants/{id}/sales` · `.../settlements`
- Order: `GET /order/v1.0/events:polling` · `.../orders/{id}` · `POST .../events/acknowledgment`
- Catalog: `GET /catalog/v2.0/merchants/{id}/catalogs` · `.../sellableItems`
- Merchant: `GET /merchant/v1.0/merchants`

> Os nomes de campo da Sales API foram modelados a partir da doc pública;
> confira contra o payload real na homologação e ajuste em `src/ifood/mapper.ts`.
