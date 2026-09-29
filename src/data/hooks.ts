import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { doc, deleteDoc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { getRestaurante, setRestaurante, repo, type IntegracaoDoc } from './repo'
import { getRede, getRedeDoDono, criarRede, abrirLoja, type LojaDaRede } from './rede'
import { getPlanoMes, salvarPlanoMes, type PlanoMesDoc } from './planoMes'
import {
  listarSolicitacoes,
  salvarSolicitacao,
  OPCAO,
  type SolicitacaoDoc,
  type TipoSolicitacao,
} from './solicitacoes'
import { MES_REF, diaDeHoje, type Contexto } from './derive'
import type { DiaHorario } from '@/components/ui/HorarioSemana'
import { DEMO_TENANT, REDE_DEMO, origemAtual } from './tenant'
import { useLojaAtiva } from './lojaAtiva'
import { useAuth } from '@/auth/AuthContext'
import { numeroBR, dataBRparaISO } from '@/lib/csv'
import { temRede, type TipoNegocio } from '@/types'
import type { TipoImport } from './importar'
import { precosPorItem, type Nota } from './compras'
import {
  normalizarCategoria,
  contaDeCmvDoProduto,
  aplicarPlanoDeContas,
  CONTA,
  TETOS_PADRAO,
  type Tetos,
  type CategoriaDespesa,
  type ContaPersonalizada,
} from './planoContas'
import type {
  DespesaDoc,
  ItemNota,
  ProdutoDoc,
  ReceitaDiaDoc,
  RestauranteDoc,
  AtividadeDoc,
  ContagemDoc,
  MembroDoc,
} from './types'

/**
 * Tenant atual — a loja que o painel está mostrando. Normalmente é o
 * restaurante do login; quem tem rede pode estar vendo outra loja dela.
 */
export function useTenant() {
  const { sessao } = useAuth()
  const loja = useLojaAtiva()
  return loja ?? sessao?.tenantId ?? DEMO_TENANT
}

/** Tenant do login, ignorando a troca de loja. Usado pela própria rede. */
export function useTenantDoLogin() {
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
export function useMovimentos() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'movimentos_estoque'], queryFn: () => repo.movimentos.listar(t) })
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

/* ---------------------------- Rede de lojas --------------------------- */

/** Rede do usuário logado — franquia ou várias lojas do mesmo dono. */
export function useRede() {
  const { sessao } = useAuth()
  const uid = sessao?.usuario.id
  const demo = sessao?.demo ?? false
  return useQuery({
    queryKey: ['rede', demo ? REDE_DEMO : uid],
    queryFn: async () => {
      if (demo) return getRede(REDE_DEMO)
      if (!uid) return null
      const u = await getDoc(doc(db, 'users', uid))
      const redeId = u.exists() ? (u.data().redeId as string | undefined) : undefined
      return redeId ? getRede(redeId) : getRedeDoDono(uid)
    },
    enabled: demo || !!uid,
  })
}

export interface LojaComContexto {
  loja: LojaDaRede
  ctx: Contexto
}

/**
 * Carrega o contexto de cálculo de cada loja da rede. As chaves de cache são
 * as mesmas do tenant individual, então trocar de loja não refaz a busca.
 */
export function useContextosDaRede(): { carregando: boolean; lojas: LojaComContexto[] } {
  const rede = useRede()
  const lojas = rede.data?.lojas ?? []
  const resultados = useQueries({
    queries: lojas.flatMap((l) => [
      { queryKey: [l.restauranteId, 'despesas'], queryFn: () => repo.despesas.listar(l.restauranteId) },
      { queryKey: [l.restauranteId, 'receita_dia'], queryFn: () => repo.receitaDia.listar(l.restauranteId) },
      { queryKey: [l.restauranteId, 'contagens'], queryFn: () => repo.contagens.listar(l.restauranteId) },
      { queryKey: [l.restauranteId, 'restaurante'], queryFn: () => getRestaurante(l.restauranteId) },
    ]),
  })

  return {
    carregando: rede.isLoading || resultados.some((r) => r.isLoading),
    lojas: lojas.map((loja, i) => ({
      loja,
      ctx: {
        despesas: (resultados[i * 4]?.data as DespesaDoc[]) ?? [],
        receitaDia: (resultados[i * 4 + 1]?.data as ReceitaDiaDoc[]) ?? [],
        contagens: (resultados[i * 4 + 2]?.data as ContagemDoc[]) ?? [],
        config: (resultados[i * 4 + 3]?.data as RestauranteDoc | undefined) ?? null,
      },
    })),
  }
}

/** Cria a rede e registra a loja atual como primeira unidade. */
export function useCriarRede() {
  const { sessao } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { nome: string; tipo: 'franquia' | 'multi_loja' }) => {
      if (!sessao) throw new Error('sem sessão')
      return criarRede({
        uid: sessao.usuario.id,
        nome: p.nome,
        tipo: p.tipo,
        primeiraLoja: {
          restauranteId: sessao.tenantId,
          nome: sessao.restaurante.nome,
          bairro: sessao.restaurante.bairro,
          cidade: sessao.restaurante.cidade,
        },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rede'] })
      qc.invalidateQueries({ queryKey: [sessao?.tenantId, 'restaurante'] })
    },
  })
}

/** Abre uma loja nova dentro da rede. */
export function useAbrirLoja() {
  const { sessao } = useAuth()
  const rede = useRede()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { nome: string; bairro: string; cidade: string }) => {
      if (!sessao || !rede.data) throw new Error('sem rede')
      return abrirLoja({
        rede: rede.data,
        uid: sessao.usuario.id,
        nome: p.nome,
        bairro: p.bairro,
        cidade: p.cidade || 'Rio de Janeiro',
        // Loja própria da rede: franqueada quando a rede é franquia.
        tipoNegocio: rede.data.tipo === 'franquia' ? 'franqueada' : 'multi_loja',
        aliquotaImposto: 0.06,
        metaFaturamento: 50000,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rede'] }),
  })
}

/* ------------------------- Plano do mês -------------------------------- */

/** Plano de um mês. Sem plano gravado, devolve null e a tela usa os tetos gerais. */
export function usePlanoMes(mes: string) {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'plano', mes], queryFn: () => getPlanoMes(t, mes) })
}

export function useSalvarPlanoMes() {
  const t = useTenant()
  const { sessao } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { mes: string; metaFaturamento: number; tetos: Tetos }) => {
      const doc: PlanoMesDoc = {
        ...p,
        criadoEm: new Date().toISOString(),
        criadoPorNome: sessao?.usuario.nome ?? 'Você',
      }
      await salvarPlanoMes(t, doc)
      return doc
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: [t, 'plano', d.mes] }),
  })
}

/* ------------------- Pedidos da franqueadora -------------------------- */

/** Pedidos que a franqueadora fez pra ESTA loja. */
export function useSolicitacoes() {
  const t = useTenant()
  return useQuery({ queryKey: [t, 'solicitacoes'], queryFn: () => listarSolicitacoes(t) })
}

/** A franqueadora pede uma informação a uma loja da rede. */
export function useCriarSolicitacao() {
  const { sessao } = useAuth()
  const rede = useRede()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { lojaId: string; tipo: TipoSolicitacao; detalhe?: string }) => {
      const opcao = OPCAO[p.tipo]
      const doc: SolicitacaoDoc = {
        id: novoId('sol'),
        tipo: p.tipo,
        titulo: opcao.titulo,
        detalhe: p.detalhe?.trim() || opcao.descricao,
        status: 'aberta',
        pedidoPorId: sessao?.usuario.id ?? 'franqueador',
        pedidoPorNome: sessao?.usuario.nome ?? 'Franqueadora',
        rede: rede.data?.nome ?? 'Rede',
        criadoEm: new Date().toISOString(),
      }
      await salvarSolicitacao(p.lojaId, doc)
      return doc
    },
    onSuccess: (_d, p) => qc.invalidateQueries({ queryKey: [p.lojaId, 'solicitacoes'] }),
  })
}

/** A loja marca o pedido como atendido. */
export function useResponderSolicitacao() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: SolicitacaoDoc) =>
      salvarSolicitacao(t, { ...s, status: 'respondida', respondidoEm: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'solicitacoes'] }),
  })
}

/** Pedidos abertos de cada loja da rede — alimenta os cartões de Franquias. */
export function useSolicitacoesDaRede(lojas: LojaDaRede[]) {
  const resultados = useQueries({
    queries: lojas.map((l) => ({
      queryKey: [l.restauranteId, 'solicitacoes'],
      queryFn: () => listarSolicitacoes(l.restauranteId),
    })),
  })
  const porLoja: Record<string, SolicitacaoDoc[]> = {}
  lojas.forEach((l, i) => {
    porLoja[l.restauranteId] = (resultados[i]?.data as SolicitacaoDoc[]) ?? []
  })
  return porLoja
}

/** Contexto para os cálculos (despesas + receita + config). */
export function useContexto() {
  const despesas = useDespesas()
  const receita = useReceitaDia()
  const contagens = useContagens()
  const config = useRestaurante()
  return {
    carregando: despesas.isLoading || receita.isLoading || config.isLoading,
    ctx: {
      despesas: despesas.data ?? [],
      receitaDia: receita.data ?? [],
      // Contagem de estoque fecha o CMV do DRE (compras ± inventário).
      contagens: contagens.data ?? [],
      config: config.data ?? null,
    },
  }
}

/* --------------------------- Plano de contas ---------------------------- *
 * O plano de contas é o modelo padrão + o que a loja personalizou. O registro
 * vive em `planoContas.ts` e é reescrito aqui assim que as contas da loja
 * chegam do banco — por isso todo mundo que lê `CONTA`/`CONTAS` (gaveta, DRE,
 * Despesas, Plano do mês, importação) enxerga a conta nova sem mudar nada.
 * ----------------------------------------------------------------------- */

/**
 * Carrega e aplica o plano de contas da loja. Precisa ser chamado alto na
 * árvore (o AppShell chama) pra que o registro já esteja em pé quando as
 * telas renderizarem.
 */
export function usePlanoContas() {
  const t = useTenant()
  return useQuery({
    queryKey: [t, 'contas'],
    queryFn: async () => {
      const contas = await repo.contas.listar(t)
      aplicarPlanoDeContas(contas)
      return contas
    },
  })
}

/** Cria ou corrige uma conta do plano. Id de conta padrão vira edição dela. */
export function useSalvarConta() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (conta: ContaPersonalizada) => {
      const autor = getAutor()
      const jaExiste = !!CONTA[conta.id]
      await repo.contas.salvar(t, conta.id, conta)
      await registrarAtividade(
        t,
        {
          acao: jaExiste ? 'corrigiu a conta' : 'criou a conta',
          entidade: conta.nome ?? conta.id,
          tipo: 'Plano de contas',
          quem: '',
          quemInicial: '',
          quemCor: '',
        },
        autor,
      )
      return conta
    },
    onSuccess: () => invalidarPlano(qc, t),
  })
}

/**
 * Tira uma conta do plano.
 *
 * Conta própria some de vez — e por isso, se ainda tem lançamento, é
 * obrigatório dizer para qual conta ele vai: sem destino o valor sumiria do
 * DRE junto com a conta. Conta do modelo padrão só é ARQUIVADA (sai das listas
 * de lançamento, o histórico continua somando), então mover é opcional.
 */
export function useRemoverConta() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async ({ id, destino }: { id: string; destino?: CategoriaDespesa }) => {
      const autor = getAutor()
      const info = CONTA[id]
      const daConta = (await repo.despesas.listar(t)).filter((d) => d.categoria === id)
      if (daConta.length && !destino && info?.propria) {
        throw new Error('Escolha para qual conta os lançamentos vão antes de apagar esta.')
      }
      // Sem destino, nada se move: a conta é arquivada e o histórico fica nela.
      const aMover = destino ? daConta : []
      for (const d of aMover) {
        await repo.despesas.salvar(t, d.id, {
          categoria: normalizarCategoria(destino),
          editadoEm: autor.criadoEm,
          editadoPorId: autor.criadoPorId,
          editadoPorNome: autor.criadoPorNome,
        })
      }
      if (info?.propria) await repo.contas.remover(t, id)
      else await repo.contas.salvar(t, id, { id, arquivada: true })
      await registrarAtividade(
        t,
        {
          acao: info?.propria ? 'apagou a conta' : 'arquivou a conta',
          entidade: info?.nome ?? id,
          tipo: 'Plano de contas',
          quem: '',
          quemInicial: '',
          quemCor: '',
        },
        autor,
      )
      return { movidos: aMover.length }
    },
    onSuccess: () => {
      invalidarPlano(qc, t)
      qc.invalidateQueries({ queryKey: [t, 'despesas'] })
    },
  })
}

/** Devolve uma conta arquivada pro uso. */
export function useReativarConta() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.contas.salvar(t, id, { id, arquivada: false }),
    onSuccess: () => invalidarPlano(qc, t),
  })
}

function invalidarPlano(qc: ReturnType<typeof useQueryClient>, t: string) {
  qc.invalidateQueries({ queryKey: [t, 'contas'] })
  qc.invalidateQueries({ queryKey: [t, 'atividades'] })
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

/** Só os campos de autoria que vão pro documento (sem o avatar do toast). */
function autoriaDe(autor: ReturnType<ReturnType<typeof useAutor>>) {
  return {
    criadoEm: autor.criadoEm,
    criadoPorId: autor.criadoPorId,
    criadoPorNome: autor.criadoPorNome,
    origem: autor.origem,
  }
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
        valorTotal: entrada.valorTotal ?? 0,
        dataCompetencia: entrada.dataCompetencia ?? diaDeHoje(),
        formaPagamento: entrada.formaPagamento ?? 'pix',
        status: entrada.status ?? 'pago',
        recorrente: entrada.recorrente ?? false,
        criadoEm: autor.criadoEm,
        criadoPorId: autor.criadoPorId,
        criadoPorNome: autor.criadoPorNome,
        origem: autor.origem,
        ...entrada,
        // Depois do spread de propósito: nada entra no banco fora do plano de contas.
        categoria: normalizarCategoria(entrada.categoria),
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

/**
 * Corrige uma conta da casa já lançada. Grava por cima do mesmo documento —
 * o id não muda, então o caixa, o DRE e o Plano do mês leem a versão nova sem
 * precisar saber que houve correção. Quem lançou continua sendo o autor.
 *
 * Compra de mercadoria NÃO passa por aqui: ela tem estoque e custo de produto
 * atrás e é corrigida pela nota inteira, em `useAtualizarNota`.
 */
export function useAtualizarDespesa() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<DespesaDoc> }) => {
      const autor = getAutor()
      const atual = (await repo.despesas.listar(t)).find((d) => d.id === id)
      if (!atual) throw new Error('Esse lançamento não existe mais — atualize a tela.')
      const doc: DespesaDoc = {
        ...atual,
        ...dados,
        categoria: normalizarCategoria(dados.categoria ?? atual.categoria),
        id,
        // Autoria original preservada; a correção fica registrada ao lado.
        criadoEm: atual.criadoEm,
        criadoPorId: atual.criadoPorId,
        criadoPorNome: atual.criadoPorNome,
        origem: atual.origem,
        editadoEm: autor.criadoEm,
        editadoPorId: autor.criadoPorId,
        editadoPorNome: autor.criadoPorNome,
      }
      await repo.despesas.salvar(t, id, doc)
      await registrarAtividade(
        t,
        { acao: 'corrigiu a despesa', entidade: doc.fornecedor, tipo: 'Despesa', valor: doc.valorTotal, quem: '', quemInicial: '', quemCor: '' },
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

/** Cópia de uma conta da casa, com id próprio e apontando pra origem. */
export function useDuplicarDespesa() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async ({ origem, dados }: { origem: DespesaDoc; dados?: Partial<DespesaDoc> }) => {
      const autor = getAutor()
      const id = novoId('d')
      // `itens`, `notaId` e as marcas de edição ficam de fora: a cópia nasce
      // limpa, senão ela apareceria dentro da nota fiscal do original.
      const {
        id: _id,
        notaId: _notaId,
        itens: _itens,
        editadoEm: _e1,
        editadoPorId: _e2,
        editadoPorNome: _e3,
        ...base
      } = origem
      const doc: DespesaDoc = {
        ...base,
        ...dados,
        categoria: normalizarCategoria(dados?.categoria ?? origem.categoria),
        duplicadoDe: origem.id,
        ...autoriaDe(autor),
        id,
      }
      await repo.despesas.salvar(t, id, doc)
      await registrarAtividade(
        t,
        { acao: 'duplicou a despesa', entidade: doc.fornecedor, tipo: 'Despesa', valor: doc.valorTotal, quem: '', quemInicial: '', quemCor: '' },
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

/**
 * Apaga uma conta da casa. Lançamento de nota fiscal não entra aqui — quem
 * apaga compra é `useRemoverNota`, que leva junto o estoque e o custo.
 */
export function useRemoverDespesa() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (alvo: string | DespesaDoc) => {
      const autor = getAutor()
      const id = typeof alvo === 'string' ? alvo : alvo.id
      const doc = typeof alvo === 'string' ? (await repo.despesas.listar(t)).find((d) => d.id === id) : alvo
      await repo.despesas.remover(t, id)
      await registrarAtividade(
        t,
        { acao: 'apagou a despesa', entidade: doc?.fornecedor ?? 'lançamento', tipo: 'Despesa', valor: doc?.valorTotal, quem: '', quemInicial: '', quemCor: '' },
        autor,
      )
      return doc ?? null
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [t, 'despesas'] })
      qc.invalidateQueries({ queryKey: [t, 'atividades'] })
    },
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
            dataCompetencia: r.data ? dataBRparaISO(r.data) : diaDeHoje(),
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
        const contagem = contagens.find((c) => c.mesReferencia === MES_REF) ?? contagens[0]
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

/** O que já veio das plataformas no dia (enquanto a integração real não roda). */
export const VENDA_APP_DEMO = {
  ifood: { bruto: 742.5, taxa: 178.2, pedidos: 38 },
  rappi: { bruto: 186.4, taxa: 41.3, pedidos: 9 },
}

export function useCriarFechamento() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (e: { pix: number; cartao: number; dinheiro: number; delivery?: number; outras?: number }) => {
      const { pix, cartao, dinheiro } = e
      const autor = getAutor()
      const autoria = { criadoEm: autor.criadoEm, criadoPorId: autor.criadoPorId, criadoPorNome: autor.criadoPorNome, origem: autor.origem }
      const hoje = diaDeHoje()
      const loja = pix + cartao + dinheiro
      const delivery = e.delivery ?? 0
      const outras = e.outras ?? 0
      const id = `fech-${hoje}`
      // Um canal por linha de receita bruta do DRE: loja própria, delivery de
      // app, delivery próprio e outras receitas.
      const canais = [
        { canal: 'ifood' as const, valorBruto: VENDA_APP_DEMO.ifood.bruto, taxa: VENDA_APP_DEMO.ifood.taxa, pedidos: VENDA_APP_DEMO.ifood.pedidos },
        { canal: 'rappi' as const, valorBruto: VENDA_APP_DEMO.rappi.bruto, taxa: VENDA_APP_DEMO.rappi.taxa, pedidos: VENDA_APP_DEMO.rappi.pedidos },
        { canal: 'balcao' as const, valorBruto: loja, taxa: 0, pedidos: 0 },
        { canal: 'whatsapp' as const, valorBruto: delivery, taxa: 0, pedidos: 0 },
        { canal: 'outros' as const, valorBruto: outras, taxa: 0, pedidos: 0 },
      ].filter((c) => c.valorBruto > 0)
      const receita = {
        id,
        data: hoje,
        canais,
        recebimentos: [
          { forma: 'pix', valor: pix },
          { forma: 'cartao', valor: cartao },
          { forma: 'dinheiro', valor: dinheiro },
        ],
        sangria: 0,
        totalDia: canais.reduce((s, c) => s + c.valorBruto, 0),
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

export interface ItemDaNota {
  produtoId: string
  quantidade: number
  precoUnitario: number
}

export interface EntradaNota {
  fornecedor: string
  data: string
  formaPagamento: DespesaDoc['formaPagamento']
  status: DespesaDoc['status']
  observacao?: string
  itens: ItemDaNota[]
}

/** Autoria já resolvida, sem os campos privados do `useAutor`. */
type Autoria = { criadoEm: string; criadoPorId: string; criadoPorNome: string; origem: ReturnType<typeof origemAtual> }

/** Marca de quem corrigiu o lançamento, sem apagar quem lançou. */
function marcaDeEdicao(autor: Autoria) {
  return { editadoEm: autor.criadoEm, editadoPorId: autor.criadoPorId, editadoPorNome: autor.criadoPorNome }
}

/**
 * Grava os documentos de uma nota fiscal sob um `notaId`: movimento de estoque
 * por item, custo do produto em dia e o financeiro separado por conta do DRE.
 *
 * É o mesmo caminho para lançar e para corrigir — corrigir apaga os docs
 * antigos da nota e regrava por aqui, senão sobrava movimento de estoque órfão
 * de uma versão que não existe mais.
 */
async function gravarNota(
  t: string,
  notaId: string,
  e: EntradaNota,
  autoria: Autoria,
  extras: Record<string, unknown> = {},
) {
  const produtos = await repo.produtos.listar(t)
  const porId = new Map(produtos.map((p) => [p.id, p]))
  const criados: { colecao: string; id: string }[] = []

  // Item a item: entrada no estoque + custo do produto em dia.
  const linhas = e.itens
    .map((i) => ({ item: i, produto: porId.get(i.produtoId) }))
    .filter((l): l is { item: ItemDaNota; produto: ProdutoDoc } => !!l.produto && l.item.quantidade > 0)

  for (const { item, produto } of linhas) {
    const movimentoId = novoId('mov')
    await repo.movimentos.salvar(t, movimentoId, {
      id: movimentoId,
      tipo: 'Entrou mercadoria',
      notaId,
      data: e.data,
      produtoId: produto.id,
      produto: produto.nome,
      quantidade: item.quantidade,
      custoUnitario: item.precoUnitario,
      valor: item.quantidade * item.precoUnitario,
      ...autoria,
    })
    criados.push({ colecao: 'movimentos_estoque', id: movimentoId })
  }

  // Financeiro: um lançamento por conta de CMV envolvida na nota.
  const porConta = new Map<CategoriaDespesa, ItemNota[]>()
  for (const { item, produto } of linhas) {
    // A conta sai da CATEGORIA do produto (embalagem → descartáveis,
    // limpeza → limpeza). O `entraNoCmv` não decide aqui: marmita marcada
    // como fora do CMV ia parar na conta de Limpeza, o que ninguém entende
    // lendo o DRE.
    const conta = contaDeCmvDoProduto(produto.categoria)
    const variacao =
      produto.custoAtual > 0 ? ((item.precoUnitario - produto.custoAtual) / produto.custoAtual) * 100 : undefined
    porConta.set(conta, [
      ...(porConta.get(conta) ?? []),
      {
        produtoId: produto.id,
        produto: produto.nome,
        unidade: produto.unidade,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        ...(variacao === undefined ? {} : { variacao }),
      },
    ])
  }

  let valorTotal = 0
  for (const [categoria, itens] of porConta) {
    const valor = itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0)
    valorTotal += valor
    const despesaId = novoId('d')
    await repo.despesas.salvar(t, despesaId, {
      id: despesaId,
      fornecedor: e.fornecedor || 'Fornecedor',
      descricao: itens.map((i) => i.produto).join(', '),
      categoria,
      valorTotal: valor,
      dataCompetencia: e.data,
      formaPagamento: e.formaPagamento,
      status: e.status,
      recorrente: false,
      tipoLancamento: 'compra',
      notaId,
      itens,
      ...(e.observacao ? { observacao: e.observacao } : {}),
      ...autoria,
      ...extras,
    })
    criados.push({ colecao: 'despesas', id: despesaId })
  }

  // O custo do produto é sempre o da compra mais recente que existe hoje —
  // recalculado do histórico inteiro, não escrito direto pelo preço desta nota.
  // Assim editar uma nota velha não sobrescreve o preço de uma compra nova.
  await resincronizarCustos(t, linhas.map((l) => l.produto.id))

  return { notaId, valorTotal, itens: linhas.length, criados }
}

/**
 * Apaga tudo que uma nota gerou: os lançamentos financeiros e as entradas de
 * estoque. Devolve o que foi apagado e quais produtos precisam de custo novo.
 */
async function apagarNota(t: string, notaId: string) {
  const despesas = (await repo.despesas.listar(t)).filter((d) => (d.notaId ?? d.id) === notaId)
  const movimentos = (await repo.movimentos.listar(t)).filter((m) => m.notaId === notaId)
  const produtosTocados = new Set<string>([
    ...movimentos.map((m) => m.produtoId),
    ...despesas.flatMap((d) => (d.itens ?? []).map((i) => i.produtoId)),
  ])
  for (const d of despesas) await repo.despesas.remover(t, d.id)
  for (const m of movimentos) await repo.movimentos.remover(t, m.id)
  return {
    despesas,
    movimentos,
    produtosTocados: [...produtosTocados].filter(Boolean),
    valorTotal: despesas.reduce((s, d) => s + d.valorTotal, 0),
  }
}

/**
 * Recoloca o custo de cada produto no preço da compra mais recente que ainda
 * existe. É o que fecha o furo de apagar ou corrigir uma nota: sem isso o
 * produto continuava valendo o preço de uma compra que não existe mais, e a
 * contagem de estoque (e o CMV do DRE) mentia junto.
 *
 * Produto sem nenhuma compra restante mantém o custo do cadastro — zerar aqui
 * apagaria o valor da prateleira.
 */
async function resincronizarCustos(t: string, produtoIds: string[]) {
  if (!produtoIds.length) return
  const alvo = new Set(produtoIds)
  const despesas = await repo.despesas.listar(t)
  const produtos = await repo.produtos.listar(t)
  const precos = new Map(precosPorItem(despesas).map((p) => [p.produtoId, p]))
  for (const produto of produtos) {
    if (!alvo.has(produto.id)) continue
    const preco = precos.get(produto.id)
    if (!preco || preco.atual <= 0 || preco.atual === produto.custoAtual) continue
    await repo.produtos.atualizar(t, produto.id, { custoAtual: preco.atual })
  }
}

/**
 * Lança uma nota fiscal de mercadoria: dá entrada no estoque item a item,
 * atualiza o custo de cada produto e gera o lançamento financeiro.
 *
 * O financeiro sai separado por conta do DRE (alimento, bebida, descartável),
 * senão uma nota mista jogaria bebida na linha de alimentos. Os lançamentos
 * carregam o mesmo `notaId`, então a tela remonta a nota inteira.
 */
export function useCriarNota() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (e: EntradaNota) => {
      const autor = getAutor()
      const r = await gravarNota(t, novoId('nf'), e, autoriaDe(autor))
      await registrarAtividade(
        t,
        {
          acao: 'lançou a nota do',
          entidade: e.fornecedor || 'fornecedor',
          tipo: 'Compra',
          valor: r.valorTotal,
          quem: '',
          quemInicial: '',
          quemCor: '',
        },
        autor,
      )
      return r
    },
    onSuccess: () => invalidarNota(qc, t),
  })
}

/**
 * Corrige uma nota já lançada. Apaga os documentos da versão antiga e regrava
 * a nota inteira sob o MESMO `notaId`: o estoque, o custo dos produtos e o
 * financeiro passam a contar a mesma história. Quem lançou continua sendo o
 * autor; quem corrigiu fica registrado ao lado.
 */
export function useAtualizarNota() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async ({ notaId, entrada }: { notaId: string; entrada: EntradaNota }) => {
      const autor = getAutor()
      const antiga = await apagarNota(t, notaId)
      const original = antiga.despesas[0]
      // A autoria original sobrevive à correção — senão o "quem lançou" da
      // tela passava a apontar pra quem só arrumou o preço de um item.
      const autoria: Autoria = original
        ? {
            criadoEm: original.criadoEm,
            criadoPorId: original.criadoPorId,
            criadoPorNome: original.criadoPorNome,
            origem: original.origem,
          }
        : autoriaDe(autor)
      const r = await gravarNota(t, notaId, entrada, autoria, marcaDeEdicao(autor))
      // Produto que saiu da nota também precisa de custo novo.
      await resincronizarCustos(t, antiga.produtosTocados)
      await registrarAtividade(
        t,
        {
          acao: 'corrigiu a nota do',
          entidade: entrada.fornecedor || 'fornecedor',
          tipo: 'Compra',
          valor: r.valorTotal,
          quem: '',
          quemInicial: '',
          quemCor: '',
        },
        autor,
      )
      return r
    },
    onSuccess: () => invalidarNota(qc, t),
  })
}

/**
 * Apaga a nota inteira: lançamentos financeiros, entradas de estoque e o custo
 * dos produtos de volta pra compra anterior. Apagar só a despesa deixava a
 * mercadoria no estoque sem nunca ter sido paga.
 */
export function useRemoverNota() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async ({ notaId, fornecedor }: { notaId: string; fornecedor?: string }) => {
      const autor = getAutor()
      const apagada = await apagarNota(t, notaId)
      await resincronizarCustos(t, apagada.produtosTocados)
      await registrarAtividade(
        t,
        {
          acao: 'apagou a nota do',
          entidade: fornecedor || apagada.despesas[0]?.fornecedor || 'fornecedor',
          tipo: 'Compra',
          valor: apagada.valorTotal,
          quem: '',
          quemInicial: '',
          quemCor: '',
        },
        autor,
      )
      return apagada
    },
    onSuccess: () => invalidarNota(qc, t),
  })
}

/** Nota nova, igualzinha à original — com `notaId` próprio e estoque próprio. */
export function useDuplicarNota() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (e: EntradaNota) => {
      const autor = getAutor()
      const r = await gravarNota(t, novoId('nf'), e, autoriaDe(autor))
      await registrarAtividade(
        t,
        {
          acao: 'duplicou a nota do',
          entidade: e.fornecedor || 'fornecedor',
          tipo: 'Compra',
          valor: r.valorTotal,
          quem: '',
          quemInicial: '',
          quemCor: '',
        },
        autor,
      )
      return r
    },
    onSuccess: () => invalidarNota(qc, t),
  })
}

/**
 * Traz de volta uma nota apagada, com o mesmo `notaId` e a autoria original.
 * É o "Desfazer" do toast: apagar uma nota mexe em estoque, custo de produto e
 * financeiro, então desfazer precisa refazer os três — apagar de novo o que
 * sobrou não bastava.
 */
export function useRestaurarNota() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (nota: Nota) => {
      const autor = getAutor()
      const base = nota.lancamentos[0]
      const autoria: Autoria = base
        ? { criadoEm: base.criadoEm, criadoPorId: base.criadoPorId, criadoPorNome: base.criadoPorNome, origem: base.origem }
        : autoriaDe(autor)
      return gravarNota(
        t,
        nota.id,
        {
          fornecedor: nota.fornecedor,
          data: nota.data,
          formaPagamento: nota.formaPagamento,
          status: nota.status,
          observacao: base?.observacao,
          itens: nota.itens.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade,
            precoUnitario: i.precoUnitario,
          })),
        },
        autoria,
      )
    },
    onSuccess: () => invalidarNota(qc, t),
  })
}

/** Traz de volta uma conta da casa apagada, com o mesmo id e a mesma autoria. */
export function useRestaurarDespesa() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (d: DespesaDoc) => {
      await repo.despesas.salvar(t, d.id, d)
      return d
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'despesas'] }),
  })
}

/** Uma nota mexe em quatro coleções — todas revalidam juntas. */
function invalidarNota(qc: ReturnType<typeof useQueryClient>, t: string) {
  qc.invalidateQueries({ queryKey: [t, 'despesas'] })
  qc.invalidateQueries({ queryKey: [t, 'produtos'] })
  qc.invalidateQueries({ queryKey: [t, 'movimentos_estoque'] })
  qc.invalidateQueries({ queryKey: [t, 'atividades'] })
}

/**
 * Movimento de estoque que NÃO mexe em dinheiro: perda, contagem,
 * transferência. Entrada de mercadoria não passa por aqui — ela tem nota
 * fiscal, fornecedor e valor, e entra por `useCriarNota`.
 */
export function useCriarMovimento() {
  const t = useTenant()
  const qc = useQueryClient()
  const getAutor = useAutor()
  return useMutation({
    mutationFn: async (e: { tipo: string; produtoId: string; quantidade: number; observacao?: string }) => {
      const autor = getAutor()
      const autoria = {
        criadoEm: autor.criadoEm,
        criadoPorId: autor.criadoPorId,
        criadoPorNome: autor.criadoPorNome,
        origem: autor.origem,
      }
      const produtos = await repo.produtos.listar(t)
      const produto = produtos.find((p) => p.id === e.produtoId)
      if (!produto) throw new Error('Escolha um produto cadastrado.')
      const valor = e.quantidade * produto.custoAtual
      const movimentoId = novoId('mov')
      await repo.movimentos.salvar(t, movimentoId, {
        id: movimentoId,
        tipo: e.tipo,
        data: diaDeHoje(),
        produtoId: produto.id,
        produto: produto.nome,
        quantidade: e.quantidade,
        custoUnitario: produto.custoAtual,
        valor,
        ...(e.observacao ? { observacao: e.observacao } : {}),
        ...autoria,
      })
      await registrarAtividade(
        t,
        { acao: 'movimentou estoque', entidade: produto.nome, tipo: 'Estoque', valor, quem: '', quemInicial: '', quemCor: '' },
        autor,
      )
      return { movimentoId, produto: produto.nome, valor }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [t, 'movimentos_estoque'] })
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

/** Teto padrão de taxas de app (%) até o dono conectar as integrações e a
 * gente passar a calcular de verdade a partir dos pedidos reais. */
export const TAXA_APP_TETO_PADRAO = 12

export interface RespostasOnboarding {
  nome: string
  bairro: string
  lojas: string
  /** Loja única, várias lojas, franqueada ou franqueadora. */
  tipoNegocio: TipoNegocio
  /** Nome da bandeira/rede, quando opera mais de uma loja. */
  nomeRede: string
  /** % da receita bruta pagos à franqueadora. */
  royalties: number
  fundoPromocao: number
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
  mercadoria: number
  pessoas: string
  meta: string
  avisos: { whatsapp: boolean; email: boolean; sms: boolean }
}

/** % de um valor em R$/mês sobre a meta de faturamento (base dos tetos).
 * `meta` vem mascarado como dígitos formatados (ex.: "50.000"), não no
 * padrão decimal BR do numeroBR — por isso só limpa os dígitos. */
export function pctDaMeta(valor: number, meta: string): number {
  const base = Number(meta.replace(/\D/g, '')) || 50000
  return base > 0 ? Math.round((valor / base) * 100) : 0
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
  const { sessao } = useAuth()
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
        metaFaturamento: Number(r.meta.replace(/\D/g, '')) || 50000,
        // Tetos por grupo do DRE — o que o onboarding não pergunta fica no padrão.
        tetos: {
          ...TETOS_PADRAO,
          ocupacao: pctDaMeta(r.contasFixas, r.meta),
          pessoal: pctDaMeta(r.folha, r.meta),
          cmv: pctDaMeta(r.mercadoria, r.meta),
          deducao: TAXA_APP_TETO_PADRAO,
        },
        aberturaMes: 'julho de 2026',
        onboardingConcluido: true,
        // Natureza do negócio: é ela que decide se o DRE tem linha de
        // franqueadora e se existe visão de rede.
        tipoNegocio: r.tipoNegocio,
        bandeira: temRede(r.tipoNegocio) || r.tipoNegocio === 'franqueada' ? r.nomeRede : '',
        taxasFranquia:
          r.tipoNegocio === 'franqueada'
            ? { royalties: r.royalties, fundoPromocao: r.fundoPromocao }
            : null,
        // extras do onboarding (RestauranteDoc tolera campos a mais)
        numLojas: Number(r.lojas) || 1,
        ticketMedio: numeroBR(r.ticket),
        pedidosDia: Number(r.pedidos) || 0,
        horarios: r.horarios,
        folha: r.folha,
        contasFixas: r.contasFixas,
        mercadoria: r.mercadoria,
        pessoas: Number(r.pessoas) || 0,
        avisos: r.avisos,
      } as never)
      // Quem opera mais de uma loja já sai do onboarding com a rede criada,
      // com a loja atual como primeira unidade.
      if (temRede(r.tipoNegocio) && sessao && !sessao.demo) {
        await criarRede({
          uid: sessao.usuario.id,
          nome: r.nomeRede || r.nome || 'Minha rede',
          tipo: r.tipoNegocio === 'franqueadora' ? 'franquia' : 'multi_loja',
          primeiraLoja: {
            restauranteId: t,
            nome: r.nome || sessao.restaurante.nome,
            bairro: r.bairro,
            cidade: 'Rio de Janeiro',
          },
        })
      }

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
      qc.invalidateQueries({ queryKey: ['rede'] })
    },
  })
}

/** Salva campos soltos da configuração do restaurante (tipo de negócio, taxas…). */
export function useSalvarRestaurante() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dados: Partial<RestauranteDoc>) => setRestaurante(t, dados as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [t, 'restaurante'] })
      qc.invalidateQueries({ queryKey: ['rede'] })
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

/* ------------------------------ iFood ----------------------------------- */

export interface LojaIFood {
  id: string
  nome: string
  razaoSocial: string
}

/**
 * Lojas do iFood autorizadas para o nosso aplicativo. O dono escolhe a dele
 * numa lista em vez de digitar o código — além de evitar erro de digitação,
 * é o que faz o clique gerar a consulta real ao iFood.
 */
export function useListarLojasIFood() {
  return useMutation({
    mutationFn: async (): Promise<LojaIFood[]> => {
      const fn = httpsCallable<void, { lojas: LojaIFood[] }>(functions, 'listarLojasIFood')
      const { data } = await fn()
      return data.lojas ?? []
    },
  })
}

/**
 * Vincula a loja escolhida ao restaurante. Passa pela Cloud Function porque
 * é lá que confirmamos, contra o iFood, que a loja existe e que temos acesso.
 */
export function useConectarIFood() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (merchantId: string) => {
      const fn = httpsCallable<
        { restauranteId: string; provedor: string; merchantId: string },
        { ok: boolean }
      >(functions, 'conectarIntegracao')
      const { data } = await fn({ restauranteId: t, provedor: 'ifood', merchantId })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'integracoes'] }),
  })
}

/** Sincroniza cardápio e estado da loja na hora, sem esperar o sync das 6h. */
export function useSincronizarIFood() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (merchantId: string) => {
      const fn = httpsCallable<{ restauranteId: string; merchantId: string }, { itens: number }>(
        functions,
        'sincronizarIFoodAgora',
      )
      const { data } = await fn({ restauranteId: t, merchantId })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'integracoes'] }),
  })
}
