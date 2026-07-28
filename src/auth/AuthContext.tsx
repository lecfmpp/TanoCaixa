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
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { DEMO_TENANT } from '@/data/tenant'
import { restauranteDemo, usuarioDemo } from '@/data/mock'
import { permissoesDoPapel, type Papel, type Permissoes, type Sessao } from '@/types'

interface DadosCadastro {
  nome?: string
  restauranteNome?: string
  bairro?: string
}

interface AuthContextValor {
  sessao: Sessao | null
  permissoes: Permissoes | null
  carregando: boolean
  entrarDemo: () => void
  entrarComEmail: (email: string, senha: string) => Promise<void>
  criarConta: (nome: string, email: string, senha: string, restauranteNome?: string, bairro?: string) => Promise<void>
  entrarComGoogle: () => Promise<void>
  sair: () => Promise<void>
}

const AuthContext = createContext<AuthContextValor | null>(null)
const CHAVE_DEMO = 'tanocaixa:demo'

/** Cria (idempotente) o restaurante do usuário: tenant = uid do dono. */
async function provisionarRestaurante(user: User, dados?: DadosCadastro): Promise<string> {
  const rid = user.uid
  const nome = dados?.nome || user.displayName || user.email?.split('@')[0] || 'Você'
  await setDoc(
    doc(db, 'restaurants', rid),
    {
      nome: dados?.restauranteNome || 'Meu restaurante',
      bairro: dados?.bairro || '',
      cidade: 'Rio de Janeiro',
      tipoOperacao: 'delivery_salao',
      tipoCozinha: '',
      cnpj: '',
      regimeTributario: 'simples',
      aliquotaImposto: 0.06,
      metaFaturamento: 50000,
      tetos: { mercadoria: 30, pessoal: 25, ocupacao: 15, taxas_app: 12 },
      aberturaMes: 'julho de 2026',
      memberUids: [user.uid],
      criadoPor: user.uid,
    },
    { merge: true },
  )
  await setDoc(
    doc(db, 'restaurants', rid, 'membros', user.uid),
    { nome, inicial: (nome[0] || 'V').toUpperCase(), cor: '#2E5F73', papel: 'dono', conviteStatus: 'ativo' },
    { merge: true },
  )
  await setDoc(
    doc(db, 'users', user.uid),
    { nome, email: user.email || '', restauranteId: rid },
    { merge: true },
  )
  return rid
}

/** Monta a sessão de um usuário real (provisiona o restaurante se faltar). */
async function construirSessao(user: User): Promise<Sessao> {
  const uSnap = await getDoc(doc(db, 'users', user.uid))
  let rid = uSnap.exists() ? (uSnap.data().restauranteId as string | undefined) : undefined
  if (!rid) rid = await provisionarRestaurante(user)

  const [rSnap, mSnap] = await Promise.all([
    getDoc(doc(db, 'restaurants', rid)),
    getDoc(doc(db, 'restaurants', rid, 'membros', user.uid)),
  ])
  const r = rSnap.data() ?? {}
  const papel = (mSnap.exists() ? (mSnap.data().papel as Papel) : 'dono') as Papel
  const nome = user.displayName || (uSnap.data()?.nome as string) || user.email?.split('@')[0] || 'Você'

  return {
    usuario: {
      id: user.uid,
      nome,
      email: user.email || '',
      avatarInicial: (nome[0] || 'V').toUpperCase(),
      avatarCor: '#2E5F73',
      papel,
    },
    restaurante: {
      id: rid,
      nome: (r.nome as string) || 'Meu restaurante',
      bairro: (r.bairro as string) || '',
      cidade: (r.cidade as string) || 'Rio de Janeiro',
      tipoOperacao: (r.tipoOperacao as Sessao['restaurante']['tipoOperacao']) || 'delivery_salao',
      tipoCozinha: (r.tipoCozinha as string) || '',
    },
    tenantId: rid,
    demo: false,
  }
}

function sessaoDemo(): Sessao {
  return { usuario: usuarioDemo, restaurante: restauranteDemo, tenantId: DEMO_TENANT, demo: true }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // Rede de segurança: se o Auth não inicializar (ex.: persistência do
    // navegador quebrada), não deixa o app preso no splash pra sempre.
    const timeout = setTimeout(() => setCarregando(false), 8000)
    const cancelar = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout)
      if (user) {
        sessionStorage.removeItem(CHAVE_DEMO)
        try {
          setSessao(await construirSessao(user))
        } catch (e) {
          console.warn('sessão:', e)
          setSessao(null)
        }
      } else if (sessionStorage.getItem(CHAVE_DEMO) === '1') {
        setSessao(sessaoDemo())
      } else {
        setSessao(null)
      }
      setCarregando(false)
    })
    return cancelar
  }, [])

  const entrarDemo = useCallback(() => {
    sessionStorage.setItem(CHAVE_DEMO, '1')
    setSessao(sessaoDemo())
    setCarregando(false)
  }, [])

  const entrarComEmail = useCallback(async (email: string, senha: string) => {
    await signInWithEmailAndPassword(auth, email, senha)
  }, [])

  const criarConta = useCallback(
    async (nome: string, email: string, senha: string, restauranteNome?: string, bairro?: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, senha)
      if (nome) await updateProfile(cred.user, { displayName: nome })
      await provisionarRestaurante(cred.user, { nome, restauranteNome, bairro })
    },
    [],
  )

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
