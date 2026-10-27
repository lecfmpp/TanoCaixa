import type { Recurso } from './tipos'

/**
 * Iscas digitais: guias, checklists e planilhas gratuitos que os posts oferecem no final.
 * Os arquivos ficam em /public/downloads (gerados por `blog/recursos-src/`).
 */
export const RECURSOS: Recurso[] = [
  {
    id: 'planilha-cmv-ficha-tecnica',
    titulo: 'Planilha de CMV e ficha técnica',
    resumo: 'Calcule o custo de cada prato, o CMV do mês e o preço de venda com a margem que você quer.',
    descricao:
      'Uma planilha pronta, com fórmulas, para parar de chutar preço. Você lista os ingredientes de cada prato, informa o rendimento e a perda, e ela devolve o custo, o CMV em % e o preço sugerido para a margem que você escolher. Inclui o cálculo do CMV do mês (estoque inicial + compras − estoque final) e um exemplo preenchido de pizza.',
    formato: 'XLSX',
    arquivo: '/downloads/planilha-cmv-ficha-tecnica-tanocaixa.xlsx',
    tom: 'mata',
    inclui: [
      'Aba "Ficha técnica" com custo por ingrediente, rendimento e perda',
      'Preço sugerido a partir do CMV que você quer atingir',
      'Aba "CMV do mês" com estoque inicial, compras e estoque final',
      'Exemplo de pizza preenchido para você copiar o jeito',
    ],
    paraQuem: 'Quem precifica pratos, calcula CMV ou está montando as fichas técnicas do cardápio.',
    slugsRelacionados: ['como-calcular-cmv-restaurante', 'custo-da-pizza-pizzaria', 'cmv-restaurante-japones'],
  },
  {
    id: 'guia-lucro-por-pedido-ifood',
    titulo: 'Guia: quanto sobra de cada pedido do iFood',
    resumo: 'A conta completa do pedido em apps de delivery, com tabela de preço mínimo para cada margem.',
    descricao:
      'Um guia de três páginas para você descobrir o que sobra de verdade em um pedido de app. Mostra tudo que sai do valor do prato (comissão, pagamento online, entrega, cupom, embalagem, imposto e custo do insumo), traz a fórmula do preço mínimo para cada margem e uma folha em branco para refazer a conta com os seus números.',
    formato: 'PDF',
    arquivo: '/downloads/guia-lucro-por-pedido-ifood-tanocaixa.pdf',
    tom: 'telha',
    inclui: [
      'Tudo que sai do pedido: o que cada taxa leva de cada R$ 100',
      'Fórmula do preço mínimo para ter a margem que você quer',
      'Tabela de preços mínimos para margens de 5% a 20%',
      'Folha em branco para refazer a conta com os seus números',
    ],
    paraQuem: 'Quem vende por iFood, 99Food, Keeta ou outro app e quer saber se cada pedido paga a conta.',
    slugsRelacionados: ['taxa-do-ifood', 'cmv-hamburgueria'],
  },
  {
    id: 'checklist-fechamento-de-caixa',
    titulo: 'Checklist de fechamento de caixa do dia',
    resumo: 'Um passo a passo de 10 minutos para fechar o dia sabendo quanto entrou, quanto saiu e quanto sobrou.',
    descricao:
      'O fechamento que cabe no fim do serviço. Vendas por canal (balcão, mesa, apps), conferência de caixa e maquininha, sangrias e suprimentos, notas do dia, contas a pagar do dia seguinte e o número final do dia. Para imprimir e deixar no caixa.',
    formato: 'PDF',
    arquivo: '/downloads/checklist-fechamento-de-caixa-tanocaixa.pdf',
    tom: 'mar',
    inclui: [
      'Vendas do dia por canal: balcão, mesa, delivery próprio e apps',
      'Conferência de caixa, maquininha e Pix',
      'Notas e boletos do dia, para ninguém perder vencimento',
      'Campo do número final: entrou, saiu e sobrou',
    ],
    paraQuem: 'Quem fecha o caixa no fim do dia e quer um jeito simples e igual todos os dias.',
    slugsRelacionados: ['gestao-financeira-restaurante-arabe', 'ponto-de-equilibrio-restaurante'],
  },
  {
    id: 'checklist-escolher-sistema-restaurante',
    titulo: 'Checklist: 12 perguntas antes de assinar um sistema',
    resumo: 'As perguntas que evitam pagar por taxa escondida, fidelidade e módulo que você não usa.',
    descricao:
      'Doze perguntas para fazer em qualquer demonstração, de PDV, cardápio digital ou sistema financeiro: preço real depois da promoção, taxa por pedido, multa de cancelamento, o que acontece com os seus dados, quem dá suporte e em que horário, e o que exatamente está incluso. Espaço para anotar a resposta de cada fornecedor e comparar lado a lado.',
    formato: 'PDF',
    arquivo: '/downloads/checklist-escolher-sistema-restaurante-tanocaixa.pdf',
    tom: 'sol',
    inclui: [
      'As 12 perguntas, na ordem em que elas pesam no bolso',
      'Quadro para comparar até 3 fornecedores lado a lado',
      'Sinais de alerta em propostas e contratos',
      'Como testar na prática durante o período grátis',
    ],
    paraQuem: 'Quem está comparando sistemas (PDV, delivery ou financeiro) e quer decidir sem se arrepender.',
    slugsRelacionados: ['sistema-para-restaurante', 'comparativo-saipos-anota-ai-goomer-consumer'],
  },
]

export function acharRecurso(id: string): Recurso | undefined {
  return RECURSOS.find((r) => r.id === id)
}
