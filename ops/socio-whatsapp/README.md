# Sócios no WhatsApp (Leandro ↔ Fernando)

Rotina interna dos sócios — **não faz parte do app** do Tá no Caixa (não toca Firebase,
nem dados de restaurantes). Lê a conversa dos dois no WhatsApp, diz o que está pendente,
o que já foi feito, quais perguntas ficaram sem resposta e onde a conversa parou, e
monta um lembrete para cada um perguntando pelo próximo passo.

**Envio desligado por padrão.** Sem `SOCIO_WHATSAPP_ENVIAR=sim` **e** o pedido explícito
(`--enviar` / input `enviar`), só gera o relatório e os rascunhos.

## Como funciona
1. `greenapi.mjs` — Green-API (mesmo provedor do RetroFoot): `getChatHistory` para ler,
   `sendMessage` para enviar, `getContacts` para achar o chatId.
2. `analise.mjs` — lógica pura e testada: normaliza mensagens, detecta compromissos
   ("vou…", "deixa comigo"), pedidos ("você pode…"), aceites ("combinado"), conclusões
   ("feito", "enviei", ✅, do mesmo assunto e da mesma pessoa) e perguntas sem resposta.
3. `resumo-ia.mjs` — opcional: com `GEMINI_API_KEY`, acrescenta um resumo do Gemini ao
   relatório. O texto passa antes por `limpar()` (sem e-mail, telefone, CPF/CNPJ).
4. `rodar.mjs` — junta tudo; o workflow `.github/workflows/socios-whatsapp.yml` roda no
   GitHub Actions e mostra o relatório no Summary da execução.

## Rodar
```bash
node --test ops/socio-whatsapp/analise.test.mjs                        # testes
node ops/socio-whatsapp/rodar.mjs --arquivo ops/socio-whatsapp/exemplo-historico.json
```

## Ligar (Leandro)
1. Green-API: usar a instância do RetroFoot (o plano Developer grátis aceita até 3
   conversas) ou criar outra. O número conectado precisa **estar na conversa**: o ideal é
   um grupo "Tá no Caixa · Sócios" com Leandro, Fernando e o número secundário do bot.
   O histórico só existe a partir de quando o número foi conectado.
2. Secrets do repositório: `GREEN_API_URL`, `GREEN_API_ID`, `GREEN_API_TOKEN`.
3. Actions → "Sócios no WhatsApp" → Run workflow com `listar_chats` → copiar o chatId
   do grupo para o secret `SOCIO_CHAT`; os números de cada um (`55DDDNUMERO@c.us`) em
   `SOCIO_CHAT_FERNANDO` e `SOCIO_CHAT_LEANDRO`.
4. Rodar sem opções e conferir o rascunho no Summary.
5. Só depois do OK do Fernando: variável `SOCIO_WHATSAPP_ENVIAR=sim` e descomentar o
   `schedule` no workflow com o horário escolhido.

## Limites conhecidos
- Heurística em português: pega frases típicas ("vou", "fica comigo", "feito"); o que for
  combinado de forma indireta pode escapar — o resumo do Gemini cobre parte disso.
- Áudios, imagens sem legenda e figurinhas são ignorados.
