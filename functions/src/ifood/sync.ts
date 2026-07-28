import { ClienteIFood } from './client'
import {
  normalizarVendas,
  normalizarItens,
  agregarPorDia,
  receitaDiaDoIFood,
  despesaTaxaDoIFood,
  produtoMenuDoIFood,
} from './mapper'

/**
 * Escritor do Firestore injetado pelo host (Cloud Function usa o Admin SDK).
 * Mantém o módulo de sync portável e testável.
 */
export interface EscritorFirestore {
  salvarReceitaDia(restauranteId: string, id: string, doc: unknown): Promise<void>
  salvarDespesa(restauranteId: string, id: string, doc: unknown): Promise<void>
  salvarProdutoMenu(restauranteId: string, id: string, doc: unknown): Promise<void>
  salvarAtividade(restauranteId: string, id: string, doc: unknown): Promise<void>
  atualizarIntegracao(restauranteId: string, provedor: string, patch: Record<string, unknown>): Promise<void>
}

export interface ContextoSync {
  cliente: ClienteIFood
  escritor: EscritorFirestore
  merchantId: string
  restauranteId: string
}

/**
 * Sync financeiro de um dia: puxa as vendas do iFood, agrega e grava
 * receita_dia (bruto/taxa/pedidos) + a despesa da comissão (taxas_app) +
 * uma linha na trilha de autoria. Rodar de fábrica às 06:00.
 */
export async function syncFinanceiroDia(ctx: ContextoSync, data: string): Promise<{ pedidos: number; bruto: number }> {
  const bruto = await ctx.cliente.vendasBrutas(ctx.merchantId, data, data)
  const vendas = normalizarVendas(bruto)
  const [resumo] = agregarPorDia(vendas)
  if (!resumo) return { pedidos: 0, bruto: 0 }

  const receita = receitaDiaDoIFood(resumo)
  const despesa = despesaTaxaDoIFood(resumo)

  await ctx.escritor.salvarReceitaDia(ctx.restauranteId, receita.id, receita)
  if (despesa.valorTotal > 0) {
    await ctx.escritor.salvarDespesa(ctx.restauranteId, despesa.id, despesa)
  }
  await ctx.escritor.salvarAtividade(ctx.restauranteId, `ifood-sync-${data}`, {
    id: `ifood-sync-${data}`,
    quem: 'Automático',
    quemInicial: '',
    quemCor: '#AEB9B8',
    acao: 'puxou as vendas do',
    entidade: `iFood · ${resumo.pedidos} pedidos`,
    tipo: 'Fechamento',
    valor: resumo.bruto,
    criadoEm: new Date().toISOString(),
    criadoPorId: 'ifood',
    criadoPorNome: 'Automático',
    origem: 'integracao',
  })
  await ctx.escritor.atualizarIntegracao(ctx.restauranteId, 'ifood', {
    status: 'conectado',
    ultimoSyncEm: new Date().toISOString(),
    pedidosUltimoDia: resumo.pedidos,
    faturamentoUltimoDia: resumo.bruto,
  })

  return { pedidos: resumo.pedidos, bruto: resumo.bruto }
}

/** Sincroniza o cardápio (itens + preços de venda) do iFood. */
export async function syncCatalogo(ctx: ContextoSync): Promise<number> {
  const catalogos = await ctx.cliente.catalogos(ctx.merchantId)
  const groupId = catalogos[0]?.groupId
  if (!groupId) return 0
  const itens = normalizarItens(await ctx.cliente.itensVendaveisBrutos(ctx.merchantId, groupId))
  for (const item of itens) {
    const doc = produtoMenuDoIFood(item)
    await ctx.escritor.salvarProdutoMenu(ctx.restauranteId, doc.id, doc)
  }
  return itens.length
}
