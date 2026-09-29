import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Nota } from '@/data/compras'
import type { ProdutoDoc } from '@/data/types'

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

/** O que a gaveta recebe quando abre pra EDITAR algo que já existe. */
export interface DadosGaveta {
  /** Nota fiscal em edição (gaveta 'compra'). */
  nota?: Nota
  /** Produto em edição (gaveta 'produto'). */
  produto?: ProdutoDoc
}

interface UIContexto {
  toasts: Toast[]
  adicionarToast: (t: Omit<Toast, 'id'>) => string
  removerToast: (id: string) => void
  modal: ModalConfig | null
  confirmar: (c: ModalConfig) => void
  fecharModal: () => void
  gaveta: TipoGaveta | null
  gavetaDados: DadosGaveta | null
  abrirGaveta: (t: TipoGaveta, dados?: DadosGaveta) => void
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
  const [gavetaDados, setGavetaDados] = useState<DadosGaveta | null>(null)

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
  const abrirGaveta = useCallback((t: TipoGaveta, dados?: DadosGaveta) => {
    setGavetaDados(dados ?? null)
    setGaveta(t)
  }, [])
  const fecharGaveta = useCallback(() => {
    setGaveta(null)
    setGavetaDados(null)
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
      gavetaDados,
      abrirGaveta,
      fecharGaveta,
    }),
    [toasts, adicionarToast, removerToast, modal, confirmar, fecharModal, gaveta, gavetaDados, abrirGaveta, fecharGaveta],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI precisa de <UIProvider>')
  return c
}
