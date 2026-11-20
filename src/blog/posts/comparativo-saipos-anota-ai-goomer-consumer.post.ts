import type { Post } from '../tipos'

/**
 * Comparativo · palavra-chave: saipos preço (260/mês) + buscas de marca (anota ai, saipos, goomer, consumer sistema).
 * Preços e limites conferidos nas páginas oficiais em 21/10/2026 (ver `fontes` e `blog/research/competidores-raw/`).
 * Consumer: só o que o site diz (PDV grátis até 200 pedidos/mês; planos pagos sob consulta).
 * Os exemplos de conta do Tá no Caixa não aparecem aqui: o texto não inventa números.
 */
const post: Post = {
  slug: 'comparativo-saipos-anota-ai-goomer-consumer',
  titulo: 'Saipos, Anota AI, Goomer e Consumer: preços e diferenças (2026)',
  tituloMeta: 'Saipos, Anota AI, Goomer e Consumer: preços 2026',
  descricao: 'Preços de entrada, limites de pedidos e diferenças entre Saipos, Anota AI, Goomer e Consumer, conferidos nas páginas oficiais em 21/10/2026.',
  resumo: 'Compare o preço de entrada de Saipos, Anota AI, Goomer e Consumer, como o valor escala com os pedidos e o que nenhum deles responde: quanto sobrou.',
  palavraChave: 'saipos preço',
  secundarias: ['alternativa ao saipos', 'saipos ou anota ai', 'quanto custa a saipos por mês', 'goomer ou anota ai', 'melhor sistema para delivery', 'sistema para restaurante preço'],
  tipo: 'comparativo',
  categoria: 'Comparativos',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'bars',
    etiqueta: 'COMPARATIVO · PREÇO DE ENTRADA',
    itens: [
      { rotulo: 'Saipos', valor: 241 },
      { rotulo: 'Brendi', valor: 120 },
      { rotulo: 'Anota AI', valor: 100 },
      { rotulo: 'Goomer', valor: 100 },
    ],
  },
  relacionados: ['sistema-para-restaurante', 'taxa-do-ifood', 'ponto-de-equilibrio-restaurante'],
  cta: { principal: { tipo: 'recurso', id: 'checklist-escolher-sistema-restaurante' }, secundario: { tipo: 'teste', variante: 'painel' } },
  fontes: [
    { rotulo: 'Saipos, planos e preços (consultado em 21/10/2026)', url: 'https://saipos.com/planos-e-precos' },
    { rotulo: 'Goomer, planos (consultado em 21/10/2026)', url: 'https://goomer.com.br/planos' },
    { rotulo: 'Anota AI, página inicial e planos (consultado em 21/10/2026)', url: 'https://anota.ai/' },
    { rotulo: 'Brendi, planos (consultado em 21/10/2026)', url: 'https://brendi.com.br/planos' },
    { rotulo: 'GrandChef, planos e adesão (consultado em 21/10/2026)', url: 'https://www.grandchef.com.br/adesao' },
    { rotulo: 'Consumer, site oficial (consultado em 21/10/2026)', url: 'https://www.consumer.com.br/' },
  ],
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Saipos:** gestão completa de restaurante, a partir de R$ 240,79 por mês no plano mensal, segundo a página oficial.',
        '**Anota AI e Goomer:** cardápio e pedidos por WhatsApp e link. Os dois escalam com o número de pedidos e entram perto de R$ 100 por mês.',
        '**Consumer:** PDV com versão grátis até 200 pedidos por mês. Os planos pagos são por módulos e sob consulta.',
        '**Antes de comparar:** olhe taxa de pagamento online, limite de pedidos, adesão e fidelidade, não só a mensalidade.',
        '**O que falta nos quatro:** a conta do que sobrou no mês. Conferido em 21/10/2026; confirme sempre na página oficial.',
      ],
    },
    {
      t: 'p',
      texto:
        'Não existe o melhor entre **Saipos, Anota AI, Goomer e Consumer**. Existe o que combina com o seu jeito de vender e com o tamanho da sua loja. Este comparativo junta o que cada empresa publica em suas páginas oficiais, com data, para você decidir sem chute.',
    },
    {
      t: 'p',
      texto:
        'Uma ressalva: são produtos de tipos diferentes. Por isso a comparação de preço vale como ponto de partida, não como veredito. Para o quadro geral de ferramentas, veja o guia de [sistema para restaurante](/blog/sistema-para-restaurante).',
    },

    { t: 'h2', texto: 'O que cada um desses sistemas é?' },
    {
      t: 'p',
      texto:
        'A **Saipos** se apresenta como sistema de gestão completo: financeiro, estoque, emissão de nota fiscal, KDS e integrações de delivery, com mais de 70 recursos segundo a própria página. Atende restaurante, delivery, pizzaria, franquia e outros formatos.',
    },
    {
      t: 'p',
      texto:
        'A **Anota AI** foca em atendimento e pedidos: um atendente de IA no WhatsApp que entende texto e áudio, cardápio digital e gestor de pedidos. A página também lista pedidos de balcão (PDV) e display de cozinha (KDS).',
    },
    {
      t: 'p',
      texto:
        'A **Goomer** vende cardápio digital em várias formas: delivery por link no WhatsApp, QR Code, tablet e totem. Os planos de delivery vão de um grátis, com limite de pedidos, até um que integra com PDV.',
    },
    {
      t: 'p',
      texto:
        'O **Consumer** é um sistema de PDV e gestão. O site destaca uma versão grátis do PDV até 200 pedidos por mês e mais de 100 funcionalidades. Os valores dos planos pagos, por módulos, não aparecem publicados.',
    },

    { t: 'h2', texto: 'Quanto custa cada um para começar?' },
    {
      t: 'p',
      texto:
        'O preço de entrada vai de **R$ 0 (com limite de pedidos) a R$ 240,79 por mês**, mas a conta de cada um mede coisas diferentes. A tabela mostra o mais barato que cada empresa publica, com o que vem junto.',
    },
    {
      t: 'tabela',
      cabecalho: ['Sistema', 'Preço de entrada', 'Limite de pedidos', 'Taxas e extras', 'Teste ou plano grátis'],
      linhas: [
        ['Saipos', 'A partir de R$ 240,79/mês (plano mensal)', 'Não informado na página', 'Recursos extras (como bot de WhatsApp e roteirização) à parte', 'Demonstração gratuita'],
        ['Anota AI', 'R$ 99,99/mês (mensal, até 150 pedidos)', '150 pedidos; depois R$ 199,99 e R$ 299,99', 'Taxas de pagamento online dentro do cardápio', '7 dias grátis, sem cartão'],
        ['Goomer (delivery)', 'R$ 0 (grátis) ou R$ 99,90/mês (Básico, mensal)', 'Grátis: 30 pedidos, depois R$ 1,39 por pedido; Básico: ilimitado', 'QR Code é um produto à parte (R$ 70/mês, segundo a página)', 'Plano grátis'],
        ['Consumer (PDV)', 'R$ 0 na versão grátis', 'Até 200 pedidos/mês na versão grátis', 'Planos pagos por módulos: sob consulta', 'Versão grátis'],
        ['Brendi (referência)', 'Mínimo de R$ 120/mês', 'Valor varia com o faturamento', 'Taxas só nos pedidos pagos online; taxa de operação e mídia à parte', '15 dias grátis, sem cartão'],
        ['GrandChef (referência)', 'R$ 90/mês (mensal)', 'Não informado na página', 'Adesão de R$ 100; NFC-e é módulo à parte', 'Teste grátis'],
      ],
      destaqueColuna: 1,
      legenda: 'Valores de entrada, no plano mensal, nas páginas oficiais. Planos anuais costumam sair mais barato por mês, mas exigem pagar um período maior.',
      fonte: 'Fontes: páginas oficiais de cada empresa. Conferido em 21/10/2026.',
    },
    {
      t: 'p',
      texto:
        'No gráfico a seguir, cada barra é o **menor valor mensal pago** que a empresa publica. A versão grátis do Consumer aparece como zero, mas vale só até 200 pedidos por mês e sem os módulos pagos.',
    },
    {
      t: 'grafico',
      tipo: 'barras',
      titulo: 'Preço de entrada por mês, em reais (a partir de)',
      subtitulo: 'Menor plano mensal pago publicado. Consumer: versão grátis limitada a 200 pedidos/mês.',
      dados: [
        { rotulo: 'Saipos', valor: 240.79, nota: 'a partir de, gestão completa' },
        { rotulo: 'Brendi', valor: 120, nota: 'mínimo, varia com o faturamento' },
        { rotulo: 'Anota AI', valor: 99.99, nota: 'até 150 pedidos/mês' },
        { rotulo: 'Goomer', valor: 99.9, nota: 'Básico; há plano grátis limitado' },
        { rotulo: 'GrandChef', valor: 90, nota: 'mais R$ 100 de adesão' },
        { rotulo: 'Consumer', valor: 0, destaque: true, nota: 'grátis até 200 pedidos/mês' },
      ],
      formato: 'brl',
      fonte: 'Páginas oficiais, conferido em 21/10/2026. Os produtos não são equivalentes entre si.',
    },
    {
      t: 'nota',
      tom: 'alerta',
      rotulo: 'Preços mudam',
      texto: 'Estes valores valem para 21/10/2026. Confira na página oficial antes de decidir, e peça por escrito o que está incluso, o limite de pedidos e as taxas de pagamento online.',
    },

    { t: 'h2', texto: 'Como o preço escala quando a loja cresce?' },
    {
      t: 'p',
      texto:
        'Em quase todos, **o valor sobe junto com o uso**. O preço de entrada só descreve o primeiro degrau, e o seu mês de pico costuma cair em um degrau mais alto.',
    },
    {
      t: 'p',
      texto:
        'Na Anota AI, o plano mensal sobe por faixa de pedidos: R$ 99,99 até 150 pedidos, R$ 199,99 de 151 a 250 e R$ 299,99 acima de 250. A página também oferece um plano anual com pedidos ilimitados, em 12 parcelas, e diz que o plano não cobra taxa por pedido, apenas as taxas dos pagamentos feitos dentro do cardápio.',
    },
    {
      t: 'p',
      texto:
        'Na Goomer, o plano grátis para em 30 pedidos por mês e cobra R$ 1,39 por pedido acima disso. O Básico (R$ 99,90 no mensal) tem pedidos ilimitados, e os planos acima somam chatbot e integração com PDV por R$ 184,90 e R$ 299,90 no mensal.',
    },
    {
      t: 'p',
      texto:
        'Na Saipos, o plano mensal parte de R$ 240,79, e o valor final depende do que você contrata: a página lista módulos extras. Na Brendi, o mínimo é R$ 120 e a página diz que o valor varia com o faturamento. No GrandChef, o mensal é R$ 90, com adesão de R$ 100. No Consumer, os planos pagos são sob consulta.',
    },
    { t: 'cta', cta: { tipo: 'teste', variante: 'nota' } },

    { t: 'h2', texto: 'Qual costuma servir a cada perfil de restaurante?' },
    {
      t: 'p',
      texto:
        'Cada um costuma servir a um perfil. Esta é uma leitura do que as páginas oficiais prometem, não uma recomendação: teste o que fizer sentido na sua rotina.',
    },
    {
      t: 'ul',
      itens: [
        '**Só delivery por link ou WhatsApp:** Goomer ou Anota AI. Os dois resolvem cardápio e pedido, e o Goomer tem plano grátis para pequenos volumes.',
        '**PDV completo, fiscal e cozinha integrados:** a Saipos se posiciona para isso, com nota fiscal, KDS e muitas integrações. O Consumer e o GrandChef também são PDV.',
        '**Começar sem pagar:** o PDV grátis do Consumer (até 200 pedidos por mês) e o plano grátis da Goomer (até 30 pedidos) permitem testar sem mensalidade.',
        '**Várias lojas:** a Saipos fala em dashboard de franquias e multi CNPJ, e a Goomer tem solução sob medida para quem tem mais de 10 unidades. Peça demonstração e pergunte como fica a visão consolidada.',
      ],
    },
    {
      t: 'p',
      texto:
        'Se o seu foco é reduzir a dependência de apps, leia também como a [taxa do iFood](/blog/taxa-do-ifood) pesa na conta de cada pedido antes de decidir quanto vale pagar por um canal próprio.',
    },

    { t: 'h2', texto: 'O que nenhum desses sistemas substitui?' },
    {
      t: 'p',
      texto:
        'PDV e cardápio digital cuidam do **pedido**: recebem, imprimem, mandam para a cozinha. A pergunta do fim do mês é outra: depois de tudo, **quanto sobrou**? Essa conta pede o financeiro junto, e é onde muita loja ainda usa planilha.',
    },
    {
      t: 'p',
      texto:
        'O Tá no Caixa existe para essa pergunta. Ele mostra quanto entrou, quanto saiu e quanto sobrou, com o lançamento do dia por canal (Pix, cartão, dinheiro e apps de delivery), nota fiscal por foto, compras, despesas e ponto de equilíbrio. **Ele não é PDV nem cardápio digital**: complementa um deles.',
    },
    {
      t: 'comparacao',
      colA: 'PDV ou cardápio digital',
      colB: 'Tá no Caixa',
      linhas: [
        { dim: 'Resolve', a: 'Receber e organizar pedidos, imprimir, enviar à cozinha', b: 'Mostrar quanto entrou, saiu e sobrou no mês' },
        { dim: 'Pergunta que responde', a: 'Quanto vendi e o que preciso preparar agora?', b: 'Quanto sobrou e quanto preciso vender para fechar no azul?' },
        { dim: 'Lançamento por canal', a: 'Vem do pedido, quando o sistema recebe o canal', b: 'Você lança Pix, cartão, dinheiro e cada app, todo dia' },
        { dim: 'Compras, despesas e DRE', a: 'Depende do sistema e do módulo contratado', b: 'Faz parte: notas por foto, despesas, DRE e plano do mês' },
        { dim: 'PDV e integração automática com apps', a: 'Sim, é a função principal', b: 'Em breve. Hoje o lançamento é manual' },
        { dim: 'Preço', a: 'Varia, como visto na tabela acima', b: 'R$ 149/mês com 1 loja (+ R$ 79 por loja a mais), com 14 dias grátis sem cartão' },
      ],
    },
    {
      t: 'p',
      texto: 'Na prática, os dois podem andar juntos: o PDV ou o cardápio para vender e o Tá no Caixa para saber se a venda virou lucro. Veja como fica a tela.',
    },
    {
      t: 'print',
      src: '/landing/dashboard.webp',
      alt: 'Painel do Tá no Caixa com entrou, saiu e sobrou do mês',
      url: 'app.tanocaixa.com/painel',
      legenda: 'O painel do Tá no Caixa junta o que entrou, o que saiu e o que sobrou no mês, sem depender de PDV específico.',
    },
    { t: 'cartao-link', slug: 'ponto-de-equilibrio-restaurante', rotulo: 'Para saber quanto vender para fechar no azul' },

    { t: 'h2', texto: 'Como decidir em 4 passos?' },
    {
      t: 'p',
      texto:
        'Decida pelo problema que você quer resolver agora, não pela lista de recursos. Estes quatro passos organizam a escolha em uma tarde.',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Escreva o que dói hoje', texto: 'Pedido perdido no WhatsApp, nota fiscal, cozinha desorganizada ou não saber quanto sobrou. Cada dor aponta para um tipo de ferramenta.' },
        { titulo: 'Conte seus pedidos por mês', texto: 'Muitos planos têm degraus por pedido. Use o mês de pico, não o mês fraco, para ver em qual faixa você cai.' },
        { titulo: 'Some o custo real', texto: 'Mensalidade, adesão, taxas de pagamento online e módulos extras. Monte a conta de 12 meses com o plano que você realmente usaria.' },
        { titulo: 'Teste com a sua operação', texto: 'Use o teste ou o plano grátis por uma semana com pedidos de verdade. Peça a quem fecha o caixa para opinar.' },
      ],
    },

    { t: 'h2', texto: 'Quais erros evitar ao comparar sistemas?' },
    {
      t: 'p',
      texto:
        'O erro mais comum é comparar só a mensalidade. Estes quatro aparecem sempre, e o checklist de escolha ajuda a não esquecer nenhum.',
    },
    {
      t: 'erros',
      itens: [
        { titulo: 'Olhar só a mensalidade', texto: 'O preço anunciado é o piso. Some adesão, módulos extras e taxas antes de comparar.' },
        { titulo: 'Esquecer a taxa de pagamento online', texto: 'Quando o cliente paga no cardápio, há taxa por transação. Em volume alto, ela pesa mais que a mensalidade.' },
        { titulo: 'Ignorar o limite de pedidos', texto: 'Passar da faixa muda o plano ou gera cobrança por pedido excedente. Compare no seu mês de pico.' },
        { titulo: 'Não perguntar sobre fidelidade e saída', texto: 'Pergunte se há multa, prazo mínimo e como exportar seus dados caso você queira trocar.' },
      ],
    },
    {
      t: 'p',
      texto:
        'Para levar à reunião com qualquer fornecedor, use o **checklist de escolha de sistema** que preparamos. Ele lista as perguntas sobre preço, suporte, fiscal, dados e contrato, para você receber respostas por escrito.',
    },

    { t: 'h2', texto: 'Perguntas frequentes sobre Saipos, Anota AI, Goomer e Consumer' },
    {
      t: 'faq',
      itens: [
        {
          p: 'Quanto custa a Saipos por mês?',
          r: 'A partir de R$ 240,79 por mês no plano mensal, segundo a página de planos conferida em 21/10/2026. O valor final depende do que você contrata, e a Saipos pede uma demonstração para detalhar a proposta.',
        },
        {
          p: 'Qual é melhor, Saipos ou Anota AI?',
          r: 'Depende do que você precisa. A Saipos se apresenta como gestão completa, com fiscal, estoque e financeiro. A Anota AI foca em atendimento por WhatsApp, cardápio digital e gestor de pedidos, com entrada em R$ 99,99 por mês (até 150 pedidos). Teste os dois com a sua operação.',
        },
        {
          p: 'Qual é a diferença entre Goomer e Anota AI?',
          r: 'Os dois vendem cardápio digital e pedidos por WhatsApp. Segundo as páginas oficiais, a Goomer tem plano grátis até 30 pedidos por mês e planos pagos a partir de R$ 99,90; a Anota AI tem teste de 7 dias e planos mensais por faixa de pedidos a partir de R$ 99,99. Compare no seu volume de pedidos.',
        },
        {
          p: 'O PDV do Consumer é grátis?',
          r: 'O site do Consumer informa uma versão grátis do PDV até 200 pedidos por mês. Os planos pagos são por módulos e o preço é sob consulta, então não dá para comparar valor sem pedir proposta.',
        },
        {
          p: 'A Anota AI cobra taxa por pedido?',
          r: 'A página da Anota AI diz que não há taxa por pedido nem comissão. As taxas citadas são as de pagamento feito dentro do cardápio, como Pix, cartão de crédito e carteiras digitais. Confirme os percentuais na hora de contratar.',
        },
        {
          p: 'O Tá no Caixa substitui o PDV ou o cardápio digital?',
          r: 'Não. Ele mostra quanto entrou, saiu e sobrou, e complementa o PDV ou o cardápio que você já usa. PDV e integração automática com apps de delivery estão em breve. O plano é R$ 149/mês com 1 loja (+ R$ 79 por loja a mais), com 14 dias grátis sem cartão.',
        },
      ],
    },
  ],
}

export default post
