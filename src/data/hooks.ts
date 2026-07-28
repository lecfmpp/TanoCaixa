import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getRestaurante, setRestaurante, repo, type IntegracaoDoc } from './repo'
import type { DiaHorario } from '@/components/ui/HorarioSemana'
import { DEMO_TENANT, origemAtual } from './tenant'
import { useAuth } from '@/auth/AuthContext'
import { numeroBR, dataBRparaISO } from '@/lib/csv'
import type { TipoImport } from './importar'
import type { CategoriaDespesa } from '@/types'
import type {
  DespesaDoc,
  ProdutoDoc,
  AtividadeDoc,
  ContagemDoc,
  MembroDoc,
} from './types'

const CATEGORIAS: CategoriaDespesa[] = ['mercadoria', 'pessoal', 'ocupacao', 'taxas_app']
function normalizarCategoria(v: string): CategoriaDespesa {
  const s = (v || '').toLowerCase().trim()
  return (CATEGORIAS.find((c) => s.includes(c.replace('_app', ''))) ?? 'mercadoria')
}

/** Tenant atual — o restaurante do usuário logado, ou o tenant demo. */
export function useTenant() {
  const { sessao } = useAuth()
  return sessao?.tenantId ?? DEMO_TENANT
}

/* -------------------------------- Queries ------------------------------- */

export function useRestaurante() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'restaurante'], queryFn: () => getRestaurante(t) })
}
export function useMembros() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'membros'], queryFn: () => repo.membros.listar(t) })
}
export function useProdutos() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'produtos'], queryFn: () => repo.produtos.listar(t) })
}
export function useDespesas() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'despesas'], queryFn: () => repo.despesas.listar(t) })
}
export function useReceitaDia() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'receita_dia'], queryFn: () => repo.receitaDia.listar(t) })
}
export function useContagens() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'contagens'], queryFn: () => repo.contagens.listar(t) })
}
export function useAtividades() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'atividades'], queryFn: () => repo.atividades.listar(t) })
}
export function useInsights() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'insights'], queryFn: () => repo.insights.listar(t) })
}
export function useIntegracoes() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'integracoes'], queryFn: () => repo.integracoes.listar(t) })
}

/** Contexto para os cálculos (despesas + receita + config). */
export function useContexto() {
  const despesas = useDespesas()
  const receita = useReceitaDia()
  const config = useRestaurante()
  return {
    carregando: despesas.isLoading || receita.isLoading || config.isLoading,
    ctx: {
      despesas: despesas.data ?? [],
      receitaDia: receita.data ?? [],
      config: config.data ?? null,
    },
  }
}

/* ------------------------------- Mutations ------------------------------ */

function novoId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`
}

/** Dados de autoria do usuário logado no momento. */
function useAutor() {
  const { sessao } = useAuth()
  return () => ({
    criadoEm: new Date().toISOString(),
    criadoPorId: sessao?.usuario.id ?? 'halim',
    criadoPorNome: sessao?.usuario.nome ?? 'Halim',
    origem: origemAtual(),
    _inicial: sessao?.usuario.avatarInicial ?? 'H',
    _cor: sessao?.usuario.avatarCor ?? '#2E5F73',
  })
}

/** Registra uma linha na trilha de autoria. */
async function registrarAtividade(
  tenant: string,
  a: Omit<AtividadeDoc, 'id' | 'criadoEm' | 'criadoPorId' | 'criadoPorNome' | 'origem'>,
  autor: ReturnType<ReturnType<typeof useAutor>>,
) {
  const id = novoId('at')
  const doc: AtividadeDoc = {
    id,
    quem: autor.criadoPorNome,
    quemInicial: autor._inicial,
    quemCor: autor._cor,
    acao: a.acao,
    entidade: a.entidade,
    tipo: a.tipo,
    valor: a.valor,
    criadoEm: autor.criadoEm,
    criadoPorId: autor.criadoPorId,
    criadoPorNome: autor.criadoPorNome,
    origem: autor.origem,
  }
  await repo.atividades.salvar(tenant, id, doc)
}

export function useCriarDespesa() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (entrada: Partial<DespesaDoc>) => {
      const autor = getAutor()
      const id = entrada.id ?? novoId('d')
      const doc: DespesaDoc = {
        fornecedor: entrada.fornecedor ?? 'Fornecedor',
        categoria: entrada.categoria ?? 'mercadoria',
        valorTotal: entrada.valorTotal ?? 0,
        dataCompetencia: entrada.dataCompetencia ?? new Date().toISOString().slice(0, 10),
        formaPagamento: entrada.formaPagamento ?? 'pix',
        status: entrada.status ?? 'pago',
        recorrente: entrada.recorrente ?? false,
        criadoEm: autor.criadoEm,
        criadoPorId: autor.criadoPorId,
        criadoPorNome: autor.criadoPorNome,
        origem: autor.origem,
        ...entrada,
        id,
      }
      await repo.despesas.salvar(t, id, doc)
      await registrarAtividade(
        t,
        { acao: 'lançou despesa', entidade: doc.fornecedor, tipo: 'Despesa', valor: doc.valorTotal, quem: '', quemInicial: '', quemCor: '' },
        autor,
      )
      return doc
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [t, 'despesas'] })
      qc.invalidateQueries({ queryKey: [t, 'atividades'] })
    },
  })
}

export function useRemoverDespesa() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.despesas.remover(t, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'despesas'] }),
  })
}

export function useCriarProduto() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (entrada: Partial<ProdutoDoc>) => {
      const autor = getAutor()
      const id = entrada.id ?? novoId('p')
      const doc: ProdutoDoc = {
        nome: entrada.nome ?? 'Produto',
        categoria: entrada.categoria ?? 'Secos',
        unidade: entrada.unidade ?? 'un',
        custoAtual: entrada.custoAtual ?? 0,
        fornecedor: entrada.fornecedor ?? '',
        entraNoCmv: entrada.entraNoCmv ?? true,
        criadoEm: autor.criadoEm,
        criadoPorId: autor.criadoPorId,
        criadoPorNome: autor.criadoPorNome,
        origem: autor.origem,
        ...entrada,
        id,
      }
      await repo.produtos.salvar(t, id, doc)
      await registrarAtividade(
        t,
        { acao: 'cadastrou o produto', entidade: doc.nome, tipo: 'Produto', quem: '', quemInicial: '', quemCor: '' },
        autor,
      )
      return doc
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [t, 'produtos'] })
      qc.invalidateQueries({ queryKey: [t, 'atividades'] })
    },
  })
}

export function useSalvarMembro() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<MembroDoc> }) => repo.membros.salvar(t, id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'membros'] }),
  })
}

export function useRemoverMembro() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.membros.remover(t, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'membros'] }),
  })
}

export function useConectarIntegracao() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: { provedor: string; merchantId?: string; status?: IntegracaoDoc['status'] }) =>
      repo.integracoes.salvar(t, p.provedor, {
        provedor: p.provedor,
        merchantId: p.merchantId,
        status: p.status ?? 'conectando',
      } as Partial<IntegracaoDoc>),
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'integracoes'] }),
  })
}

/** Importa um lote de registros de CSV (produtos, despesas ou estoque). */
export function useImportar() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async ({ tipo, registros }: { tipo: TipoImport; registros: Record<string, string>[] }) => {
      const autor = getAutor()
      const autoria = {
        criadoEm: autor.criadoEm,
        criadoPorId: autor.criadoPorId,
        criadoPorNome: autor.criadoPorNome,
        origem: autor.origem,
      }
      let count = 0

      if (tipo === 'produtos') {
        for (const r of registros) {
          if (!r.nome) continue
          const id = novoId('p')
          await repo.produtos.salvar(t, id, {
            id,
            nome: r.nome,
            categoria: r.categoria || 'Secos',
            unidade: r.unidade || 'un',
            custoAtual: numeroBR(r.custo),
            estoqueMinimo: numeroBR(r.estoque_minimo) || undefined,
            fornecedor: r.fornecedor || '',
            entraNoCmv: !/n[aã]o|false|^0$/i.test((r.entra_no_cmv || 'sim').trim()),
            ...autoria,
          })
          count++
        }
        qc.invalidateQueries({ queryKey: [t, 'produtos'] })
      } else if (tipo === 'despesas') {
        for (const r of registros) {
          if (!r.fornecedor && !r.valor) continue
          const id = novoId('d')
          await repo.despesas.salvar(t, id, {
            id,
            fornecedor: r.fornecedor || 'Fornecedor',
            categoria: normalizarCategoria(r.categoria),
            valorTotal: numeroBR(r.valor),
            dataCompetencia: r.data ? dataBRparaISO(r.data) : new Date().toISOString().slice(0, 10),
            formaPagamento: (r.forma_pagamento || 'pix') as DespesaDoc['formaPagamento'],
            status: (r.status || 'pago') as DespesaDoc['status'],
            descricao: r.descricao || '',
            recorrente: false,
            ...autoria,
          })
          count++
        }
        qc.invalidateQueries({ queryKey: [t, 'despesas'] })
      } else {
        const [produtos, contagens] = await Promise.all([
          repo.produtos.listar(t),
          repo.contagens.listar(t),
        ])
        const contagem = contagens.find((c) => c.mesReferencia === '2026-07') ?? contagens[0]
        if (contagem) {
          const porNome = new Map(produtos.map((p) => [p.nome.toLowerCase(), p]))
          const itens = [...contagem.itens]
          for (const r of registros) {
            const p = porNome.get((r.produto || '').toLowerCase().trim())
            if (!p) continue
            const item = {
              produtoId: p.id,
              nome: p.nome,
              unidade: p.unidade,
              custoUnitario: numeroBR(r.custo_unitario) || p.custoAtual,
              quantidade: numeroBR(r.quantidade),
              contadoPor: autor.criadoPorNome,
            }
            const idx = itens.findIndex((it) => it.produtoId === p.id)
            if (idx >= 0) itens[idx] = item
            else itens.push(item)
            count++
          }
          const valorEstoque = itens.reduce((s, it) => s + it.quantidade * it.custoUnitario, 0)
          await repo.contagens.salvar(t, contagem.id, { ...contagem, itens, valorEstoque })
          qc.invalidateQueries({ queryKey: [t, 'contagens'] })
        }
      }

      const rotulo = tipo === 'produtos' ? 'produtos' : tipo === 'despesas' ? 'despesas' : 'itens de estoque'
      await registrarAtividade(
        t,
        { acao: 'importou por planilha', entidade: `${count} ${rotulo}`, tipo: 'Importação', quem: '', quemInicial: '', quemCor: '' },
        autor,
      )
      qc.invalidateQueries({ queryKey: [t, 'atividades'] })
      return { count }
    },
  })
}

export function useCriarFechamento() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async ({ pix, cartao, dinheiro }: { pix: number; cartao: number; dinheiro: number }) => {
      const autor = getAutor()
      const autoria = { criadoEm: autor.criadoEm, criadoPorId: autor.criadoPorId, criadoPorNome: autor.criadoPorNome, origem: autor.origem }
      const hoje = new Date().toISOString().slice(0, 10)
      const loja = pix + cartao + dinheiro
      const id = `fech-${hoje}`
      const receita = {
        id,
        data: hoje,
        canais: [
          { canal: 'ifood' as const, valorBruto: 742.5, taxa: 178.2, pedidos: 38 },
          { canal: 'rappi' as const, valorBruto: 186.4, taxa: 41.3, pedidos: 9 },
          { canal: 'balcao' as const, valorBruto: loja, taxa: 0, pedidos: 0 },
        ],
        recebimentos: [
          { forma: 'pix', valor: pix },
          { forma: 'cartao', valor: cartao },
          { forma: 'dinheiro', valor: dinheiro },
        ],
        sangria: 0,
        totalDia: 742.5 + 186.4 + loja,
        ...autoria,
      }
      await repo.receitaDia.salvar(t, id, receita)
      await registrarAtividade(
        t,
        { acao: 'fechou o caixa de', entidade: 'hoje', tipo: 'Fechamento', valor: receita.totalDia, quem: '', quemInicial: '', quemCor: '' },
        autor,
      )
      return receita
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [t, 'receita_dia'] })
      qc.invalidateQueries({ queryKey: [t, 'atividades'] })
    },
  })
}

export function useCriarMovimento() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (e: { tipo: string; produto: string; quantidade: number; custo: number; geraDespesa: boolean }) => {
      const autor = getAutor()
      const autoria = { criadoEm: autor.criadoEm, criadoPorId: autor.criadoPorId, criadoPorNome: autor.criadoPorNome, origem: autor.origem }
      const valor = e.quantidade * e.custo
      const movimentoId = novoId('mov')
      await repo.movimentos.salvar(t, movimentoId, {
        id: movimentoId, tipo: e.tipo, produto: e.produto, quantidade: e.quantidade, custoUnitario: e.custo, valor, geraDespesa: e.geraDespesa, ...autoria,
      })
      let despesaId: string | undefined
      if (e.geraDespesa && valor > 0) {
        despesaId = novoId('d')
        await repo.despesas.salvar(t, despesaId, {
          id: despesaId, fornecedor: 'Entrada de estoque', descricao: e.produto, categoria: 'mercadoria', valorTotal: valor,
          dataCompetencia: new Date().toISOString().slice(0, 10), formaPagamento: 'automatico', status: 'pago', recorrente: false, ...autoria,
        })
      }
      await registrarAtividade(
        t,
        { acao: 'movimentou estoque', entidade: e.produto, tipo: 'Estoque', valor, quem: '', quemInicial: '', quemCor: '' },
        autor,
      )
      return { movimentoId, despesaId }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [t, 'despesas'] })
      qc.invalidateQueries({ queryKey: [t, 'atividades'] })
    },
  })
}

/** Desfaz um lançamento: apaga os docs criados e revalida. */
export function useDesfazer() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itens: { colecao: string; id: string }[]) => {
      for (const it of itens) await deleteDoc(doc(db, 'restaurants', t, it.colecao, it.id))
      return itens
    },
    onSuccess: (itens) => {
      new Set(itens.map((i) => i.colecao)).forEach((c) => qc.invalidateQueries({ queryKey: [t, c] }))
    },
  })
}

export interface RespostasOnboarding {
  nome: string
  bairro: string
  lojas: string
  operacao: string
  cozinha: string
  cnpj: string
  canais: string[]
  ticket: string
  pedidos: string
  horarios: DiaHorario[]
  faturamento: string
  folha: number
  contasFixas: number
  pessoas: string
  meta: string
  tetos: { mercadoria: number; pessoal: number; ocupacao: number; taxas_app: number }
  avisos: { whatsapp: boolean; email: boolean; sms: boolean }
}

const OP_MAP: Record<string, string> = {
  'Só delivery': 'delivery',
  'Delivery + salão': 'delivery_salao',
  'Só salão': 'salao',
  'Buffet / eventos': 'buffet',
}

/** Grava as respostas do onboarding no restaurante do usuário (tenant real). */
export function usePersistirOnboarding() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (r: RespostasOnboarding) => {
      await setRestaurante(t, {
        nome: r.nome || 'Meu restaurante',
        bairro: r.bairro,
        cidade: 'Rio de Janeiro',
        tipoOperacao: (OP_MAP[r.operacao] ?? 'delivery_salao') as never,
        tipoCozinha: r.cozinha,
        cnpj: r.cnpj,
        regimeTributario: 'simples',
        aliquotaImposto: 0.06,
        metaFaturamento: numeroBR(r.meta) || 50000,
        tetos: r.tetos,
        aberturaMes: 'julho de 2026',
        // extras do onboarding (RestauranteDoc tolera campos a mais)
        numLojas: Number(r.lojas) || 1,
        ticketMedio: numeroBR(r.ticket),
        pedidosDia: Number(r.pedidos) || 0,
        horarios: r.horarios,
        folha: r.folha,
        contasFixas: r.contasFixas,
        pessoas: Number(r.pessoas) || 0,
        avisos: r.avisos,
      } as never)
      // Canais marcados viram integrações "conectando".
      await Promise.all(
        r.canais
          .filter((c) => c === 'ifood' || c === 'rappi')
          .map((c) => repo.integracoes.salvar(t, c, { provedor: c, status: 'conectando' })),
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [t, 'restaurante'] })
      qc.invalidateQueries({ queryKey: [t, 'integracoes'] })
    },
  })
}

export function useSalvarContagem() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: ContagemDoc) => repo.contagens.salvar(t, c.id, c),
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'contagens'] }),
  })
}
