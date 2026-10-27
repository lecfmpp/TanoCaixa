import type { Post } from '../tipos'

/**
 * Pilar · palavra-chave: sistema para restaurante (1.600/mês) + melhor sistema para restaurante (140).
 * Preços de terceiros: páginas oficiais raspadas em 21/10/2026 (blog/research/competidores-raw/).
 * Consumer e Cardápio Web: valores sob consulta, por isso ficam fora do gráfico.
 */
const post: Post = {
  slug: 'sistema-para-restaurante',
  titulo: 'Sistema para restaurante: como escolher e quanto custa (2026)',
  tituloMeta: 'Sistema para restaurante: como escolher e quanto custa',
  descricao: 'Sistema para restaurante: veja os 3 tipos (PDV, cardápio/delivery e financeiro), preços datados de 8 opções e como escolher em 6 passos.',
  resumo: 'Sistema para restaurante são três coisas: PDV, cardápio/delivery e financeiro. Veja o que cada um resolve, os preços conferidos e como escolher.',
  palavraChave: 'sistema para restaurante',
  secundarias: ['melhor sistema para restaurante', 'sistema de gestão para restaurante', 'quanto custa um sistema para restaurante', 'sistema para restaurante grátis', 'sistema para delivery'],
  tipo: 'pilar',
  categoria: 'Comparativos',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'steps',
    etiqueta: 'GUIA · 3 CAMADAS',
    itens: [
      { rotulo: 'PDV e gestão' },
      { rotulo: 'Cardápio e delivery' },
      { rotulo: 'Quanto sobrou' },
    ],
  },
  relacionados: ['taxa-do-ifood', 'comparativo-saipos-anota-ai-goomer-consumer', 'como-calcular-cmv-restaurante'],
  cta: { principal: { tipo: 'recurso', id: 'checklist-escolher-sistema-restaurante' }, secundario: { tipo: 'teste', variante: 'painel' } },
  fontes: [
    { rotulo: 'Saipos, planos e preços (conferido em 21/10/2026)', url: 'https://saipos.com/planos-e-precos' },
    { rotulo: 'Goomer, planos (conferido em 21/10/2026)', url: 'https://goomer.com.br/planos' },
    { rotulo: 'Anota AI, planos (conferido em 21/10/2026)', url: 'https://anota.ai/' },
    { rotulo: 'Brendi, planos (conferido em 21/10/2026)', url: 'https://brendi.com.br/planos' },
    { rotulo: 'GrandChef, planos e adesão (conferido em 21/10/2026)', url: 'https://www.grandchef.com.br/adesao' },
    { rotulo: 'OlaClick, planos (conferido em 21/10/2026)', url: 'https://pricing.olaclick.app/pt' },
  ],
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Três coisas diferentes:** "sistema para restaurante" pode ser PDV e gestão da operação, cardápio digital com delivery, ou controle financeiro. Quase ninguém precisa de só um.',
        '**Preço de entrada:** de R$ 0 (planos grátis com limite) a R$ 240,79 por mês nas páginas oficiais conferidas, mas o total real depende de módulos, taxas e número de pedidos.',
        '**Cuidado com o que não aparece:** fidelidade, taxa por pedido pago online, módulo cobrado à parte e preço depois da promoção.',
        '**Como escolher:** comece pela dor (pedido, nota fiscal ou saber quanto sobrou), peça teste grátis e confira o preço de saída antes de migrar os dados.',
        '**Onde o Tá no Caixa entra:** ele não é PDV nem cardápio digital. Mostra quanto sobrou, por R$ 149 por loja ao mês. Conferido em 21/10/2026.',
      ],
    },
    {
      t: 'p',
      texto: 'O melhor **sistema para restaurante** é o que resolve a sua maior dor hoje e custa menos do que ela. Não existe um campeão para todo mundo, porque o termo reúne ferramentas que fazem trabalhos bem diferentes.',
    },
    {
      t: 'p',
      texto: 'Este guia separa as três categorias, mostra o que cada uma custa com data de consulta, lista os erros que mais pesam no bolso e termina com um passo a passo de escolha. Sem ranking de "o número 1", porque isso depende da sua cozinha.',
    },

    { t: 'h2', texto: 'O que é um sistema para restaurante, afinal?' },
    {
      t: 'p',
      texto: 'É qualquer software que tira uma parte da operação do papel e do caderno. Na prática, o mercado vende **três tipos de ferramenta** sob o mesmo nome, e misturá-las é o erro mais comum de quem compara preço.',
    },
    {
      t: 'tabela',
      cabecalho: ['', 'PDV e gestão da operação', 'Cardápio digital e delivery', 'Gestão financeira'],
      linhas: [
        ['Pergunta que responde', 'Como registro e entrego o pedido?', 'Como o cliente pede sem ligar?', 'Quanto entrou, saiu e sobrou?'],
        ['O que faz', 'Comanda, caixa, nota fiscal, estoque, cozinha (KDS)', 'Cardápio por link ou QR Code, pedidos por WhatsApp e site', 'Entradas por canal, despesas, notas, DRE, meta do mês'],
        ['Quem usa no dia a dia', 'Garçom, caixa, cozinha', 'Cliente e atendente', 'Dono e gerente'],
        ['Exemplos no mercado', 'Saipos, Consumer, GrandChef', 'Goomer, Anota AI, Brendi, OlaClick', 'Tá no Caixa'],
      ],
      legenda: 'Muitos produtos misturam categorias: um PDV pode ter módulo financeiro, e um cardápio pode ter gestor de pedidos. A coluna mostra o foco principal.',
    },
    {
      t: 'p',
      texto: 'Repare que as três perguntas são diferentes. Um PDV excelente pode te dizer que você vendeu R$ 80 mil no mês e não dizer quanto sobrou depois de insumo, aluguel, folha e taxa de app. Esse buraco é o da terceira coluna.',
    },

    { t: 'h2', texto: 'O que é PDV em restaurante e você precisa de um?' },
    {
      t: 'p',
      texto: 'PDV é o **ponto de venda**: o sistema onde você lança o pedido, fecha a conta e, quando exigido, emite a nota fiscal. Se você vende no balcão, no salão ou tem obrigação fiscal, vai precisar de um.',
    },
    {
      t: 'p',
      texto: 'Quem só vende por delivery em app e WhatsApp pode começar com um gestor de pedidos mais simples. Quem tem mesa e comanda, não. Sem PDV, a comanda vira papel, o erro vira desconto e o caixa vira palpite.',
    },
    {
      t: 'p',
      texto: 'Nota fiscal e regime de imposto são assunto do seu contador. Pergunte a ele qual módulo fiscal você precisa antes de contratar, porque alguns sistemas cobram esse módulo à parte.',
    },

    { t: 'h2', texto: 'Quanto custa um sistema para restaurante em 2026?' },
    {
      t: 'p',
      texto: 'Nas páginas oficiais conferidas, o preço de entrada vai de **R$ 0 a R$ 240,79 por mês**, mas o valor final quase nunca é o da vitrine. Veja o que cada fabricante publica.',
    },
    {
      t: 'tabela',
      cabecalho: ['Produto', 'Tipo principal', 'Preço público', 'Teste'],
      linhas: [
        ['Saipos', 'Gestão completa / PDV', 'A partir de R$ 240,79/mês (plano mensal); anual sob demonstração', 'Demonstração gratuita'],
        ['Goomer', 'Cardápio e delivery', 'Grátis (até 30 pedidos/mês, R$ 1,39 por pedido excedente); R$ 99,90, R$ 184,90 ou R$ 299,90/mês', 'Plano grátis'],
        ['Anota AI', 'Cardápio e atendimento', 'R$ 99,99 (até 150 pedidos/mês), R$ 199,99 (151 a 250) ou R$ 299,99 (acima); mais taxas de pagamento online', '7 dias'],
        ['Brendi', 'Cardápio e delivery', 'A partir de R$ 120/mês, varia com o faturamento; Pix R$ 0,40 + 0,5% por pedido', '15 dias, sem cartão'],
        ['GrandChef', 'PDV e delivery', 'Mensal R$ 90 (adesão R$ 100); semestral R$ 420; anual R$ 810; NFC-e e Delivery Online aparecem como módulos', 'Teste grátis'],
        ['OlaClick', 'Delivery e WhatsApp', 'Advanced R$ 64, Premium R$ 157, Elite R$ 247 ou Impulso R$ 825/mês (valores da página, com plano anual)', 'Grátis para começar'],
        ['Consumer', 'PDV e delivery', 'Valores dos planos pagos sob consulta; anuncia versão gratuita', '7 dias'],
        ['Tá no Caixa', 'Gestão financeira', 'R$ 149 por loja/mês (de R$ 249, preço de lançamento)', '14 dias, sem cartão'],
      ],
      destaqueColuna: 2,
      legenda: 'Preços e condições mudam. Confirme na página do fabricante antes de decidir. Cardápio Web publica planos sob consulta.',
      fonte: 'Fonte: páginas oficiais de cada produto, listadas ao fim do texto. Conferido em 21/10/2026.',
    },
    {
      t: 'p',
      texto: 'Comparar só a primeira coluna de preço engana. Um plano de R$ 99 que cobra por pedido excedente, ou um de R$ 90 com módulos extras, pode sair mais caro que um de R$ 150 fechado. Por isso o gráfico abaixo mostra apenas o **preço de entrada**.',
    },
    {
      t: 'grafico',
      tipo: 'barras',
      titulo: 'Preço de entrada por mês, nas páginas oficiais',
      subtitulo: 'Em R$ por mês. "A partir de" ou mínimo publicado; não inclui módulos, taxas por pedido nem adesão.',
      dados: [
        { rotulo: 'Saipos', valor: 240.79, nota: 'plano mensal, a partir de' },
        { rotulo: 'Tá no Caixa', valor: 149, destaque: true, nota: 'por loja; financeiro, não PDV' },
        { rotulo: 'Brendi', valor: 120, nota: 'mínimo, varia com faturamento' },
        { rotulo: 'Anota AI', valor: 99.99, nota: 'até 150 pedidos/mês' },
        { rotulo: 'Goomer Básico', valor: 99.9, nota: 'existe plano grátis limitado' },
        { rotulo: 'GrandChef', valor: 90, nota: 'mensal, mais adesão de R$ 100' },
        { rotulo: 'OlaClick Advanced', valor: 64, nota: 'valor do plano anual' },
      ],
      formato: 'brl',
      fonte: 'Páginas oficiais de cada produto. Conferido em 21/10/2026.',
    },
    {
      t: 'nota',
      tom: 'alerta',
      rotulo: 'Compare o mesmo serviço',
      texto: 'Os produtos acima não fazem a mesma coisa. Uma barra menor não quer dizer sistema mais barato para o seu caso: quer dizer que ele faz menos, ou que cobra o resto em outro lugar.',
    },

    { t: 'h2', texto: 'Existe sistema para restaurante grátis que preste?' },
    {
      t: 'p',
      texto: 'Existe, e serve para começar, desde que você conheça o limite. Entre os produtos conferidos, o **plano grátis da Goomer** vai até 30 pedidos por mês e cobra R$ 1,39 por pedido acima disso. O Consumer anuncia uma versão gratuita, com valores dos planos pagos sob consulta.',
    },
    {
      t: 'p',
      texto: 'O grátis costuma ser um período de teste prolongado: ele funciona até o seu movimento crescer. Calcule o custo no mês mais cheio, não no mais fraco, porque é nele que você vai estar dependendo do sistema.',
    },
    {
      t: 'p',
      texto: 'Planilha também é sistema, e funciona para quem tem uma loja pequena e disciplina. O problema é a nota que se perde, a fórmula que quebra e o número que chega no dia 20. Se for ficar na planilha, comece calculando o [ponto de equilíbrio do restaurante](/blog/ponto-de-equilibrio-restaurante).',
    },

    { t: 'h2', texto: 'Qual PDV é o mais barato?' },
    {
      t: 'p',
      texto: 'Nas páginas conferidas, o **GrandChef** tem o plano mensal mais baixo entre os que vendem PDV: R$ 90 por mês, mais R$ 100 de adesão. O Saipos começa em R$ 240,79 no plano mensal, com mais recursos de gestão incluídos.',
    },
    {
      t: 'p',
      texto: 'Barato é uma conta de três linhas: mensalidade, módulos que você realmente usa e taxas por pedido. Some as três para o seu movimento antes de comparar. Se a diferença de preço é pequena, escolha pelo suporte e pela facilidade de sair.',
    },

    {
      t: 'comparacao',
      colA: 'PDV e cardápio',
      colB: 'Tá no Caixa',
      linhas: [
        { dim: 'Foco', a: 'O pedido: comanda, cardápio, entrega, nota fiscal', b: 'O dinheiro: entrou, saiu, sobrou' },
        { dim: 'Quem opera', a: 'Salão, caixa, cozinha e cliente', b: 'Dono e gerente' },
        { dim: 'Responde "quanto sobrou no mês?"', a: 'Em geral, só com módulo financeiro ou planilha', b: 'Sim, é o centro do produto', bOk: true },
        { dim: 'Registra pedido e emite nota fiscal', a: 'Sim (PDV)', b: 'Não. PDV está em breve', aOk: true, bOk: false },
        { dim: 'Lançamento por canal (Pix, cartão, dinheiro, apps)', a: 'Depende do produto', b: 'Sim, fechamento do dia por canal' },
      ],
    },

    { t: 'h2', texto: 'Como escolher um sistema para restaurante em 6 passos?' },
    {
      t: 'p',
      texto: 'Escolha pela **dor mais cara**, não pela lista de recursos. Siga os seis passos abaixo, na ordem.',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Escreva a sua maior dor', texto: 'Pedido errado, fila no caixa, nota fiscal, ou não saber quanto sobrou? Uma frase só. Ela define a categoria.' },
        { titulo: 'Liste os canais em que você vende', texto: 'Salão, balcão, WhatsApp, site, iFood. Sistema que não cobre o seu canal principal vira planilha extra.' },
        { titulo: 'Peça o preço completo, por escrito', texto: 'Mensalidade, adesão, módulo fiscal, taxa por pedido, usuário extra. Pergunte também quanto custa depois da promoção.' },
        { titulo: 'Teste com a sua operação real', texto: 'Use os dias grátis num turno de verdade, com a sua equipe. Demonstração de vendedor não conta como teste.' },
        { titulo: 'Confira a saída', texto: 'Pode exportar seus dados? Há fidelidade? Qual o aviso para cancelar? Escolha sabendo como se sai.' },
        { titulo: 'Decida com um contador por perto', texto: 'Nota fiscal e imposto são com ele. Mostre a ele a lista de módulos antes de assinar.' },
      ],
    },
    {
      t: 'p',
      texto: 'Se quiser levar isso pronto para a reunião com o vendedor, o checklist que indicamos no fim do texto traz as perguntas em forma de lista.',
    },
    {
      t: 'checklist',
      titulo: 'Perguntas rápidas antes de assinar',
      itens: [
        'Qual é o valor total no mês mais cheio, com módulos e taxas?',
        'Quanto custa depois do período promocional?',
        'Existe fidelidade ou multa para cancelar?',
        'Cobra por pedido, por usuário ou por loja?',
        'Consigo exportar meus dados se eu sair?',
        'O suporte atende no horário em que eu trabalho?',
        'Ele mostra quanto sobrou, ou só quanto vendi?',
      ],
    },
    { t: 'cta', cta: { tipo: 'teste', variante: 'comparacao' } },

    { t: 'h2', texto: 'Quais erros custam caro na hora de contratar?' },
    {
      t: 'p',
      texto: 'Quase todo arrependimento vem de uma destas quatro armadilhas. Nenhuma aparece no preço da vitrine.',
    },
    {
      t: 'erros',
      itens: [
        { titulo: 'Assinar com fidelidade sem testar', texto: 'Contrato longo com sistema que a equipe não usa é mensalidade perdida. Teste antes e pergunte a multa de saída.' },
        { titulo: 'Esquecer a taxa por pedido', texto: 'Alguns cobram por pedido excedente ou sobre pagamento online. Em mês cheio, a taxa passa da mensalidade.' },
        { titulo: 'Descobrir o módulo extra depois', texto: 'Nota fiscal, delivery próprio e QR Code aparecem como módulos em páginas de preço. Pergunte o que está incluído.' },
        { titulo: 'Ignorar a migração dos dados', texto: 'Trocar de sistema com cardápio, clientes e histórico presos dá trabalho. Veja a exportação antes de entrar.' },
      ],
    },
    {
      t: 'p',
      texto: 'Existe uma quinta armadilha, menos falada: comprar um sistema excelente para o pedido e ficar sem resposta sobre o lucro. Quem vende bastante no iFood sente isso rápido, porque a venda cai com desconto de comissão. A conta está em [taxa do iFood](/blog/taxa-do-ifood).',
    },

    { t: 'h2', texto: 'Qual é o papel do controle financeiro no meio disso?' },
    {
      t: 'p',
      texto: 'O controle financeiro responde o que nenhum PDV responde sozinho: **quanto sobrou no fim do mês**. É a camada em que o Tá no Caixa atua. Ele não registra pedido nem emite nota; cuida do dinheiro depois que o pedido virou venda.',
    },
    {
      t: 'p',
      texto: 'Na prática, você lança o dia por canal (Pix, cartão, dinheiro e apps de delivery), fotografa a nota de compra e vê entrou, saiu e sobrou num painel. Para o custo do prato, o caminho hoje é [calcular o CMV do restaurante](/blog/como-calcular-cmv-restaurante); o CMV por ficha técnica dentro do produto está em breve.',
    },
    {
      t: 'print',
      src: '/landing/dashboard.webp',
      alt: 'Dashboard do Tá no Caixa com entrou, saiu, sobrou e ponto de equilíbrio',
      url: 'app.tanocaixa.com/painel',
      legenda: 'O painel mostra o que entrou, o que saiu e o que sobrou no mês, com o ponto de equilíbrio. Os números da tela são de uma loja de exemplo.',
    },
    {
      t: 'p',
      texto: 'O plano custa **R$ 149 por loja ao mês** (de R$ 249, preço de lançamento), com 14 dias grátis e sem cartão. A integração automática com iFood e outros apps também está em breve; hoje o lançamento dos apps é feito no fechamento do dia.',
    },
    { t: 'cartao-link', slug: 'comparativo-saipos-anota-ai-goomer-consumer', rotulo: 'Comparativo lado a lado' },

    { t: 'h2', texto: 'Qual sistema serve para delivery?' },
    {
      t: 'p',
      texto: 'Para **delivery**, você precisa de cardápio digital, gestor de pedidos e, se tem entrega própria, controle de entregadores. Cardápio por link e WhatsApp resolve a maioria dos casos pequenos.',
    },
    {
      t: 'p',
      texto: 'A pergunta financeira vem depois: cada canal tem uma comissão e uma margem diferente. Um mesmo prato pode render bem no balcão e pouco no app. Lance as vendas por canal desde o primeiro dia, senão a média esconde o canal que dá prejuízo.',
    },

    { t: 'h2', texto: 'Como decidir pelo tipo de negócio?' },
    {
      t: 'p',
      texto: 'O tipo de cozinha muda o peso de cada categoria. Use a lista como ponto de partida e leia o guia de custo do seu nicho.',
    },
    {
      t: 'ul',
      itens: [
        '**Pizzaria:** muita venda por telefone e app, custo de massa e borda. Comece por cardápio e delivery, e acompanhe o [custo da pizza](/blog/custo-da-pizza-pizzaria) para não vender abaixo da conta.',
        '**Hamburgueria:** combos, adicionais e embalagem. O foco é a ficha de cada lanche e o [CMV da hamburgueria](/blog/cmv-hamburgueria).',
        '**Lanchonete e bar:** salão com comanda e muitos itens pequenos. PDV com comanda costuma ser a prioridade.',
        '**Dark kitchen:** só delivery, vários apps, sem salão. Cardápio, gestor de pedidos e controle por canal pesam mais que PDV de balcão.',
        '**Cozinha japonesa:** o custo do peixe e a perda mandam. Veja o [CMV do restaurante japonês](/blog/cmv-restaurante-japones).',
        '**Cozinha árabe:** produção em lote, esfiha e kafta. Veja a [gestão financeira do restaurante árabe](/blog/gestao-financeira-restaurante-arabe).',
      ],
    },
    {
      t: 'p',
      texto: 'Em qualquer um desses casos, a regra é a mesma: uma ferramenta para o pedido, outra para o dinheiro, e o número final sempre no mesmo lugar.',
    },

    { t: 'h2', texto: 'Perguntas frequentes sobre sistema para restaurante' },
    {
      t: 'faq',
      itens: [
        { p: 'Qual é o melhor sistema gratuito para restaurante?', r: 'Depende do que você precisa. Entre os produtos conferidos em 21/10/2026, a Goomer tem plano grátis para cardápio (até 30 pedidos por mês) e o Consumer anuncia uma versão gratuita. Todo plano grátis tem limite; confira se ele cobre o seu movimento no mês cheio.' },
        { p: 'Qual o preço de um sistema para restaurante?', r: 'Nas páginas oficiais conferidas, os preços de entrada vão de R$ 0 (planos grátis com limite) a R$ 240,79 por mês (Saipos, plano mensal). O custo real soma módulos, adesão e taxas por pedido, então peça o valor total por escrito.' },
        { p: 'Qual PDV é o mais barato?', r: 'Entre os conferidos que vendem PDV, o GrandChef publica o plano mensal mais baixo: R$ 90 por mês, mais R$ 100 de adesão. Módulos como nota fiscal e delivery aparecem à parte, então some tudo antes de comparar.' },
        { p: 'O que é PDV em restaurante?', r: 'PDV é o ponto de venda: o sistema que registra o pedido, fecha a conta e, quando necessário, emite a nota fiscal. Ele cuida da operação do salão, do balcão e da entrega, mas não substitui o controle financeiro.' },
        { p: 'Preciso de PDV e de um controle financeiro separados?', r: 'Muitos donos usam os dois: o PDV registra o pedido e o controle financeiro mostra quanto sobrou. Alguns PDVs trazem módulo financeiro. O Tá no Caixa é só financeiro e não substitui o PDV.' },
        { p: 'Quanto custa o Tá no Caixa?', r: 'R$ 149 por loja ao mês (de R$ 249, preço de lançamento), com 14 dias grátis e sem cartão. PDV, CMV por ficha técnica e integração automática com iFood e outros apps estão em breve.' },
      ],
    },
  ],
}

export default post
