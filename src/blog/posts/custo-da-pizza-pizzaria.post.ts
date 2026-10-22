import type { Post } from '../tipos'

/**
 * Nicho · palavra-chave: custo da pizza / precificação pizza (170/mês) + cmv pizzaria + sistema para pizzaria (390/mês).
 * Todos os custos de ingredientes, caixas e preços de venda são ILUSTRATIVOS e vêm rotulados assim.
 * Fatos externos: taxas do iFood (conferidas em 21/10/2026, blog/research/ifood-oficial) e preços públicos de
 * sistemas (blog/research/competidores-raw, 21/10/2026).
 */
const post: Post = {
  slug: 'custo-da-pizza-pizzaria',
  titulo: 'Custo da pizza: como calcular o preço e a margem da pizzaria',
  tituloMeta: 'Custo da pizza: como calcular preço e margem',
  descricao: 'Veja como calcular o custo da pizza por sabor e tamanho, precificar meia a meia e borda e saber quanto o app tira da margem. Com calculadora.',
  resumo: 'Calcule o custo de cada pizza por sabor e tamanho, defina o preço pelo CMV-alvo, trate meia a meia e borda e veja quanto o app tira da margem.',
  palavraChave: 'custo da pizza',
  secundarias: ['precificação pizza', 'ficha técnica pizza', 'cmv pizzaria', 'como calcular o preço da pizza', 'margem de lucro de pizzaria', 'sistema para pizzaria'],
  tipo: 'nicho',
  categoria: 'Por tipo de cozinha',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'bars',
    etiqueta: 'PIZZARIA · CUSTO',
    itens: [
      { rotulo: 'Mussarela', valor: 20.4 },
      { rotulo: 'Calabresa', valor: 23.3 },
      { rotulo: 'Frango c/ catupiry', valor: 30.1 },
      { rotulo: 'Camarão', valor: 38.4 },
    ],
  },
  relacionados: ['sistema-para-restaurante', 'como-calcular-cmv-restaurante', 'taxa-do-ifood'],
  cta: { principal: { tipo: 'recurso', id: 'planilha-cmv-ficha-tecnica' }, secundario: { tipo: 'teste', variante: 'comparacao' } },
  fontes: [
    { rotulo: 'iFood, página oficial de planos para restaurantes (consultada em 21/10/2026)', url: 'https://parceiros.ifood.com.br/restaurante/planos-ifood' },
    { rotulo: 'iFood para Parceiros: Taxas do iFood (atualizado em 15/09/2026)', url: 'https://blog-parceiros.ifood.com.br/taxas-ifood/' },
    { rotulo: 'Saipos, planos e preços (consultada em 21/10/2026)', url: 'https://saipos.com/planos-e-precos' },
    { rotulo: 'Goomer, planos (consultada em 21/10/2026)', url: 'https://goomer.com.br/planos' },
    { rotulo: 'GrandChef, planos e adesão (consultada em 21/10/2026)', url: 'https://www.grandchef.com.br/adesao' },
  ],
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Custo da pizza:** é a soma de massa, molho, queijo, cobertura, borda e caixa, já com a perda de cada item. O queijo costuma ser a maior fatia.',
        '**Preço certo:** divida o custo pelo CMV que você quer. Com custo de R$ 23,33 e alvo de 30%, o preço sai em R$ 77,77.',
        '**Tamanho:** a área cresce com o quadrado do diâmetro. Uma pizza de 35 cm tem quase o dobro da área de uma de 25 cm (1,96 vez).',
        '**Sabor:** cada sabor tem um custo. Um preço único esconde o sabor caro que dá prejuízo, então cobre por faixa.',
        '**App:** no Plano Básico do iFood, 15,2% do pedido ficam com o app (conferido em 21/10/2026). O preço do app precisa ser maior que o do balcão.',
      ],
    },
    {
      t: 'p',
      texto:
        'O **custo da pizza** muda de sabor para sabor e de tamanho para tamanho. Por isso o preço único, copiado do vizinho, é a causa mais comum de pizzaria que vende muito e sobra pouco.',
    },
    {
      t: 'p',
      texto:
        'Este guia mostra a conta inteira: o que entra no custo, a ficha técnica em cinco passos, o preço por tamanho e por sabor, o meia a meia, a borda e o efeito do delivery. Todos os valores de exemplo são **ilustrativos**. Troque pelos da sua compra.',
    },

    { t: 'h2', texto: 'O que entra no custo da pizza?' },
    {
      t: 'p',
      texto:
        'No custo da pizza entra **tudo que vai na caixa**: massa, molho, queijo, cobertura, borda e a própria embalagem. Quem vende por delivery esquece a caixa e a fita. Ela custa dinheiro em toda venda.',
    },
    {
      t: 'p',
      texto:
        'Tem ainda o que fica fora da ficha técnica, mas pesa no preço: gás ou energia do forno, mão de obra e aluguel. Esses custos você divide pelo número de pizzas do mês e trata como rateio, separado do CMV. Gás de R$ 900 em 1.500 pizzas, por exemplo, dá R$ 0,60 por pizza (conta ilustrativa).',
    },
    {
      t: 'p',
      texto:
        'O queijo costuma dominar a conta. No exemplo da calabresa grande que usamos abaixo, a mussarela sozinha responde por metade do custo. Qualquer variação no preço do queijo mexe na margem da casa inteira.',
    },

    { t: 'h2', texto: 'Como calcular o custo de uma pizza?' },
    {
      t: 'p',
      texto:
        'Calcule o custo de uma pizza somando o custo **útil** de cada ingrediente e a embalagem. O custo útil leva em conta a perda: quando você compra R$ 11,40 de queijo e 3% se perde no manuseio, o custo real é R$ 11,75 (11,40 ÷ 0,97).',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Liste cada item e a quantidade', texto: 'Massa, molho, 300 g de mussarela, 80 g de calabresa, cebola, azeitona e orégano. Pese uma pizza de verdade, não confie na memória.' },
        { titulo: 'Calcule o custo por grama', texto: 'Divida o valor da nota pelo peso comprado. Queijo de R$ 38 o quilo custa R$ 0,038 por grama.' },
        { titulo: 'Aplique a perda ou o rendimento', texto: 'Divida o custo do item por (1 menos a perda). Cebola com 10% de perda custa 11% a mais do que parece.' },
        { titulo: 'Some a embalagem', texto: 'Caixa, fita e papel. Entra na pizza de delivery e na de viagem.' },
        { titulo: 'Divida pelo CMV-alvo', texto: 'Custo total ÷ CMV desejado dá o preço sugerido. Depois você ajusta com o que o mercado da sua rua aceita.' },
      ],
    },
    {
      t: 'p',
      texto: 'Refaça a conta com os seus valores na calculadora. Ela já vem com uma pizza grande de calabresa, e tudo é editável.',
    },
    { t: 'widget', id: 'custo-prato', preset: 'pizza' },
    {
      t: 'exemplo',
      titulo: 'Pizza grande de calabresa, a conta do widget (ilustrativa)',
      linhas: [
        { rotulo: 'Massa e molho', valor: 'R$ 4,80' },
        { rotulo: 'Mussarela 300 g (com 3% de perda)', valor: 'R$ 11,75' },
        { rotulo: 'Calabresa 80 g (com 5% de perda)', valor: 'R$ 2,95' },
        { rotulo: 'Cebola, azeitona e orégano (com 10% de perda)', valor: 'R$ 1,33' },
        { rotulo: 'Caixa e fita', valor: 'R$ 2,50' },
        { rotulo: 'Custo total da pizza', valor: 'R$ 23,33', destaque: true },
      ],
      conclusao: 'Vendida a R$ 59,90, o CMV é de **38,9%** (23,33 ÷ 59,90). Para chegar a 30%, o preço teria de ser **R$ 77,77** (23,33 ÷ 0,30).',
    },
    {
      t: 'p',
      texto: 'Repare no peso do queijo. Meio custo da pizza vem de um só item, e é nele que a negociação com o fornecedor rende mais.',
    },
    {
      t: 'grafico',
      tipo: 'empilhada',
      titulo: 'De que é feito o custo de uma pizza grande de calabresa',
      subtitulo: 'Exemplo ilustrativo. Em % do custo total de R$ 23,33.',
      partes: [
        { rotulo: 'Mussarela', valor: 50.4, tom: 'sol' },
        { rotulo: 'Massa', valor: 13.7, tom: 'areia' },
        { rotulo: 'Calabresa', valor: 12.6, tom: 'telha' },
        { rotulo: 'Caixa', valor: 10.7, tom: 'cinza' },
        { rotulo: 'Molho', valor: 6.9, tom: 'mar' },
        { rotulo: 'Cebola e temperos', valor: 5.7, tom: 'mata' },
      ],
      formato: 'pct',
      fonte: 'Valores de exemplo, ilustrativos. Troque pelos custos da sua compra.',
    },

    { t: 'h2', texto: 'Como o preço muda com o tamanho da pizza?' },
    {
      t: 'p',
      texto:
        'O preço **não** acompanha o diâmetro: ele acompanha a área. A área de um círculo é π × raio², então dobrar o raio quadruplica a área. Uma pizza de 35 cm tem 962 cm², contra 491 cm² de uma de 25 cm. É **1,96 vez** a área com apenas 40% a mais de diâmetro.',
    },
    {
      t: 'p',
      texto:
        'Queijo, molho e cobertura crescem junto com a área. A caixa e a massa sobem menos. Por isso a pizza maior costuma ter melhor margem em reais, desde que você não a venda barata demais.',
    },
    {
      t: 'tabela',
      cabecalho: ['Diâmetro', 'Área', 'Ingredientes', 'Caixa', 'Custo total', 'Preço para CMV de 30%'],
      linhas: [
        ['25 cm', '491 cm²', 'R$ 10,63', 'R$ 1,50', 'R$ 12,13', 'R$ 40,43'],
        ['30 cm', '707 cm²', 'R$ 15,31', 'R$ 2,00', 'R$ 17,31', 'R$ 57,70'],
        ['35 cm', '962 cm²', 'R$ 20,83', 'R$ 2,50', 'R$ 23,33', 'R$ 77,77'],
        ['40 cm', '1.257 cm²', 'R$ 27,21', 'R$ 3,20', 'R$ 30,41', 'R$ 101,37'],
      ],
      destaqueColuna: 5,
      legenda: 'Ilustrativo: ingredientes da calabresa proporcionais à área, tendo a de 35 cm como base. Caixas e diâmetros são hipóteses. Na vida real, ajuste pela sua ficha técnica de cada tamanho.',
    },
    {
      t: 'p',
      texto:
        'A conta mostra um erro clássico: cobrar a de 35 cm só R$ 10 acima da de 25 cm. No exemplo, ela leva quase o dobro de ingredientes e o preço do CMV-alvo é quase o dobro também.',
    },

    { t: 'h2', texto: 'Por que cada sabor precisa do seu preço?' },
    {
      t: 'p',
      texto:
        'Porque o custo muda muito entre os sabores e a mussarela está em todos. O sabor mais barato leva só queijo. O camarão, no exemplo, custa quase o dobro dele. Se os dois saem pelo mesmo preço, o sabor caro come a margem do barato.',
    },
    {
      t: 'grafico',
      tipo: 'barras',
      titulo: 'Custo de uma pizza grande por sabor',
      subtitulo: 'Exemplo ilustrativo: massa, molho e caixa fixos (R$ 7,30) mais queijo e cobertura de cada sabor.',
      dados: [
        { rotulo: 'Mussarela', valor: 20.38 },
        { rotulo: 'Calabresa', valor: 23.33 },
        { rotulo: 'Frango com catupiry', valor: 30.09 },
        { rotulo: 'Camarão', valor: 38.38, destaque: true },
      ],
      formato: 'brl',
      fonte: 'Valores de exemplo, ilustrativos.',
    },
    {
      t: 'p',
      texto: 'Com o custo de cada sabor na mão, agrupe os sabores em faixas de preço. Assim o cardápio fica simples e a margem fica protegida.',
    },
    {
      t: 'tabela',
      cabecalho: ['Faixa', 'Sabores do exemplo', 'Custo', 'Preço para CMV de 30%', 'Preço redondo'],
      linhas: [
        ['Tradicional', 'Mussarela', 'R$ 20,38', 'R$ 67,93', 'R$ 68'],
        ['Tradicional', 'Calabresa', 'R$ 23,33', 'R$ 77,77', 'R$ 78'],
        ['Especial', 'Frango com catupiry', 'R$ 30,09', 'R$ 100,30', 'R$ 100'],
        ['Premium', 'Camarão', 'R$ 38,38', 'R$ 127,93', 'R$ 128'],
      ],
      destaqueColuna: 3,
      legenda: 'Ilustrativo. Muita pizzaria agrupa os sabores em 3 ou 4 faixas de preço para manter o cardápio simples, e usa a faixa de maior custo como referência.',
    },
    { t: 'cta', cta: { tipo: 'teste', variante: 'nota' } },
    {
      t: 'p',
      texto:
        'Sobre a faixa de CMV: muita gente usa algo entre 28% e 35% como referência, mas isso varia por cozinha, por praça e por canal. O que importa é saber o **seu** número, sabor por sabor. Se quer entender a conta do mês inteiro, veja como [calcular o CMV do restaurante](/blog/como-calcular-cmv-restaurante).',
    },

    { t: 'h2', texto: 'Como precificar pizza meia a meia, borda e adicionais?' },
    {
      t: 'p',
      texto:
        'No meia a meia, o custo é a **média** dos custos dos dois sabores, porque a massa, o molho e a caixa são os mesmos. Frango com catupiry (R$ 30,09) e calabresa (R$ 23,33) dão R$ 26,71. Para 30% de CMV, o preço sai em R$ 89,03.',
    },
    {
      t: 'p',
      texto:
        'Muita pizzaria prefere cobrar pelo sabor mais caro, o que é mais simples de explicar ao cliente e protege a margem. Qualquer das duas regras vale. O erro é não ter regra e decidir na hora.',
    },
    {
      t: 'p',
      texto:
        'A borda recheada e os adicionais seguem a mesma lógica: some o custo do recheio e da perda e divida pelo CMV. Uma borda de catupiry que custa R$ 4,50 pede R$ 15,00 para um CMV de 30% (valores ilustrativos). Trate cada adicional como um mini-prato, com ficha própria.',
    },
    {
      t: 'nota',
      tom: 'dica',
      rotulo: 'Regra de bolso',
      texto: 'Revise o preço dos queijos e da calabresa a cada compra grande. Um aumento de 10% na mussarela, no exemplo da calabresa, adiciona cerca de R$ 1,18 ao custo de cada pizza grande.',
    },

    { t: 'h2', texto: 'O que a pizza no app faz com a margem?' },
    {
      t: 'p',
      texto:
        'O app tira uma fatia do preço, então a mesma pizza deixa **menos dinheiro** no delivery do que no balcão. No Plano Básico do iFood, são 12% de comissão mais 3,2% de pagamento online nos pedidos pagos pelo app (conferido em 21/10/2026). Fica 84,8% do preço.',
    },
    {
      t: 'exemplo',
      titulo: 'A mesma pizza de R$ 59,90, no balcão e no app (ilustrativo)',
      linhas: [
        { rotulo: 'Balcão: preço − custo de R$ 23,33', valor: 'R$ 36,57' },
        { rotulo: 'App (Plano Básico): repasse de 84,8% do preço', valor: 'R$ 50,80' },
        { rotulo: 'App: repasse − custo de R$ 23,33', valor: 'R$ 27,47', destaque: true },
        { rotulo: 'Preço no app para sobrar o mesmo que no balcão (59,90 ÷ 0,848)', valor: 'R$ 70,64', destaque: true },
      ],
      conclusao: 'Antes de imposto e de entrega. Para manter a mesma sobra em reais, o preço no app tem de ser cerca de **18% maior**. Cupom e promoção deixam a conta pior ainda.',
    },
    {
      t: 'p',
      texto:
        'Outros planos e a conta completa do repasse estão em [taxa do iFood: quanto cobra e quanto sobra por pedido](/blog/taxa-do-ifood). Por lá você também acha uma calculadora de preço mínimo por pedido.',
    },
    { t: 'cartao-link', slug: 'taxa-do-ifood', rotulo: 'Para a conta do app' },

    { t: 'h2', texto: 'Como acompanhar o CMV da pizzaria no mês?' },
    {
      t: 'p',
      texto:
        'Acompanhe o CMV do mês comparando o que você **gastou em insumos** com o que **vendeu**. A fórmula é estoque inicial mais compras menos estoque final, dividido pelo faturamento. O resultado mostra se a ficha técnica está sendo cumprida na prática.',
    },
    {
      t: 'p',
      texto:
        'Se o CMV real fica acima do da ficha, a diferença tem nome: perda no corte, porção generosa, desperdício, sabor de preço baixo vendendo mais que o esperado ou furto. O mix de sabores mexe no número sem que nenhum preço mude. Mais vendas de sabor caro empurram o CMV para cima.',
    },
    {
      t: 'p',
      texto:
        'O passo a passo do cálculo, com planilha, está em [como calcular o CMV do restaurante](/blog/como-calcular-cmv-restaurante). No Tá no Caixa você já lança compras e despesas e vê o que entrou, o que saiu e o que sobrou. O **CMV por ficha técnica** é um recurso em breve, ainda não está pronto.',
    },

    { t: 'h2', texto: 'Quais erros mais derrubam a margem da pizzaria?' },
    {
      t: 'erros',
      itens: [
        { titulo: 'Preço proporcional ao diâmetro', texto: 'A área cresce com o quadrado. Uma pizza de 35 cm não é 40% maior que a de 25 cm: é quase o dobro.' },
        { titulo: 'Esquecer a caixa', texto: 'Caixa, fita e papel custam em toda venda de delivery. No exemplo, são 10,7% do custo da calabresa.' },
        { titulo: 'Ignorar a perda do queijo', texto: 'Aparas, queijo grudado na pá e excesso na mão do pizzaiolo somem do estoque. Pese as porções e use a perda na ficha.' },
        { titulo: 'Mesmo preço para todos os sabores', texto: 'O sabor caro puxa o CMV para cima e o barato paga a conta. Separe em faixas e revise o cardápio.' },
      ],
    },

    { t: 'h2', texto: 'O que um sistema para pizzaria resolve, e o que o financeiro resolve?' },
    {
      t: 'p',
      texto:
        'Um sistema para pizzaria resolve o **pedido**: comanda, mesa, delivery, impressão na cozinha, cardápio, nota fiscal. O financeiro resolve o **dinheiro**: quanto entrou, quanto saiu e quanto sobrou. São camadas diferentes, e a maioria das casas precisa das duas.',
    },
    {
      t: 'tabela',
      cabecalho: ['Sistema (público)', 'O que vende', 'Preço de entrada'],
      linhas: [
        ['Saipos', 'Gestão completa, fiscal, delivery', 'a partir de R$ 240,79 por mês'],
        ['Goomer', 'Cardápio digital para delivery', 'grátis até 30 pedidos por mês; pago a partir de R$ 99,90'],
        ['GrandChef', 'PDV, delivery e fiscal', 'R$ 90 por mês, com adesão de R$ 100'],
        ['Tá no Caixa', 'Financeiro: quanto sobrou', 'R$ 149 por loja por mês; 14 dias grátis sem cartão'],
      ],
      destaqueColuna: 2,
      fonte: 'Conferido em 21/10/2026 nas páginas públicas de cada empresa. Planos e condições mudam: confirme no site.',
    },
    {
      t: 'p',
      texto:
        'O **Tá no Caixa não é PDV nem cardápio digital**. Ele mostra o resultado do mês e o ponto de equilíbrio, com o lançamento do dia por canal (Pix, cartão, dinheiro e apps). PDV e integração automática com o iFood estão **em breve**. Para comparar opções, veja o guia de [sistema para restaurante](/blog/sistema-para-restaurante).',
    },

    { t: 'h2', texto: 'Perguntas frequentes sobre o custo da pizza' },
    {
      t: 'faq',
      itens: [
        { p: 'Quanto custa para fazer uma pizza?', r: 'Depende do sabor, do tamanho e do preço dos seus insumos. No exemplo deste guia, uma pizza grande de calabresa custa **R$ 23,33** e uma de mussarela, R$ 20,38 (valores ilustrativos). Calcule a sua com a ficha técnica.' },
        { p: 'Qual o CMV ideal de uma pizzaria?', r: 'Não existe número único. Muita gente usa algo entre 28% e 35% como referência, e isso varia por cozinha, por praça e por canal. O ideal é o que deixa sobrar depois de aluguel, folha e imposto. Os exemplos aqui usam 30%.' },
        { p: 'Como calcular o preço da pizza?', r: 'Divida o custo total da pizza pelo CMV que você quer. Com custo de R$ 23,33 e CMV de 30%, o preço é R$ 77,77. Some ingredientes com perda e a caixa antes de dividir.' },
        { p: 'Como precificar pizza meia a meia?', r: 'Faça a média do custo dos dois sabores e divida pelo CMV-alvo. Muita pizzaria prefere cobrar pelo sabor mais caro para simplificar. Escolha uma regra e deixe no cardápio.' },
        { p: 'Quanto custa um sistema para pizzaria?', r: 'Varia com o que o sistema faz. Em 21/10/2026, os preços públicos de entrada eram: Saipos a partir de R$ 240,79 por mês, Goomer grátis até 30 pedidos por mês, GrandChef R$ 90 por mês com adesão de R$ 100. Condições mudam, então confirme nos sites. Para a parte financeira, o Tá no Caixa custa R$ 149 por loja por mês.' },
        { p: 'Vale a pena vender pizza no iFood?', r: 'Vale quando o preço no app cobre a comissão. No Plano Básico, 15,2% do pedido ficam com o iFood (12% + 3,2%, conferido em 21/10/2026). Refaça a conta sabor por sabor antes de aderir a cupom.' },
      ],
    },
  ],
}

export default post
