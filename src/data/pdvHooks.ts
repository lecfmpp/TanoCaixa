/* ------------------------------------------------------------------ *
 * Hooks do PDV: caixa, pedidos e o que cada venda faz no estoque.
 *
 * Uma venda mexe em três lugares de uma vez — o pedido, o estoque (uma saída
 * por matéria-prima, pela ficha técnica) e, no fechamento do caixa, a receita
 * do dia que alimenta o DRE. Cancelar desfaz o estoque.
 * ------------------------------------------------------------------ */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { repo } from './repo'
import { diaDeHoje } from './derive'
import { consumoDeInsumos, custoDoPrato } from './cardapio'
import { canalDaReceita, arred, resumoDoCaixa, totaisDoPedido, ehVenda } from './pdv'
import { novoId, registrarAtividade, useAutor, useTenant } from './hooks'
import type {
  CaixaPdvDoc,
  FormaPagamentoPdv,
  ItemPedido,
  PedidoPdvDoc,
  PratoDoc,
  ReceitaDiaDoc,
  StatusPedido,
  TipoPedido,
} from './types'

import { TIPO_VENDA as TIPO_SAIDA_VENDA } from './estoque'

/** 'YYYY-MM-DD' de n dias atrás, a partir do "hoje" do painel. */
export function diaAtras(n: number): string {
  const [a, m, d] = diaDeHoje().split('-').map(Number)
  const dt = new Date(a, m - 1, d - n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/** Fila da cozinha e a lista de pedidos precisam de dado fresco: revalida sozinho. */
const ATUALIZA_A_CADA = 10_000

export function useCaixasPdv() {
  const t = useTenant()
  return useQuery({
    queryKey: [t, 'pdv_caixas'],
    queryFn: async () => (await repo.caixasPdv.listar(t)).sort((a, b) => (a.abertoEm < b.abertoEm ? 1 : -1)),
    refetchInterval: ATUALIZA_A_CADA,
  })
}

/** Pedidos de `desde` em diante (padrão: hoje). */
export function usePedidosPdv(desde: string = diaDeHoje()) {
  const t = useTenant()
  return useQuery({
    queryKey: [t, 'pdv_pedidos', desde],
    queryFn: async () => (await repo.pedidosPdv.desde(t, desde)).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)),
    refetchInterval: ATUALIZA_A_CADA,
  })
}

function invalidarPdv(qc: ReturnType<typeof useQueryClient>, t: string) {
  qc.invalidateQueries({ queryKey: [t, 'pdv_caixas'] })
  qc.invalidateQueries({ queryKey: [t, 'pdv_pedidos'] })
  qc.invalidateQueries({ queryKey: [t, 'movimentos_estoque'] })
  qc.invalidateQueries({ queryKey: [t, 'receita_dia'] })
  qc.invalidateQueries({ queryKey: [t, 'atividades'] })
}

const zerarAtividade = { quem: '', quemInicial: '', quemCor: '' }

/* --------------------------------- Caixa -------------------------------- */

export function useAbrirCaixa() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (p: { fundo: number }) => {
      const autor = getAutor()
      const existentes = await repo.caixasPdv.listar(t)
      if (existentes.some((c) => c.status === 'aberto')) throw new Error('Já existe um caixa aberto. Feche o atual antes de abrir outro.')
      const id = novoId('cx')
      const caixa: CaixaPdvDoc = {
        id,
        numero: existentes.reduce((m, c) => Math.max(m, c.numero), 0) + 1,
        status: 'aberto',
        abertoEm: autor.criadoEm,
        abertoPorNome: autor.criadoPorNome,
        dia: diaDeHoje(),
        fundo: arred(p.fundo),
        movimentos: [],
        criadoEm: autor.criadoEm,
        criadoPorId: autor.criadoPorId,
        criadoPorNome: autor.criadoPorNome,
        origem: autor.origem,
      }
      await repo.caixasPdv.salvar(t, id, caixa)
      await registrarAtividade(t, { acao: 'abriu o caixa do PDV', entidade: `#${caixa.numero}`, tipo: 'PDV', valor: caixa.fundo, ...zerarAtividade }, autor)
      return caixa
    },
    onSuccess: () => invalidarPdv(qc, t),
  })
}

/** Sangria (tirar dinheiro da gaveta) ou reforço (colocar troco). */
export function useMovimentoCaixa() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (p: { caixa: CaixaPdvDoc; tipo: 'sangria' | 'reforco'; valor: number; motivo?: string }) => {
      const autor = getAutor()
      const atual = (await repo.caixasPdv.listar(t)).find((c) => c.id === p.caixa.id) ?? p.caixa
      if (atual.status !== 'aberto') throw new Error('Esse caixa já foi fechado.')
      const movimentos = [
        ...atual.movimentos,
        { tipo: p.tipo, valor: arred(p.valor), ...(p.motivo ? { motivo: p.motivo } : {}), em: autor.criadoEm, porNome: autor.criadoPorNome },
      ]
      await repo.caixasPdv.salvar(t, atual.id, { movimentos })
      await registrarAtividade(
        t,
        { acao: p.tipo === 'sangria' ? 'fez sangria no caixa' : 'fez reforço no caixa', entidade: `#${atual.numero}`, tipo: 'PDV', valor: p.valor, ...zerarAtividade },
        autor,
      )
    },
    onSuccess: () => invalidarPdv(qc, t),
  })
}

/**
 * Fecha o caixa: confere o contado com o esperado de cada forma de pagamento e
 * refaz a receita do dia (`pdv-AAAA-MM-DD`), que é o que o DRE e o Caixa leem.
 */
export function useFecharCaixa() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (p: { caixa: CaixaPdvDoc; contado: Partial<Record<FormaPagamentoPdv, number>>; obs?: string }) => {
      const autor = getAutor()
      const todos = await repo.pedidosPdv.desde(t, p.caixa.dia)
      const doCaixa = todos.filter((x) => x.caixaId === p.caixa.id)
      if (doCaixa.some((x) => x.status === 'em_preparo')) {
        throw new Error('Ainda há pedido em preparo. Marque como pronto ou cancele antes de fechar o caixa.')
      }
      const r = resumoDoCaixa(p.caixa, doCaixa)
      const esperado: Record<FormaPagamentoPdv, number> = { ...r.porForma, dinheiro: r.esperadoDinheiro }
      const formas = (Object.keys(esperado) as FormaPagamentoPdv[]).filter((f) => f === 'dinheiro' || esperado[f] > 0 || (p.contado[f] ?? 0) > 0)
      const contado = formas.map((forma) => ({
        forma,
        esperado: arred(esperado[forma]),
        contado: arred(p.contado[forma] ?? 0),
      }))
      const diferenca = arred(contado.reduce((s, c) => s + (c.contado - c.esperado), 0))
      const fechado: Partial<CaixaPdvDoc> = {
        status: 'fechado',
        fechadoEm: autor.criadoEm,
        fechadoPorNome: autor.criadoPorNome,
        contado,
        diferenca,
        faturamento: r.faturamento,
        ...(p.obs ? { obs: p.obs } : {}),
      }
      await repo.caixasPdv.salvar(t, p.caixa.id, fechado)

      // Receita do dia = todos os caixas FECHADOS daquele dia, não só este.
      const caixas = (await repo.caixasPdv.listar(t)).filter((c) => c.dia === p.caixa.dia && (c.status === 'fechado' || c.id === p.caixa.id))
      const ids = new Set(caixas.map((c) => c.id))
      const vendas = todos.filter((x) => x.dia === p.caixa.dia && ids.has(x.caixaId) && ehVenda(x))
      const loja = arred(vendas.filter((x) => canalDaReceita(x.tipo) === 'balcao').reduce((s, x) => s + x.total, 0))
      const entrega = arred(vendas.filter((x) => canalDaReceita(x.tipo) === 'whatsapp').reduce((s, x) => s + x.total, 0))
      const totalDia = arred(loja + entrega)
      const porForma = resumoDoCaixa(undefined, vendas).porForma
      const id = `pdv-${p.caixa.dia}`
      const receita: Partial<ReceitaDiaDoc> = {
        id,
        data: p.caixa.dia,
        canais: [
          ...(loja > 0 ? [{ canal: 'balcao' as const, valorBruto: loja, taxa: 0, pedidos: vendas.filter((x) => x.tipo !== 'entrega').length }] : []),
          ...(entrega > 0 ? [{ canal: 'whatsapp' as const, valorBruto: entrega, taxa: 0, pedidos: vendas.filter((x) => x.tipo === 'entrega').length }] : []),
        ],
        recebimentos: [
          { forma: 'pix', valor: arred(porForma.pix) },
          { forma: 'cartao', valor: arred(porForma.debito + porForma.credito + porForma.voucher) },
          { forma: 'dinheiro', valor: arred(porForma.dinheiro) },
        ],
        sangria: arred(caixas.reduce((s, c) => s + c.movimentos.filter((m) => m.tipo === 'sangria').reduce((a, m) => a + m.valor, 0), 0)),
        totalDia,
        historico: [{ em: autor.criadoEm, porId: autor.criadoPorId, porNome: autor.criadoPorNome, total: totalDia }],
        criadoEm: autor.criadoEm,
        criadoPorId: autor.criadoPorId,
        criadoPorNome: autor.criadoPorNome,
        origem: autor.origem,
      }
      await repo.receitaDia.salvar(t, id, receita)
      await registrarAtividade(
        t,
        { acao: 'fechou o caixa do PDV', entidade: `#${p.caixa.numero}`, tipo: 'PDV', valor: r.faturamento, ...zerarAtividade },
        autor,
      )
      return { ...r, diferenca }
    },
    onSuccess: () => invalidarPdv(qc, t),
  })
}

/* -------------------------------- Pedidos ------------------------------- */

export interface NovoPedido {
  caixa: CaixaPdvDoc
  tipo: TipoPedido
  cliente?: string
  telefone?: string
  endereco?: string
  itens: ItemPedido[]
  desconto: number
  taxaEntrega: number
  pagamentos: { forma: FormaPagamentoPdv; valor: number }[]
  pratos: PratoDoc[]
  produtos: import('./types').ProdutoDoc[]
}

/**
 * Lança o pedido e baixa o estoque pela ficha técnica de cada item. Se algo
 * falhar no meio, as saídas já gravadas são apagadas — venda sem estoque baixado
 * (ou estoque baixado sem venda) é pior do que a venda não sair.
 */
export function useCriarPedido() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (n: NovoPedido) => {
      const autor = getAutor()
      const dia = diaDeHoje()
      const { subtotal, desconto, total } = totaisDoPedido(n.itens, n.desconto, n.tipo === 'entrega' ? n.taxaEntrega : 0)
      const pago = arred(n.pagamentos.reduce((s, p) => s + p.valor, 0))
      const dinheiro = n.pagamentos.filter((p) => p.forma === 'dinheiro').reduce((s, p) => s + p.valor, 0)
      if (pago + 0.001 < total) throw new Error('O pagamento não cobre o total do pedido.')
      const troco = arred(pago - total)
      if (troco > 0 && troco > dinheiro + 0.001) throw new Error('Só dá troco quando parte do pagamento é em dinheiro.')

      const noDia = await repo.pedidosPdv.desde(t, dia)
      const numero = noDia.filter((p) => p.dia === dia).reduce((m, p) => Math.max(m, p.numero), 0) + 1

      // O que a venda consome, somando todos os itens.
      const consumo = new Map<string, { produtoId: string; quantidade: number; perda: number }>()
      let custo = 0
      for (const item of n.itens) {
        const prato = n.pratos.find((p) => p.id === item.pratoId)
        if (!prato) continue
        custo += custoDoPrato(prato, n.produtos, n.pratos).custo * item.quantidade
        for (const c of consumoDeInsumos(prato, item.quantidade, n.produtos, n.pratos)) {
          const atual = consumo.get(c.produtoId) ?? { produtoId: c.produtoId, quantidade: 0, perda: 0 }
          atual.quantidade += c.quantidade
          atual.perda += c.perda
          consumo.set(c.produtoId, atual)
        }
      }

      const id = novoId('pd')
      const movimentoIds: string[] = []
      const porProduto = new Map(n.produtos.map((p) => [p.id, p]))
      try {
        for (const c of consumo.values()) {
          const produto = porProduto.get(c.produtoId)
          if (!produto || c.quantidade <= 0) continue
          const movId = novoId('mov')
          await repo.movimentos.salvar(t, movId, {
            id: movId,
            tipo: TIPO_SAIDA_VENDA,
            data: dia,
            produtoId: produto.id,
            produto: produto.nome,
            quantidade: Math.round(c.quantidade * 1000) / 1000,
            custoUnitario: produto.custoAtual,
            valor: arred(c.quantidade * produto.custoAtual),
            observacao: `Pedido #${numero}`,
            pedidoId: id,
            criadoEm: autor.criadoEm,
            criadoPorId: autor.criadoPorId,
            criadoPorNome: autor.criadoPorNome,
            origem: autor.origem,
          })
          movimentoIds.push(movId)
        }
        const pedido: PedidoPdvDoc = {
          id,
          numero,
          dia,
          caixaId: n.caixa.id,
          tipo: n.tipo,
          ...(n.cliente?.trim() ? { cliente: n.cliente.trim() } : {}),
          ...(n.telefone?.trim() ? { telefone: n.telefone.trim() } : {}),
          ...(n.endereco?.trim() ? { endereco: n.endereco.trim() } : {}),
          itens: n.itens,
          subtotal,
          desconto,
          taxaEntrega: n.tipo === 'entrega' ? Math.max(n.taxaEntrega, 0) : 0,
          total,
          pagamentos: n.pagamentos.filter((p) => p.valor > 0),
          troco,
          status: 'em_preparo',
          custo: arred(custo),
          consumo: [...consumo.values()].map((c) => ({ ...c, quantidade: Math.round(c.quantidade * 1000) / 1000, perda: Math.round(c.perda * 1000) / 1000 })),
          movimentoIds,
          criadoEm: autor.criadoEm,
          criadoPorId: autor.criadoPorId,
          criadoPorNome: autor.criadoPorNome,
          origem: autor.origem,
        }
        await repo.pedidosPdv.salvar(t, id, pedido)
        await registrarAtividade(t, { acao: 'lançou o pedido', entidade: `#${numero}`, tipo: 'PDV', valor: total, ...zerarAtividade }, autor)
        return pedido
      } catch (e) {
        await Promise.allSettled(movimentoIds.map((m) => deleteDoc(doc(db, 'restaurants', t, 'movimentos_estoque', m))))
        throw e
      }
    },
    onSuccess: () => invalidarPdv(qc, t),
  })
}

/** Avança o pedido no fluxo (preparo → pronto → entrega → concluído). */
export function useMudarStatusPedido() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (p: { pedido: PedidoPdvDoc; status: StatusPedido }) => {
      const autor = getAutor()
      const agora = autor.criadoEm
      await repo.pedidosPdv.salvar(t, p.pedido.id, {
        status: p.status,
        ...(p.status === 'pronto' ? { prontoEm: agora } : {}),
        ...(p.status === 'em_entrega' ? { saiuEm: agora } : {}),
        ...(p.status === 'concluido' ? { concluidoEm: agora } : {}),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'pdv_pedidos'] }),
  })
}

/** Cancela o pedido e devolve a mercadoria ao estoque (apaga as saídas dele). */
export function useCancelarPedido() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (p: { pedido: PedidoPdvDoc; motivo: string }) => {
      const autor = getAutor()
      if (p.pedido.status === 'cancelado') return
      await repo.pedidosPdv.salvar(t, p.pedido.id, {
        status: 'cancelado',
        canceladoEm: autor.criadoEm,
        canceladoPorNome: autor.criadoPorNome,
        motivoCancelamento: p.motivo,
      })
      await Promise.all(p.pedido.movimentoIds.map((m) => deleteDoc(doc(db, 'restaurants', t, 'movimentos_estoque', m))))
      await registrarAtividade(
        t,
        { acao: 'cancelou o pedido', entidade: `#${p.pedido.numero}`, tipo: 'PDV', valor: p.pedido.total, ...zerarAtividade },
        autor,
      )
    },
    onSuccess: () => invalidarPdv(qc, t),
  })
}
