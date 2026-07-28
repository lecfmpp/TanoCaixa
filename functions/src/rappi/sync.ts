import { ClienteRappi } from './client'
import {
  normalizarPagamentos,
  normalizarMenu,
  agregarPagamentos,
  receitaDiaDoRappi,
  despesaTaxaDoRappi,
  produtoMenuDoRappi,
} from './mapper'
import type { EscritorFirestore } from '../ifood/sync'

export interface ContextoSyncRappi {
  cliente: ClienteRappi
  escritor: EscritorFirestore
  storeId: string
  restauranteId: string
}

/**
 * Sync financeiro de um dia (Rappi): puxa os pagamentos/repasse da loja,
 * agrega e grava receita_dia (bruto/taxa/pedidos) + a despesa da comissão
 * (taxas_app) + trilha de autoria. Rodar de fábrica às 06:00.
 */
export async function syncFinanceiroDiaRappi(
  ctx: ContextoSyncRappi,
  data: string,
): Promise<{ pedidos: number; bruto: number }> {
  const pagamentos = normalizarPagamentos(await ctx.cliente.pagamentosBrutos(ctx.storeId))
  const resumo = agregarPagamentos(pagamentos).find((r) => r.data === data)
  if (!resumo) return { pedidos: 0, bruto: 0 }

  const receita = receitaDiaDoRappi(resumo)
  const despesa = despesaTaxaDoRappi(resumo)

  await ctx.escritor.salvarReceitaDia(ctx.restauranteId, receita.id, receita)
  if (despesa.valorTotal > 0) {
    await ctx.escritor.salvarDespesa(ctx.restauranteId, despesa.id, despesa)
  }
  await ctx.escritor.salvarAtividade(ctx.restauranteId, `rappi-sync-${data}`, {
    id: `rappi-sync-${data}`,
    quem: 'Automático',
    quemInicial: '',
    quemCor: '#AEB9B8',
    acao: 'puxou as vendas do',
    entidade: `Rappi · ${resumo.pedidos} pedidos`,
    tipo: 'Fechamento',
    valor: resumo.bruto,
    criadoEm: new Date().toISOString(),
    criadoPorId: 'rappi',
    criadoPorNome: 'Automático',
    origem: 'integracao',
  })
  await ctx.escritor.atualizarIntegracao(ctx.restauranteId, 'rappi', {
    status: 'conectado',
    ultimoSyncEm: new Date().toISOString(),
    pedidosUltimoDia: resumo.pedidos,
    faturamentoUltimoDia: resumo.bruto,
  })

  return { pedidos: resumo.pedidos, bruto: resumo.bruto }
}

/** Sincroniza o cardápio (itens + preços) do Rappi. */
export async function syncCatalogoRappi(ctx: ContextoSyncRappi): Promise<number> {
  const itens = normalizarMenu(await ctx.cliente.menuBruto(ctx.storeId))
  for (const item of itens) {
    const doc = produtoMenuDoRappi(item)
    await ctx.escritor.salvarProdutoMenu(ctx.restauranteId, doc.id, doc)
  }
  return itens.length
}
