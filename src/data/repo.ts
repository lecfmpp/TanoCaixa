import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { normalizarCategoria, type ContaPersonalizada } from './planoContas'
import type {
  RestauranteDoc,
  MembroDoc,
  ProdutoDoc,
  DespesaDoc,
  ReceitaDiaDoc,
  ContagemDoc,
  AtividadeDoc,
  InsightDoc,
  MovimentoDoc,
  PratoDoc,
} from './types'

/* Caminhos: restaurants/{tenant}/{colecao}/{id} */

function colRef(tenant: string, nome: string) {
  return collection(db, 'restaurants', tenant, nome)
}
function docRef(tenant: string, nome: string, id: string) {
  return doc(db, 'restaurants', tenant, nome, id)
}

async function listar<T>(tenant: string, nome: string): Promise<T[]> {
  const snap = await getDocs(colRef(tenant, nome))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) }) as T)
}

async function salvar(tenant: string, nome: string, id: string, dados: DocumentData) {
  await setDoc(docRef(tenant, nome, id), dados, { merge: true })
}

async function atualizar(tenant: string, nome: string, id: string, dados: DocumentData) {
  await updateDoc(docRef(tenant, nome, id), dados)
}

async function remover(tenant: string, nome: string, id: string) {
  await deleteDoc(docRef(tenant, nome, id))
}

/* ------------------------------ Restaurante ----------------------------- */

export async function getRestaurante(tenant: string): Promise<RestauranteDoc | null> {
  const snap = await getDoc(doc(db, 'restaurants', tenant))
  return snap.exists() ? (snap.data() as RestauranteDoc) : null
}
export async function setRestaurante(tenant: string, dados: RestauranteDoc) {
  await setDoc(doc(db, 'restaurants', tenant), dados, { merge: true })
}

/* ------------------------------- Coleções ------------------------------- */

export const repo = {
  membros: {
    listar: (t: string) => listar<MembroDoc & { id: string }>(t, 'membros'),
    salvar: (t: string, id: string, d: Partial<MembroDoc>) => salvar(t, 'membros', id, d),
    remover: (t: string, id: string) => remover(t, 'membros', id),
  },
  produtos: {
    listar: (t: string) => listar<ProdutoDoc>(t, 'produtos'),
    salvar: (t: string, id: string, d: Partial<ProdutoDoc>) => salvar(t, 'produtos', id, d),
    atualizar: (t: string, id: string, d: Partial<ProdutoDoc>) => atualizar(t, 'produtos', id, d),
    remover: (t: string, id: string) => remover(t, 'produtos', id),
  },
  despesas: {
    // Migração na leitura: docs gravados no plano de contas antigo
    // (mercadoria/pessoal/ocupacao/taxas_app) viram a conta equivalente do DRE.
    listar: async (t: string) =>
      (await listar<DespesaDoc>(t, 'despesas')).map((d) => ({
        ...d,
        categoria: normalizarCategoria(d.categoria),
      })),
    salvar: (t: string, id: string, d: Partial<DespesaDoc>) => salvar(t, 'despesas', id, d),
    atualizar: (t: string, id: string, d: Partial<DespesaDoc>) => atualizar(t, 'despesas', id, d),
    remover: (t: string, id: string) => remover(t, 'despesas', id),
  },
  pratos: {
    listar: (t: string) => listar<PratoDoc>(t, 'pratos'),
    salvar: (t: string, id: string, d: Partial<PratoDoc>) => salvar(t, 'pratos', id, d),
    remover: (t: string, id: string) => remover(t, 'pratos', id),
  },
  receitaDia: {
    listar: (t: string) => listar<ReceitaDiaDoc>(t, 'receita_dia'),
    salvar: (t: string, id: string, d: Partial<ReceitaDiaDoc>) => salvar(t, 'receita_dia', id, d),
    remover: (t: string, id: string) => remover(t, 'receita_dia', id),
  },
  movimentos: {
    listar: (t: string) => listar<MovimentoDoc>(t, 'movimentos_estoque'),
    salvar: (t: string, id: string, d: Record<string, unknown>) => salvar(t, 'movimentos_estoque', id, d),
    remover: (t: string, id: string) => remover(t, 'movimentos_estoque', id),
  },
  contagens: {
    listar: (t: string) => listar<ContagemDoc>(t, 'contagens'),
    salvar: (t: string, id: string, d: Partial<ContagemDoc>) => salvar(t, 'contagens', id, d),
    remover: (t: string, id: string) => remover(t, 'contagens', id),
  },
  atividades: {
    listar: (t: string) => listar<AtividadeDoc>(t, 'atividades'),
    salvar: (t: string, id: string, d: Partial<AtividadeDoc>) => salvar(t, 'atividades', id, d),
  },
  insights: {
    listar: (t: string) => listar<InsightDoc>(t, 'insights'),
    salvar: (t: string, id: string, d: Partial<InsightDoc>) => salvar(t, 'insights', id, d),
  },
  // Plano de contas da loja: edições das contas padrão e as contas próprias.
  contas: {
    listar: (t: string) => listar<ContaPersonalizada>(t, 'contas'),
    salvar: (t: string, id: string, d: Partial<ContaPersonalizada>) => salvar(t, 'contas', id, d),
    remover: (t: string, id: string) => remover(t, 'contas', id),
  },
  integracoes: {
    listar: (t: string) => listar<IntegracaoDoc>(t, 'integracoes'),
    salvar: (t: string, id: string, d: Partial<IntegracaoDoc>) => salvar(t, 'integracoes', id, d),
  },
}

export interface IntegracaoDoc {
  id: string
  provedor: string
  status: 'conectado' | 'conectando' | 'desconectado'
  merchantId?: string
  ultimoSyncEm?: string
  pedidosUltimoDia?: number
  faturamentoUltimoDia?: number
  /* Dados da loja no marketplace, preenchidos pelo sync (ver functions/src/ifood/sync.ts). */
  nomeLoja?: string
  razaoSocial?: string
  /** OK · WARNING · CLOSED · ERROR */
  estadoLoja?: string
  /** Pausas ativas: explicam buraco de faturamento no meio do dia. */
  pausas?: { id: string; inicio: string; fim: string; motivo?: string }[]
  horarios?: { dia: string; inicio: string; duracaoMin: number }[]
  estadoAtualizadoEm?: string
  itensCardapio?: number
  cardapioAtualizadoEm?: string
}

/** Assinatura em tempo real de uma coleção (para sincronização entre abas). */
export function assinarColecao<T>(tenant: string, nome: string, cb: (itens: T[]) => void) {
  return onSnapshot(colRef(tenant, nome), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) }) as T))
  })
}
