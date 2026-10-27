#!/usr/bin/env bash
# Sobe as imagens dos lembretes de WhatsApp para o Firebase Storage (tanocaixa),
# com o token de download definido em src/lembretesCatalogo.ts (sem mexer em regras).
# Uso: functions/scripts/subir-imagens-lembretes.sh <pasta-com-os-PNGs>
# Requer: gcloud auth login (conta com acesso ao projeto tanocaixa).
set -euo pipefail
PASTA="${1:?informe a pasta com os PNGs}"
BUCKET="gs://tanocaixa.firebasestorage.app/lembretes-whatsapp"
while IFS='|' read -r arquivo token; do
  [ -f "$PASTA/$arquivo" ] || { echo "faltando: $arquivo" >&2; exit 1; }
  gcloud storage cp "$PASTA/$arquivo" "$BUCKET/$arquivo" --project tanocaixa \
    --content-type=image/png --cache-control="public, max-age=31536000" \
    --custom-metadata="firebaseStorageDownloadTokens=$token"
done <<'LISTA'
01-vendas-do-dia.png|108ccae8-527b-49e2-8187-9cf340494d29
02-caixa-aberto.png|8dfc7fd1-33dd-4a73-ab99-c88bb24b5544
03-notas-do-dia.png|8ad23bb1-8a7a-4307-9cb4-72c122d8924b
04-contas-a-vencer.png|dc193ef7-136b-4079-b8b5-adadc53343d2
05-preco-em-alta.png|86c33555-ad6b-4b23-9e21-d46585984a23
06-compras-do-mes.png|115b950e-bf29-4e38-a326-b0d7629a2027
07-contagem-de-estoque.png|283e6f5e-605b-4b2d-9c8d-e46036676452
08-diferenca-no-estoque.png|1c9ab1c5-a826-440a-812e-0543e95f8956
09-plano-do-mes.png|22a2df5b-5bf9-4b1f-be0d-d730cba8b01d
10-dre-fechado.png|1cf5d768-b2cc-4df1-b4b4-259140c19933
11-ponto-de-equilibrio.png|d0960f50-2987-4bd6-8b58-650056e89350
12-cmv-acima-da-meta.png|d91e3d04-7df2-467a-b81b-19e3d1ebb1a2
13-ficha-tecnica.png|c3de3602-c394-4bce-9d0a-41fa8adf140a
14-terminar-cadastro.png|2a6706f4-8755-4d5f-9ab3-4f4056ec0109
15-convite-pendente.png|ff299283-78b9-436f-a6e5-9c91f2fbea42
16-assinatura.png|17b3dc00-0afc-4357-94a7-8cd33fd915eb
17-ifood.png|88e5bf6c-3e90-45f7-af93-7d2e484a9e8f
LISTA
