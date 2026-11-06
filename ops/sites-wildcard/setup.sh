#!/usr/bin/env bash
# Cria o balanceador HTTPS global com certificado curinga *.tanocaixa.com.br
# apontando para a Cloud Function siteCliente (gen2 → serviço Cloud Run "sitecliente").
# Idempotente o bastante para rodar de novo: recursos que já existem são pulados.
# Leia ops/sites-wildcard/README.md antes. Roda UMA vez, à mão.
set -euo pipefail

PROJETO="${PROJETO:-tanocaixa}"
REGIAO="${REGIAO:-us-central1}"
DOMINIO="${DOMINIO:-tanocaixa.com.br}"
SERVICO="${SERVICO:-sitecliente}"   # nome do serviço Cloud Run da function siteCliente

g() { gcloud --project "$PROJETO" --quiet "$@"; }
existe() { "$@" >/dev/null 2>&1; }

echo "== APIs"
g services enable compute.googleapis.com certificatemanager.googleapis.com

echo "== IP global"
existe g compute addresses describe sites-ip --global || g compute addresses create sites-ip --global --ip-version=IPV4
IP=$(g compute addresses describe sites-ip --global --format='value(address)')

echo "== NEG serverless + backend com CDN"
existe g compute network-endpoint-groups describe sites-neg --region "$REGIAO" ||
  g compute network-endpoint-groups create sites-neg --region "$REGIAO" \
    --network-endpoint-type=serverless --cloud-run-service="$SERVICO"
existe g compute backend-services describe sites-backend --global ||
  g compute backend-services create sites-backend --global \
    --load-balancing-scheme=EXTERNAL_MANAGED --enable-cdn --cache-mode=USE_ORIGIN_HEADERS
# Sem incluir o host na chave de cache, todos os clientes dividiriam a mesma página.
g compute backend-services update sites-backend --global \
  --cache-key-include-host --cache-key-include-protocol --no-cache-key-include-query-string
g compute backend-services describe sites-backend --global --format='value(backends)' | grep -q sites-neg ||
  g compute backend-services add-backend sites-backend --global \
    --network-endpoint-group=sites-neg --network-endpoint-group-region="$REGIAO"

echo "== Certificado curinga (autorização por DNS)"
existe g certificate-manager dns-authorizations describe sites-dns-auth ||
  g certificate-manager dns-authorizations create sites-dns-auth --domain="$DOMINIO"
existe g certificate-manager certificates describe sites-curinga ||
  g certificate-manager certificates create sites-curinga \
    --domains="*.${DOMINIO},${DOMINIO}" --dns-authorizations=sites-dns-auth
existe g certificate-manager maps describe sites-cert-map ||
  g certificate-manager maps create sites-cert-map
existe g certificate-manager maps entries describe sites-curinga --map=sites-cert-map ||
  g certificate-manager maps entries create sites-curinga --map=sites-cert-map \
    --hostname="*.${DOMINIO}" --certificates=sites-curinga
existe g certificate-manager maps entries describe sites-raiz --map=sites-cert-map ||
  g certificate-manager maps entries create sites-raiz --map=sites-cert-map \
    --hostname="${DOMINIO}" --certificates=sites-curinga

echo "== URL map, proxy HTTPS e regra 443"
existe g compute url-maps describe sites-urlmap --global ||
  g compute url-maps create sites-urlmap --global --default-service=sites-backend
existe g compute target-https-proxies describe sites-https-proxy --global ||
  g compute target-https-proxies create sites-https-proxy --global \
    --url-map=sites-urlmap --certificate-map=sites-cert-map
existe g compute forwarding-rules describe sites-https --global ||
  g compute forwarding-rules create sites-https --global --load-balancing-scheme=EXTERNAL_MANAGED \
    --address=sites-ip --target-https-proxy=sites-https-proxy --ports=443

echo "== HTTP → HTTPS"
if ! existe g compute url-maps describe sites-redirect --global; then
  cat > /tmp/sites-redirect.yaml <<YAML
name: sites-redirect
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
YAML
  g compute url-maps import sites-redirect --global --source=/tmp/sites-redirect.yaml
fi
existe g compute target-http-proxies describe sites-http-proxy --global ||
  g compute target-http-proxies create sites-http-proxy --global --url-map=sites-redirect
existe g compute forwarding-rules describe sites-http --global ||
  g compute forwarding-rules create sites-http --global --load-balancing-scheme=EXTERNAL_MANAGED \
    --address=sites-ip --target-http-proxy=sites-http-proxy --ports=80

ACME=$(g certificate-manager dns-authorizations describe sites-dns-auth --format='value(dnsResourceRecord.data)')
cat <<TXT

Pronto. Crie no DNS de ${DOMINIO}:
  CNAME  _acme-challenge.${DOMINIO}   ${ACME}
  A      *.${DOMINIO}                 ${IP}
  A      ${DOMINIO}                   ${IP}   (opcional)

Acompanhe o certificado:
  gcloud certificate-manager certificates describe sites-curinga --project ${PROJETO}
TXT
