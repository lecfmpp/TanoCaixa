import type { Post } from '../tipos'

/**
 * Nicho · palavra-chave: cmv restaurante japonês (cauda longa) + custo do sushi, ficha técnica sushi.
 * Os únicos dados externos são as taxas do iFood (Plano Básico 12% + 3,2%; Plano Entrega 23% + 3,2%),
 * conferidas em 21/10/2026 nas páginas oficiais (ver `fontes`). Todos os custos, pesos e rendimentos
 * dos exemplos são ILUSTRATIVOS e vêm rotulados assim no texto.
 */
const post: Post = {
  slug: 'cmv-restaurante-japones',
  titulo: 'CMV de restaurante japonês: como controlar o custo do sushi',
  tituloMeta: 'CMV de restaurante japonês: controle o custo do sushi',
  descricao: 'Veja como calcular o CMV do restaurante japonês: rendimento do salmão, ficha técnica do combinado, perda de peixe e delivery, com contas de exemplo.',
  resumo: 'No japonês, o CMV se decide no peixe: preço por kg, rendimento depois da limpeza e perda por validade. Veja a conta do combinado, passo a passo.',
  palavraChave: 'cmv restaurante japonês',
  secundarias: ['custo do sushi', 'ficha técnica sushi', 'rendimento do salmão', 'custo do combinado de sushi', 'perda de peixe no restaurante japonês', 'rodízio de sushi custo', 'margem de lucro restaurante japonês', 'delivery japonês'],
  tipo: 'nicho',
  categoria: 'Por tipo de cozinha',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'bars',
    etiqueta: 'JAPONÊS · CMV',
    itens: [
      { rotulo: 'Rendimento 80%', valor: 39.3 },
      { rotulo: 'Rendimento 70%', valor: 42.5 },
      { rotulo: 'Rendimento 60%', valor: 46.8 },
    ],
  },
  relacionados: ['sistema-para-restaurante', 'como-calcular-cmv-restaurante', 'taxa-do-ifood'],
  cta: { principal: { tipo: 'recurso', id: 'planilha-cmv-ficha-tecnica' }, secundario: { tipo: 'teste', variante: 'nota' } },
  fontes: [
    { rotulo: 'iFood, página oficial de planos para restaurantes (consultada em 21/10/2026)', url: 'https://parceiros.ifood.com.br/restaurante/planos-ifood' },
    { rotulo: 'iFood para Parceiros: Taxas do iFood (atualizado em 15/09/2026; valores vigentes em 23/06/2026)', url: 'https://blog-parceiros.ifood.com.br/taxas-ifood/' },
    { rotulo: 'iFood para Parceiros: Plano Básico ou Plano Entrega (atualizado em 09/09/2026)', url: 'https://blog-parceiros.ifood.com.br/planos-ifood/' },
  ],
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Onde o CMV se decide:** no peixe. O que pesa é o preço por kg *dividido pelo rendimento*, não o preço da nota.',
        '**Rendimento:** pese o peixe inteiro, limpe, pese de novo e divida. Custo útil por kg = preço do kg ÷ rendimento.',
        '**Perda:** peixe fresco não espera. Registre todo dia o que foi para o lixo, senão ela vira "custo invisível".',
        '**Delivery:** embalagem e comissão do app entram na conta do combinado. No iFood, são 15,2% (Básico) ou 26,2% (Entrega) por pedido pago no app.',
        '**Números deste guia:** são exemplos ilustrativos. Pese e some os seus; o rendimento do seu salmão é o que você medir na sua bancada.',
      ],
    },
    {
      t: 'p',
      texto:
        'O **CMV do restaurante japonês** costuma ser decidido por um ingrediente só: o peixe. Arroz, nori e cream cheese fazem barulho na ficha técnica, mas é o salmão, a única coisa cara que também estraga rápido, que decide se o mês fecha no azul.',
    },
    {
      t: 'p',
      texto:
        'Este guia mostra como calcular o **custo do sushi** peça por peça, como medir o rendimento do salmão, o que fazer com as aparas e como o mix de vendas, o rodízio e o delivery mexem no resultado. Para a base da conta, veja antes como [calcular o CMV do restaurante](/blog/como-calcular-cmv-restaurante).',
    },

    { t: 'h2', texto: 'Por que o CMV do restaurante japonês é diferente?' },
    {
      t: 'p',
      texto:
        'Porque o ingrediente principal perde peso antes de virar prato e perde validade depois de comprado. Na pizzaria, a mussarela entra inteira na massa. No japonês, parte do peixe vai embora na pele, na espinha e nas aparas, e o que sobra precisa sair rápido.',
    },
    {
      t: 'p',
      texto:
        'Isso cria dois custos que a nota fiscal não mostra: o **rendimento** (quanto do peso comprado vira peça vendável) e a **perda por validade** (o que estragou antes de ser vendido). Quem calcula o CMV só com o preço da nota subestima o custo e passa meses achando que a margem é maior do que é.',
    },
    {
      t: 'p',
      texto:
        'Além do peixe, entram arroz, alga (nori), cream cheese, vegetais, molhos e insumos importados, que mudam de preço com o dólar e com o fornecedor. Vale cadastrar cada um na ficha técnica e atualizar quando a nota chegar.',
    },

    { t: 'h2', texto: 'Como calcular o rendimento do salmão?' },
    {
      t: 'p',
      texto:
        'Divida o peso limpo pelo peso bruto. O resultado é o rendimento, e o **custo útil por kg** é o preço do kg dividido por ele. Não existe um rendimento "padrão" que valha para todo mundo: ele muda com o corte comprado, o fornecedor e quem limpa o peixe. Pese o seu.',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Pese o peixe como chegou', texto: 'Anote o peso bruto e o preço pago por kg. Use a nota de compra e a balança da cozinha.' },
        { titulo: 'Limpe como faz no serviço', texto: 'Tire pele, espinha, sangue e as partes escuras, do jeito que o seu sushiman faz de verdade.' },
        { titulo: 'Pese o que ficou', texto: 'É o peso limpo, o que pode virar peça. Pese também as aparas separadas: você vai usar na seção abaixo.' },
        { titulo: 'Divida e guarde o resultado', texto: 'Rendimento = peso limpo ÷ peso bruto. Refaça a cada lote ou fornecedor novo, porque o número muda.' },
      ],
    },
    {
      t: 'exemplo',
      titulo: 'Do preço do kg ao custo por peça (números ilustrativos)',
      linhas: [
        { rotulo: 'Salmão comprado: 1.000 g a R$ 90,00/kg', valor: 'R$ 90,00' },
        { rotulo: 'Peso limpo depois da limpeza (exemplo: 700 g)', valor: '70% de rendimento' },
        { rotulo: 'Custo útil por kg = R$ 90,00 ÷ 0,70', valor: 'R$ 128,57' },
        { rotulo: 'Salmão em um combinado de 20 peças (140 g limpos)', valor: 'R$ 18,00' },
        { rotulo: 'Custo do salmão por peça (R$ 18,00 ÷ 20)', valor: 'R$ 0,90', destaque: true },
      ],
      conclusao: 'Se o rendimento do seu salmão for outro, a conta muda. O que importa é usar o **seu** número, medido na sua cozinha, e não o preço da nota.',
    },

    { t: 'h2', texto: 'Qual é a ficha técnica de um combinado de sushi?' },
    {
      t: 'p',
      texto:
        'A ficha lista cada ingrediente do combinado com a quantidade usada, o custo e a perda, e soma tudo mais a embalagem. Você tem uma amostra na calculadora abaixo, com um combinado de 20 peças. Troque os valores pelos seus e veja o custo, o CMV e o preço sugerido para o alvo que você quer.',
    },
    { t: 'widget', id: 'custo-prato', preset: 'sushi' },
    {
      t: 'p',
      texto:
        'Os valores do widget são de exemplo, ilustrativos. Repare em quanto o salmão pesa no total e em como o campo de perda aumenta o custo real do ingrediente. É a mesma lógica do rendimento, só que escrita como perda: 25% de perda e 75% de rendimento são o mesmo número.',
    },
    { t: 'cta', cta: { tipo: 'teste', variante: 'painel' } },
    {
      t: 'grafico',
      tipo: 'empilhada',
      titulo: 'Para onde vai cada R$ 100 de um combinado de R$ 69,90',
      subtitulo: 'Exemplo ilustrativo: salmão a 70% de rendimento e embalagem de R$ 3,50. Em % do preço de venda.',
      partes: [
        { rotulo: 'Salmão (R$ 18,00)', valor: 25.8, tom: 'telha' },
        { rotulo: 'Arroz', valor: 3.4, tom: 'areia' },
        { rotulo: 'Nori', valor: 2.3, tom: 'noite' },
        { rotulo: 'Cream cheese', valor: 3.1, tom: 'sol' },
        { rotulo: 'Vegetais e molhos', valor: 2.9, tom: 'cinza' },
        { rotulo: 'Embalagem', valor: 5, tom: 'mar' },
        { rotulo: 'Sobra, antes de mão de obra, imposto e taxas', valor: 57.5, tom: 'mata' },
      ],
      formato: 'pct',
      fonte: 'Custos hipotéticos do exemplo; troque pelos seus.',
    },
    {
      t: 'p',
      texto: 'O peixe sozinho leva mais de um quarto do preço, e o resto dos insumos somados não chega perto. Por isso vale gastar tempo medindo o rendimento antes de renegociar o preço do arroz.',
    },

    { t: 'h2', texto: 'Quanto o rendimento muda o CMV do combinado?' },
    {
      t: 'p',
      texto:
        'Muda bastante: no exemplo, passar de 80% para 60% de rendimento leva o CMV do combinado de cerca de 39% para quase 47%. O preço do kg e o preço de venda não mudaram nada. Só o aproveitamento caiu.',
    },
    {
      t: 'tabela',
      cabecalho: ['Rendimento do salmão', 'Custo útil por kg', 'Salmão no combinado (140 g)', 'Custo total com embalagem', 'CMV sobre R$ 69,90'],
      linhas: [
        ['80%', 'R$ 112,50', 'R$ 15,75', 'R$ 27,45', '39,3%'],
        ['70%', 'R$ 128,57', 'R$ 18,00', 'R$ 29,70', '42,5%'],
        ['60%', 'R$ 150,00', 'R$ 21,00', 'R$ 32,70', '46,8%'],
      ],
      destaqueColuna: 4,
      legenda: 'Exemplo ilustrativo: salmão a R$ 90,00/kg, demais insumos R$ 8,20 e embalagem R$ 3,50 por combinado.',
      fonte: 'Cálculo do autor com custos hipotéticos.',
    },
    {
      t: 'p',
      texto:
        'Cada ponto de rendimento perdido pede um preço de venda maior ou uma margem menor. Quem não mede só percebe quando o dinheiro some no fim do mês. Para saber quanto cada ponto de CMV custa em reais, veja o guia de [ponto de equilíbrio do restaurante](/blog/ponto-de-equilibrio-restaurante).',
    },

    { t: 'h2', texto: 'Dá para aproveitar as aparas do peixe?' },
    {
      t: 'p',
      texto:
        'Dá, e é uma das formas mais baratas de baixar o CMV. As aparas e os cortes que não servem para sashimi ou nigiri podem virar receita, desde que estejam frescos e saiam rápido.',
    },
    {
      t: 'p',
      texto:
        'Usos comuns na cozinha japonesa: recheio de temaki e hot roll, tartare, pasta para uramaki e temperado para poke. Cada um precisa de ficha própria, com o custo da apara (que já foi paga no preço do kg) e o que mais entra. Se você ignora as aparas, o rendimento real da cozinha é maior do que o da bancada; se vende tudo, o custo útil do kg cai.',
    },
    {
      t: 'nota',
      tom: 'alerta',
      rotulo: 'Segurança alimentar',
      texto: 'Peixe cru exige cuidado. Siga as normas da vigilância sanitária e mantenha a cadeia de frio do recebimento ao balcão. Se tiver dúvida sobre o que pode ou não ser reaproveitado, consulte um responsável técnico.',
    },

    { t: 'h2', texto: 'Como o mix do cardápio muda o CMV do mês?' },
    {
      t: 'p',
      texto:
        'O CMV do mês é uma média ponderada, e quem manda no peso é o que mais sai. Sashimi e nigiri carregam mais peixe por real vendido; rolls, com arroz, nori e recheios, costumam carregar menos; pratos quentes seguem outra conta. Se o cliente passa a pedir mais sashimi, o CMV geral sobe sem que nenhum preço tenha mudado.',
    },
    {
      t: 'p',
      texto:
        'Por isso vale ter o CMV **por grupo** (sashimi, rolls, quentes, combinados) e não só o geral. Dá para empurrar o item de melhor margem sem esconder o que o cliente mais quer.',
    },
    {
      t: 'p',
      texto: 'Meça o CMV de cada grupo uma vez por mês e compare. O grupo que subiu mostra onde está o problema: preço do peixe, rendimento ou desperdício.',
    },

    { t: 'h2', texto: 'Rodízio ou à la carte: qual compensa mais?' },
    {
      t: 'p',
      texto:
        'Nenhum dos dois é melhor em si: a conta muda porque, no rodízio, você vende um preço fixo e deixa o consumo livre. O que decide é o custo médio *por cliente*, não o custo de cada peça.',
    },
    {
      t: 'comparacao',
      colA: 'Rodízio',
      colB: 'À la carte',
      linhas: [
        { dim: 'Receita por cliente', a: 'Fixa, definida pelo preço do rodízio', b: 'Varia com o que cada cliente pede' },
        { dim: 'Custo por cliente', a: 'Varia com o consumo; é o que você precisa estimar', b: 'Conhecido por prato, via ficha técnica', aOk: false, bOk: true },
        { dim: 'Risco principal', a: 'Cliente que pede só as peças de maior custo', b: 'Preço mal calculado em algum prato' },
        { dim: 'Desperdício', a: 'Sobra no prato do cliente (política da casa)', b: 'Sobra na bancada, mais controlável', aOk: false, bOk: true },
        { dim: 'O que acompanhar', a: 'Custo total de insumos ÷ clientes atendidos', b: 'CMV por prato e por grupo do cardápio' },
      ],
    },
    {
      t: 'p',
      texto:
        'No rodízio, a conta que importa é **custo total dos insumos do período dividido pelo número de clientes**. Compare com o preço cobrado. Se o custo médio por cliente chegou perto do preço, o rodízio está vendendo prejuízo, e só dá para ver isso com o registro diário de compras e de clientes.',
    },

    { t: 'h2', texto: 'Como controlar compra, estoque e perda do peixe?' },
    {
      t: 'p',
      texto:
        'Compre para poucos dias, registre a nota no mesmo dia e anote toda perda. Peixe fresco tem giro curto: o que sobra da semana estraga antes de virar dinheiro. Já os itens secos ou congelados aguentam mais estoque, e vale comprar em volume quando o preço compensar.',
    },
    {
      t: 'ul',
      itens: [
        '**Lance a nota na hora:** o preço do kg de hoje é o que alimenta o custo do prato. Nota esquecida vira CMV desatualizado.',
        '**Separe fresco e congelado:** cada um tem rendimento, validade e preço próprios. Misturar os dois na mesma ficha engana a conta.',
        '**Registre a perda todo dia:** peixe vencido, parada de produção, devolução. Uma lista simples no fechamento já resolve.',
        '**Faça contagem de estoque:** semanal para peixe, mensal para o resto. A diferença entre o que deveria ter e o que tem mostra o desperdício.',
        '**Revise o fornecedor:** compare o preço *útil* por kg, não o preço da nota. O mais barato nem sempre é o que rende mais.',
      ],
    },
    {
      t: 'print',
      src: '/landing/compras.webp',
      alt: 'Tela de compras do Tá no Caixa, com notas lançadas por foto',
      url: 'app.tanocaixa.com/painel/compras',
      legenda: 'No Tá no Caixa, você fotografa a nota de compra e o app lê o cabeçalho. A ficha técnica com CMV automático ainda está em breve.',
    },

    { t: 'h2', texto: 'O que muda no CMV do delivery japonês?' },
    {
      t: 'p',
      texto:
        'No delivery entram duas despesas que o salão não tem: a **embalagem** e a **comissão do app**. O combinado pode ter o mesmo CMV do salão e, mesmo assim, deixar bem menos no caixa.',
    },
    {
      t: 'p',
      texto:
        'A embalagem do japonês pesa mais que a de outras cozinhas porque quase tudo vai separado: shoyu, hashi, gengibre, wasabi e, muitas vezes, uma embalagem térmica ou individual por tipo de peça. Coloque cada item na ficha, em vez de usar um valor médio "de cabeça".',
    },
    {
      t: 'tabela',
      cabecalho: ['Plano do iFood', 'Comissão', 'Pagamento online', 'Total por pedido pago no app', 'Em um combinado de R$ 69,90'],
      linhas: [
        ['Plano Básico (entrega sua)', '12%', '3,2%', '15,2%', 'R$ 10,62'],
        ['Plano Entrega (entrega do iFood)', '23%', '3,2%', '26,2%', 'R$ 18,31'],
      ],
      destaqueColuna: 3,
      legenda: 'Mensalidade à parte para quem fatura mais de R$ 1.800 por mês no iFood.',
      fonte: 'Fonte: iFood, página de planos. Conferido em 21/10/2026. O combinado de R$ 69,90 é um exemplo.',
    },
    {
      t: 'p',
      texto:
        'Some a comissão e a embalagem ao custo dos insumos e compare com o que sobra no salão. Se o delivery não deixa o que você precisa, ajuste o preço do canal. A conta completa do app está no guia da [taxa do iFood](/blog/taxa-do-ifood), com calculadora.',
    },
    { t: 'cartao-link', slug: 'taxa-do-ifood', rotulo: 'Para a conta do delivery' },

    { t: 'h2', texto: 'Quais erros fazem o CMV do japonês estourar?' },
    {
      t: 'p',
      texto: 'Quase sempre o erro está na medição, não na compra. Estes quatro aparecem muito.',
    },
    {
      t: 'erros',
      itens: [
        { titulo: 'Calcular o custo pelo preço da nota', texto: 'O kg comprado não é o kg vendável. Divida pelo rendimento para chegar ao **custo útil**.' },
        { titulo: 'Usar um rendimento de "tabela"', texto: 'Cada corte, fornecedor e limpeza rendem diferente. Pese o **seu** peixe a cada lote novo.' },
        { titulo: 'Esquecer a perda por validade', texto: 'Peixe vencido é custo que não aparece na ficha. Registre o descarte todo dia, mesmo o pequeno.' },
        { titulo: 'Ignorar embalagem e comissão no delivery', texto: 'O combinado pode dar lucro no salão e prejuízo no app. Calcule a sobra **por canal**.' },
      ],
    },
    {
      t: 'p',
      texto:
        'Depois de acertar a ficha, o passo seguinte é acompanhar o CMV do mês de verdade, com compras, estoque e vendas no mesmo lugar. Se quiser entender o que olhar além da ficha, veja o guia de [sistema para restaurante](/blog/sistema-para-restaurante).',
    },

    { t: 'h2', texto: 'Perguntas frequentes sobre o CMV do restaurante japonês' },
    {
      t: 'faq',
      itens: [
        { p: 'Qual é o CMV de um restaurante japonês?', r: 'Varia de casa para casa, porque depende do mix do cardápio, do preço do peixe e do rendimento. Muita gente usa faixas de referência de mercado, mas o número que vale é o seu. Calcule: (estoque inicial + compras − estoque final) ÷ vendas do período.' },
        { p: 'Como calcular o custo do sushi?', r: 'Faça a ficha técnica do prato: liste cada ingrediente com a quantidade usada, divida o preço do kg pelo rendimento para chegar ao custo útil, some a embalagem e divida o total pelo preço de venda para achar o CMV do prato.' },
        { p: 'Como calcular o rendimento do salmão?', r: 'Pese o peixe como chegou, limpe, pese o que ficou e divida o peso limpo pelo bruto. O custo útil por kg é o preço do kg dividido pelo rendimento. Meça no seu lote, porque o valor muda com corte e fornecedor.' },
        { p: 'Vale a pena fazer rodízio de sushi?', r: 'Depende do custo médio por cliente. No rodízio a receita é fixa e o consumo é livre, então divida o custo total dos insumos pelo número de clientes e compare com o preço cobrado. Sem esse registro, é difícil saber se a conta fecha.' },
        { p: 'Posso aproveitar as aparas do peixe?', r: 'Em geral, sim, desde que estejam frescas e sejam usadas rápido, em temaki, hot roll, tartare ou pasta de recheio. Siga as normas da vigilância sanitária e a cadeia de frio. Cada receita com apara precisa da própria ficha técnica.' },
      ],
    },
  ],
}

export default post
