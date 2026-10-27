import type { Post } from '../tipos'

/**
 * Nicho · palavra-chave: cmv hamburgueria (+ sistema para hamburgueria, ficha técnica hambúrguer, precificação hambúrguer).
 * Taxas do iFood conferidas nas páginas oficiais em 21/10/2026 (ver `fontes`).
 * Todos os custos, preços, pesos e rendimentos dos exemplos são ILUSTRATIVOS e vêm rotulados assim.
 */
const post: Post = {
  slug: 'cmv-hamburgueria',
  titulo: 'CMV de hamburgueria: custo do hambúrguer e margem ideal',
  tituloMeta: 'CMV de hamburgueria: custo do hambúrguer e margem',
  descricao: 'Calcule o CMV de hamburgueria: ficha técnica do hambúrguer, custo do blend, do combo e do delivery. Com exemplo passo a passo e calculadora.',
  resumo: 'O CMV da hamburgueria se decide no blend, no pão, no queijo e na batata do combo. Veja a ficha técnica, a conta do delivery e a calculadora.',
  palavraChave: 'cmv hamburgueria',
  secundarias: ['sistema para hamburgueria', 'como abrir hamburgueria', 'ficha técnica hambúrguer', 'precificação hambúrguer', 'custo do hambúrguer artesanal', 'margem de lucro de hamburgueria', 'como precificar hambúrguer', 'combo hambúrguer'],
  tipo: 'nicho',
  categoria: 'Por tipo de cozinha',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'bars',
    etiqueta: 'CMV · HAMBURGUERIA',
    itens: [
      { rotulo: 'Blend (% do custo)', valor: 47 },
      { rotulo: 'Pão (%)', valor: 16 },
      { rotulo: 'Queijo (%)', valor: 13 },
      { rotulo: 'Bacon (%)', valor: 12 },
    ],
  },
  relacionados: ['sistema-para-restaurante', 'taxa-do-ifood', 'como-calcular-cmv-restaurante', 'custo-da-pizza-pizzaria'],
  cta: { principal: { tipo: 'teste', variante: 'numero' }, secundario: { tipo: 'recurso', id: 'guia-lucro-por-pedido-ifood' } },
  fontes: [
    { rotulo: 'iFood, página oficial de planos para restaurantes (consultada em 21/10/2026)', url: 'https://parceiros.ifood.com.br/restaurante/planos-ifood' },
    { rotulo: 'iFood para Parceiros: Taxas do iFood (atualizado em 15/09/2026; valores vigentes em 23/06/2026)', url: 'https://blog-parceiros.ifood.com.br/taxas-ifood/' },
  ],
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Onde se decide:** o CMV da hamburgueria nasce em quatro itens (blend, pão, queijo/bacon e batata) e no combo, onde a batata e a bebida mexem na margem do pedido.',
        '**Ficha técnica:** o blend encolhe ao grelhar. Calcule o custo pelo peso **cru**, não pelo peso que vai no pão.',
        '**Combo:** ele tende a deixar mais reais no caixa, mas o CMV em percentual pode piorar. Confira os dois números.',
        '**Delivery:** a comissão (12% no Plano Básico, 23% no Plano Entrega, mais 3,2% de pagamento online, conferido em 21/10/2026) e a embalagem pesam mais que no balcão.',
        '**Referência:** muita gente usa 28% a 35% como CMV de partida. Varia por cozinha, por praça e por canal.',
      ],
    },
    {
      t: 'p',
      texto:
        'O **CMV de uma hamburgueria** é o custo da comida que você vendeu, dividido pelo faturamento. Na hamburgueria ele depende de poucos itens, e isso ajuda: dá para controlar cada um deles.',
    },
    {
      t: 'p',
      texto: 'Neste guia você vê a ficha técnica do hambúrguer, o custo de cada ingrediente, a conta do combo e o efeito do delivery. Os números são **exemplos ilustrativos**: troque pelos seus na calculadora.',
    },

    { t: 'h2', texto: 'O que é o CMV de hamburgueria e onde ele se decide?' },
    {
      t: 'p',
      texto:
        'O CMV (custo da mercadoria vendida) mostra quanto de cada R$ 100 vendidos foi gasto só com a comida e a embalagem. Numa hamburgueria, quatro itens carregam quase todo o custo: o **blend de carne**, o **pão**, o **queijo e o bacon** e a **batata** do acompanhamento.',
    },
    {
      t: 'p',
      texto:
        'Existe o CMV de **cada produto** (quanto custa um burger) e o CMV **do mês** (quanto saiu de estoque e compra em relação ao que você vendeu). Os dois contam histórias diferentes. Se você ainda não faz a conta mensal, comece por [como calcular o CMV do restaurante](/blog/como-calcular-cmv-restaurante).',
    },
    {
      t: 'p',
      texto:
        'Quem está vendo **como abrir uma hamburgueria** costuma olhar primeiro o ponto, o equipamento e o cardápio. Olhe também a ficha técnica: ela é a base do preço que você vai cobrar desde o primeiro dia.',
    },

    { t: 'h2', texto: 'Quanto custa fazer um hambúrguer artesanal?' },
    {
      t: 'p',
      texto:
        'Somando os ingredientes do exemplo abaixo, o burger sai por **R$ 13,64 de insumos** mais R$ 1,90 de embalagem. É uma conta que você refaz com a sua nota de compra: preço do quilo ou do pacote, dividido pelo que vai em cada unidade.',
    },
    {
      t: 'exemplo',
      titulo: 'Custo de um burger com bacon (exemplo ilustrativo)',
      linhas: [
        { rotulo: 'Pão brioche (R$ 2,10, com 2% de perda)', valor: 'R$ 2,14' },
        { rotulo: 'Blend: 200 g crus a R$ 32/kg (vira ~160 g prontos)', valor: 'R$ 6,40' },
        { rotulo: 'Queijo cheddar (2 fatias)', valor: 'R$ 1,80' },
        { rotulo: 'Bacon (30 g, com 5% de perda)', valor: 'R$ 1,58' },
        { rotulo: 'Molho da casa', valor: 'R$ 0,90' },
        { rotulo: 'Alface e tomate (com 15% de perda)', valor: 'R$ 0,82' },
        { rotulo: 'Custo dos insumos do burger', valor: 'R$ 13,64', destaque: true },
      ],
      conclusao: 'Vendido a **R$ 39,90**, o burger tem CMV de insumos de **34,2%** (13,64 ÷ 39,90) e deixa R$ 26,26 antes da embalagem. Os preços de compra são hipóteses do exemplo.',
    },
    {
      t: 'tabela',
      cabecalho: ['Item', 'Custo', '% do custo do burger'],
      linhas: [
        ['Blend de carne', 'R$ 6,40', '47%'],
        ['Pão brioche', 'R$ 2,14', '16%'],
        ['Queijo cheddar', 'R$ 1,80', '13%'],
        ['Bacon', 'R$ 1,58', '12%'],
        ['Molho da casa', 'R$ 0,90', '7%'],
        ['Alface e tomate', 'R$ 0,82', '5%'],
        ['Total de insumos', 'R$ 13,64', '100%'],
      ],
      ultimaEmDestaque: true,
      legenda: 'Percentuais arredondados. Embalagem (R$ 1,90 no exemplo) fica fora desta divisão.',
      fonte: 'Valores ilustrativos, calculados para este artigo.',
    },
    {
      t: 'p',
      texto: 'O mesmo custo, visto em barra, deixa clara a proporção de cada item.',
    },
    {
      t: 'grafico',
      tipo: 'empilhada',
      titulo: 'De que é feito o custo de um burger',
      subtitulo: 'Exemplo ilustrativo. Em % do custo dos insumos, sem a embalagem.',
      partes: [
        { rotulo: 'Blend (% do custo)', valor: 47, tom: 'telha' },
        { rotulo: 'Pão (%)', valor: 16, tom: 'sol' },
        { rotulo: 'Queijo (%)', valor: 13, tom: 'mar' },
        { rotulo: 'Bacon (%)', valor: 12, tom: 'mata' },
        { rotulo: 'Molho', valor: 7, tom: 'areia' },
        { rotulo: 'Vegetais', valor: 5, tom: 'cinza' },
      ],
      formato: 'pct',
      fonte: 'Valores ilustrativos. Na sua cozinha o blend e o pão tendem a ser os dois maiores itens, mas confira na sua nota de compra.',
    },
    {
      t: 'p',
      texto:
        'Repare: quase metade do custo está na carne. Um aumento de 10% no preço do blend pesa muito mais que o mesmo aumento no molho. Por isso vale negociar e acompanhar primeiro o item que mais pesa.',
    },

    { t: 'h2', texto: 'Por que o blend encolhe e como isso entra na ficha técnica?' },
    {
      t: 'p',
      texto:
        'O blend perde água e gordura na chapa, então **o hambúrguer cozido pesa menos que o cru**. A ficha técnica precisa partir do peso cru, que é o que você comprou, e registrar o rendimento depois de grelhar.',
    },
    {
      t: 'p',
      texto:
        'No exemplo, 200 g crus viram cerca de 160 g prontos, um rendimento de 80%. Esse número é só ilustrativo: ele muda com a gordura do blend, a chapa e o ponto da carne. Pese os seus.',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Pese o blend cru e cozido', texto: 'Faça isso com 5 a 10 hambúrgueres, no ponto que você serve. Tire a média.' },
        { titulo: 'Calcule o rendimento', texto: 'Peso cozido dividido pelo peso cru. Se 200 g viram 160 g, o rendimento é 80%.' },
        { titulo: 'Defina o peso cru por unidade', texto: 'Para servir 160 g prontos, separe 200 g crus. Esse peso cru é o que entra na ficha.' },
        { titulo: 'Liste cada ingrediente com a perda', texto: 'Pão, bacon e vegetais também perdem: ponta do pão, gordura do bacon, folhas descartadas. Registre a perda de cada um.' },
        { titulo: 'Some e compare com o preço', texto: 'Custo total dividido pelo preço de venda dá o CMV do produto. Refaça quando o fornecedor reajustar.' },
      ],
    },
    {
      t: 'nota',
      tom: 'dica',
      rotulo: 'Dica de cozinha',
      texto: 'Pese o blend na porção toda vez que montar a primeira leva do dia. Se a bolinha sai 10 g maior, no fim do mês isso vira quilos de carne que você pagou e não cobrou.',
    },

    { t: 'h2', texto: 'Use a calculadora com o seu hambúrguer' },
    {
      t: 'p',
      texto:
        'A calculadora abaixo já vem com um hambúrguer de exemplo, incluindo a batata. Troque os ingredientes, as perdas, o preço e a embalagem, e veja o CMV e o preço sugerido para a margem que você quer. Os valores iniciais são **ilustrativos**.',
    },
    { t: 'widget', id: 'custo-prato', preset: 'hamburguer' },
    { t: 'cta', cta: { tipo: 'teste', variante: 'comparacao' } },

    { t: 'h2', texto: 'Como precificar combo e adicionais sem perder margem?' },
    {
      t: 'p',
      texto:
        'Calcule o combo como um produto novo, com ficha técnica própria. Somar o burger, a batata e a bebida pelo preço de cada um e dar um desconto no olho é o jeito mais comum de errar o preço.',
    },
    {
      t: 'exemplo',
      titulo: 'Burger sozinho × combo (exemplo ilustrativo)',
      linhas: [
        { rotulo: 'Burger: preço R$ 39,90, insumos R$ 13,64', valor: 'CMV 34,2% · sobra R$ 26,26' },
        { rotulo: 'Batata (porção, com perda)', valor: '+ R$ 2,89' },
        { rotulo: 'Refrigerante lata', valor: '+ R$ 3,00' },
        { rotulo: 'Combo: preço R$ 54,90, insumos R$ 19,53', valor: 'CMV 35,6% · sobra R$ 35,37', destaque: true },
      ],
      conclusao: 'O combo deixa **R$ 9,11 a mais** no caixa por pedido, mesmo com o CMV subindo 1,4 ponto percentual. Em reais ele ganha, em percentual ele perde. Por isso olhe os dois.',
    },
    {
      t: 'p',
      texto:
        'Os adicionais seguem a mesma lógica. Um bacon extra de 30 g tem custo de R$ 1,58 no exemplo; vendido a R$ 6,00, o custo cai para 26% do preço. Um queijo extra, com uma fatia a R$ 0,90, vendido a R$ 4,00, fica em 23%. Esses preços são **hipóteses** para mostrar a conta.',
    },
    {
      t: 'p',
      texto:
        'Costuma valer a pena conferir se o adicional tem margem melhor que o burger, porque o pão, o molho e a mão de obra já foram pagos. Mas confirme na sua ficha: só o seu custo e o seu preço dizem se isso vale para você.',
    },

    { t: 'h2', texto: 'Quanto o delivery muda a conta do hambúrguer?' },
    {
      t: 'p',
      texto:
        'Muito. Hamburgueria vende bastante por app, e cada pedido pago pelo iFood paga comissão, taxa de pagamento online e uma embalagem mais cara que a do balcão.',
    },
    {
      t: 'p',
      texto:
        'Conferido em 21/10/2026 nas páginas oficiais do iFood: **Plano Básico, 12% de comissão; Plano Entrega, 23%; e 3,2% de taxa de pagamento online** nos dois. Para a conta completa e a mensalidade, veja a [taxa do iFood](/blog/taxa-do-ifood). A taxa vigente da sua loja está no Portal do Parceiro.',
    },
    {
      t: 'grafico',
      tipo: 'barras',
      titulo: 'O que sobra do mesmo combo de R$ 54,90, por canal',
      subtitulo: 'Exemplo ilustrativo: insumos de R$ 19,53, embalagem de R$ 2,50 nos pedidos de app. Antes de imposto, entrega própria, aluguel e folha.',
      dados: [
        { rotulo: 'Balcão', valor: 35.37, destaque: true, nota: 'sem taxa de app' },
        { rotulo: 'Plano Básico', valor: 24.53, nota: 'comissão 12% + 3,2%' },
        { rotulo: 'Plano Entrega', valor: 18.49, nota: 'comissão 23% + 3,2%' },
      ],
      formato: 'brl',
      fonte: 'Taxas: iFood (21/10/2026). Preço, insumos e embalagem são hipóteses do exemplo, com o mesmo preço nos três canais.',
    },
    {
      t: 'comparacao',
      colA: 'Balcão',
      colB: 'Delivery por app',
      linhas: [
        { dim: 'Taxa sobre a venda', a: 'Nenhuma (fora a maquininha)', b: '15,2% ou 26,2% do pedido pago pelo app', aOk: true, bOk: false },
        { dim: 'Embalagem', a: 'Quase nenhuma', b: 'Caixa, saco, descartáveis e sachês', aOk: true, bOk: false },
        { dim: 'Qualidade na mesa', a: 'O burger chega na hora', b: 'Viaja de moto: pesa pão, molho e batata' },
        { dim: 'Alcance', a: 'Quem passa na porta', b: 'Bairro inteiro, cliente novo', aOk: false, bOk: true },
        { dim: 'Preço que costuma funcionar', a: 'Tabela do salão', b: 'Muita gente cobra mais no app para cobrir a taxa. Teste', },
      ],
    },
    {
      t: 'p',
      texto:
        'Isso não é um argumento contra o app. É um argumento para ter **uma ficha e um preço por canal**. Para a conta de um pedido, entenda também [quanto sobra por pedido no iFood](/blog/taxa-do-ifood).',
    },
    { t: 'cartao-link', slug: 'taxa-do-ifood', rotulo: 'Para a conta completa do app' },

    { t: 'h2', texto: 'Onde o CMV da hamburgueria vaza?' },
    {
      t: 'p',
      texto:
        'O vazamento raramente está no preço do blend. Está em coisas pequenas que se repetem todo dia e não aparecem em lugar nenhum. Estes quatro costumam aparecer.',
    },
    {
      t: 'erros',
      itens: [
        { titulo: 'Porção maior que a da ficha', texto: 'A bolinha de 210 g em vez de 200 g, o bacon “a olho”, o queijo em três fatias. Cada pequena folga se multiplica por todos os pedidos.' },
        { titulo: 'Desperdício de pão e batata', texto: 'Pão que passa do prazo e batata frita que sobra na fritadeira. Meça a sobra do dia e ajuste a produção.' },
        { titulo: 'Compra de carne sem lançar', texto: 'Se a nota do açougue não entra no sistema, o CMV do mês fica calculado em cima de estoque no chute.' },
        { titulo: 'Preço velho na ficha', texto: 'O fornecedor reajustou e a ficha continua com o preço de três meses atrás. O CMV que você acha que tem não é o que tem.' },
      ],
    },
    {
      t: 'p',
      texto:
        'A solução é lançar as compras assim que chegam e comparar, no fim do mês, o que você gastou com o que vendeu. Se o número do mês for pior que a soma das fichas, a diferença é desperdício, porção ou compra sem controle.',
    },
    {
      t: 'print',
      src: '/landing/compras.webp',
      alt: 'Tela de compras do Tá no Caixa, com notas de fornecedores lançadas',
      url: 'app.tanocaixa.com/painel/compras',
      legenda: 'No Tá no Caixa, a compra entra pela foto da nota e fica separada por fornecedor, para você comparar com o que vendeu.',
    },

    { t: 'h2', texto: 'O que um sistema para hamburgueria resolve, e o que fica de fora?' },
    {
      t: 'p',
      texto:
        'Quando alguém busca **sistema para hamburgueria**, quase sempre quer um PDV: lançar o pedido, mandar para a chapa, controlar o delivery e emitir a nota. Esse é o trabalho dele, e ele faz bem.',
    },
    {
      t: 'p',
      texto:
        'O que ele não costuma responder é a pergunta do dono no fim do mês: **quanto sobrou?** Entra o faturamento, mas falta juntar compra, despesa, taxa de app e imposto numa conta só. Isso é a camada financeira, e ela convive com o PDV, não o substitui.',
    },
    {
      t: 'p',
      texto:
        'O Tá no Caixa é essa camada: mostra o que entrou por canal, o que saiu e o que sobrou, além do ponto de equilíbrio, e lê a nota fiscal por foto. Ele **não é PDV nem cardápio digital**. O CMV por ficha técnica e a integração automática com iFood e outros apps estão **em breve**; hoje o lançamento do dia é feito por você, em um minuto.',
    },
    {
      t: 'p',
      texto:
        'Se você está comparando opções de PDV, veja o guia de [sistema para restaurante](/blog/sistema-para-restaurante), com a tabela de preços e o que cada tipo de sistema entrega. E para saber quanto você precisa vender no mês para fechar a conta, leia sobre o [ponto de equilíbrio do restaurante](/blog/ponto-de-equilibrio-restaurante).',
    },

    { t: 'h2', texto: 'Perguntas frequentes sobre CMV de hamburgueria' },
    {
      t: 'faq',
      itens: [
        { p: 'Qual o CMV ideal de uma hamburgueria?', r: 'Não existe um número único. **Muita gente usa 28% a 35% como referência de partida**, mas varia por cozinha, praça e canal. O seu CMV ideal é o que ainda deixa sobra depois de taxa de app, imposto, aluguel e folha. Calcule o do balcão e o do delivery separados.' },
        { p: 'Quanto custa fazer um hambúrguer artesanal?', r: 'Depende do seu blend, do pão e do tamanho. No exemplo deste guia, os insumos de um burger com bacon somam **R$ 13,64** (valores ilustrativos), com quase metade no blend. Pese e some os seus ingredientes na ficha técnica.' },
        { p: 'Como precificar um combo de hambúrguer?', r: 'Faça uma ficha técnica do combo: burger, batata, bebida e embalagem. Some o custo e divida pelo preço para ver o CMV. Confira o CMV em percentual e o que sobra em reais, porque o combo pode ganhar em um e perder no outro.' },
        { p: 'Como calcular a ficha técnica do hambúrguer?', r: 'Parta do peso cru de cada ingrediente, aplique a perda de cada um e multiplique pelo preço de compra. No blend, use o peso cru, não o cozido, porque ele encolhe na chapa. Some tudo e divida pelo preço de venda.' },
        { p: 'Quanto custa um sistema para hamburgueria?', r: 'Varia bastante entre PDVs, por módulo e por número de caixas. A tabela com preços conferidos está no guia de [sistema para restaurante](/blog/sistema-para-restaurante). O Tá no Caixa, que não é PDV, custa **R$ 149 por loja por mês** (de R$ 249, preço de lançamento), com 14 dias grátis sem cartão.' },
        { p: 'Como abrir uma hamburgueria sem errar no preço?', r: 'Monte a ficha técnica de cada item antes de fechar o cardápio, inclua a embalagem de delivery e a taxa do app, e calcule o preço que cobre tudo isso. Depois acompanhe o CMV do mês e ajuste. Para impostos e abertura da empresa, fale com seu contador.' },
      ],
    },
  ],
}

export default post
