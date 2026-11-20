#!/usr/bin/env bash
# Liga o Tá no Caixa à W-API, em etapas. NADA aqui publica funções ou o site.
#
#   functions/scripts/configurar-wapi.sh conferir
#       Só lê: segredos existentes, .env.tanocaixa e o status do número na W-API.
#
#   functions/scripts/configurar-wapi.sh dados <INSTANCE_ID> "<(11) 91234-5678>"
#       Grava no functions/.env.tanocaixa: WHATSAPP_PROVEDOR=wapi, WAPI_INSTANCE_ID
#       e WHATSAPP_NUMERO (o número que o dono adiciona ao grupo). Só arquivo local.
#
#   functions/scripts/configurar-wapi.sh webhooks
#       Cadastra na W-API os 5 webhooks (receber, enviar, status, conectou,
#       desconectou) apontando para a função whatsappWebhook. Fala com a W-API.
#
#   functions/scripts/configurar-wapi.sh voltar-green
#       Volta o .env.tanocaixa para a Green API (o que está no ar hoje).
#
# Antes: o segredo WAPI_TOKEN precisa existir no Secret Manager do projeto
# tanocaixa (criado pelo dono da conta; este script nunca pede nem mostra o token).
# Variáveis opcionais: ENV_FILE (outro .env), PROJETO (padrão tanocaixa).
set -euo pipefail

PROJETO="${PROJETO:-tanocaixa}"
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$AQUI/.env.tanocaixa}"
URL_WEBHOOK_BASE="https://us-central1-${PROJETO}.cloudfunctions.net/whatsappWebhook"
API="https://api.w-api.app/v1"

fb() { NODE_NO_WARNINGS=1 command firebase "$@" --project "$PROJETO"; }

segredo_existe() { fb functions:secrets:get "$1" >/dev/null 2>&1; }

ler_segredo() { fb functions:secrets:access "$1" 2>/dev/null | tr -d '\r\n'; }

valor_env() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- | sed 's/^"//; s/"$//'; }

gravar_env() { # chave valor
  local chave="$1" valor="$2" tmp
  touch "$ENV_FILE"
  tmp="$(mktemp)"
  grep -vE "^$chave=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$chave" "$valor" >> "$tmp"
  mv "$tmp" "$ENV_FILE"
}

conferir_segredos() {
  local falta=0
  for s in WAPI_TOKEN WHATSAPP_WEBHOOK_TOKEN GREEN_API_URL GREEN_API_ID GREEN_API_TOKEN; do
    if segredo_existe "$s"; then echo "  ok      $s"; else echo "  FALTA   $s"; falta=1; fi
  done
  return $falta
}

cmd="${1:-}"
case "$cmd" in
  conferir)
    echo "Segredos no projeto $PROJETO:"
    conferir_segredos || echo "  (sem todos os segredos o deploy das funções de WhatsApp falha)"
    echo
    echo "Em $ENV_FILE:"
    for k in WHATSAPP_PROVEDOR WAPI_INSTANCE_ID WHATSAPP_NUMERO WHATSAPP_GRUPO; do
      v="$(valor_env "$k")"; echo "  $k=${v:-(vazio)}"
    done
    id="$(valor_env WAPI_INSTANCE_ID)"
    if [ -n "$id" ] && segredo_existe WAPI_TOKEN; then
      echo
      echo "Status do número na W-API:"
      curl -sS --max-time 20 -H "Authorization: Bearer $(ler_segredo WAPI_TOKEN)" \
        "$API/instance/status-instance?instanceId=$id" | head -c 300; echo
    fi
    ;;

  dados)
    id="${2:?informe o ID da instância da W-API}"
    numero="${3:?informe o número do Tá no Caixa, ex.: \"(11) 91234-5678\"}"
    [[ "$id" =~ ^[A-Za-z0-9-]{6,40}$ ]] || { echo "ID da instância estranho: $id" >&2; exit 1; }
    digitos="$(printf '%s' "$numero" | tr -cd '0-9')"
    [ "${#digitos}" -ge 10 ] && [ "${#digitos}" -le 13 ] || { echo "Número estranho: $numero" >&2; exit 1; }
    gravar_env WHATSAPP_PROVEDOR wapi
    gravar_env WAPI_INSTANCE_ID "$id"
    gravar_env WHATSAPP_NUMERO "\"$numero\""   # entre aspas: tem espaço e parênteses
    echo "Gravado em $ENV_FILE (só local; nada foi publicado)."
    conferir_segredos || echo "Crie os segredos que faltam antes de publicar."
    ;;

  webhooks)
    id="$(valor_env WAPI_INSTANCE_ID)"
    [ -n "$id" ] || { echo "Rode antes: $0 dados <INSTANCE_ID> <NUMERO>" >&2; exit 1; }
    segredo_existe WAPI_TOKEN || { echo "Falta o segredo WAPI_TOKEN" >&2; exit 1; }
    segredo_existe WHATSAPP_WEBHOOK_TOKEN || { echo "Falta o segredo WHATSAPP_WEBHOOK_TOKEN" >&2; exit 1; }
    token_api="$(ler_segredo WAPI_TOKEN)"
    url="$URL_WEBHOOK_BASE?t=$(ler_segredo WHATSAPP_WEBHOOK_TOKEN)"
    for evento in received delivery message-status connected disconnected; do
      resp="$(curl -sS --max-time 20 -X PUT \
        -H "Authorization: Bearer $token_api" -H 'Content-Type: application/json' \
        -d "{\"value\":\"$url\"}" "$API/webhook/update-webhook-$evento?instanceId=$id")"
      echo "  $evento: $(printf '%s' "$resp" | head -c 160)"
    done
    echo "Webhooks apontam para $URL_WEBHOOK_BASE (token omitido)."
    ;;

  voltar-green)
    gravar_env WHATSAPP_PROVEDOR green
    echo "Voltou para a Green API em $ENV_FILE."
    ;;

  *)
    sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
