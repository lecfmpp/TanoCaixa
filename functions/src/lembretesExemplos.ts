/* ------------------------------------------------------------------ *
 * Exemplo de cada lembrete para o painel: a mesma imagem, a mesma legenda
 * e o mesmo link que o grupo recebe, com dados de exemplo no lugar dos do dia.
 * Puro (sem Firebase): usa o mesmo montarLembrete do envio de verdade.
 * ------------------------------------------------------------------ */
import { LEMBRETES, URL_DO_APP, type IdLembrete } from './lembretesCatalogo'
import { montarLembrete, varsDeVencimentos, type Variaveis } from './lembretesTexto'

/** Dados de exemplo de cada lembrete (sem `restaurante`, que vem da loja). */
const EXEMPLOS: Record<IdLembrete, Variaveis> = {
  vendas_do_dia: {},
  caixa_aberto: { n: 3, aberto_desde: 'ontem, 18h40' },
  notas_do_dia: {},
  vencimentos: {
    ...varsDeVencimentos(
      [
        { fornecedor: 'Distribuidora Rio Bebidas', valor: 'R$ 1.240,00', situacao: 'vence hoje' },
        { fornecedor: 'Hortifruti Bom Preço', valor: 'R$ 386,50', situacao: 'vence amanhã' },
      ],
      '',
    ),
  },
  alta_de_preco: { item: 'Queijo muçarela', fornecedor: 'Laticínios Serra', pct: 18, preco_antigo: 'R$ 38,90', preco_novo: 'R$ 45,90', unidade: 'kg', data: '05/11' },
  relatorio_compras: { mes: 'outubro', total: 'R$ 18.420,00', n_notas: 23, fornecedor: 'Distribuidora Rio Bebidas', valor: 'R$ 6.110,00', pct: 33, item: 'Queijo muçarela', pct_alta: 18 },
  contagem_estoque: { data: '30/09' },
  diferenca_estoque: { item: 'Cerveja long neck', qtd: '12 un', data_1: '01/10', data_2: '01/11' },
  plano_do_mes: { mes: 'novembro' },
  dre_mes_anterior: { mes: 'outubro', valor: 'R$ 9.850,00', pct: 14, cmv: 34, meta: 32 },
  ponto_equilibrio: { falta: 'R$ 4.300,00', dias: 9, media: 'R$ 480,00' },
  cmv_acima_meta: { cmv: 36, meta: 32, item_1: 'Queijo muçarela', item_2: 'Carne moída' },
  pratos_sem_ficha: { n: 7, prato_1: 'Parmegiana', prato_2: 'Escondidinho', prato_3: 'Pudim', resto: 4 },
  terminar_cadastro: { passo: 'cadastrar os produtos' },
  convite_pendente: { nome: 'Ana', cargo: 'gestão', data: '02/11' },
  assinatura: { data: '20/11' },
  ifood_parado: { data: '03/11' },
}

export interface ExemploLembrete {
  /** Legenda como chega no WhatsApp (com *negrito* e _itálico_ do WhatsApp). */
  legenda: string
  imagemUrl: string
  /** Página do app que o link abre. */
  link: string
}

/** Exemplo pronto do lembrete, com o nome da loja. Nunca lança: sem exemplo, devolve null. */
export function exemploDoLembrete(id: IdLembrete, restaurante: string): ExemploLembrete | null {
  try {
    const { legenda, imagemUrl } = montarLembrete(id, { ...EXEMPLOS[id], restaurante: restaurante || 'Sua loja' })
    return { legenda, imagemUrl, link: `${URL_DO_APP}${LEMBRETES[id].link}` }
  } catch (e) {
    console.error(`exemplo do lembrete ${id} falhou`, e)
    return null
  }
}
