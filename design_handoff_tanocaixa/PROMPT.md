# Prompt para o Claude Code

Cole isto no Claude Code, na raiz do repositório, com a pasta `design_handoff_tanocaixa/` dentro do projeto.

---

Você vai construir o **Tá no Caixa** (tanocaixa.com), um SaaS de gestão financeira para donos de
restaurante no Rio de Janeiro. Todo o produto é em **português do Brasil** e toda moeda em **R$**.

**Antes de escrever código, leia:**
1. `design_handoff_tanocaixa/README.md` — visão geral, telas, tokens, comportamento
2. `design_handoff_tanocaixa/DATA_MODEL.md` — entidades, cálculos e integrações
3. `design_handoff_tanocaixa/BACKLOG.md` — ordem de implementação
4. `design_handoff_tanocaixa/tokens.json` — tokens de design
5. Abra no navegador `design_handoff_tanocaixa/design/Web Desktop.dc.html` — **é a referência principal**
   (login, onboarding e o painel inteiro, tudo clicável). Depois `Modais e Avisos.dc.html` e `Estilo Visual.dc.html`.

Os `.dc.html` são **protótipos de design**, não código para copiar. Recrie as telas no ambiente do
projeto seguindo os padrões dele.

**Stack sugerida (se o repositório estiver vazio):** Next.js (App Router) + TypeScript + Tailwind
(tokens do `tokens.json` no `theme.extend`) + shadcn/ui, Supabase (Postgres + Auth + Storage + RLS),
TanStack Query, Zod, e uma rota de servidor para OCR/IA das notas. Priorize **web responsiva** — não é app nativo.

**Regras de implementação inegociáveis**
1. **Mobile-first responsivo**, três breakpoints descritos no README. Alvo real: dono de restaurante usando
   celular no meio do salão e computador na hora de fechar o mês.
2. **Menos de 1,5s** para o painel inicial pintar; **até 5s** para a leitura da nota por foto.
3. Todo valor monetário em **JetBrains Mono**, formatado `pt-BR` com R$ e duas casas, alinhado à direita.
4. **Toda ação grava autoria**: quem, quando, de onde (celular / computador / integração / IA). Isso aparece
   nas tabelas, no feed do Início e no histórico completo em Ajustes.
5. **Permissões por papel** (dono vê lucro; gerente não) aplicadas no banco (RLS), não só na interface.
6. **Modal só para o que é difícil de desfazer**; o resto é toast com "Desfazer" (padrão em `Modais e Avisos`).
7. Copy em linguagem de balcão: entrou, saiu, sobrou. Nenhum jargão contábil fora da página de DRE.
8. LGPD: criptografia dos dados financeiros, exportar e apagar tudo a pedido, trilha de auditoria.

**Entregue em fases**, conforme `BACKLOG.md`, com um resumo do que foi feito ao fim de cada fase.
Comece pela Fase 0 (setup + tokens + shell + auth) e me mostre a tela de Início com dados mockados
antes de seguir.
