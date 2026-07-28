import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRestaurante, repo } from './repo'
import { DEMO_TENANT, origemAtual } from './tenant'
import { useAuth } from '@/auth/AuthContext'
import type {
  DespesaDoc,
  ProdutoDoc,
  AtividadeDoc,
  ContagemDoc,
} from './types'

/** Tenant atual — demo enquanto o auth por e-mail/senha não é habilitado. */
export function useTenant() {
  return DEMO_TENANT
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

export function useSalvarContagem() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (c: ContagemDoc) => repo.contagens.salvar(t, c.id, c),
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'contagens'] }),
  })
}
