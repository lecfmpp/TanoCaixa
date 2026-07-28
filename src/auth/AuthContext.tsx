import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { restauranteDemo, usuarioDemo } from '@/data/mock'
import { permissoesDoPapel, type Permissoes, type Sessao } from '@/types'

interface AuthContextValor {
  sessao: Sessao | null
  permissoes: Permissoes | null
  carregando: boolean
  /** Entra com a sessão de exemplo (Halim, dono) — sem backend. */
  entrarDemo: () => void
  /** Login real via Firebase Auth (e-mail/senha). */
  entrarComEmail: (email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthContextValor | null>(null)

const CHAVE_DEMO = 'tanocaixa:demo'

function sessaoDoUsuarioFirebase(user: User): Sessao {
  // Fase 0: sem doc de associação ainda, assumimos o dono do restaurante
  // de exemplo. Nas próximas fases isso vem do membro no Firestore.
  const nome = user.displayName || user.email?.split('@')[0] || 'Você'
  return {
    usuario: {
      ...usuarioDemo,
      id: user.uid,
      nome,
      email: user.email || usuarioDemo.email,
      avatarInicial: nome.charAt(0).toUpperCase(),
    },
    restaurante: restauranteDemo,
    demo: false,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Sessão de demonstração persistida sobrevive a refresh.
    if (sessionStorage.getItem(CHAVE_DEMO) === '1') {
      setSessao({ usuario: usuarioDemo, restaurante: restauranteDemo, demo: true })
      setCarregando(false)
      return
    }
    const cancelar = onAuthStateChanged(auth, (user) => {
      setSessao(user ? sessaoDoUsuarioFirebase(user) : null)
      setCarregando(false)
    })
    return cancelar
  }, [])

  const entrarDemo = useCallback(() => {
    sessionStorage.setItem(CHAVE_DEMO, '1')
    setSessao({ usuario: usuarioDemo, restaurante: restauranteDemo, demo: true })
    setCarregando(false)
  }, [])

  const entrarComEmail = useCallback(async (email: string, senha: string) => {
    await signInWithEmailAndPassword(auth, email, senha)
  }, [])

  const sair = useCallback(async () => {
    sessionStorage.removeItem(CHAVE_DEMO)
    if (sessao?.demo) {
      setSessao(null)
      return
    }
    await signOut(auth)
    setSessao(null)
  }, [sessao])

  const valor = useMemo<AuthContextValor>(
    () => ({
      sessao,
      permissoes: sessao ? permissoesDoPapel(sessao.usuario.papel) : null,
      carregando,
      entrarDemo,
      entrarComEmail,
      sair,
    }),
    [sessao, carregando, entrarDemo, entrarComEmail, sair],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
