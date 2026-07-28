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
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
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
  /** Cria conta real (Firebase Auth + perfil no Firestore). */
  criarConta: (nome: string, email: string, senha: string) => Promise<void>
  /** Login com Google. */
  entrarComGoogle: () => Promise<void>
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

  const criarConta = useCallback(async (nome: string, email: string, senha: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, senha)
    if (nome) await updateProfile(cred.user, { displayName: nome })
    // Perfil do usuário no Firestore (associação ao restaurante vem no onboarding).
    await setDoc(doc(db, 'users', cred.user.uid), {
      nome,
      email,
      criadoEm: new Date().toISOString(),
    })
  }, [])

  const entrarComGoogle = useCallback(async () => {
    await signInWithPopup(auth, new GoogleAuthProvider())
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
      criarConta,
      entrarComGoogle,
      sair,
    }),
    [sessao, carregando, entrarDemo, entrarComEmail, criarConta, entrarComGoogle, sair],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
