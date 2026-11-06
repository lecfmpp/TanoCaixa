# Sites dos clientes em `*.tanocaixa.com.br`

Cada restaurante publica o site pela tela **Meu site** (`/painel/site`) e ele fica no ar em
`{sub}.tanocaixa.com.br` (e `{sub}.tanocaixa.com.br/links`). Os sites ficam no `.com.br` de
propósito: o conteúdo dos clientes não divide cookies, sessão nem reputação de e-mail/SEO com o
app em `tanocaixa.com`.

## Como funciona

```
visitante ──► faustoburger.tanocaixa.com.br
              │  DNS: *.tanocaixa.com.br  A  <IP global do balanceador>
              ▼
   Load Balancer HTTPS global (Google Cloud, mesmo projeto `tanocaixa`)
   certificado curinga *.tanocaixa.com.br (Certificate Manager) + Cloud CDN
              │  serverless NEG
              ▼
   Cloud Function `siteCliente` (gen2 / Cloud Run "sitecliente")
   lê o Host → sites/{sub} no Firestore → HTML pronto (cache 60 s na CDN)
```

- **Rascunho:** `restaurants/{rid}/site/config` (só membros, regras já existentes).
- **Publicado:** `sites/{sub}` (leitura pública, escrita só pela function `publicarSite`, que
  garante que o endereço é único e reservado aos nomes permitidos).
- **Imagens:** Storage em `sites/{rid}/…` (leitura pública, envio só por membro).
- Publicar → o site muda em até ~60 s (CDN `s-maxage=60` + cache de 30 s na function).

### Por que não "custom domain" do Firebase Hosting por cliente?
O Firebase Hosting não aceita domínio curinga e limita quantos domínios próprios cada projeto
conecta (cada um com verificação e certificado separados). Serve para 10 clientes, não para
1.000. O balanceador com certificado curinga resolve qualquer subdomínio novo na hora, sem
nenhum passo por cliente. Custo fixo aproximado: ~US$ 18/mês da regra de encaminhamento + tráfego.

## Antes do DNS (testar já)
A function responde em modo caminho: `https://<url-da-siteCliente>/{sub}` e `/{sub}/links`.
A URL aparece no fim do `firebase deploy --only functions:siteCliente`.

## Passo a passo (uma vez)

1. Publicar regras e functions:
   ```bash
   firebase deploy --only firestore:rules,storage,functions:siteCliente,functions:publicarSite --project tanocaixa
   ```
   As regras do Storage leem o Firestore (`firestore.get`) para saber quem é membro — na primeira
   vez o CLI pede para liberar essa permissão; aceite.
2. Criar o balanceador e o certificado curinga: `ops/sites-wildcard/setup.sh` (precisa de
   `gcloud` logado com permissão de Owner/Editor no projeto). O script imprime os registros DNS.
3. No DNS do `tanocaixa.com.br` (Registro.br ou onde estiver):
   - `CNAME _acme-challenge.tanocaixa.com.br → <valor que o script imprimir>` (autoriza o certificado curinga)
   - `A *.tanocaixa.com.br → <IP que o script imprimir>`
   - (opcional) `A tanocaixa.com.br → mesmo IP`, se quiser que a raiz também caia no balanceador
4. Esperar o certificado ficar `ACTIVE` (15 min a algumas horas):
   ```bash
   gcloud certificate-manager certificates describe sites-curinga --project tanocaixa
   ```

## Nomes reservados
`www, app, api, admin, blog, painel, …` — lista completa em
`functions/src/site/modelo.ts` (`SUBDOMINIOS_RESERVADOS`). Vale no app e na function.
