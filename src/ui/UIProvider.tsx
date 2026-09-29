import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DespesaDoc } from '@/data/types'
import type { Nota } from '@/data/compras'

export type TipoToast = 'sucesso' | 'andamento' | 'atencao' | 'erro' | 'sistema'

export interface Toast {
  id: string
  tipo: TipoToast
  titulo: string
  texto?: string
  rotuloAcao?: string
  onAcao?: () => void
}

export interface ModalConfig {
  gravidade: 'destrutivo' | 'atencao' | 'neutro'
  titulo: string
  texto: string
  resumo?: { rot: string; val: string }[]
  rotuloCancelar?: string
  rotuloConfirmar: string
  onConfirmar: () => void
}

export type TipoGaveta = 'despesa' | 'compra' | 'produto' | 'estoque' | 'fechamento'

/**
 * Lançamento que a gaveta abriu para CORRIGIR, em vez de criar do zero. A
 * gaveta é a mesma — ela só grava por cima do que já existe (mesmo id, mesma
 * nota). Sem isso a gaveta só sabia criar, e um lançamento errado ficava
 * errado pra sempre.
 *
 * Duplicar não passa por aqui: a cópia é criada direto, com confirmação.
 */
export type EdicaoGaveta =
  | { alvo: 'despesa'; despesa: DespesaDoc }
  | { alvo: 'nota'; nota: Nota }

interface UIContexto {
  toasts: Toast[]
  adicionarToast: (t: Omit<Toast, 'id'>) => string
  removerToast: (id: string) => void
  modal: ModalConfig | null
  confirmar: (c: ModalConfig) => void
  fecharModal: () => void
  gaveta: TipoGaveta | null
  /** Lançamento que a gaveta aberta está corrigindo ou copiando. */
  gavetaEdicao: EdicaoGaveta | null
  abrirGaveta: (t: TipoGaveta, edicao?: EdicaoGaveta) => void
  fecharGaveta: () => void
}

const Ctx = createContext<UIContexto | null>(null)

const DURACAO: Record<TipoToast, number> = {
  sucesso: 8000, // com desfazer
  andamento: 0,
  atencao: 6000,
  erro: 0, // fica até fechar
  sistema: 5000,
}

let contador = 0

export function UIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [modal, setModal] = useState<ModalConfig | null>(null)
  const [gaveta, setGaveta] = useState<TipoGaveta | null>(null)
  const [gavetaEdicao, setGavetaEdicao] = useState<EdicaoGaveta | null>(null)

  const removerToast = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
  }, [])

  const adicionarToast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = `t${++contador}`
      setToasts((ts) => [...ts.slice(-2), { ...t, id }])
      const dur = DURACAO[t.tipo]
      if (dur > 0) setTimeout(() => removerToast(id), dur)
      return id
    },
    [removerToast],
  )

  const confirmar = useCallback((c: ModalConfig) => setModal(c), [])
  const fecharModal = useCallback(() => setModal(null), [])
  const abrirGaveta = useCallback((t: TipoGaveta, edicao?: EdicaoGaveta) => {
    setGavetaEdicao(edicao ?? null)
    setGaveta(t)
  }, [])
  const fecharGaveta = useCallback(() => {
    setGaveta(null)
    setGavetaEdicao(null)
  }, [])

  const valor = useMemo<UIContexto>(
    () => ({
      toasts,
      adicionarToast,
      removerToast,
      modal,
      confirmar,
      fecharModal,
      gaveta,
      gavetaEdicao,
      abrirGaveta,
      fecharGaveta,
    }),
    [toasts, adicionarToast, removerToast, modal, confirmar, fecharModal, gaveta, gavetaEdicao, abrirGaveta, fecharGaveta],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI precisa de <UIProvider>')
  return c
}
