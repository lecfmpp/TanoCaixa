import { ClienteIFood } from './client'
import {
  agregarPorDia,
  normalizarItens,
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
  atualizarIntegracao(
    restauranteId: string,
    provedor: string,
    patch: Record<string, unknown>,
  ): Promise<void>
}

export interface ContextoSync {
  cliente: ClienteIFood
  escritor: EscritorFirestore
  merchantId: string
  restauranteId: string
}

/**
 * Sync financeiro de um dia: puxa as vendas do iFood, agrega e grava
 * receita_dia (bruto/taxa/pedidos) + a despesa da comissão + uma linha na
 * trilha de autoria. Rodar de fábrica às 06:00.
 */
export async function syncFinanceiroDia(
  ctx: ContextoSync,
  data: string,
): Promise<{ pedidos: number; bruto: number }> {
  const vendas = await ctx.cliente.vendas(ctx.merchantId, data, data)
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

/**
 * Estado operacional da loja no iFood: se está aberta, se há pausa ativa e
 * quais são os turnos cadastrados. Serve para explicar buraco de faturamento
 * no painel ("a loja ficou pausada das 12h às 15h").
 */
export async function syncEstadoLoja(ctx: ContextoSync): Promise<void> {
  const [detalhe, status, pausas, horarios] = await Promise.all([
    ctx.cliente.merchantDetalhe(ctx.merchantId),
    ctx.cliente.statusLoja(ctx.merchantId),
    ctx.cliente.interrupcoes(ctx.merchantId),
    ctx.cliente.horarios(ctx.merchantId),
  ])

  const estado = status[0]?.state ?? 'DESCONHECIDO'
  await ctx.escritor.atualizarIntegracao(ctx.restauranteId, 'ifood', {
    nomeLoja: detalhe?.name ?? '',
    razaoSocial: detalhe?.corporateName ?? '',
    endereco: detalhe?.address ?? null,
    estadoLoja: estado,
    pausas: pausas.map((p) => ({ id: p.id, inicio: p.start, fim: p.end, motivo: p.description ?? '' })),
    horarios: horarios.map((h) => ({ dia: h.dayOfWeek, inicio: h.start, duracaoMin: h.duration })),
    estadoAtualizadoEm: new Date().toISOString(),
  })

  if (pausas.length) {
    await ctx.escritor.salvarAtividade(ctx.restauranteId, `ifood-pausa-${pausas[0].id}`, {
      id: `ifood-pausa-${pausas[0].id}`,
      quem: 'Automático',
      quemInicial: '',
      quemCor: '#AEB9B8',
      acao: 'detectou pausa na loja do',
      entidade: `iFood · até ${pausas[0].end}`,
      tipo: 'Operação',
      criadoEm: new Date().toISOString(),
      criadoPorId: 'ifood',
      criadoPorNome: 'Automático',
      origem: 'integracao',
    })
  }
}

/**
 * Sincroniza o cardápio de TODOS os catálogos da loja (itens, categorias e
 * complementos). Devolve quantos itens foram gravados.
 */
export async function syncCatalogo(ctx: ContextoSync): Promise<number> {
  const catalogos = await ctx.cliente.catalogos(ctx.merchantId)
  let total = 0

  for (const catalogo of catalogos) {
    const catalogId = catalogo.catalogId ?? catalogo.groupId
    if (!catalogId) continue

    // As categorias dão o nome legível que o sellableItems nem sempre traz.
    const nomePorCategoria = new Map<string, string>()
    try {
      for (const c of await ctx.cliente.categorias(ctx.merchantId, catalogId)) {
        nomePorCategoria.set(c.id, c.name)
      }
    } catch {
      /* catálogo sem categorias acessíveis: seguimos com o que o item traz */
    }

    const itens = normalizarItens(await ctx.cliente.itensVendaveisBrutos(ctx.merchantId, catalogId))
    for (const item of itens) {
      const comCategoria = {
        ...item,
        category: item.category || nomePorCategoria.get(item.categoryId ?? '') || '',
      }
      const doc = produtoMenuDoIFood(comCategoria)
      await ctx.escritor.salvarProdutoMenu(ctx.restauranteId, doc.id, doc)
      total++
    }
  }

  await ctx.escritor.atualizarIntegracao(ctx.restauranteId, 'ifood', {
    itensCardapio: total,
    catalogosLidos: catalogos.length,
    cardapioAtualizadoEm: new Date().toISOString(),
  })
  return total
}
