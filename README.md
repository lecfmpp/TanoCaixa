# TanoCaixa — FoodFinance

Gestão financeira inteligente e **mobile-first** para restaurantes.
Elimina a burocracia de digitação usando IA para leitura de notas/recibos por
foto (OCR), traduz dados em dashboards diretos e envia insights proativos.

> **Domínio:** [www.tanocaixa.com.br](https://www.tanocaixa.com.br)
> **Status:** infraestrutura inicial. As telas serão desenvolvidas a partir dos
> designs fornecidos.

## Stack

- **Frontend:** React + Vite + TypeScript (SPA mobile-first)
- **Backend:** Firebase — Auth, Firestore, Storage, Hosting
- **IA/OCR:** leitura de recibos (a definir na fase de desenvolvimento)

## Módulos (PRD)

1. Dashboard principal (faturamento, despesas, lucro/prejuízo, margem)
2. Cadastro de produtos + inventário mensal
3. Entrada de despesas com IA/OCR (foto → dados)
4. Planejamento DRE (projetado vs. realizado)
5. KPIs gastronômicos (CMV, mão de obra, delivery, ponto de equilíbrio)
6. Insights por IA + notificações (e-mail/SMS/WhatsApp)

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com as credenciais do Firebase
npm run dev
```

## Firebase

Autenticação da CLI (uma vez por máquina):

```bash
firebase login
```

Emuladores locais (opcional, defina `VITE_USE_FIREBASE_EMULATORS=true`):

```bash
firebase emulators:start
```

Deploy do hosting:

```bash
npm run build
firebase deploy --only hosting
```

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (`dist/`)
- `npm run preview` — pré-visualização do build
- `npm run lint` — lint

## Publicar pela nuvem

Publicar não depende do computador de ninguém: abra o GitHub -> aba **Actions** -> escolha o workflow -> **Run workflow**. Nunca roda sozinho por push.

- **Publicar o site** (`deploy-hosting.yml`): build + `firebase deploy --only hosting`.
- **Publicar function boasVindas** (`deploy-functions.yml`): build, testes, grava `RESEND_API_KEY` no Firebase e faz deploy só de `functions:boasVindas`.

Configuração única (GitHub -> Settings -> Secrets and variables -> Actions):

1. **Variables** (valores do Console do Firebase -> app Web): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`. Sem elas o build falha de propósito (evita a tela branca).
2. **Secret** `FIREBASE_SERVICE_ACCOUNT`: conteúdo inteiro do JSON de uma conta de serviço do projeto `tanocaixa` com os papéis Firebase Admin (ou Firebase Hosting Admin + Cloud Functions Admin + Service Account User + Secret Manager Admin). Se a organização bloquear chaves JSON, use Workload Identity Federation: crie as **Variables** `GCP_WIF_PROVIDER` e `GCP_SERVICE_ACCOUNT` (mesmo padrão do repositório wiseleads) e dispense o secret.
3. **Secret** `RESEND_API_KEY`: a chave da API do Resend (só para o workflow das functions).
