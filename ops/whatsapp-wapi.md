# Ligar o WhatsApp do Tá no Caixa à W-API

Estado em 06/11/2026: código pronto no PR #38, **nada publicado**. A produção
continua na Green API e com a tela antiga de Ajustes.

## Já está pronto
- Código: provedor W-API, pareamento por código, teste, histórico e conferência diária (PR #38).
- Segredo `WHATSAPP_WEBHOOK_TOKEN` criado no Secret Manager (versão 1, valor aleatório).
- `functions/.env.tanocaixa` deste worktree com `WHATSAPP_PROVEDOR=green` e os campos da W-API vazios.
- Script `functions/scripts/configurar-wapi.sh` para cada etapa abaixo.

## 1. Dono da conta (pelo celular)
1. Criar a conta em https://w-api.app e a instância (teste grátis de 7 dias).
2. Conectar um chip novo, só do Tá no Caixa, lendo o QR code.
3. Criar o segredo `WAPI_TOKEN` com o token da instância:
   https://console.cloud.google.com/security/secret-manager?project=tanocaixa → Criar secret.
4. Mandar para o Claude: **ID da instância** e **número do chip** ("(11) 9XXXX-XXXX").
   O token nunca vai na conversa.

## 2. Claude aplica os dados (só local)
```bash
functions/scripts/configurar-wapi.sh dados <INSTANCE_ID> "(11) 9XXXX-XXXX"
functions/scripts/configurar-wapi.sh conferir
```
`conferir` mostra se os segredos existem e o status do número na W-API (só leitura).

## 3. Só com o "pode publicar" do dono
1. Conferir o que está no ar (`firebase functions:list`) e de qual branch veio.
2. Colocar o número novo no grupo interno (`WHATSAPP_GRUPO`): com `wapi`, os avisos
   gerais também saem pelo número novo.
3. Publicar só as funções de WhatsApp:
   ```bash
   cd functions && npm run build && firebase deploy --project tanocaixa --only \
   functions:lembretesManha,functions:lembretesNoite,functions:conferirGruposWhatsapp,\
   functions:lembretesWhatsappConfig,functions:lembretesWhatsappSalvar,functions:lembretesWhatsappGrupo,\
   functions:lembretesWhatsappCodigo,functions:lembretesWhatsappLink,functions:lembretesWhatsappDesconectar,functions:lembretesWhatsappTeste,\
   functions:whatsappWebhook,functions:avisoAtividade,functions:resumoDoDia,functions:lembretes
   ```
4. Cadastrar os webhooks na W-API: `functions/scripts/configurar-wapi.sh webhooks`.
5. Publicar o Hosting (tela nova de Ajustes) a partir do mesmo branch.
6. Política de TTL do Firestore no campo `expiraEm` (grupo de coleção `envios` e `whatsapp_mensagens`).

## 4. Teste numa loja nossa
Criar grupo → adicionar o número → colar o link do grupo (ou "Gerar código" e mandar no grupo) → ver "Conectado"
→ "Mandar mensagem de teste" → ver "entregue" → tirar o dono do grupo → teste mostra "Falta o dono no grupo".

Confirmar no teste: o webhook de grupo traz `chat.id`, `sender.id` e o texto; `get-Participants`
devolve telefones (não só `@lid`); os nomes de status de entrega batem com `whatsappGrupoRegras.ts`.

## Voltar atrás
`functions/scripts/configurar-wapi.sh voltar-green` e republicar as mesmas funções.
