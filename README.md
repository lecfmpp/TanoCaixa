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
