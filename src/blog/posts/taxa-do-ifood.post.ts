import type { Post } from '../tipos'

/**
 * Cluster · palavra-chave: taxa do ifood (1.600/mês) + calculadora taxa ifood (210).
 * Números dos planos conferidos nas páginas oficiais do iFood em 21/10/2026 (ver `fontes`).
 * Os custos do prato, embalagem e imposto dos exemplos são ILUSTRATIVOS e vêm rotulados assim.
 */
const post: Post = {
  slug: 'taxa-do-ifood',
  titulo: 'Taxa do iFood: quanto cobra e quanto sobra por pedido',
  tituloMeta: 'Taxa do iFood 2026: quanto cobra e quanto sobra',
  descricao: 'Plano Básico (12% + 3,2%) ou Entrega (23% + 3,2%): veja a conta de um pedido, quanto sobra de verdade e use a calculadora com os seus números.',
  resumo: 'A comissão do iFood é de 12% a 23%, mais 3,2% do pagamento online. Veja a conta de um pedido, o que sobra depois dos custos e simule o seu prato.',
  palavraChave: 'taxa do ifood',
  secundarias: ['quanto o ifood cobra', 'calculadora taxa ifood', 'taxa do ifood para restaurantes', 'repasse ifood', 'comissão ifood'],
  tipo: 'cluster',
  categoria: 'Delivery',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'spread',
    etiqueta: 'DELIVERY · CÁLCULO',
    itens: [
      { rotulo: 'Comissão Plano Básico (%)', valor: 12 },
      { rotulo: 'Comissão Plano Entrega (%)', valor: 23 },
    ],
  },
  relacionados: ['sistema-para-restaurante', 'como-calcular-cmv-restaurante', 'comparativo-saipos-anota-ai-goomer-consumer'],
  cta: { principal: { tipo: 'recurso', id: 'guia-lucro-por-pedido-ifood' }, secundario: { tipo: 'teste', variante: 'numero' } },
  fontes: [
    { rotulo: 'iFood, página oficial de planos para restaurantes (consultada em 21/10/2026)', url: 'https://parceiros.ifood.com.br/restaurante/planos-ifood' },
    { rotulo: 'iFood para Parceiros: Taxas do iFood (atualizado em 15/09/2026; valores vigentes em 23/06/2026)', url: 'https://blog-parceiros.ifood.com.br/taxas-ifood/' },
    { rotulo: 'iFood para Parceiros: Plano Básico ou Plano Entrega (atualizado em 09/09/2026)', url: 'https://blog-parceiros.ifood.com.br/planos-ifood/' },
    { rotulo: 'iFood para Parceiros: ciclo de repasses do iFood (26/07/2026)', url: 'https://blog-parceiros.ifood.com.br/ciclo-de-repasses-ifood/' },
  ],
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Comissão:** 12% no Plano Básico (entrega é sua) e 23% no Plano Entrega (entrega é do iFood), sobre o valor do pedido.',
        '**Pagamento online:** mais 3,2% nos pedidos pagos pelo app. Dinheiro na entrega não paga essa taxa.',
        '**Mensalidade:** R$ 110 (Básico) ou R$ 150 (Entrega), só para quem fatura mais de R$ 1.800 por mês e com o primeiro mês grátis.',
        '**O que sobra:** em um pedido de R$ 50 no Plano Básico, o iFood deixa R$ 42,40. Isso ainda não é lucro: falta tirar insumos, embalagem, imposto e entrega.',
        '**Conferido em:** 21/10/2026, nas páginas oficiais do iFood. A taxa vigente da sua loja está no Portal do Parceiro.',
      ],
    },
    {
      t: 'p',
      texto:
        'O iFood fica com **15,2% a 26,2% de cada pedido pago pelo app**, dependendo do plano. Parece pouco até você fazer a conta do prato inteiro. O que decide se o delivery dá lucro não é o percentual: é quanto sobra *depois* de tudo que sai do pedido.',
    },
    {
      t: 'p',
      texto: 'Este guia mostra a conta oficial, um exemplo com custos, a comparação com a venda no balcão e uma calculadora para você refazer tudo com os seus números. Se você ainda está escolhendo ferramenta para controlar isso, veja o guia de [sistema para restaurante](/blog/sistema-para-restaurante).',
    },

    { t: 'h2', texto: 'Quanto o iFood cobra do restaurante?' },
    {
      t: 'p',
      texto:
        'O iFood cobra uma **comissão sobre cada pedido**, uma **taxa de 3,2% nos pedidos pagos pelo app** e uma **mensalidade** para quem fatura acima de R$ 1.800 por mês. O valor da comissão muda com o plano.',
    },
    {
      t: 'tabela',
      cabecalho: ['Plano', 'Comissão', 'Pagamento online', 'Mensalidade', 'Quem entrega', 'Total por pedido pago no app'],
      linhas: [
        ['Plano Básico', '12%', '3,2%', 'R$ 110', 'Sua loja', '15,2%'],
        ['Plano Entrega', '23%', '3,2%', 'R$ 150', 'Rede do iFood', '26,2%'],
        ['Plano Entrega Flex', '12% (entrega própria) ou 23% (entrega do iFood)', '3,2%', 'R$ 150', 'Misto, por área', '15,2% ou 26,2%'],
      ],
      destaqueColuna: 5,
      legenda: 'Mensalidade cobrada só de quem fatura mais de R$ 1.800 por mês no iFood; primeiro mês grátis para novos cadastros.',
      fonte: 'Fonte: iFood, página de planos. Conferido em 21/10/2026.',
    },
    {
      t: 'p',
      texto: 'A comissão incide sobre a base do pedido, **inclusive a taxa de entrega**, quando ela existe. A taxa de serviço (a partir de R$ 0,99) é cobrada do cliente e não é descontada do seu repasse.',
    },
    {
      t: 'nota',
      tom: 'alerta',
      rotulo: 'Confira a sua',
      texto:
        'O próprio iFood avisa que as taxas podem variar por categoria e modelo logístico. Para ver o que foi cobrado na sua loja, abra o **Portal do Parceiro**, entre no Painel Financeiro e toque em “Taxas e comissões” no detalhe do repasse.',
    },

    { t: 'h2', texto: 'Quanto sobra de um pedido de R$ 50 no iFood?' },
    {
      t: 'p',
      texto: 'No Plano Básico, **sobram R$ 42,40** de um pedido de R$ 50 pago pelo app. É o exemplo que o próprio iFood usa, e a conta é simples.',
    },
    {
      t: 'exemplo',
      titulo: 'Pedido de R$ 50,00, Plano Básico, pago pelo app',
      linhas: [
        { rotulo: 'Valor do pedido', valor: 'R$ 50,00' },
        { rotulo: 'Comissão do iFood (12%)', valor: '− R$ 6,00' },
        { rotulo: 'Taxa de pagamento online (3,2%)', valor: '− R$ 1,60' },
        { rotulo: 'Repasse líquido do iFood', valor: 'R$ 42,40', destaque: true },
      ],
      conclusao: 'No Plano Entrega, o mesmo pedido deixa **R$ 36,90** (comissão de R$ 11,50 + R$ 1,60 de pagamento online).',
    },
    {
      t: 'p',
      texto: 'Só que R$ 42,40 não é lucro. Do repasse ainda saem o custo do prato, a embalagem, o imposto e, no Plano Básico, a entrega. Veja o mesmo pedido com custos de exemplo.',
    },
    {
      t: 'exemplo',
      titulo: 'Do repasse ao que sobra (custos de exemplo)',
      linhas: [
        { rotulo: 'Repasse líquido do iFood (Plano Básico)', valor: 'R$ 42,40' },
        { rotulo: 'Insumos do prato (30% do preço)', valor: '− R$ 15,00' },
        { rotulo: 'Embalagem', valor: '− R$ 1,50' },
        { rotulo: 'Imposto sobre a venda (6%)', valor: '− R$ 3,00' },
        { rotulo: 'Entrega própria (motoboy, moto, combustível)', valor: '− R$ 6,00' },
        { rotulo: 'Sobra por pedido, antes de aluguel e folha', valor: 'R$ 16,90', destaque: true },
      ],
      conclusao: 'Dos R$ 50 do pedido, **R$ 16,90 (33,8%)** ficam para pagar o resto da casa. É esse número, e não o faturamento, que mostra se o app compensa.',
    },
    {
      t: 'grafico',
      tipo: 'empilhada',
      titulo: 'Para onde vai cada R$ 100 de um pedido no Plano Básico',
      subtitulo: 'Exemplo ilustrativo, sem a entrega própria. Em % do preço do prato.',
      partes: [
        { rotulo: 'Comissão do iFood', valor: 12, tom: 'telha' },
        { rotulo: 'Pagamento online', valor: 3.2, tom: 'sol' },
        { rotulo: 'Imposto (6%)', valor: 6, tom: 'areia' },
        { rotulo: 'Insumos (30%)', valor: 30, tom: 'mar' },
        { rotulo: 'Embalagem (3%)', valor: 3, tom: 'cinza' },
        { rotulo: 'Sobra', valor: 45.8, tom: 'mata' },
      ],
      formato: 'pct',
      fonte: 'Taxas: iFood (21/10/2026). Insumos, embalagem e imposto são hipóteses do exemplo.',
    },

    { t: 'h2', texto: 'O mesmo prato rende mais no balcão ou no app?' },
    {
      t: 'p',
      texto: 'Rende **quase o dobro no balcão**. Sem comissão, sem taxa de pagamento online e sem entrega, o mesmo prato do exemplo deixa R$ 32,00 em vez de R$ 16,90.',
    },
    {
      t: 'grafico',
      tipo: 'barras',
      titulo: 'O que sobra do mesmo prato de R$ 50, por canal',
      subtitulo: 'Exemplo ilustrativo: insumos de R$ 15, imposto de 6% e embalagem de R$ 1,50 nos pedidos de app.',
      dados: [
        { rotulo: 'Balcão (sem embalagem)', valor: 32, destaque: true, nota: 'sem taxa de app e sem entrega' },
        { rotulo: 'Plano Entrega', valor: 17.4, nota: 'o iFood entrega' },
        { rotulo: 'Plano Básico', valor: 16.9, nota: 'entrega própria a R$ 6,00' },
      ],
      formato: 'brl',
      fonte: 'Cálculo do autor com as taxas oficiais do iFood (21/10/2026).',
    },
    {
      t: 'p',
      texto: 'Isso não quer dizer que o app seja ruim. Ele traz cliente novo, e uma cozinha com horário ocioso pode lucrar com pedido a mais. Quer dizer que **cada canal precisa da sua própria conta**.',
    },
    {
      t: 'citacao',
      texto: 'Faturar R$ 50 no app e faturar R$ 50 no balcão são dois negócios diferentes.',
    },

    { t: 'h2', texto: 'Use a calculadora com os seus números' },
    {
      t: 'p',
      texto: 'Troque o preço, o custo do prato e as taxas do seu contrato. A calculadora devolve o que sobra por pedido, a margem e **o preço mínimo** para você ter a margem que quer. Não sabe o custo do prato? Aprenda a [calcular o CMV do restaurante](/blog/como-calcular-cmv-restaurante) primeiro.',
    },
    { t: 'widget', id: 'taxa-ifood' },
    { t: 'cta', cta: { tipo: 'teste', variante: 'nota' } },

    { t: 'h2', texto: 'Quais erros fazem o delivery dar prejuízo sem você perceber?' },
    {
      t: 'p',
      texto: 'Quase sempre o prejuízo não vem da comissão. Vem de custos que ficam **fora da conta do pedido**. Estes quatro aparecem muito.',
    },
    {
      t: 'erros',
      itens: [
        { titulo: 'Olhar o faturamento do app, não o repasse', texto: 'O dinheiro que cai é menor que a venda. Compare o **repasse** com o custo, não o valor bruto dos pedidos.' },
        { titulo: 'Esquecer a entrega própria', texto: 'No Plano Básico, motoboy e moto correm mesmo sem pedido. Divida o custo mensal pelo número de entregas.' },
        { titulo: 'Bancar cupom sem conta', texto: 'Um desconto de R$ 5 num prato que deixa R$ 17 tira quase um terço da sobra. Calcule antes de aderir.' },
        { titulo: 'Usar a mesma margem do balcão', texto: 'A margem do prato no app é menor. Refaça o preço e o CMV por canal, senão a média engana.' },
      ],
    },
    {
      t: 'p',
      texto: 'O jeito mais simples de não cair nessas armadilhas é lançar as vendas **por canal**, todos os dias, no mesmo lugar.',
    },
    {
      t: 'print',
      src: '/landing/caixa.webp',
      alt: 'Tela de fechamento do dia do Tá no Caixa, com vendas por canal',
      url: 'app.tanocaixa.com/painel/caixa',
      legenda: 'No Tá no Caixa, você lança Pix, cartão, dinheiro e apps de delivery num formulário só e vê o que entrou por canal.',
    },
    { t: 'cartao-link', slug: 'como-calcular-cmv-restaurante', rotulo: 'Para o custo do prato' },

    { t: 'h2', texto: 'Qual plano compensa: Básico, Entrega ou Entrega Flex?' },
    {
      t: 'p',
      texto: 'Depende de **quanto custa a sua entrega por pedido**. A diferença de comissão entre os dois planos é de 11 pontos percentuais (23% menos 12%) sobre o valor do pedido.',
    },
    {
      t: 'nota',
      tom: 'dica',
      rotulo: 'Regra de bolso',
      texto: 'Se a sua entrega própria custa **mais que 11% do ticket médio** por pedido, o Plano Entrega tende a compensar. Num ticket de R$ 50, esse ponto é R$ 5,50 por entrega.',
    },
    {
      t: 'comparacao',
      colA: 'Plano Básico',
      colB: 'Plano Entrega',
      linhas: [
        { dim: 'Comissão', a: '12%', b: '23%', aOk: true, bOk: false },
        { dim: 'Entrega', a: 'Sua equipe, sua rota, seu raio', b: 'Rede de entregadores do iFood' },
        { dim: 'Custo da entrega', a: 'Fixo: salário e moto correm mesmo sem pedido', b: 'Variável: só existe quando há pedido', aOk: false, bOk: true },
        { dim: 'Mensalidade (acima de R$ 1.800/mês)', a: 'R$ 110', b: 'R$ 150' },
        { dim: 'Costuma servir a', a: 'Quem entrega bem perto e já tem equipe', b: 'Quem tem demanda que oscila ou está começando' },
      ],
    },
    {
      t: 'p',
      texto: 'O **Plano Entrega Flex** mistura os dois: a sua equipe entrega na área que você define (12%) e a rede do iFood atende o resto (23%). Serve a quem entrega bem no entorno e perde pedido distante.',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Some o custo mensal da entrega própria', texto: 'Salário, encargos, moto, combustível e manutenção do mês.' },
        { titulo: 'Divida pelo número de entregas', texto: 'O resultado é o custo de **cada entrega**. Use o mês inteiro, inclusive as horas paradas.' },
        { titulo: 'Compare com 11% do ticket médio', texto: 'Se o custo por entrega for maior, o Plano Entrega leva vantagem. Se for menor, o Básico rende mais.' },
        { titulo: 'Refaça quando a demanda mudar', texto: 'Um mês fraco encarece a entrega própria. Reveja a cada trimestre.' },
      ],
    },

    { t: 'h2', texto: 'Quando o dinheiro do iFood cai na conta?' },
    {
      t: 'p',
      texto:
        'O iFood repassa **sempre às quartas-feiras**, mas o plano padrão paga cada semana de vendas **em 4 semanas**, sem taxa. Os períodos de apuração têm 7 dias, de segunda a domingo.',
    },
    {
      t: 'p',
      texto:
        'Na prática, uma venda de hoje vira dinheiro só daqui a cerca de um mês. Quem paga fornecedor à vista e recebe do iFood depois precisa de caixa para cobrir o buraco. O iFood oferece antecipação semanal ou diária, **com taxa** sobre o valor antecipado.',
    },
    {
      t: 'p',
      texto: 'Antes de antecipar, calcule quanto a taxa de antecipação tira da sua margem. Se o pedido já deixa pouco, a antecipação pode zerar o lucro. Capital de giro existe para isso: cobrir o intervalo, não para pagar prejuízo.',
    },

    { t: 'h2', texto: 'Como saber se o app vale a pena no seu mês?' },
    {
      t: 'p',
      texto: 'Separe as vendas por canal e compare o que sobra de cada um. Sem isso, o lucro do balcão esconde o prejuízo do delivery e você só descobre no fim do mês.',
    },
    {
      t: 'ul',
      itens: [
        '**Lance a venda por canal:** balcão, mesa, delivery próprio e cada app, todo dia. Leva um minuto.',
        '**Compare o repasse com a venda:** no Painel Financeiro do iFood, veja o líquido da semana e some as taxas e comissões do mês.',
        '**Calcule a sobra por pedido:** use a calculadora acima com o custo real do prato e da entrega.',
        '**Decida com número:** ajuste preço, cupom e plano, e refaça a conta todo mês.',
      ],
    },

    { t: 'h2', texto: 'Perguntas frequentes sobre a taxa do iFood' },
    {
      t: 'faq',
      itens: [
        { p: 'Qual é a taxa do iFood para restaurantes?', r: 'No Plano Básico, **12% de comissão** mais 3,2% de pagamento online. No Plano Entrega, **23%** mais 3,2%. Há mensalidade de R$ 110 ou R$ 150 para quem fatura mais de R$ 1.800 por mês.' },
        { p: 'É pago para vender no iFood?', r: 'Sim. O iFood cobra comissão sobre cada pedido e, para quem fatura acima de R$ 1.800 por mês, uma mensalidade (R$ 110 ou R$ 150, conforme o plano). O primeiro mês da mensalidade é grátis para novos cadastros.' },
        { p: 'Como funciona o comissionamento do iFood?', r: 'A comissão é um percentual cobrado sobre cada pedido concluído. Ele incide sobre os itens e sobre a eventual taxa de entrega, e aparece discriminado no extrato de cada venda.' },
        { p: 'Quem paga a taxa de serviço de R$ 0,99 do iFood?', r: 'O cliente. É a taxa de serviço que o iFood cobra do consumidor, a partir de R$ 0,99, e ela não sai do seu repasse.' },
        { p: 'Qual dia cai o repasse do iFood?', r: 'O iFood repassa sempre às quartas-feiras. O plano padrão paga cada período de 7 dias em 4 semanas, sem taxa. Há antecipação semanal e diária, com taxa.' },
        { p: 'Dá para evitar a taxa de pagamento online de 3,2%?', r: 'Só nos pedidos que o cliente paga em dinheiro na entrega: eles não geram essa taxa. Nos pedidos pagos pelo app, ela sempre incide.' },
      ],
    },
  ],
}

export default post
