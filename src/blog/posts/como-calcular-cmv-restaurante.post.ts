import type { Post } from '../tipos'

/**
 * Cluster · palavra-chave: como calcular cmv (720) + como calcular o cmv (880) + cmv restaurante (880).
 * Sem fonte de terceiros: é conceito de contabilidade de custos. Todos os números são ILUSTRATIVOS e vêm rotulados.
 * A faixa de 28% a 35% é tratada como referência que muita gente usa, sem fonte.
 */
const post: Post = {
  slug: 'como-calcular-cmv-restaurante',
  titulo: 'Como calcular o CMV do restaurante (fórmula e exemplos)',
  tituloMeta: 'Como calcular o CMV do restaurante: fórmula e exemplo',
  descricao: 'CMV é estoque inicial + compras − estoque final, dividido pelo faturamento. Veja a conta passo a passo, o que entra, o CMV ideal e calcule o seu.',
  resumo: 'CMV é o custo da mercadoria vendida. Veja a fórmula, um exemplo com números, o que entra e o que não entra na conta e como saber se o seu está alto.',
  palavraChave: 'como calcular cmv',
  secundarias: ['como calcular o cmv', 'cmv restaurante', 'o que é cmv', 'cmv ideal restaurante', 'fórmula do cmv', 'planilha cmv'],
  tipo: 'cluster',
  categoria: 'Custos e CMV',
  publicadoEm: '2026-10-21',
  atualizadoEm: '2026-10-21',
  capa: {
    tipo: 'steps',
    etiqueta: 'CMV · A CONTA',
    itens: [
      { rotulo: 'Estoque inicial', valor: 8000 },
      { rotulo: 'Compras', valor: 15500 },
      { rotulo: 'Estoque final', valor: 7500 },
      { rotulo: 'CMV', valor: 16000 },
    ],
  },
  relacionados: ['sistema-para-restaurante', 'taxa-do-ifood', 'ponto-de-equilibrio-restaurante'],
  cta: { principal: { tipo: 'recurso', id: 'planilha-cmv-ficha-tecnica' }, secundario: { tipo: 'teste', variante: 'nota' } },
  blocos: [
    {
      t: 'tldr',
      itens: [
        '**Fórmula:** CMV = estoque inicial + compras − estoque final. Dividido pelo faturamento do período, vira o CMV em %.',
        '**O que entra:** só o que foi vendido: ingredientes, bebidas e embalagem. Aluguel, folha e energia ficam de fora.',
        '**Exemplo:** estoque inicial de R$ 8.000, compras de R$ 15.500 e estoque final de R$ 7.500 dão CMV de R$ 16.000. Em um mês de R$ 50.000, são 32%.',
        '**CMV ideal:** muita gente usa uma faixa de 28% a 35% como referência. Varia com a cozinha, o preço e a perda.',
        '**O erro mais comum:** não contar o estoque. Sem contagem, o número do CMV é chute.',
      ],
    },
    {
      t: 'p',
      texto:
        'CMV é o **custo da mercadoria vendida**: estoque inicial + compras − estoque final, dividido pelo faturamento. O resultado diz quanto de cada R$ 100 vendidos virou custo de ingrediente.',
    },
    {
      t: 'p',
      texto:
        'É o número que mais pesa na margem de um restaurante. Neste guia você vê a fórmula, uma conta completa com números, o que entra e o que não entra, e uma calculadora para fazer com o seu mês. Para ver onde o CMV se encaixa no resto da gestão, leia o guia de [sistema para restaurante](/blog/sistema-para-restaurante).',
    },

    { t: 'h2', texto: 'O que é CMV no restaurante?' },
    {
      t: 'p',
      texto:
        'CMV é a sigla de **custo da mercadoria vendida**. No restaurante, é o custo dos ingredientes, bebidas, insumos e embalagens que você consumiu para fazer o que vendeu naquele período.',
    },
    {
      t: 'p',
      texto:
        'Note a palavra “vendida”. Comprar R$ 20.000 de insumo no mês não significa CMV de R$ 20.000. Se parte ficou na prateleira, ela ainda é estoque e só vira custo quando sai para um prato. É por isso que a conta usa os dois estoques.',
    },
    {
      t: 'p',
      texto:
        'Tem outro uso da sigla que confunde: o **CMV de um prato**, que é quanto de ingrediente vai em uma porção. Os dois se parecem, mas respondem a perguntas diferentes. Vamos separar mais abaixo.',
    },

    { t: 'h2', texto: 'Qual é a fórmula do CMV?' },
    {
      t: 'p',
      texto: 'A fórmula é **CMV = estoque inicial + compras − estoque final**. Para virar porcentagem, divida o CMV pelo faturamento do mesmo período e multiplique por 100.',
    },
    {
      t: 'exemplo',
      titulo: 'CMV de um mês (números ilustrativos)',
      linhas: [
        { rotulo: 'Estoque inicial (o que havia no dia 1º)', valor: 'R$ 8.000,00' },
        { rotulo: '+ Compras do mês (ingredientes, bebidas, embalagens)', valor: 'R$ 15.500,00' },
        { rotulo: '− Estoque final (o que sobrou no último dia)', valor: '− R$ 7.500,00' },
        { rotulo: 'CMV do mês', valor: 'R$ 16.000,00', destaque: true },
        { rotulo: 'Faturamento do mês', valor: 'R$ 50.000,00' },
        { rotulo: 'CMV em % (16.000 ÷ 50.000)', valor: '32%', destaque: true },
      ],
      conclusao: 'De cada R$ 100 vendidos, **R$ 32 foram para ingredientes** e sobraram R$ 68 para pagar aluguel, folha, impostos e o lucro. Os números são de exemplo.',
    },
    {
      t: 'p',
      texto:
        'Repare que as compras foram R$ 15.500, mas o CMV foi R$ 16.000. O estoque caiu R$ 500 no mês, então você vendeu um pouco mais do que comprou. Se olhasse só as compras, subestimaria o custo.',
    },

    { t: 'h2', texto: 'Como calcular o CMV em 4 passos?' },
    {
      t: 'p',
      texto: 'Calcule sempre no mesmo período, de preferência o mês fechado. Os quatro passos abaixo cobrem a conta inteira e levam menos de uma hora quando a casa está organizada.',
    },
    {
      t: 'passos',
      itens: [
        { titulo: 'Conte o estoque no último dia do mês', texto: 'Contagem física, item por item, com quantidade e custo unitário. Câmara fria, freezer, seco, bebidas e embalagens. Esse número é o estoque final.' },
        { titulo: 'Use o estoque final do mês anterior como inicial', texto: 'Ele já foi contado. Se você nunca contou, comece hoje: o primeiro mês serve de ponto de partida.' },
        { titulo: 'Some as compras do período', texto: 'Notas de fornecedor do mês inteiro, só de mercadoria. Compra sem nota ou paga no dinheiro do caixa também entra.' },
        { titulo: 'Aplique a fórmula e divida pelo faturamento', texto: 'Estoque inicial + compras − estoque final = CMV. Depois, CMV ÷ faturamento × 100.' },
      ],
    },
    {
      t: 'nota',
      tom: 'dica',
      rotulo: 'Dica de contagem',
      texto: 'Conte sempre no mesmo horário e com a cozinha parada, de preferência na segunda de manhã ou depois do fechamento. Contar no meio do serviço duplica ou esquece item.',
    },

    { t: 'h2', texto: 'O que entra e o que não entra no CMV?' },
    {
      t: 'p',
      texto: 'Entra tudo o que **some quando o prato sai**. Não entra o custo que existe com a casa aberta, tendo ou não vendas.',
    },
    {
      t: 'tabela',
      cabecalho: ['Despesa', 'Entra no CMV?', 'Por quê'],
      linhas: [
        ['Carnes, hortifrúti, laticínios, secos', 'Sim', 'Virou prato'],
        ['Bebidas compradas para revenda', 'Sim', 'É mercadoria vendida'],
        ['Embalagem de delivery e viagem', 'Sim', 'Sai junto com o pedido'],
        ['Perda, vencimento e desperdício', 'Sim', 'Você comprou e não vendeu: o custo existe'],
        ['Aluguel, condomínio e IPTU', 'Não', 'Despesa fixa'],
        ['Salários, encargos e pró-labore', 'Não', 'Folha, não mercadoria'],
        ['Energia, gás de cozinha e água', 'Não', 'Despesa operacional'],
        ['Comissão de app, taxa de cartão', 'Não', 'Despesa sobre a venda (veja as [taxas dos apps de delivery](/blog/taxa-do-ifood))'],
        ['Material de limpeza e descartáveis de salão', 'Não, em geral', 'Despesa operacional; defina uma regra e mantenha'],
      ],
      destaqueColuna: 1,
      legenda: 'Cada empresa decide a regra dos itens limítrofes. O importante é manter a mesma regra todo mês. Em dúvida, fale com seu contador.',
    },
    {
      t: 'p',
      texto:
        'Gás de cozinha e funcionário da cozinha costumam gerar discussão. Na prática, a regra mais simples é: se você consegue ligar o item a um prato específico, é CMV; se existe mesmo sem vender nada, é despesa.',
    },

    { t: 'h2', texto: 'CMV do mês ou CMV por prato?' },
    {
      t: 'p',
      texto:
        'São duas contas complementares. O **CMV do mês** olha para o negócio inteiro, usando estoque e compras. O **CMV do prato** olha para uma receita, usando a ficha técnica.',
    },
    {
      t: 'p',
      texto:
        'O CMV do mês mostra **se** você tem um problema. O CMV do prato mostra **onde**. Um mês com 38% pode esconder uma pizza que custa 30% e um prato de camarão que custa 55%, e só a ficha técnica separa os dois.',
    },
    {
      t: 'p',
      texto:
        'Se o CMV do mês ficou acima do que as fichas técnicas dizem que deveria ficar, a diferença é perda, desperdício, porção fora do padrão ou venda sem registro. É a primeira pista para investigar.',
    },
    {
      t: 'p',
      texto:
        'Cada cozinha tem as suas armadilhas. Veja o custo de ingredientes da massa e do queijo em [custo da pizza](/blog/custo-da-pizza-pizzaria), o peso da carne e do pão no [CMV da hamburgueria](/blog/cmv-hamburgueria), a perda do peixe no [CMV do restaurante japonês](/blog/cmv-restaurante-japones) e a rotina financeira da [cozinha árabe](/blog/gestao-financeira-restaurante-arabe).',
    },

    { t: 'h2', texto: 'Qual é o CMV ideal de um restaurante?' },
    {
      t: 'p',
      texto:
        'Não existe um número único. Muita gente usa a faixa de **28% a 35%** como referência, mas ela varia com o tipo de cozinha, o preço praticado, a perda e o canal de venda. Trate como ponto de partida, não como meta.',
    },
    {
      t: 'p',
      texto:
        'O que importa é o que sobra depois dele. Um CMV de 38% pode ser saudável se o aluguel e a folha são baixos, e um de 28% pode quebrar a casa se o resto é pesado. O gráfico mostra o efeito em um mês de R$ 50.000 de faturamento.',
    },
    {
      t: 'grafico',
      tipo: 'barras',
      titulo: 'Quanto sobra para o resto da conta, por CMV',
      subtitulo: 'Exemplo ilustrativo: faturamento de R$ 50.000 no mês. Sobra = faturamento menos CMV, antes de aluguel, folha e impostos.',
      dados: [
        { rotulo: 'CMV de 28%', valor: 36000, nota: 'CMV de R$ 14.000' },
        { rotulo: 'CMV de 32%', valor: 34000, destaque: true, nota: 'CMV de R$ 16.000' },
        { rotulo: 'CMV de 38%', valor: 31000, nota: 'CMV de R$ 19.000' },
      ],
      formato: 'brl',
      fonte: 'Cálculo ilustrativo do autor, sem dado de mercado.',
    },
    {
      t: 'p',
      texto:
        'Cada ponto percentual de CMV, nesse mês, vale R$ 500. Cair de 38% para 32% libera R$ 3.000 por mês sem vender um prato a mais. Isso é o que torna o CMV a primeira conta a acompanhar.',
    },

    { t: 'h2', texto: 'Calcule o seu CMV agora' },
    {
      t: 'p',
      texto: 'Preencha estoque inicial, compras, estoque final e faturamento. A calculadora devolve o CMV em reais e em porcentagem. Se preferir a conta numa planilha, a planilha de CMV e ficha técnica, no fim deste guia, traz a mesma lógica pronta.',
    },
    { t: 'widget', id: 'cmv' },
    { t: 'cta', cta: { tipo: 'teste', variante: 'painel' } },

    { t: 'h2', texto: 'Por que o CMV sobe e como baixar?' },
    {
      t: 'p',
      texto:
        'O CMV sobe por **cinco motivos**: preço do fornecedor, porção maior que a da ficha, perda, mix de vendas que puxa para pratos de custo alto e compra que ninguém lança. Descubra qual é o seu antes de mexer em preço.',
    },
    {
      t: 'erros',
      itens: [
        { titulo: 'Não contar o estoque', texto: 'Sem contagem, o CMV vira “compras ÷ vendas” e esconde o excesso ou a falta de produto. Conte todo mês, no mesmo dia.' },
        { titulo: 'Aumentar o preço antes de achar o vazamento', texto: 'Se a perda é o problema, preço maior só adia a conta. Compare o CMV real com o das fichas técnicas.' },
        { titulo: 'Deixar a porção ao gosto do cozinheiro', texto: 'Duas conchas a mais de molho por prato, o dia inteiro, viram um número no fim do mês. Pese e padronize.' },
        { titulo: 'Esquecer de lançar a compra', texto: 'Nota guardada na gaveta e feira paga em dinheiro ficam fora. O CMV parece menor do que é.' },
      ],
    },
    {
      t: 'p',
      texto:
        'Para baixar, ataque na ordem: **registre toda compra**, conte o estoque, padronize as porções, negocie os três itens mais caros e revise o preço dos pratos com margem apertada. Mexer no cardápio é o último recurso.',
    },
    {
      t: 'citacao',
      texto: 'CMV que ninguém conta não é CMV, é torcida.',
    },

    { t: 'h2', texto: 'Como achar o CMV na DRE?' },
    {
      t: 'p',
      texto:
        'Na DRE, o CMV aparece logo abaixo da receita. A receita menos o CMV dá o **lucro bruto**, e é dele que saem as despesas de aluguel, folha e o resto até chegar ao resultado final.',
    },
    {
      t: 'p',
      texto:
        'O Tá no Caixa tem uma DRE com o CMV explicado em linguagem de dono, pronta para mostrar ao contador. As compras entram quando você fotografa a nota fiscal, e a DRE mostra o resultado do mês. O **CMV por ficha técnica está em breve**: hoje o sistema não calcula o custo de cada prato.',
    },
    { t: 'cartao-link', slug: 'ponto-de-equilibrio-restaurante', rotulo: 'Próximo passo: quanto vender para pagar as contas' },

    { t: 'h2', texto: 'Perguntas frequentes sobre o CMV' },
    {
      t: 'faq',
      itens: [
        { p: 'Como calcular o CMV no Excel?', r: 'Crie quatro células: estoque inicial, compras, estoque final e faturamento. O CMV é `=inicial + compras − final`, e o percentual é `=CMV / faturamento`. A planilha de CMV e ficha técnica, no fim deste guia, já traz as fórmulas prontas.' },
        { p: 'Qual é o CMV ideal?', r: 'Não há um número único. Muita gente usa 28% a 35% como referência, mas o ideal depende do tipo de cozinha, do preço e da perda. O que vale é acompanhar o seu mês a mês e olhar quanto sobra depois dele.' },
        { p: 'Como se calcula o custo do produto vendido?', r: 'Soma-se o estoque inicial com as compras do período e subtrai-se o estoque final. O resultado é o custo do que foi vendido. Divida pelo faturamento para ter o percentual.' },
        { p: 'Como achar o CMV na DRE?', r: 'Ele fica logo abaixo da receita de vendas. Receita menos CMV dá o lucro bruto, e dele saem as despesas até o resultado do mês.' },
        { p: 'O que não entra no CMV?', r: 'Aluguel, folha, energia, gás, taxas de cartão e comissão de app. São despesas, não mercadoria. Em itens duvidosos, defina uma regra e fale com seu contador.' },
        { p: 'Com que frequência devo calcular o CMV?', r: 'Todo mês, no fechamento, com contagem física do estoque. Casas com muito desperdício podem contar toda semana os itens mais caros, como carnes e bebidas.' },
      ],
    },
  ],
}

export default post
