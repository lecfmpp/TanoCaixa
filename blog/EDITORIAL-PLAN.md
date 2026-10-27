# Plano editorial — blog do Tá no Caixa

Base: `blog/RESEARCH.md`. Modelo: pilar + cluster (WiseFunnel/True North), em português do balcão.

## Arquitetura de conteúdo

```
PILAR  Sistema para restaurante (comercial) ─────────────┐
   ├─ Comparativo de preços (Saipos, Anota AI, Goomer…)  │ link para o pilar
   ├─ Taxa do iFood + calculadora de lucro por pedido ───┤
   ├─ Como calcular CMV ──────────────────────────────────┤
   ├─ Ponto de equilíbrio ────────────────────────────────┤
   └─ NICHOS: pizzaria · hamburgueria · japonês · árabe ──┘
```

Todo cluster linka **para o pilar** e para **2 irmãos**; o pilar linka para todos. CTA final em todos.

## Lote 1 (publicado nesta entrega)

| # | Slug | Título (≤ 60) | Tipo | Palavra-chave | Vol. | Intenção | Elementos de destaque | CTA final |
|---|---|---|---|---|---:|---|---|---|
| 1 | `sistema-para-restaurante` | Sistema para restaurante: como escolher e quanto custa | **Pilar** | sistema para restaurante · melhor sistema para restaurante | 1.600 · 140 | comercial | tabela de preços datada, gráfico de preço de entrada, passos de decisão, erros comuns | recurso *checklist de escolha* + teste |
| 2 | `taxa-do-ifood` | Taxa do iFood: quanto cobra e quanto sobra por pedido | Cluster | taxa do ifood · calculadora taxa ifood | 1.600 · 210 | informacional | **calculadora**, gráfico "onde vai cada R$ 100", exemplo, FAQ (PAA) | recurso *guia lucro por pedido* + teste |
| 3 | `como-calcular-cmv-restaurante` | Como calcular o CMV do restaurante (fórmula e exemplos) | Cluster | como calcular cmv · cmv restaurante | 880 · 880 | informacional | **calculadora**, exemplo passo a passo, tabela de faixas, passos | recurso *planilha de CMV* + teste |
| 4 | `ponto-de-equilibrio-restaurante` | Ponto de equilíbrio do restaurante: como calcular | Cluster | ponto de equilíbrio restaurante · como calcular ponto de equilíbrio | 720 | informacional | **calculadora**, gráfico de custo × receita, exemplo | teste (variante número) |
| 5 | `custo-da-pizza-pizzaria` | Custo da pizza: como calcular preço e margem | Nicho | precificação pizza · ficha técnica pizza · sistema para pizzaria | 170 · 50 · 390 | informacional + comercial | calculadora de custo do prato (preset pizza), tabela de insumos | recurso *planilha de CMV* |
| 6 | `cmv-hamburgueria` | CMV de hamburgueria: custo do hambúrguer e margem | Nicho | cmv hamburgueria · sistema para hamburgueria | 20 · 210 | informacional + comercial | calculadora (preset hambúrguer), gráfico de composição do custo | teste (variante comparação) |
| 7 | `cmv-restaurante-japones` | CMV de restaurante japonês: custo do sushi e do peixe | Nicho | cmv restaurante japonês · custo sushi | cauda longa | informacional | calculadora (preset sushi), perda/rendimento do peixe, passos | recurso *planilha de CMV* |
| 8 | `gestao-financeira-restaurante-arabe` | Restaurante árabe: custo da esfiha, CMV e lucro | Nicho | custo esfiha · gestão restaurante árabe | cauda longa | informacional | calculadora (preset esfiha), tabela de insumos, pullquote | teste (variante painel) + recurso *checklist de fechamento* |
| 9 | `comparativo-saipos-anota-ai-goomer-consumer` | Saipos, Anota AI, Goomer, Consumer: preços e diferenças | Comparativo | saipos preço · alternativa saipos · anota ai · goomer | 260 + marcas | comercial | tabela de preços, gráfico de preço de entrada, "quando cada um vale", FAQ | recurso *checklist de escolha* + teste |

## Fila (lote 2 em diante)

| Prioridade | Slug sugerido | Palavra-chave | Observação |
|---|---|---|---|
| A | `margem-de-lucro-restaurante` | margem de lucro restaurante (PAA rico) | SERP média/fraca |
| A | `repasse-ifood` | repasse ifood (720, CPC 3,9) | complementa a taxa |
| A | `dark-kitchen-como-funciona-e-custos` | dark kitchen (5.400) | topo de funil; CTA delivery |
| A | `alternativas-ao-saipos` | alternativa saipos | alto intento de troca |
| B | `planilha-fluxo-de-caixa-restaurante` | planilha fluxo de caixa restaurante | isca + página de recurso |
| B | `controle-de-estoque-restaurante` | controle de estoque restaurante (90, CPC 4,9) | |
| B | `como-calcular-markup-restaurante` | como calcular markup (720) | |
| B | `sistema-para-lanchonete` / `-bar` / `-padaria` | 390 / 260 / 210 (CPC 8–11) | páginas de nicho comercial |
| C | `como-abrir-hamburgueria` / `-pizzaria` | 90 cada | |
| C | `dre-para-restaurante` | dre restaurante (70) | liga com o recurso para o contador |

## Iscas digitais (CTAs reutilizáveis)

| Id | Formato | Para quem | Posts que usam |
|---|---|---|---|
| `planilha-cmv-ficha-tecnica` | XLSX com fórmulas | quem calcula CMV e preço do prato | 3, 5, 7 |
| `guia-lucro-por-pedido-ifood` | PDF | quem vende em apps de delivery | 2 |
| `checklist-fechamento-de-caixa` | PDF | dono que fecha o dia | 8 |
| `checklist-escolher-sistema-restaurante` | PDF | quem está comparando sistemas | 1, 9 |

Blocos de teste (cadastro): `painel` (tela real do dashboard), `numero` (40 s para começar),
`nota` (foto da nota), `comparacao` (vs planilha), `rede` (várias lojas). Rotação para não repetir:
cada post usa uma isca **ou** um teste no final, com o outro como secundário; o CTA do meio muda de
variante em relação ao final do mesmo post.

## Métricas (30/60/90 dias)

- Search Console: impressões e cliques por cluster; posição média de `taxa do ifood`, `como calcular cmv`,
  `sistema para restaurante`.
- Conversão: cliques em CTA → `/criar`; downloads de recursos; cadastros com origem `blog/<slug>`.
- Reescrever em 60 dias os posts que ficarem entre as posições 8 e 20.
