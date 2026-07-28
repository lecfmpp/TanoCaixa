# Modelo de dados e regras de cálculo

Todas as tabelas têm `id`, `restaurante_id`, `criado_em`, `criado_por`, `atualizado_em`, `atualizado_por`, `origem`.
`origem ∈ {celular, computador, integracao, ia_foto}` — é o que alimenta o histórico de autoria.

## restaurante
nome, bairro, cidade, cnpj (opcional), tipo_operacao (delivery | delivery_salao | salao | buffet),
tipo_cozinha, num_lojas, ticket_medio, dias_abertos_semana, regime_tributario (simples | presumido),
aliquota_imposto (default 0.06).

## usuario / membro
usuario: nome, email, celular_whatsapp, senha_hash, avatar_inicial, avatar_cor.
membro: usuario_id, restaurante_id, papel ∈ {dono, gerente, estoque, lancador, contador}, convite_status.
**Permissões:** dono vê tudo; gerente vê CMV, estoque, despesas de mercadoria — **não** vê lucro, folha,
faturamento total nem DRE; estoque só movimenta estoque; lancador só cria despesa; contador só lê e exporta.
Aplicar em RLS.

## categoria_despesa
Fixas do produto: `mercadoria` (CMV), `pessoal`, `ocupacao`, `taxas_app`. Subcategorias livres.

## fornecedor
nome, cnpj, categoria_padrao, contato, prazo_pagamento.

## produto
nome, categoria (hortifruti, carnes, secos, bebidas, embalagens, limpeza), unidade (kg,g,L,un,pacote,caixa),
custo_atual, fornecedor_padrao_id, estoque_minimo, entra_no_cmv (bool), custo_historico[].

## despesa
fornecedor_id, categoria, descricao, valor_total, data_competencia, data_vencimento, forma_pagamento
(pix, dinheiro, cartao, boleto, transferencia, automatico), status (pago, a_pagar, vence), recorrente (bool),
observacao, nota_id (quando veio de foto), itens[] {produto_id, quantidade, preco_unitario}.

## nota_ocr
imagem_url, status (lendo, lida, falhou), tempo_leitura_ms, extraido {fornecedor, cnpj, data, total, itens[]},
confianca_por_campo, revisado_por, confirmado_em. **Meta: ≤ 5s.**
Ao confirmar: cria fornecedor e produtos que não existirem, cria a despesa e compara cada preço com o último
pago (variação em % mostrada na conferência).

## contagem_estoque
mes_referencia, status (aberta, fechada), aberta_em, fechada_em, fechada_por,
itens[] {produto_id, quantidade, custo_unitario, contado_por, contado_em}.
valor_estoque = Σ(quantidade × custo_unitario). Abre dia 1º, lembretes dia 1 e 28.

## movimento_estoque
tipo (entrada, contagem, perda, transferencia), produto_id, quantidade, custo_unitario, gera_despesa (bool).

## receita_dia (fechamento de caixa)
data, canais[] {canal (ifood, rappi, whatsapp, balcao), valor_bruto, taxa, pedidos},
recebimentos[] {forma, valor}, sangria, total_dia, confirmado_por, confirmado_em, origem.
iFood/Rappi/maquininha chegam por integração às 06:00; o usuário confirma o que veio na loja.

## plano_mes
mes, meta_faturamento, tetos {mercadoria, pessoal, ocupacao, taxas_app} em %, sobra_prevista = 100 − Σ tetos,
definido_por.

## insight
tipo, texto, dado_de_apoio, gerado_em, lido_em, acao_sugerida.

## atividade (trilha de auditoria)
quem, acao, entidade, entidade_id, valor, origem, ip/dispositivo, quando. Alimenta o feed do Início e o
histórico em Ajustes. Nunca deletar: correções entram como nova linha.

---

## Cálculos
- **Faturamento bruto** = Σ receita_dia.canais.valor_bruto no período.
- **CMV %** = despesas de `mercadoria` ÷ faturamento bruto. (Versão contábil, quando houver contagem fechada:
  estoque_inicial + compras − estoque_final.)
- **Custo de pessoal %** = despesas `pessoal` ÷ faturamento bruto.
- **Peso dos apps %** = taxas de iFood/Rappi/maquininha ÷ faturamento bruto.
- **Receita líquida** = bruta − taxas de apps e maquininha.
- **Lucro bruto** = receita líquida − CMV.
- **Resultado operacional** = lucro bruto − pessoal − ocupação.
- **Imposto** = faturamento bruto × aliquota (Simples 6% no exemplo).
- **Sobrou no fim do mês** = resultado operacional − imposto.
- **Margem** = resultado ÷ faturamento bruto.
- **Ponto de equilíbrio** = custos fixos ÷ margem de contribuição, onde
  margem de contribuição = 1 − (CMV% + taxas%). Mostrar também por dia aberto e a data em que virou.
- **Status do teto**: ≤ teto → *tranquilo*; até 1 p.p. acima → *quase lá*; acima → *estourou*.
  Alertas em 80% e 100% do teto proporcional ao dia do mês.

## Integrações
- **iFood / Rappi**: OAuth do parceiro, sync diário 06:00 + webhook de pedido; importar vendas, taxas, cancelamentos.
- **Maquininhas** (Stone, Cielo, PagSeguro, Mercado Pago) e **PDV** (Colibri, Consumer, Goomer).
- **OCR/IA**: upload da foto → fila → extração estruturada (fornecedor, CNPJ, data, total, itens com quantidade
  e preço unitário) → sugestão de categoria → conferência humana. Guardar confiança por campo e sempre permitir edição.
- **Notificações**: e-mail (resumo de segunda 7h), WhatsApp (teto em 80% e 100%), SMS de contingência,
  lembretes de contagem dias 1 e 28. Tom sempre positivo e com o próximo passo.
