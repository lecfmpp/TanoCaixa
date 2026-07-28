# Handoff: Tá no Caixa — gestão financeira para restaurantes

## Visão geral
**Tá no Caixa** (tanocaixa.com) é um SaaS de gestão financeira para donos de restaurante, com alma carioca.
O MVP é **web desktop responsivo** (não é app nativo). O produto responde a três perguntas em três segundos:
*quanto entrou, quanto saiu, quanto sobrou* — e elimina digitação lendo notas fiscais por foto (OCR + IA)
e puxando faturamento de iFood, Rappi e maquininha.

Restaurante de referência dos protótipos: **Zaatar Cozinha Árabe**, delivery-first, Botafogo/RJ,
faturamento ~R$ 50.000/mês. Toda a interface é em **português do Brasil** e toda moeda em **R$**.

## Sobre os arquivos de design
Os arquivos em `design/` são **referências de design feitas em HTML** — protótipos que mostram aparência
e comportamento pretendidos, **não código de produção para copiar**. A tarefa é **recriar esses designs no
ambiente do codebase alvo** (React/Next, Vue, etc.) usando os padrões e bibliotecas já estabelecidos lá.
Se ainda não existe codebase, escolha a stack (sugestão em `PROMPT.md`) e implemente os designs nela.

Cada `.dc.html` abre direto no navegador (duplo clique). São páginas de canvas: dá para dar zoom e navegar.

## Fidelidade
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, hierarquia, copy e estados finais já estão
definidos. Recrie fielmente. O que é ilustrativo: dados numéricos (mock), fotos do Rio (substituíveis por
banco de imagens licenciado) e as molduras de navegador/celular dos protótipos (são só cenário — não
implemente a moldura).

---

## Arquivos de design

| Arquivo | O que contém |
|---|---|
| `design/Web Desktop.dc.html` | **O MVP.** Login, criar conta, esqueci a senha, onboarding em 7 passos e o painel completo (Início, Despesas, Produtos, Estoque, Plano do mês, DRE, Números, Ajustes), gaveta de novo lançamento e a versão em 430px de largura. É a referência principal. |
| `design/Estilo Visual.dc.html` | Paleta, tipografia, formas, filtro de fotos, tom de voz. |
| `design/Modais e Avisos.dc.html` | Padrão de modais de confirmação e dos 5 tipos de toast, com regras de uso e tempos. |
| `design/Onboarding.dc.html` | As 17 telas de entrada/onboarding em versão celular (referência de conteúdo). |
| `design/Onboarding Clicavel.dc.html` | O mesmo fluxo navegável. |
| `design/Ta no Caixa.dc.html` | Protótipo mobile do app (referência para o breakpoint pequeno) + e-mail de segunda-feira. |
| `design/uploads/*.png` | Fotos do Rio usadas nos fundos. |
| `tokens.json` | Tokens de design em JSON, prontos para virar tema. |
| `PROMPT.md` | Prompt para colar no Claude Code. |
| `DATA_MODEL.md` | Entidades, campos, regras de cálculo e integrações. |
| `BACKLOG.md` | Fases de implementação sugeridas. |

---

## Design tokens

### Cores
| Token | Hex | Uso |
|---|---|---|
| `mar` | `#2E5F73` | cor primária: barra lateral, botões principais, cabeçalhos |
| `mar-escuro` | `#1E4354` | gradientes, hover do primário |
| `noite` | `#16303A` | fundo atrás de foto, overlays |
| `sol` | `#EFAB5C` | destaque quente, disco solar, estado "quase lá" |
| `telhado` | `#C05437` | ação de lançar (+ Lançar), alertas de atenção |
| `mata` | `#2F6B4A` | positivo: sobrou, dentro da meta, sucesso |
| `telha-alerta` | `#B4462F` | negativo: estourou, erro, destrutivo |
| `areia` | `#CDCCB8` | fundo da mesa de trabalho / canvas |
| `fundo-app` | `#F0EEE2` | fundo das telas |
| `superficie` | `#FBFAF2` | cartões e campos |
| `preenchimento` | `#E8E6D7` | chips inativos, cabeçalho de tabela, botão secundário |
| `trilho` | `#E1DFCE` | trilhos de barra de progresso |
| `creme` | `#F7F5EA` | texto sobre fundo escuro |
| `tinta` | `#1C2A2E` | texto principal |
| `tinta-2` | `#45585D` | texto de apoio |
| `tinta-3` | `#6A7A7E` | descrições |
| `tinta-4` | `#8A9698` | rótulos, metadados |
| `tinta-5` | `#AEB9B8` | placeholders, itens desabilitados |
| `insight-fundo` | `#F4E8D4` / borda `rgba(192,84,55,.3)` | cartões de recado/insight |
| `insight-texto` | `#3A3327` / rótulo `#8A5A28` | texto dentro do insight |

Bordas de cartão: `1px solid rgba(46,95,115,.10–.14)`. Divisórias de tabela: `1px solid #E8E6D7`.

**Regra de ouro:** uma cor quente por tela. Verde e vermelho são reservados a dinheiro, nunca a enfeite.

### Tipografia
- **Archivo** (Google Fonts, 400/500/600/700/800) — toda a interface.
- **JetBrains Mono** (400/500/700) — **todo valor em R$**, percentuais, datas e códigos. Sempre alinhado à direita em tabelas.
- Escala: título de página 26–30px/800/-0.025em · título de seção 15–16px/700 · corpo 14–15px/400–600 ·
  rótulo 11–12px/700 uppercase letter-spacing .08em · número grande 26–40px/700 mono/-0.03em.
- `text-wrap: pretty` em blocos de texto corrido.

### Formas e sombras
- Raio: cartão 18–20px · botão/campo 13–16px · chip 10–12px · avatar 50%.
- Sombra de cartão flutuante: `0 12px 26px rgba(22,48,58,.16)`; modal `0 30px 70px rgba(22,48,58,.35)`;
  gaveta `-24px 0 60px rgba(22,48,58,.28)`.
- Espaçamento: grade de 4px; gap padrão entre cartões 14px; padding de cartão 18–22px; padding de página 24–28px.
- Layout sempre com `display:flex`/`grid` + `gap` (nunca margens soltas entre irmãos).

### Filtro das fotos do Rio
Toda foto entra com o mesmo tratamento (3 camadas):
1. imagem: `filter: saturate(.30) contrast(1.06); object-fit: cover`
2. camada de cor: `mix-blend-mode: multiply` — **Mar** `#2E5F73` a 82–86%, **Sol** `linear-gradient(180deg,#EFAB5C,#C05437)` a 78–80%, **Areia** `#CDCCB8` a 72%
3. camada de luz: `mix-blend-mode: screen` `#F7F5EA` 12–26% (ou degradê de sol no topo)
Mais um degradê escuro do lado onde fica o texto e, opcionalmente, o **disco solar** (círculo sólido `#EFAB5C`, opacidade .9).
Fotos só em momento de respiro (login, onboarding, cabeçalho, e-mail, capa de mês). **Nunca atrás de número ou tabela.**

---

## Telas

### 1. Entrada (`Web Desktop.dc.html`, estados `login`, `criar`, `esqueci`)
Layout: split. **Esquerda 44%** — foto do Rio (filtro Mar) + logo + manchete
"Saber se sobrou dinheiro não pode dar trabalho" + dois números de prova (40s pra lançar uma nota / 3s pra
saber se sobrou). **Direita** — formulário centralizado, largura máxima 400px, gap 20px.

- **Entrar**: e-mail, senha (com "mostrar"), "continuar conectado", "esqueci a senha", botão primário
  "Entrar no painel", divisor "ou", Google e Apple, link "Criar agora".
- **Criar conta**: nome, restaurante + bairro (lado a lado), celular (WhatsApp — campo destacado, é o canal
  de alerta), e-mail, senha com medidor de força (4 barras + frase em linguagem simples), aceite LGPD,
  botão "Criar conta e começar" → **vai para o onboarding**.
- **Esqueci a senha**: escolha de canal (WhatsApp / e-mail, com dado mascarado), botão "Me manda o código",
  saída humana no rodapé ("fala com a gente no WhatsApp"). Continuação (código de 6 dígitos → nova senha →
  confirmação) está detalhada em `Onboarding.dc.html`.

### 2. Onboarding — 7 passos (estado `onb`)
Trilha lateral de 330px com foto (filtro Sol), lista de passos (feito = bolinha verde, atual = bolinha sol)
e "Sair do cadastro". Área direita: barra de progresso + "passo N de 7", conteúdo, e rodapé fixo com
"← Voltar", "Pular por agora" e o botão primário.

1. **O restaurante** — nome, bairro, nº de lojas, como opera (chips: só delivery / delivery+salão / só salão / buffet), tipo de comida (chips), CNPJ opcional.
2. **Canais de venda** — checkboxes iFood, Rappi, WhatsApp/site, balcão; ticket médio, dias abertos, pedidos/dia; aviso sobre margem em delivery.
3. **Números de partida** — faturamento típico, folha, nº de pessoas, contas fixas, estoque parado (opcional). Devolve na hora o **ponto de equilíbrio** calculado.
4. **Integrações** — iFood (conectado), Rappi (conectando, spinner), maquininha, PDV. Sempre com "faço depois".
5. **Sua equipe** — lista de membros com avatar/inicial, convite por WhatsApp, papéis (gerente, estoque, só lançar nota, contador) e a frase que explica a permissão.
6. **Metas e avisos** — meta de faturamento, tetos por categoria (30/25/15/12) com sobra prevista (18% · R$ 9.000), switches dos canais de aviso.
7. **Tudo pronto** — foto, checklist do que foi configurado e "primeira missão" (tirar foto da última nota). Botão "Ver meu painel" entra no app.

### 3. Painel
**Shell**: barra lateral 236px `#2E5F73` (logo, 8 itens de menu, cartão de progresso da contagem, "Sair da conta")
+ área de conteúdo com scroll, padding 24/28px.
**Cabeçalho de todas as seções**: faixa com foto (filtro Mar, altura ~86px, raio 18px), título da seção,
subtítulo com restaurante/bairro/data, segmentado **Semana | Mês**, botão "Exportar" e o botão **+ Lançar**
(telha `#C05437`, sombra) que abre o menu de 4 opções. *O menu não pode ficar dentro da faixa (ela tem overflow hidden).*

- **Início** — 4 cartões (Entrou, Saiu, Sobrou em fundo mar com disco solar, Ponto de equilíbrio); faixa "Fechou o dia?" com botão; gráfico de barras entrou×saiu (semana a semana ou dia a dia, com o valor escrito em cima de cada barra e a sobra do período embaixo em verde/vermelho); cartão de insight; cartão "Quem mexeu no quê" (5 últimas ações).
- **Despesas** — 4 cartões de resumo (saiu, pago, a pagar, vence em 3 dias); barra "onde o dinheiro saiu" com as 4 categorias; busca; filtros por categoria (funcionais); tabela com fornecedor+descrição, categoria (chip colorido), forma de pagamento, data, **quem lançou** (avatar+nome+quando), situação (pago/a pagar/vence) e valor; rodapé com contagem e total. Painel lateral **Leitura da nota**: miniatura da foto, campos extraídos, chips de categoria, itens lidos com **comparação de preço** (+14%, −3%) e botões Ajustar / Tá certo, lançar. Abaixo, "Contas que se repetem".
- **Produtos** — busca, filtros por categoria, tabela (produto, fornecedor, categoria, unidade, atualizado por, custo), botão + Novo produto.
- **Estoque** — lista da contagem com steppers −/+ por item, subtotal por item, "contado por X"; lateral com valor contado (recalcula ao vivo), histórico de estoque fechado e nota sobre o uso no celular.
- **Plano do mês** — meta com barra de progresso; tabela teto × realizado × R$ × situação (tranquilo/quase lá/estourou); cartão de vazamento de margem; bloco para montar o plano do mês seguinte.
- **DRE** — tabela contábil completa: receita bruta aberta por canal → (−) taxas → receita líquida → (−) CMV aberto → lucro bruto → (−) pessoal aberto → (−) ocupação aberta → resultado operacional → (−) impostos → **sobrou no fim do mês** (linha final em fundo mar). Colunas: julho, % da receita, junho, variação. Abaixo, barra "pra onde vai cada R$ 100". Lateral: resultado, comparativo com junho, tradução em linguagem simples e bloco **Pro contador** (PDF, planilha, XMLs, envio dia 5).
- **Números** — 4 KPIs (CMV, custo de pessoal, peso dos apps, ponto de equilíbrio) que trocam com o segmentado semana/mês; histórico de sobra dos últimos 6 meses.
- **Ajustes** — equipe e papéis, canais de aviso (switches), e **histórico de tudo que foi feito**: ação, origem (foto lida pela IA / celular / computador da loja / integração), tipo, valor e hora, com filtro por pessoa e exportar.

### 4. Gaveta de novo lançamento (520px, à direita, com backdrop)
Cabeçalho (título, subtítulo, fechar) + trilha de 3 etapas → conteúdo → rodapé fixo (Cancelar | Continuar).
Etapa 2 é genérica: resumo em tabela + aviso de autoria ("vai ficar registrado como Halim, hoje às 19:42,
pelo computador da loja") + impacto real ("seu CMV vai de 29,9% para 30,9%"). Etapa 3 é sucesso + dica.

Quatro fluxos: **Despesa** (valor, categoria, fornecedor, data, forma de pagamento, repete todo mês, observação),
**Produto** (nome, categoria, unidade, custo, estoque mínimo, fornecedor, entra-no-CMV),
**Movimento de estoque** (tipo, produto, quantidade com stepper, custo, gerar despesa junto),
**Fechamento do dia** (valores das plataformas já preenchidos + Pix/maquininha/dinheiro digitados + total).

### 5. Modais e avisos (`Modais e Avisos.dc.html`)
- **Modal** só para ação difícil de desfazer (apagar, fechar contagem, sair perdendo dados). Faixa de 6px no
  topo na cor da gravidade, título como pergunta curta, consequência em uma frase, resumo com números quando
  importa, botões `[secundário | primário com o verbo]`. Nunca "OK". Nunca modal sobre modal.
- **Toast** para tudo que já aconteceu: sucesso (verde, com "Desfazer"), em andamento (spinner, sem botão),
  atenção (fundo `#F4E8D4`, sempre com próximo passo), erro (borda `#B4462F`, fica até fechar), sistema
  (fundo mar). Canto inferior direito no desktop, topo no celular. Máximo 3 na pilha.
  Tempos: 5s comum, 8s com "desfazer", erro persistente.

---

## Interações e comportamento
- Navegação da barra lateral troca a seção sem recarregar; o item ativo ganha `rgba(255,255,255,.14)` e peso 700.
- Segmentado **Semana | Mês** recalcula cartões, gráfico e KPIs.
- Filtros de categoria (despesas e produtos) filtram a lista e o total do rodapé.
- Steppers de estoque recalculam o valor contado ao vivo.
- Gaveta e modais: fecham no backdrop e no ×; `Esc` fecha; foco preso dentro enquanto abertos.
- Leitura de nota: estado "lendo" com spinner (meta ≤ 5s) → tela de conferência → confirmação com toast e "desfazer".
- Responsivo: **>1100px** barra lateral fixa e tabelas completas · **700–1100px** barra vira ícones, tabelas
  perdem as colunas fornecedor e unidade · **<700px** tudo empilha em cartões, menu vira gaveta e as ações
  principais (lançar nota, contar estoque) ficam em botão fixo embaixo.
- Sem internet: salva local e sincroniza depois (toast de sistema).

## Estado
`sessao` (usuário, papel, restaurante) · `secaoAtiva` · `periodo: 'semana'|'mes'` · `filtroCategoriaDespesa` ·
`filtroCategoriaProduto` · `contagem: {produtoId: quantidade}` · `gaveta: {tipo, passo, dados}` ·
`modal: {tipo, payload}` · `toasts: []` · `onboarding: {passo, respostas}` · `canaisDeAviso`.

## Papéis e permissões
- **Dono** — vê tudo, inclusive lucro, folha e DRE.
- **Gerente** — lança nota, conta estoque, vê CMV. **Não vê** lucro, folha nem faturamento total.
- **Estoque / só lançar nota / contador** — recortes menores; contador recebe exportações.
- Toda ação grava autor, hora e origem (ver `DATA_MODEL.md`).

## Assets
- 4 fotos do Rio em `design/uploads/` (vista aérea, Cristo ao pôr do sol, bondinho de Santa Teresa, Escadaria
  Selarón). **São referências**: substitua por imagens licenciadas antes de publicar. O filtro é o que garante
  a consistência visual, não a foto específica.
- Sem biblioteca de ícones: os poucos ícones são formas CSS simples (círculos, quadrados, check em borda
  rotacionada). Se o codebase já tem uma biblioteca (Lucide, etc.), use-a mantendo traço fino e neutro.
- Fontes: Google Fonts (Archivo, JetBrains Mono).

## Copy — regras
Entrou / saiu / sobrou / teto / tá no caixa. Nada de "receita bruta", "resultado líquido" ou "DRE" fora da
página de DRE. Todo alerta vem com o que fazer. Gíria carioca leve, no máximo uma por tela. Sem emoji.
