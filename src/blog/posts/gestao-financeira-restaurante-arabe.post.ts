import type { Post } from '../tipos'

/**
 * Nicho · palavra-chave: gestão de restaurante árabe / custo da esfiha.
 * Todos os custos, rendimentos e preços dos exemplos são ILUSTRATIVOS e vêm rotulados assim.
 * Única informação de terceiros: taxas do iFood (12% + 3,2% e 23% + 3,2%), conferidas em 21/10/2026
 * em `blog/research/ifood-oficial/` (ver `fontes`).
 */
const post: Post = {
  slug: 'gestao-financeira-restaurante-arabe',
  titulo: 'Restaurante árabe: custo da esfiha, CMV e lucro (guia do dono)',
  tituloMeta: 'Gestão de restaurante árabe: custo da esfiha e CMV',
  descricao: 'Custo da esfiha, CMV e lucro no restaurante árabe: calcule o lote de massa, o preço de cada item e o que sobra no balcão, no delivery e na encomenda.',
  resumo: 'Na esfiharia a conta é de volume e mix. Veja como calcular o custo da esfiha pelo lote de massa, o preço por item e onde o lucro escapa.',
  palavraChave: 'gestão de restaurante árabe',
  secundarias: ['custo da esfiha', 'cmv restaurante árabe', 'ficha técnica esfiha', 'margem de lucro esfiharia', 'preço da esfiha', 'sistema para esfiharia'],
  tipo: 'nicho',
  categoria: 'Por tipo de cozinha',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'steps',
    etiqueta: 'COZINHA ÁRABE · CUSTO',
    itens: [
      { rotulo: 'Lote de massa', valor: 36 },
      { rotulo: 'Por esfiha', valor: 2.78 },
      { rotulo: 'Preço (CMV 35%)', valor: 7.94 },
    ],
  },
  relacionados: ['sistema-para-restaurante', 'taxa-do-ifood', 'ponto-de-equilibrio-restaurante', 'como-calcular-cmv-restaurante'],
  cta: { principal: { tipo: 'recurso', id: 'checklist-fechamento-de-caixa' }, secundario: { tipo: 'teste', variante: 'painel' } },
  fontes: [
    { rotulo: 'iFood, página oficial de planos para restaurantes (consultada em 21/10/2026)', url: 'https://parceiros.ifood.com.br/restaurante/planos-ifood' },
    { rotulo: 'iFood para Parceiros: Taxas do iFood (atualizado em 15/09/2026; valores vigentes em 23/06/2026)', url: 'https://blog-parceiros.ifood.com.br/taxas-ifood/' },
  ],
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Conta de volume:** a gestão de restaurante árabe depende de muitos itens de preço baixo. Cada centavo de custo por esfiha se multiplica por centenas de unidades.',
        '**Custo da esfiha:** custo do lote de massa dividido pelas unidades que saem, mais recheio, forno, embalagem e perda. No exemplo deste guia, R$ 2,78 por unidade.',
        '**Preço:** divida o custo pelo CMV que você quer. Com CMV de 35%, a esfiha do exemplo sai por cerca de R$ 7,94.',
        '**Onde o lucro escapa:** forno sem rateio, massa que sobra, recheio que passa do ponto e venda por app sem conta por canal.',
        '**Hábito:** feche o caixa todo dia, por canal. É assim que você vê o que sobrou, e não só o que entrou.',
      ],
    },
    {
      t: 'p',
      texto:
        'A **gestão de restaurante árabe** tem uma particularidade: você produz quase tudo em casa (massa, pastas, recheios) e vende muitos itens pequenos. Esfiha, quibe, kafta e coalhada seca têm ticket baixo, então um erro de centavos vira prejuízo no fim do mês.',
    },
    {
      t: 'p',
      texto:
        'Este guia mostra a conta do custo da esfiha pelo lote, o preço de cada item, o efeito do mix e o fechamento do dia. Todos os números de custo são **exemplos ilustrativos**: troque pelos seus. Para entender o conceito por trás, veja como [calcular o CMV do restaurante](/blog/como-calcular-cmv-restaurante).',
    },

    { t: 'h2', texto: 'Quanto custa fazer uma esfiha?' },
    {
      t: 'p',
      texto:
        'O custo de uma esfiha é o **custo do lote de massa dividido pelas unidades**, somado ao recheio, ao rateio do forno, à embalagem e à perda. No exemplo abaixo, ela custa R$ 2,78. É a conta que a maioria das esfiharias não faz por escrito.',
    },
    {
      t: 'exemplo',
      titulo: 'Esfiha aberta de carne, conta pelo lote (valores ilustrativos)',
      linhas: [
        { rotulo: 'Custo do lote de massa (farinha, fermento, óleo, sal, açúcar)', valor: 'R$ 36,00' },
        { rotulo: 'Unidades que saem do lote', valor: '40' },
        { rotulo: 'Massa por esfiha (R$ 36,00 ÷ 40)', valor: 'R$ 0,90' },
        { rotulo: 'Recheio por esfiha (carne, tomate, cebola, temperos)', valor: '+ R$ 1,50' },
        { rotulo: 'Rateio de gás ou energia do forno', valor: '+ R$ 0,10' },
        { rotulo: 'Embalagem', valor: '+ R$ 0,15' },
        { rotulo: 'Perda de 5% (massa e recheio que sobram)', valor: '+ R$ 0,13' },
        { rotulo: 'Custo por esfiha', valor: 'R$ 2,78', destaque: true },
      ],
      conclusao: 'Para um CMV de 35%, o preço é R$ 2,78 ÷ 0,35 = **R$ 7,94**. Para 30%, **R$ 9,27**. Os valores do lote, do recheio e da perda são hipóteses do exemplo.',
    },
    {
      t: 'p',
      texto: 'Repare no tamanho de cada parte. O recheio pesa mais que a massa, mas o forno e a perda, que quase ninguém anota, somam perto de 10% do custo.',
    },
    {
      t: 'grafico',
      tipo: 'empilhada',
      titulo: 'De que é feito o custo de uma esfiha de R$ 2,78',
      subtitulo: 'Exemplo ilustrativo. Em % do custo por unidade.',
      partes: [
        { rotulo: 'Massa', valor: 32.4, tom: 'sol' },
        { rotulo: 'Recheio', valor: 53.9, tom: 'telha' },
        { rotulo: 'Forno (rateio)', valor: 3.6, tom: 'mar' },
        { rotulo: 'Embalagem', valor: 5.4, tom: 'cinza' },
        { rotulo: 'Perda', valor: 4.7, tom: 'areia' },
      ],
      formato: 'pct',
      fonte: 'Cálculo do autor com custos hipotéticos (21/10/2026).',
    },

    { t: 'h2', texto: 'Como fazer a ficha técnica de um item de produção própria?' },
    {
      t: 'p',
      texto:
        'Pese e anote o lote inteiro, conte quantas unidades saem e divida. A ficha técnica de um item de produção própria é o mesmo raciocínio de um prato, só que o primeiro ingrediente é a massa ou o recheio que você mesmo faz.',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Faça o lote como de costume e anote tudo', texto: 'Farinha, fermento, óleo, sal, açúcar: pese e some o custo de cada um, com o preço da última compra.' },
        { titulo: 'Conte as unidades que saíram', texto: 'Use o resultado real, não o da receita. Se o lote rende 40 em um dia e 37 em outro, use a média.' },
        { titulo: 'Divida o custo do lote pelas unidades', texto: 'Esse é o custo da massa por esfiha. Faça igual com o recheio, por unidade.' },
        { titulo: 'Rateie forno e embalagem', texto: 'Gás ou energia do mês divididos pelas unidades assadas, mais a embalagem de cada item.' },
        { titulo: 'Some a perda e divida pelo CMV desejado', texto: 'Aplique a perda observada (massa que sobra, recheio que passa do ponto) e chegue ao preço.' },
      ],
    },
    {
      t: 'p',
      texto: 'Quer testar com os seus números? A calculadora abaixo vem com uma porção de 6 esfihas abertas de carne (valores ilustrativos). Troque o preço, o custo de cada item e a perda, e veja o CMV mudar na hora.',
    },
    { t: 'widget', id: 'custo-prato', preset: 'esfiha' },
    { t: 'cta', cta: { tipo: 'teste', variante: 'numero' } },

    { t: 'h2', texto: 'Como o mix de itens mexe no lucro?' },
    {
      t: 'p',
      texto:
        'O mix muda o lucro porque **cada família de itens tem um custo e um papel diferente**. Salgados giram rápido e custam pouco por unidade. Pratos com carne pesam no custo, e os doces têm outra margem.',
    },
    {
      t: 'p',
      texto: 'Por isso o CMV médio da casa engana. Um quibe que vende o dia todo pode estar com margem boa, enquanto a kafta, mais cara de fazer, empurra a média para cima. A conta precisa ser por item.',
    },
    {
      t: 'grafico',
      tipo: 'barras',
      titulo: 'Custo unitário por item do mix',
      subtitulo: 'Exemplo ilustrativo, em R$ por unidade ou porção.',
      dados: [
        { rotulo: 'Esfiha de carne', valor: 2.78, destaque: true },
        { rotulo: 'Quibe frito', valor: 3.2 },
        { rotulo: 'Pasta com pão (porção)', valor: 3.0 },
        { rotulo: 'Doce de massa folhada', valor: 3.6 },
        { rotulo: 'Espetinho de kafta', valor: 4.5 },
      ],
      formato: 'brl',
      fonte: 'Valores hipotéticos para ilustrar o raciocínio.',
    },
    {
      t: 'p',
      texto: 'Com o custo por item na mão, o preço sugerido sai de uma divisão. A tabela usa um CMV de 35%, que é só uma referência que muita gente usa; ela varia por cozinha e por estratégia.',
    },
    {
      t: 'tabela',
      cabecalho: ['Item', 'Custo (ilustrativo)', 'Preço para CMV de 35%', 'Sobra bruta por unidade'],
      linhas: [
        ['Esfiha de carne', 'R$ 2,78', 'R$ 7,94', 'R$ 5,16'],
        ['Quibe frito', 'R$ 3,20', 'R$ 9,14', 'R$ 5,94'],
        ['Pasta com pão (porção)', 'R$ 3,00', 'R$ 8,57', 'R$ 5,57'],
        ['Doce de massa folhada', 'R$ 3,60', 'R$ 10,29', 'R$ 6,69'],
        ['Espetinho de kafta', 'R$ 4,50', 'R$ 12,86', 'R$ 8,36'],
      ],
      destaqueColuna: 2,
      legenda: 'Todos os valores são ilustrativos. Preço de venda de verdade também depende do que o cliente aceita pagar na sua região.',
    },
    {
      t: 'nota',
      tom: 'dica',
      rotulo: 'Regra de bolso',
      texto: 'Em item de ticket baixo, o que paga a casa é a **quantidade**. Se a sobra por esfiha é de R$ 5,16, são necessárias muitas unidades por dia para cobrir aluguel e folha. Veja a conta no [ponto de equilíbrio do restaurante](/blog/ponto-de-equilibrio-restaurante).',
    },

    { t: 'h2', texto: 'Vale mais produzir a massa ou comprar pronta?' },
    {
      t: 'p',
      texto:
        'Não existe resposta única: depende do **custo total de cada caminho**, não só do preço da massa. Produzir parece mais barato porque a farinha custa pouco, mas há mão de obra, forno, perda e tempo de quem faz.',
    },
    {
      t: 'p',
      texto:
        'Para comparar sem se enganar, calcule o custo por unidade dos dois jeitos. Na produção própria, some o lote, o rateio do forno, a hora de quem prepara (salário e encargos divididos pelas horas e pelas unidades) e a perda. Na massa pronta, use o preço da unidade já com frete, e inclua a perda também.',
    },
    {
      t: 'p',
      texto:
        'Compare o resultado e olhe o que não está na conta: padrão do sabor, dependência de fornecedor e espaço na cozinha. Se a diferença for de centavos, o critério pode ser outro. Só decida depois de ter o número dos dois.',
    },

    { t: 'h2', texto: 'Como controlar o desperdício e a produção por horário?' },
    {
      t: 'p',
      texto:
        'Produza pelo **histórico de venda** de cada horário, não pelo palpite. Anote por duas ou três semanas quanto saiu de cada item em cada faixa (almoço, tarde, jantar) e monte uma tabela de produção por dia da semana.',
    },
    {
      t: 'p',
      texto:
        'O desperdício na cozinha árabe costuma vir de dois lugares: massa aberta que não foi assada e recheio que ficou tempo demais na bancada. Uma regra simples é preparar em lotes menores nos horários de pico, em vez de um lote grande de manhã.',
    },
    {
      t: 'erros',
      itens: [
        { titulo: 'Produzir pelo palpite', texto: 'O lote grande de manhã vira sobra à noite. Use o histórico de venda por horário.' },
        { titulo: 'Não rachar o forno no custo', texto: 'Gás e energia são reais. Sem rateio, a ficha técnica mostra um custo menor que o verdadeiro.' },
        { titulo: 'Usar a receita, não o rendimento real', texto: 'A receita diz 40, a bancada entrega 37. A conta tem que usar o que sai de fato.' },
        { titulo: 'Misturar o CMV de todos os itens', texto: 'A média esconde o item caro. Calcule por item e por família (salgado, prato, doce).' },
      ],
    },
    {
      t: 'p',
      texto: 'Registre também o que sobrou e foi descartado. Esse número, somado semana a semana, mostra se a produção está calibrada ou se está jogando dinheiro fora.',
    },

    { t: 'h2', texto: 'Onde sobra mais: balcão, delivery ou encomenda?' },
    {
      t: 'p',
      texto:
        'Costuma sobrar mais **no balcão**, porque não há comissão de app nem entrega. Mas a resposta certa é a do seu mês, canal por canal. Delivery e encomenda têm custos e prazos próprios.',
    },
    {
      t: 'p',
      texto:
        'No iFood, conferido em 21/10/2026, o Plano Básico cobra 12% de comissão mais 3,2% de pagamento online, e o Plano Entrega cobra 23% mais 3,2%. De cada R$ 100 pagos pelo app, sobram R$ 84,80 no Básico e R$ 73,80 no Entrega, ainda antes dos custos. Como o ticket da esfiha é baixo, essa fatia pesa muito. A conta completa está em [taxa do iFood](/blog/taxa-do-ifood).',
    },
    {
      t: 'p',
      texto:
        'Encomenda e evento (festas, escritórios, cento de salgados) fogem do app e, em geral, têm preço combinado. Aqui o risco é outro: comprar insumo e produzir antes de receber. Calcule o custo do cento como qualquer item, deixe a margem no orçamento e combine o sinal com o cliente.',
    },
    {
      t: 'p',
      texto:
        'Por isso vale lançar a venda por canal, todos os dias. Sem essa separação, o balcão lucrativo esconde o delivery que não paga a conta, e você descobre no fim do mês.',
    },

    { t: 'h2', texto: 'Como fazer o fechamento do dia na esfiharia?' },
    {
      t: 'p',
      texto:
        'Feche o caixa todo dia, no mesmo horário e na mesma ordem: **vendas por canal, notas do dia, sangria e diferença de caixa**. Leva poucos minutos e evita o susto de descobrir o rombo semanas depois.',
    },
    {
      t: 'checklist',
      titulo: 'Fechamento do dia, em quatro passos',
      itens: [
        'Venda por canal: balcão (dinheiro, Pix, cartão), apps de delivery e encomendas.',
        'Notas e gastos do dia: compras de insumo, gás, embalagem, tudo com a nota guardada.',
        'Sangria: quanto saiu do caixa e para quê.',
        'Conferência: o que entrou menos o que saiu bate com o dinheiro que está na gaveta?',
      ],
    },
    {
      t: 'p',
      texto: 'O Tá no Caixa faz esse fechamento num formulário só. Ele não é PDV nem cardápio digital: mostra **quanto sobrou**, com o que entrou, o que saiu e o ponto de equilíbrio. Nos prints de demonstração há um exemplo de restaurante de cozinha árabe, com dados de exemplo.',
    },
    {
      t: 'print',
      src: '/landing/despesas.webp',
      alt: 'Tela de despesas do Tá no Caixa com gastos lançados por categoria',
      url: 'app.tanocaixa.com/painel/despesas',
      legenda: 'No Tá no Caixa, compras e despesas ficam lançadas por categoria, para você ver o que saiu junto com o que entrou. Dados de exemplo.',
    },
    { t: 'cartao-link', slug: 'ponto-de-equilibrio-restaurante', rotulo: 'Para saber quanto vender' },
    {
      t: 'p',
      texto: 'Sobre tributos e enquadramento da esfiharia, fale com o seu contador. O que está neste guia é a conta de custo e de caixa, não orientação fiscal. Se ainda está escolhendo ferramenta, veja o guia de [sistema para restaurante](/blog/sistema-para-restaurante).',
    },

    { t: 'h2', texto: 'Perguntas frequentes sobre a gestão da esfiharia' },
    {
      t: 'faq',
      itens: [
        { p: 'Quanto custa fazer uma esfiha?', r: 'Depende do seu lote e do recheio: divida o custo do lote de massa pelas unidades e some recheio, forno, embalagem e perda. No exemplo ilustrativo deste guia, o custo é de R$ 2,78 por esfiha. Refaça com as suas compras.' },
        { p: 'Qual a margem de lucro de uma esfiharia?', r: 'Não há margem única. O que existe é a sobra depois de insumos, folha, aluguel, taxas e impostos, que varia por loja e por canal. Calcule a sua pelo fechamento do mês: o que entrou menos tudo o que saiu.' },
        { p: 'Vale mais produzir ou comprar a massa pronta?', r: 'Depende do custo total de cada caminho. Compare o custo por unidade da massa própria (lote, forno, mão de obra e perda) com o preço da massa pronta já com frete. Só decida com os dois números.' },
        { p: 'Como controlar o desperdício na esfiharia?', r: 'Produza pelo histórico de venda por horário e em lotes menores nos picos. Registre também a sobra descartada todo dia: somada na semana, ela mostra se a produção está calibrada.' },
        { p: 'Qual CMV usar para precificar a esfiha?', r: 'O CMV é uma decisão sua. Muita gente usa uma faixa de referência que varia por cozinha, mas o certo é calcular o custo real do item e dividir pelo CMV que cobre as suas despesas e deixa lucro.' },
      ],
    },
  ],
}

export default post
