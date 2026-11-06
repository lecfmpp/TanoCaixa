# Sites dos clientes em `{sub}.tanocaixa.com.br`

Mesmo modelo do WiseFunnel (`*.wiseform.io`): **só Firebase, sem custo extra**.

```
visitante ──► faustoburger.tanocaixa.com.br
              │  DNS (Registro.br): *.tanocaixa.com.br  CNAME  tanocaixa-lojas.web.app
              ▼
   Firebase Hosting, site `tanocaixa-lojas` (target "lojas" no firebase.json)
   cada {sub}.tanocaixa.com.br é registrado neste site ao publicar → certificado próprio
              │  rewrite ** → siteCliente
              ▼
   Cloud Function `siteCliente`: lê o Host → sites/{sub} no Firestore → HTML (cache 60 s)
```

- **Rascunho:** `restaurants/{rid}/site/config` (só membros).
- **Publicado:** `sites/{sub}` (leitura pública; escrita só pela function `publicarSite`).
- **Imagens:** Storage `sites/{rid}/…` (leitura pública; envio só por membro).
- **Publicar** (`publicarSite`): grava `sites/{sub}` e registra `{sub}.tanocaixa.com.br` no site
  `tanocaixa-lojas` pela API do Hosting (`functions/src/site/dominio.ts`). Na 1ª publicação o
  Firebase emite o certificado em 5–30 min; depois, mudanças aparecem em até ~1 min.
  Trocar de endereço remove o domínio antigo.
- Sem registro, um subdomínio **não abre** (erro de certificado) — o curinga é só no DNS.
- Teste sem DNS: `https://tanocaixa-lojas.web.app/{sub}` e `/{sub}/links`.

## Configuração (uma vez)

1. **Conta de serviço** `sites-publicador` (a `publicarSite` roda com ela, para as outras functions
   não ganharem acesso ao Hosting):
   ```bash
   gcloud iam service-accounts create sites-publicador --project tanocaixa --display-name "Publica sites dos clientes"
   gcloud projects add-iam-policy-binding tanocaixa --member serviceAccount:sites-publicador@tanocaixa.iam.gserviceaccount.com --role roles/firebasehosting.admin --condition=None
   gcloud projects add-iam-policy-binding tanocaixa --member serviceAccount:sites-publicador@tanocaixa.iam.gserviceaccount.com --role roles/datastore.user --condition=None
   ```
2. **DNS do `tanocaixa.com.br`** (Registro.br → DNS → Editar zona):
   | Tipo | Nome | Valor |
   |---|---|---|
   | CNAME | `*` | `tanocaixa-lojas.web.app` |
   | TXT | (raiz) | `hosting-site=tanocaixa-lojas` |

   Se o Registro.br não aceitar `*`, use o DNS da HostGator (como `wiseform.io` e `tanocaixa.com`):
   troque os servidores DNS do `.com.br` para `ns896/ns897.hostgator.com.br` e crie os mesmos
   registros na zona de lá.
3. **Deploy:** `firebase deploy --only hosting:lojas,functions:siteCliente,functions:publicarSite`.
   O `deploy --only hosting` do GitHub Actions publica os dois sites (app e lojas).

## Limites
O WiseFunnel tem 108 domínios num único site do Hosting sem problema. Se um dia o Firebase
limitar, dá para abrir um segundo site (`tanocaixa-lojas-2`) e distribuir.

## Nomes reservados
`www, app, api, admin, blog, painel, …` — `SUBDOMINIOS_RESERVADOS` em `functions/src/site/modelo.ts`.
