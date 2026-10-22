import type { Post } from '../tipos'

/**
 * Cluster · palavra-chave: ponto de equilíbrio restaurante (cauda de "ponto de equilíbrio", 9.900/mês).
 * Sem dado de terceiros: todos os números do texto são exemplos ILUSTRATIVOS e vêm rotulados assim.
 * Exemplo-base: custos fixos R$ 28.000, custos variáveis 40% do faturamento, ticket R$ 70, 26 dias abertos.
 */
const post: Post = {
  slug: 'ponto-de-equilibrio-restaurante',
  titulo: 'Ponto de equilíbrio do restaurante: como calcular (com exemplo)',
  tituloMeta: 'Ponto de equilíbrio do restaurante: como calcular',
  descricao: 'Descubra quanto o restaurante precisa faturar por mês e por dia para não ter prejuízo. Fórmula, exemplo passo a passo e calculadora com os seus números.',
  resumo: 'O ponto de equilíbrio é o faturamento mínimo em que o restaurante empata. Veja a fórmula, um exemplo por mês, por dia e por pedido, e simule o seu.',
  palavraChave: 'ponto de equilíbrio restaurante',
  secundarias: ['como calcular ponto de equilíbrio', 'ponto de equilíbrio financeiro', 'margem de contribuição', 'faturamento mínimo do restaurante', 'custos fixos de restaurante', 'quanto preciso vender para não ter prejuízo'],
  tipo: 'cluster',
  categoria: 'Gestão financeira',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'steps',
    etiqueta: 'GESTÃO · EQUILÍBRIO',
    itens: [
      { rotulo: 'Custos fixos', valor: 28000 },
      { rotulo: 'Margem de contribuição: 60%' },
      { rotulo: 'Faturamento mínimo', valor: 46667 },
    ],
  },
  relacionados: ['sistema-para-restaurante', 'como-calcular-cmv-restaurante', 'taxa-do-ifood'],
  cta: { principal: { tipo: 'teste', variante: 'painel' }, secundario: { tipo: 'recurso', id: 'checklist-fechamento-de-caixa' } },
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Definição:** o ponto de equilíbrio é o faturamento mínimo em que o restaurante empata: custos fixos ÷ margem de contribuição.',
        '**Fixos e variáveis:** fixo você paga vendendo ou não (aluguel, folha). Variável cresce com a venda (insumos, taxa de cartão, imposto).',
        '**Margem de contribuição:** é o que sobra de cada R$ 1 vendido depois dos custos variáveis. Quanto maior, menos você precisa vender.',
        '**No exemplo deste guia:** R$ 28.000 de fixos e 40% de variáveis dão R$ 46.667 por mês, ou cerca de R$ 1.795 por dia aberto. Os números são ilustrativos.',
        '**Lucro:** equilíbrio é o empate. Para ter lucro, some a meta de lucro aos custos fixos e refaça a conta.',
      ],
    },
    {
      t: 'p',
      texto:
        'O **ponto de equilíbrio do restaurante** responde a uma pergunta que todo dono faz de madrugada: quanto eu preciso vender para não ter prejuízo? Abaixo desse valor você perde dinheiro. Acima, começa a sobrar.',
    },
    {
      t: 'p',
      texto:
        'A conta é simples, mas quase todo mundo erra na hora de separar o que é fixo e o que é variável. Aqui você vê a fórmula, um exemplo completo e uma calculadora para refazer com os seus números. Para ver onde isso se encaixa no controle da casa, veja o guia de [sistema para restaurante](/blog/sistema-para-restaurante).',
    },

    { t: 'h2', texto: 'O que é ponto de equilíbrio em um restaurante?' },
    {
      t: 'p',
      texto:
        'É o **faturamento em que a receita cobre exatamente todos os custos**: nem lucro, nem prejuízo. Em um mês de R$ 46.667 de vendas no exemplo deste guia, o restaurante paga tudo e fecha no zero a zero.',
    },
    {
      t: 'p',
      texto:
        'Você pode ver o número de três jeitos: em reais por mês, em reais por dia aberto e em pedidos por dia. O terceiro costuma ser o mais útil, porque a equipe entende "preciso de 26 pedidos" bem melhor que "preciso de R$ 46 mil".',
    },
    {
      t: 'p',
      texto:
        'Esse cálculo também aparece como **ponto de equilíbrio financeiro**. Na prática, para o dono de restaurante, é a mesma ideia: o piso de vendas abaixo do qual o mês fecha no vermelho.',
    },

    { t: 'h2', texto: 'Quais são os custos fixos e variáveis do restaurante?' },
    {
      t: 'p',
      texto:
        '**Custo fixo é o que você paga mesmo se não vender nada.** Custo variável é o que só existe porque houve venda e cresce junto com ela. Separar os dois certo é o passo mais importante da conta.',
    },
    {
      t: 'tabela',
      cabecalho: ['Custos fixos (pagos vendendo ou não)', 'Custos variáveis (crescem com a venda)'],
      linhas: [
        ['Aluguel e condomínio', 'Insumos e mercadoria (CMV)'],
        ['Folha fixa com encargos', 'Comissão dos apps de delivery'],
        ['Retirada do dono (pró-labore)', 'Taxa de cartão e de pagamento online'],
        ['Energia, gás e água (base)', 'Imposto sobre a venda'],
        ['Sistema, internet e contador', 'Embalagem do delivery'],
        ['Manutenção e marketing fixos', 'Extras de equipe por volume (horas extras, diaristas)'],
      ],
      legenda: 'Classificação de referência. Tributos e folha têm regras próprias: fale com seu contador para enquadrar cada custo da sua operação.',
    },
    {
      t: 'p',
      texto:
        'Alguns custos são meio a meio, como energia e gás, que têm uma base fixa e uma parte que sobe com o movimento. Nesses casos, use a base como fixo e a parte que oscila como variável. Se tiver dúvida, pergunte ao contador.',
    },
    { t: 'cartao-link', slug: 'como-calcular-cmv-restaurante', rotulo: 'Para a parte variável mais pesada' },

    { t: 'h2', texto: 'O que é margem de contribuição?' },
    {
      t: 'p',
      texto:
        'A margem de contribuição é **a parte de cada real vendido que sobra depois dos custos variáveis**. Ela é a peça central da fórmula, porque é ela que "paga" os custos fixos.',
    },
    {
      t: 'p',
      texto:
        'Se os custos variáveis somam 40% do faturamento, a margem de contribuição é 60%. De cada R$ 100 vendidos, R$ 60 ficam para pagar aluguel, folha e o resto. Quando o CMV ou a taxa de app sobem, essa margem encolhe e o equilíbrio sobe.',
    },
    {
      t: 'p',
      texto: 'Atenção: margem de contribuição não é lucro. Ela ainda não descontou os custos fixos, é só o que sobra para pagá-los.',
    },
    { t: 'h2', texto: 'Qual é a fórmula do ponto de equilíbrio?' },
    {
      t: 'p',
      texto: 'A fórmula é **custos fixos ÷ margem de contribuição**. O resultado é o faturamento mínimo do mês, em reais.',
    },
    {
      t: 'citacao',
      texto: 'Ponto de equilíbrio = custos fixos ÷ (1 − custos variáveis em % do faturamento).',
    },
    {
      t: 'p',
      texto:
        'Para chegar ao valor por dia, divida pelos dias abertos no mês. Para chegar aos pedidos, divida o valor do dia pelo ticket médio. Veja tudo passo a passo.',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Some os custos fixos do mês', texto: 'Use a média dos últimos meses, não o melhor mês. Inclua a **retirada do dono**, senão o equilíbrio fica menor do que a vida real.' },
        { titulo: 'Some os custos variáveis em % do faturamento', texto: 'CMV, comissão de app, taxa de cartão, imposto e embalagem, cada um como percentual da venda. Some tudo.' },
        { titulo: 'Calcule a margem de contribuição', texto: 'Tire de 100% o percentual dos variáveis. Variáveis de 40% dão margem de 60%, ou 0,60.' },
        { titulo: 'Divida os fixos pela margem', texto: 'O resultado é o faturamento mínimo do mês. Divida pelos dias abertos e depois pelo ticket médio para ter o dia e os pedidos.' },
      ],
    },

    { t: 'h2', texto: 'Como calcular o ponto de equilíbrio com um exemplo?' },
    {
      t: 'p',
      texto:
        'Veja um restaurante **fictício** com R$ 28.000 de custos fixos e 40% de custos variáveis. Todos os valores são ilustrativos, para mostrar a conta.',
    },
    {
      t: 'exemplo',
      titulo: 'Custos fixos do mês (exemplo ilustrativo)',
      linhas: [
        { rotulo: 'Aluguel', valor: 'R$ 6.000' },
        { rotulo: 'Folha fixa com encargos', valor: 'R$ 13.000' },
        { rotulo: 'Retirada do dono', valor: 'R$ 4.000' },
        { rotulo: 'Energia, gás e água (base)', valor: 'R$ 2.200' },
        { rotulo: 'Contador', valor: 'R$ 600' },
        { rotulo: 'Sistema e internet', valor: 'R$ 500' },
        { rotulo: 'Manutenção e marketing', valor: 'R$ 1.700' },
        { rotulo: 'Total de custos fixos', valor: 'R$ 28.000', destaque: true },
      ],
    },
    {
      t: 'exemplo',
      titulo: 'Custos variáveis (% do faturamento) e a conta final',
      linhas: [
        { rotulo: 'Insumos (CMV)', valor: '30%' },
        { rotulo: 'Comissão de app e taxa de cartão', valor: '4%' },
        { rotulo: 'Imposto sobre a venda', valor: '4%' },
        { rotulo: 'Embalagem', valor: '2%' },
        { rotulo: 'Total de custos variáveis', valor: '40%' },
        { rotulo: 'Margem de contribuição (100% − 40%)', valor: '60%' },
        { rotulo: 'Ponto de equilíbrio (R$ 28.000 ÷ 0,60)', valor: 'R$ 46.667 por mês', destaque: true },
      ],
      conclusao: 'Abaixo de **R$ 46.667** em vendas no mês, esse restaurante perde dinheiro. Acima disso, cada R$ 100 a mais deixam R$ 60 de sobra.',
    },
    {
      t: 'p',
      texto: 'Num gráfico, o equilíbrio é o ponto em que a linha da receita cruza a do custo total.',
    },
    {
      t: 'grafico',
      tipo: 'linhas',
      titulo: 'Onde a receita cruza o custo total',
      subtitulo: 'Exemplo ilustrativo: R$ 28.000 de custos fixos e 40% de custos variáveis.',
      x: [0, 20000, 40000, 60000, 80000, 100000],
      series: [
        { rotulo: 'Receita', tom: 'mar', y: [0, 20000, 40000, 60000, 80000, 100000] },
        { rotulo: 'Custo total (fixo + variável)', tom: 'telha', y: [28000, 36000, 44000, 52000, 60000, 68000] },
      ],
      formatoX: 'brl',
      formatoY: 'brl',
      marcaX: { x: 46667, rotulo: 'equilíbrio R$ 46.667' },
      fonte: 'Cálculo do autor com números de exemplo.',
    },

    { t: 'h2', texto: 'Quanto preciso vender por dia e quantos pedidos?' },
    {
      t: 'p',
      texto:
        'No exemplo, o restaurante precisa de **cerca de R$ 1.795 por dia aberto**, ou **26 pedidos por dia** com ticket médio de R$ 70. A conta é o equilíbrio mensal dividido pelos dias e depois pelo ticket.',
    },
    {
      t: 'exemplo',
      titulo: 'Do mês ao pedido (exemplo ilustrativo)',
      linhas: [
        { rotulo: 'Ponto de equilíbrio do mês', valor: 'R$ 46.667' },
        { rotulo: 'Dias abertos no mês', valor: '26' },
        { rotulo: 'Faturamento mínimo por dia (R$ 46.667 ÷ 26)', valor: 'R$ 1.795' },
        { rotulo: 'Ticket médio', valor: 'R$ 70' },
        { rotulo: 'Pedidos por dia para empatar (R$ 1.795 ÷ R$ 70)', valor: '25,6, ou seja, 26 pedidos', destaque: true },
      ],
    },
    {
      t: 'p',
      texto:
        'Arredonde para cima, porque não existe 0,6 de pedido. Esse número serve de meta para o turno: se às 20 horas a casa só fez 10 pedidos, dá para ver cedo que o dia está abaixo do piso.',
    },
    { t: 'cta', cta: { tipo: 'teste', variante: 'numero' } },

    { t: 'h2', texto: 'Use a calculadora com os seus números' },
    {
      t: 'p',
      texto:
        'Troque os custos fixos, o percentual de variáveis, o ticket e os dias abertos pelos da sua casa. A calculadora devolve o faturamento mínimo do mês, do dia e os pedidos para empatar. Quer saber o percentual dos insumos? Veja como [calcular o CMV do restaurante](/blog/como-calcular-cmv-restaurante).',
    },
    { t: 'widget', id: 'equilibrio' },

    { t: 'h2', texto: 'Como calcular o ponto de equilíbrio com meta de lucro?' },
    {
      t: 'p',
      texto:
        'Some o lucro que você quer aos custos fixos e divida pela mesma margem de contribuição. A fórmula fica **(custos fixos + lucro desejado) ÷ margem de contribuição**.',
    },
    {
      t: 'p',
      texto:
        'No exemplo, suponha que o dono queira R$ 6.000 de lucro no mês, além da retirada que já está nos fixos. A conta é (R$ 28.000 + R$ 6.000) ÷ 0,60, que dá cerca de R$ 56.667 por mês.',
    },
    {
      t: 'tabela',
      cabecalho: ['Meta', 'Cálculo', 'Faturamento do mês', 'Por dia (26 dias)', 'Pedidos por dia (ticket R$ 70)'],
      linhas: [
        ['Só empatar', 'R$ 28.000 ÷ 0,60', 'R$ 46.667', 'R$ 1.795', '26'],
        ['Lucro de R$ 6.000', 'R$ 34.000 ÷ 0,60', 'R$ 56.667', 'R$ 2.180', '32'],
      ],
      destaqueColuna: 2,
      legenda: 'Exemplo ilustrativo, com custos fixos de R$ 28.000 e custos variáveis de 40%.',
    },
    {
      t: 'p',
      texto:
        'Repare que R$ 6.000 de lucro pedem R$ 10.000 a mais de venda, e não R$ 6.000. Isso acontece porque só 60% de cada real vendido sobra para os fixos e para o lucro.',
    },

    { t: 'h2', texto: 'O que acontece se o CMV ou a taxa de app subirem?' },
    {
      t: 'p',
      texto:
        'O equilíbrio sobe, porque a margem de contribuição encolhe. Quatro pontos a mais de custo variável empurram o piso do exemplo de R$ 46.667 para R$ 50.000.',
    },
    {
      t: 'grafico',
      tipo: 'barras',
      titulo: 'Ponto de equilíbrio por cenário de custo variável',
      subtitulo: 'Exemplo ilustrativo: mesmos R$ 28.000 de custos fixos. Faturamento mínimo do mês.',
      dados: [
        { rotulo: 'CMV cai 4 pontos', valor: 43750, nota: 'variáveis em 36%' },
        { rotulo: 'Cenário base', valor: 46667, destaque: true, nota: 'variáveis em 40%' },
        { rotulo: 'CMV ou taxa de app sobem 4 pontos', valor: 50000, nota: 'variáveis em 44%' },
        { rotulo: 'CMV e taxa sobem 4 pontos cada', valor: 53846, nota: 'variáveis em 48%' },
      ],
      formato: 'brl',
      fonte: 'Cálculo do autor com números de exemplo.',
    },
    {
      t: 'p',
      texto:
        'É por isso que migrar vendas do balcão para o delivery sem olhar a conta pode empurrar o equilíbrio para cima. Veja quanto cada pedido de app deixa no guia da [taxa dos apps de delivery](/blog/taxa-do-ifood), com a conta de um pedido.',
    },

    { t: 'h2', texto: 'Quais erros distorcem o ponto de equilíbrio?' },
    {
      t: 'p',
      texto:
        'Os erros mais comuns fazem o equilíbrio parecer **menor** do que ele é. Aí o dono acha que está empatando e, no fim do mês, o caixa não fecha.',
    },
    {
      t: 'erros',
      itens: [
        { titulo: 'Jogar o CMV nos custos fixos', texto: 'Insumo cresce com a venda, então é variável. Colocar no fixo desmonta a margem de contribuição e o resultado perde o sentido.' },
        { titulo: 'Esquecer a retirada do dono', texto: 'Se o seu salário não está nos fixos, você trabalha de graça no cálculo. Coloque um valor de pró-labore, mesmo que pequeno.' },
        { titulo: 'Usar o faturamento bruto sem imposto e taxas', texto: 'Venda bruta não é dinheiro disponível. Imposto, taxa de cartão e comissão de app saem antes de chegar ao caixa.' },
        { titulo: 'Ignorar a sazonalidade', texto: 'O equilíbrio é mensal, mas as vendas oscilam. Reveja os fixos e o ticket nos meses fracos, não só nos fortes.' },
      ],
    },
    {
      t: 'p',
      texto:
        'Outro cuidado: a conta supõe que fixos e percentuais ficam parados, e na vida real eles mudam. Refaça o cálculo quando o aluguel, o salário ou o preço do fornecedor mudarem.',
    },

    { t: 'h2', texto: 'Como acompanhar o equilíbrio ao longo do mês?' },
    {
      t: 'p',
      texto:
        'Compare, toda semana, o que já entrou com a meta do mês. Descobrir no dia 30 que ficou abaixo do equilíbrio não ajuda. Descobrir no dia 15 ainda dá tempo de agir em preço, cardápio ou horário.',
    },
    {
      t: 'ul',
      itens: [
        '**Lance a venda todo dia:** por canal (Pix, cartão, dinheiro e apps), para saber quanto entrou de verdade.',
        '**Compare com o piso diário:** no exemplo, R$ 1.795. Dias abaixo disso precisam ser compensados por dias acima.',
        '**Registre os gastos na hora:** compras e despesas lançadas na semana evitam o susto do fim do mês.',
        '**Reveja os fixos a cada trimestre:** aluguel reajusta, folha muda, contrato de sistema também.',
      ],
    },
    {
      t: 'print',
      src: '/landing/dashboard.webp',
      alt: 'Dashboard do Tá no Caixa com entrou, saiu, sobrou e o caminho até o ponto de equilíbrio',
      url: 'app.tanocaixa.com/painel',
      legenda: 'No dashboard do Tá no Caixa, você vê o que entrou, o que saiu, quanto sobrou e o caminho até o ponto de equilíbrio. No plano do mês, define metas e teto de gasto.',
    },
    {
      t: 'nota',
      tom: 'alerta',
      rotulo: 'Fale com seu contador',
      texto: 'A classificação dos custos e o enquadramento de impostos mudam conforme o regime da empresa. Valide com seu contador antes de usar o número em decisões grandes.',
    },

    { t: 'h2', texto: 'Perguntas frequentes sobre ponto de equilíbrio' },
    {
      t: 'faq',
      itens: [
        { p: 'O que é ponto de equilíbrio?', r: 'É o faturamento em que a receita cobre todos os custos, sem lucro nem prejuízo. Em um restaurante, calcula-se dividindo os custos fixos pela margem de contribuição.' },
        { p: 'Como calcular o ponto de equilíbrio de um restaurante?', r: 'Some os custos fixos do mês, some os variáveis em % do faturamento, tire esse percentual de 100% para achar a margem de contribuição e divida os fixos pela margem. Com R$ 28.000 de fixos e 40% de variáveis, o equilíbrio é de R$ 46.667 (exemplo ilustrativo).' },
        { p: 'Qual a diferença entre ponto de equilíbrio e lucro?', r: 'No equilíbrio, o resultado é zero: a receita só paga os custos. O lucro é o que passa disso. Para planejar lucro, some a meta aos custos fixos e divida pela margem de contribuição.' },
        { p: 'Quantos pedidos por dia preciso para empatar?', r: 'Divida o equilíbrio do mês pelos dias abertos e depois pelo ticket médio. No exemplo, R$ 46.667 ÷ 26 dias ÷ R$ 70 dá cerca de 26 pedidos por dia. Arredonde sempre para cima.' },
        { p: 'O que entra nos custos fixos de um restaurante?', r: 'Tudo que você paga vendendo ou não: aluguel, folha fixa com encargos, retirada do dono, base de energia, gás e água, sistema, internet, contador e manutenção. Insumos, taxas e imposto sobre a venda são variáveis.' },
        { p: 'Com que frequência devo refazer o cálculo?', r: 'Sempre que um custo fixo ou um percentual mudar, como reajuste de aluguel, nova taxa de app ou aumento do CMV. Na falta de mudança, reveja a cada trimestre.' },
      ],
    },
  ],
}

export default post
