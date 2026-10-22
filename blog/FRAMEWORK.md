# Framework do blog do Tá no Caixa

Adaptado dos sistemas de blog do **WiseFunnel** (estratégia pilar/cluster, biblioteca de elementos
visuais, gate de qualidade) e do **True North Business Loan** (HTML pré-renderizado, FAQPage/Article
schema, sitemap gerado no build), na voz da marca (`BRAND.md` §9: *fala como o dono fala; direto;
bem-humorado, nunca debochado; mostra número, tela e conta; não promete*).

Base de dados e pesquisa: `blog/RESEARCH.md` · Plano e fila: `blog/EDITORIAL-PLAN.md`.

## 1. O que existe e onde

| Peça | Arquivo |
|---|---|
| Artigo (um arquivo por post) | `src/blog/posts/<slug>.post.ts` (auto-descoberto, não precisa registrar) |
| Contrato dos blocos | `src/blog/tipos.ts` |
| Elementos visuais | `src/blog/elementos.tsx`, `graficos.tsx` |
| Calculadoras (widgets) | `src/blog/widgets.tsx` (`taxa-ifood`, `cmv`, `equilibrio`, `custo-prato` + presets) |
| CTAs reutilizáveis | `src/blog/ctas.tsx` (`CtaTeste` ×5 variantes, `CtaRecurso`, `CtaFinal`) |
| Iscas digitais (registro) | `src/blog/recursos.ts` → arquivos em `public/downloads/` |
| SEO (meta, JSON-LD) | `src/blog/seo.ts` |
| Pré-render + sitemap | `scripts/prerender-blog.mjs` (`npm run build`) |
| Capas 1200×630 | `blog/capas/gerar.mjs` → `public/blog/<slug>.png` |
| QA gate | `npm run blog:gate` (`scripts/blog-gate.mjs`) |

## 2. Arquitetura de conteúdo (pilar + cluster)

- **Pilar** (1.800–3.000 palavras): termo amplo e comercial (ex.: *sistema para restaurante*).
- **Cluster/nicho** (1.100–2.200 palavras): pergunta específica que **linka para o pilar** e para 2 irmãos.
- `relacionados[0]` é sempre o pilar (nos clusters). O texto linka o pilar com âncora com palavra-chave.
- Toda página responde na **primeira frase** (AEO) e termina com CTA.

## 3. Regras de escrita (falham o gate)

1. **Sem emoji.** Em lugar nenhum.
2. **H2 em sentence case**, ≥ 50% em forma de pergunta (o que a pessoa digita no Google).
3. Abre com `tldr` (4 a 5 itens, cada um com **lead-in em negrito:**) → depois 1–2 parágrafos curtos.
4. Frases de até ~20 palavras; parágrafos de até 4 frases. Negrito com parcimônia.
5. `tituloMeta` ≤ **60** (é o `<title>` inteiro, sem sufixo). `descricao` ≤ **160**, com benefício e, quando couber, a marca.
6. Slug kebab-case com a palavra-chave primeiro; igual ao nome do arquivo.
7. FAQ com **4 a 6** perguntas reais (as do *People Also Ask*, ver `RESEARCH.md` §3).
8. **CTA:** `cta.principal` + `cta.secundario` no fim, mais **exatamente 1 bloco `cta`** no meio do texto (variante diferente da do fim). Um é isca (`recurso`) e o outro é teste (`teste`).
9. ≥ 2 links internos no texto (um deles para o pilar) e 1 `cartao-link`.
10. Fontes em `fontes` sempre que houver preço de concorrente, taxa de app ou dado de terceiros. Tabelas de preço levam "Conferido em dd/mm/aaaa".

## 4. Honestidade de conteúdo (não negociável)

- **Nada de estatística inventada.** Faixas (ex.: CMV 28% a 35%) aparecem como "referência que muita gente usa; varia por cozinha". Exemplos com números são **rotulados ilustrativos** (`exemplo` já mostra esse rótulo; nas outras telas, escreva).
- **Preços/taxas de terceiros** só com fonte consultada e data. Se não confirmou, não escreva.
- **O que o Tá no Caixa faz hoje:** dashboard (entrou, saiu, sobrou, ponto de equilíbrio), lançamento do dia (Pix, cartão, dinheiro e apps), nota fiscal por foto (IA lê o cabeçalho), compras/despesas/produtos/estoque, DRE e plano do mês (metas e teto de gasto), rede e franquias, permissões (gerente não vê o lucro), recado de segunda por e-mail. Plano: **R$ 149 por loja/mês**, 14 dias grátis sem cartão.
- **Em breve (não vender como pronto):** PDV, CMV por ficha técnica e integração automática com iFood/apps. Se citar, diga "em breve".
- **O Tá no Caixa não é PDV nem cardápio digital.** Em comparativos, diga isso com todas as letras: ele mostra **quanto sobrou**; PDV/cardápio cuidam do pedido. Eles se complementam.
- Sem aconselhamento contábil/jurídico. Dado tributário: "fale com seu contador".

## 5. Elementos (blocos) e quando usar

Rodar o **passe de elementos** em cada H2: usar o primeiro que casa; senão, prosa. **Pelo menos 2 seções ficam só em prosa.** Nunca empilhar 3 blocos "caixa" seguidos sem parágrafo entre eles.

| Sinal no rascunho | Bloco | Observação |
|---|---|---|
| Resposta curta | `tldr` | 1 por post, no topo |
| 3 números-chave | `numeros` | não inventar |
| 2+ opções com preço/valor | `tabela` | destaque a coluna e dê fonte/data |
| A vs B com veredicto | `comparacao` | `aOk`/`bOk` só quando há vantagem clara |
| Passo a passo | `passos` | nunca `ol` para passos |
| 2–4 erros comuns | `erros` | 4 cartões |
| Conta numérica | `exemplo` | sempre ilustrativo e coerente com o texto |
| Ranking, preço de entrada, canais | `grafico` `barras` | |
| Composição de R$ 100 | `grafico` `empilhada` | soma 100 |
| Custo × receita | `grafico` `linhas` | |
| Ferramenta de cálculo | `widget` | 1 a 2 por post |
| Tela real do app | `print` | `/landing/*.webp`; 1 a 2 |
| Regra de bolso/caveat | `nota` (`dica`/`alerta`/`info`) | |
| Uma frase memorável | `citacao` | máx. 1 |
| Referência cruzada | `cartao-link` | máx. 2, nunca na abertura |
| Perguntas | `faq` | 4–6, último bloco de conteúdo |

Gráficos (≥ 1 por post) e tabela/comparação (≥ 1) são obrigatórios. Clusters e nichos têm 1 widget.

### Widgets disponíveis
`taxa-ifood` · `cmv` · `equilibrio` · `custo-prato` (`preset`: `pizza`, `hamburguer`, `sushi`, `esfiha`; criar novo preset em `PRESETS_PRATO`).

### Print do app (`public/landing/`)
`dashboard.webp`, `inicio.webp`, `caixa.webp`, `compras.webp`, `despesas.webp`, `produtos.webp`, `estoque.webp`, `dre.webp`, `plano-do-mes.webp`, `franquias.webp`. Legenda descreve o que o dono vê, sem prometer.

## 6. CTAs (rotação)

- **Final:** principal + secundário. Se o principal é `recurso`, o secundário é `teste`, e vice-versa.
- **Meio:** 1 bloco `cta` (compacto). Variante diferente da final.
- Variantes de teste: `painel` (tela real), `numero` (40 s), `nota` (foto da nota), `comparacao` (vs planilha), `rede` (várias lojas). **Não repetir a mesma variante no meio e no fim do mesmo post, nem em dois posts vizinhos.**
- Iscas (`recursos.ts`): `planilha-cmv-ficha-tecnica`, `guia-lucro-por-pedido-ifood`, `checklist-fechamento-de-caixa`, `checklist-escolher-sistema-restaurante`. Para criar uma nova: registrar em `recursos.ts`, gerar o arquivo em `public/downloads/`, e a Cloud Function `capturarLead` (`functions/src/leads.ts`) aceitar o novo `id`.

## 7. Como publicar um post

1. Pesquisar (DataForSEO + SERP + concorrentes) → atualizar `RESEARCH.md` se houver dado novo.
2. Criar `src/blog/posts/<slug>.post.ts` seguindo `taxa-do-ifood.post.ts` (modelo).
3. `npm run blog:gate` (precisa zerar as falhas) e `npx tsc -b`.
4. `node blog/capas/gerar.mjs` (gera a capa do slug).
5. `npm run build` (pré-render + sitemap). Conferir `dist/blog/<slug>/index.html`.
6. Deploy (`firebase deploy --only hosting`; `--only functions:capturarLead` se for a 1ª vez).
7. Search Console: enviar `https://tanocaixa.com/sitemap.xml` e solicitar a indexação das URLs novas.

## 8. Checklist de SEO on-page (por post)

Palavra-chave no H1, no `tituloMeta`, na 1ª frase, em 1 H2 e na `descricao`. URL curta. Canonical, Open Graph e Twitter. JSON-LD `Article` + `BreadcrumbList` (+ `FAQPage` quando há FAQ). Imagem de capa 1200×630 com `alt`. Links internos com âncora com palavra-chave. Atualizar `atualizadoEm` quando revisar preço/taxa.
