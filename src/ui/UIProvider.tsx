import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

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

export type TipoGaveta = 'despesa' | 'produto' | 'estoque' | 'fechamento'

interface UIContexto {
  toasts: Toast[]
  adicionarToast: (t: Omit<Toast, 'id'>) => string
  removerToast: (id: string) => void
  modal: ModalConfig | null
  confirmar: (c: ModalConfig) => void
  fecharModal: () => void
  gaveta: TipoGaveta | null
  abrirGaveta: (t: TipoGaveta) => void
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
  const abrirGaveta = useCallback((t: TipoGaveta) => setGaveta(t), [])
  const fecharGaveta = useCallback(() => setGaveta(null), [])

  const valor = useMemo<UIContexto>(
    () => ({
      toasts,
      adicionarToast,
      removerToast,
      modal,
      confirmar,
      fecharModal,
      gaveta,
      abrirGaveta,
      fecharGaveta,
    }),
    [toasts, adicionarToast, removerToast, modal, confirmar, fecharModal, gaveta, abrirGaveta, fecharGaveta],
  )

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUI precisa de <UIProvider>')
  return c
}
