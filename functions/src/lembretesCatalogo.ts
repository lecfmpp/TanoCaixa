/* ------------------------------------------------------------------ *
 * Catálogo dos lembretes de WhatsApp com imagem (1 imagem 1080x1080 por tipo).
 * A imagem é fixa e só traz título curto; o conteúdo do dia vai na legenda
 * (`corpo`, com variáveis {entre chaves}). Textos: ver whatsappTexto.ts para o tom.
 *
 * As imagens ficam no Firebase Storage, em `lembretes-whatsapp/`, lidas por URL
 * com token de download (não depende de regra do Storage). Para reenviar os
 * arquivos: functions/scripts/subir-imagens-lembretes.sh
 * ------------------------------------------------------------------ */

export const BUCKET = 'tanocaixa.firebasestorage.app'
export const PASTA_IMAGENS = 'lembretes-whatsapp'
/** Os links dos lembretes abrem o app aqui. */
export const URL_DO_APP = 'https://tanocaixa.com'

export interface Lembrete {
  /** Nome do arquivo em PASTA_IMAGENS. */
  arquivo: string
  /** Token de download (parte da URL pública da imagem). */
  token: string
  grupo: string
  /** Quando o lembrete deve ser enviado. */
  gatilho: string
  /** Página exata do app (caminho + ?acao=) onde a pessoa faz o que o lembrete pede. */
  link: string
  /** Legenda com variáveis {entre chaves}. */
  corpo: string
  /** Legendas alternativas para a mesma imagem. */
  variantes?: Record<string, string>
}

export const LEMBRETES = {
  vendas_do_dia: {
    arquivo: "01-vendas-do-dia.png",
    token: "108ccae8-527b-49e2-8187-9cf340494d29",
    grupo: "Rotina diária",
    gatilho: "Nenhuma venda lançada no dia",
    link: "/painel/caixa?acao=fechamento",
    corpo: "💵 *Hoje ainda não há vendas lançadas*\nQuando fizer sentido, abra o Caixa e registre o total do dia. Com isso o fluxo de caixa fica certo e o resumo de amanhã sai fiel.\n_{restaurante}_",
  },
  caixa_aberto: {
    arquivo: "02-caixa-aberto.png",
    token: "8dfc7fd1-33dd-4a73-ab99-c88bb24b5544",
    grupo: "Rotina diária",
    gatilho: "Caixa do PDV aberto desde o dia anterior",
    link: "/painel/pdv/caixa",
    corpo: "🔒 *O caixa #{n} segue aberto desde {aberto_desde}*\nAo fechar, o app confere o total vendido e fecha a receita do dia automaticamente.\n_{restaurante}_",
  },
  notas_do_dia: {
    arquivo: "03-notas-do-dia.png",
    token: "8ad23bb1-8a7a-4307-9cb4-72c122d8924b",
    grupo: "Rotina diária",
    gatilho: "Fim do dia sem nota lançada",
    link: "/painel/compras?acao=compra",
    corpo: "🧾 *Se chegou nota hoje, vale lançar hoje*\nBasta fotografar. O estoque dá entrada, o custo dos produtos se atualiza e o contas a pagar já fica em dia.\n_{restaurante}_",
  },
  vencimentos: {
    arquivo: "04-contas-a-vencer.png",
    token: "dc193ef7-136b-4079-b8b5-adadc53343d2",
    grupo: "Contas e compras",
    gatilho: "Contas a vencer ou vencidas",
    link: "/painel/compras",
    corpo: "⏰ *{titulo}*\n{itens}\nAo pagar, marque como pago em Compras ou Despesas para sair da lista.\n_{restaurante}_",
  },
  alta_de_preco: {
    arquivo: "05-preco-em-alta.png",
    token: "86c33555-ad6b-4b23-9e21-d46585984a23",
    grupo: "Contas e compras",
    gatilho: "Item com reajuste de preço",
    link: "/painel/compras",
    corpo: "📈 *{item} subiu {pct}% na {fornecedor}*\nDe {preco_antigo} para {preco_novo} o {unidade}, na compra de {data}. Vale comparar com outro fornecedor ou revisar o preço dos pratos que usam esse item.\n_{restaurante}_",
  },
  relatorio_compras: {
    arquivo: "06-compras-do-mes.png",
    token: "115b950e-bf29-4e38-a326-b0d7629a2027",
    grupo: "Contas e compras",
    gatilho: "Início do mês (relatório do mês anterior)",
    link: "/painel/compras",
    corpo: "🛒 *{mes}: {total} em {n_notas} notas*\nMaior fornecedor: {fornecedor} ({valor}, {pct}%). Maior alta de preço: {item}, +{pct_alta}%.\nO relatório por fornecedor está em Compras e dá para exportar em CSV.\n_{restaurante}_",
    variantes: {"sem_alta":"🛒 *{mes}: {total} em {n_notas} notas*\nMaior fornecedor: {fornecedor} ({valor}, {pct}%).\nO relatório por fornecedor está em Compras e dá para exportar em CSV.\n_{restaurante}_"},
  },
  contagem_estoque: {
    arquivo: "07-contagem-de-estoque.png",
    token: "283e6f5e-605b-4b2d-9c8d-e46036676452",
    grupo: "Estoque",
    gatilho: "Última contagem antiga (substitui o lembrete dos dias 1 e 28)",
    link: "/painel/estoque",
    corpo: "🗓️ *A última contagem foi em {data}*\nUma nova contagem mantém o CMV e o que saiu de cada item no real. O melhor momento é com a loja fechada.\n_{restaurante}_",
  },
  diferenca_estoque: {
    arquivo: "08-diferenca-no-estoque.png",
    token: "1c9ab1c5-a826-440a-812e-0543e95f8956",
    grupo: "Estoque",
    gatilho: "Saída de item maior que as vendas explicam",
    link: "/painel/estoque",
    corpo: "⚠️ *{item} saiu {qtd} a mais do que as vendas explicam*\nEntre as contagens de {data_1} e {data_2}. Pode ser perda, quebra ou uma nota ainda não lançada. Se foi perda, registrar ajuda a manter o CMV certo.\n_{restaurante}_",
  },
  plano_do_mes: {
    arquivo: "09-plano-do-mes.png",
    token: "22a2df5b-5bf9-4b1f-be0d-d730cba8b01d",
    grupo: "Planejamento",
    gatilho: "Mês começou sem plano definido",
    link: "/painel/plano",
    corpo: "🎯 *{mes} começou e o plano ainda não foi definido*\nCom a meta de faturamento e os tetos de cada grupo, o app mostra ao longo do mês se mercadoria, pessoal e taxas estão dentro do planejado.\n_{restaurante}_",
  },
  dre_mes_anterior: {
    arquivo: "10-dre-fechado.png",
    token: "1cf5d768-b2cc-4df1-b4b4-259140c19933",
    grupo: "Planejamento",
    gatilho: "DRE do mês anterior fechado",
    link: "/painel/dre",
    corpo: "📑 *{mes} fechou com lucro líquido de {valor} ({pct}% da receita)*\nCMV em {cmv}%, com meta de {meta}%. Vale uma olhada com calma na tela DRE antes de planejar o mês.\n_{restaurante}_",
  },
  ponto_equilibrio: {
    arquivo: "11-ponto-de-equilibrio.png",
    token: "d0960f50-2987-4bd6-8b58-650056e89350",
    grupo: "Planejamento",
    gatilho: "Meio do mês, venda abaixo do ponto de equilíbrio",
    link: "/painel",
    corpo: "⚖️ *Faltam {falta} de venda para cobrir os custos do mês*\nRestam {dias} dias, uma média de {media} por dia. Cálculo com o que foi lançado até agora.\n_{restaurante}_",
    variantes: {"passou":"⚖️ *O mês já passou do ponto de equilíbrio*\nA partir daqui, o que entra é resultado.\n_{restaurante}_"},
  },
  cmv_acima_meta: {
    arquivo: "12-cmv-acima-da-meta.png",
    token: "d91e3d04-7df2-467a-b81b-19e3d1ebb1a2",
    grupo: "Planejamento",
    gatilho: "CMV do mês acima da meta",
    link: "/painel/pdv/cardapio",
    corpo: "🧮 *CMV do mês em {cmv}%, com meta de {meta}%*\nOs itens que mais pesam: {item_1} e {item_2}. Rever a ficha técnica e o preço desses pratos costuma ser o caminho mais rápido.\n_{restaurante}_",
  },
  pratos_sem_ficha: {
    arquivo: "13-ficha-tecnica.png",
    token: "c3de3602-c394-4bce-9d0a-41fa8adf140a",
    grupo: "Cardápio",
    gatilho: "Pratos sem ficha técnica",
    link: "/painel/pdv/cardapio",
    corpo: "🍽️ *{n} pratos ainda sem ficha: {prato_1}, {prato_2}, {prato_3} e mais {resto}*\nCom a ficha, o app calcula o custo e o CMV de cada prato e baixa o estoque a cada venda no PDV.\n_{restaurante}_",
    variantes: {"curto":"🍽️ *{n} {pratos} ainda sem ficha: {lista}*\nCom a ficha, o app calcula o custo e o CMV de cada prato e baixa o estoque a cada venda no PDV.\n_{restaurante}_"},
  },
  terminar_cadastro: {
    arquivo: "14-terminar-cadastro.png",
    token: "2a6706f4-8755-4d5f-9ab3-4f4056ec0109",
    grupo: "Conta e equipe",
    gatilho: "Onboarding parado",
    link: "/onboarding",
    corpo: "🚀 *Seu cadastro parou no passo {passo} de 7*\nDá para retomar de onde parou, em poucos minutos: tanocaixa.com",
  },
  convite_pendente: {
    arquivo: "15-convite-pendente.png",
    token: "ff299283-78b9-436f-a6e5-9c91f2fbea42",
    grupo: "Conta e equipe",
    gatilho: "Convite de equipe sem aceite",
    link: "/painel/ajustes",
    corpo: "👥 *O convite para {nome} ({cargo}) foi enviado em {data} e ainda não foi aceito*\nSe precisar, é possível reenviar o link em Ajustes.\n_{restaurante}_",
  },
  assinatura: {
    arquivo: "16-assinatura.png",
    token: "17b3dc00-0afc-4357-94a7-8cd33fd915eb",
    grupo: "Conta e equipe",
    gatilho: "Fim do período de teste ou falha de pagamento",
    link: "/painel/assinatura",
    corpo: "💳 *O período de teste termina em {data}*\nPara continuar sem interrupção, escolha um plano em Assinatura. Seus dados e lançamentos continuam guardados.",
    variantes: {"pagamento":"💳 *Não conseguimos processar o pagamento de {data}*\nAtualize o cartão em Assinatura para manter o acesso."},
  },
  ifood_parado: {
    arquivo: "17-ifood.png",
    token: "88e5bf6c-3e90-45f7-af93-7d2e484a9e8f",
    grupo: "Conta e equipe",
    gatilho: "Sincronização iFood parada",
    link: "/painel/ajustes",
    corpo: "🔄 *A última sincronização com o iFood foi em {data}*\nReconecte em Ajustes para voltar a receber vendas e taxas automaticamente.\n_{restaurante}_",
  },
} as const satisfies Record<string, Lembrete>

export type IdLembrete = keyof typeof LEMBRETES

/** URL pública da imagem (a Green-API baixa por ela). */
export const urlDaImagem = (l: Pick<Lembrete, 'arquivo' | 'token'>) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(`${PASTA_IMAGENS}/${l.arquivo}`)}?alt=media&token=${l.token}`
