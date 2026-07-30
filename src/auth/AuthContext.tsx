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
  signInWithRedirect,
  updateProfile,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '@/lib/firebase'
import { DEMO_TENANT } from '@/data/tenant'
import { TETOS_PADRAO } from '@/data/planoContas'
import { definirLojaAtiva } from '@/data/lojaAtiva'
import { restauranteDemo, usuarioDemo } from '@/data/mock'
import { permissoesDoPapel, normalizarPapel, type Permissoes, type Sessao } from '@/types'

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
  /** Retorna o uid autenticado — use pra saber quando `sessao` passou a
   * refletir ESTE login (e não uma sessão antiga que já estava ativa). */
  entrarComEmail: (email: string, senha: string) => Promise<string>
  criarConta: (nome: string, email: string, senha: string, restauranteNome?: string, bairro?: string) => Promise<string>
  entrarComGoogle: () => Promise<string>
  sair: () => Promise<void>
  atualizarPerfil: (dados: { nome?: string; photoURL?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValor | null>(null)
const CHAVE_DEMO = 'tanocaixa:demo'
/** Token de convite guardado antes do login/cadastro em /convite/:token. */
export const CHAVE_CONVITE = 'tanocaixa:convite'
/** Dados do formulário de cadastro (nome do restaurante, bairro), guardados
 * até o construirSessao rodar — ver comentário em criarConta sobre por quê. */
const CHAVE_CADASTRO = 'tanocaixa:cadastro'

export const aceitarConviteFn = httpsCallable<{ token: string; nome?: string }, { restauranteId: string }>(
  functions,
  'aceitarConvite',
)

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
      tetos: TETOS_PADRAO,
      aberturaMes: 'julho de 2026',
      // O onboarding refina isso; loja única é o padrão seguro (sem linha de
      // franqueadora no DRE, sem visão de rede).
      tipoNegocio: 'loja_unica',
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

/** Monta a sessão de um usuário real (consome convite pendente, ou provisiona
 * um restaurante novo, se faltar). */
async function construirSessao(user: User): Promise<Sessao> {
  const uSnap = await getDoc(doc(db, 'users', user.uid))
  let rid = uSnap.exists() ? (uSnap.data().restauranteId as string | undefined) : undefined
  if (!rid) {
    const tokenConvite = sessionStorage.getItem(CHAVE_CONVITE)
    if (tokenConvite) {
      sessionStorage.removeItem(CHAVE_CONVITE)
      try {
        const resp = await aceitarConviteFn({ token: tokenConvite, nome: user.displayName ?? undefined })
        rid = resp.data.restauranteId
      } catch (e) {
        console.warn('convite:', e)
      }
    }
    if (!rid) {
      // Dados do formulário de cadastro (nome do restaurante, bairro), se
      // vieram de criarConta — ver comentário lá sobre por que não provisiona
      // direto (evita duas escritas concorrentes no mesmo restaurants/{rid}).
      const bruto = sessionStorage.getItem(CHAVE_CADASTRO)
      sessionStorage.removeItem(CHAVE_CADASTRO)
      const dadosCadastro = bruto ? (JSON.parse(bruto) as DadosCadastro) : undefined
      rid = await provisionarRestaurante(user, dadosCadastro)
    }
  }

  const [rSnap, mSnap] = await Promise.all([
    getDoc(doc(db, 'restaurants', rid)),
    getDoc(doc(db, 'restaurants', rid, 'membros', user.uid)),
  ])
  const r = rSnap.data() ?? {}
  const papel = normalizarPapel(mSnap.exists() ? (mSnap.data().papel as string) : 'dono')
  const nome = user.displayName || (uSnap.data()?.nome as string) || user.email?.split('@')[0] || 'Você'

  return {
    usuario: {
      id: user.uid,
      nome,
      email: user.email || '',
      avatarInicial: (nome[0] || 'V').toUpperCase(),
      avatarCor: '#2E5F73',
      photoURL: user.photoURL || (uSnap.data()?.photoURL as string) || undefined,
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

/** onAuthStateChanged pode disparar mais de uma vez pro mesmo usuário — inclusive
 * em disparos SEQUENCIAIS (não só concorrentes), o 2º só começando depois que o
 * 1º já terminou. Por isso o cache não expira quando a promise resolve: sem
 * isso, o 2º disparo acha o CHAVE_CADASTRO já consumido pelo 1º e reprovisiona
 * o restaurante com valores padrão, sobrescrevendo o nome/bairro reais gravados
 * pela 1ª chamada (visto na prática: dois writes no Firestore a ~37ms um do
 * outro). Só provisiona/consome o cadastro pendente UMA vez por uid por sessão
 * do navegador. atualizarPerfil mantém esse cache em dia nas edições depois.
 */
const sessaoCache = new Map<string, Promise<Sessao>>()
function construirSessaoCacheada(user: User): Promise<Sessao> {
  const existente = sessaoCache.get(user.uid)
  if (existente) return existente
  const p = construirSessao(user)
  sessaoCache.set(user.uid, p)
  return p
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
          setSessao(await construirSessaoCacheada(user))
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
    const cred = await signInWithEmailAndPassword(auth, email, senha)
    return cred.user.uid
  }, [])

  const criarConta = useCallback(
    async (nome: string, email: string, senha: string, restauranteNome?: string, bairro?: string) => {
      // Guarda os dados do formulário ANTES de criar a conta: createUserWithEmailAndPassword
      // já dispara o onAuthStateChanged (que roda construirSessao) antes mesmo
      // de terminarmos esta função — se cada um chamasse provisionarRestaurante
      // por conta própria, as duas escritas concorrentes em restaurants/{rid}
      // corriam risco de uma sobrescrever a outra com os valores padrão. Por
      // isso só o construirSessao provisiona; aqui só deixamos os dados prontos
      // pra ele achar (mesmo esquema do CHAVE_CONVITE).
      if (!sessionStorage.getItem(CHAVE_CONVITE)) {
        sessionStorage.setItem(CHAVE_CADASTRO, JSON.stringify({ nome, restauranteNome, bairro }))
      }
      const cred = await createUserWithEmailAndPassword(auth, email, senha)
      if (nome) await updateProfile(cred.user, { displayName: nome })
      return cred.user.uid
    },
    [],
  )

  const entrarComGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    try {
      const cred = await signInWithPopup(auth, provider)
      return cred.user.uid
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      // Popup bloqueado ou ambiente sem suporte a popup → redireciona (a
      // página recarrega e o uid sai do onAuthStateChanged, não daqui).
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/operation-not-supported-in-this-environment' ||
        code === 'auth/popup-closed-by-user'
      ) {
        await signInWithRedirect(auth, provider)
        return ''
      }
      throw e
    }
  }, [])

  const atualizarPerfil = useCallback(
    async (dados: { nome?: string; photoURL?: string }) => {
      if (!auth.currentUser || !sessao || sessao.demo) return
      const perfilAuth: { displayName?: string; photoURL?: string } = {}
      if (dados.nome !== undefined) perfilAuth.displayName = dados.nome
      if (dados.photoURL !== undefined) perfilAuth.photoURL = dados.photoURL
      if (Object.keys(perfilAuth).length) await updateProfile(auth.currentUser, perfilAuth)

      const patchUser: Record<string, unknown> = {}
      const patchMembro: Record<string, unknown> = {}
      if (dados.nome !== undefined) {
        patchUser.nome = dados.nome
        patchMembro.nome = dados.nome
        patchMembro.inicial = (dados.nome[0] || 'V').toUpperCase()
      }
      if (dados.photoURL !== undefined) patchUser.photoURL = dados.photoURL

      await Promise.all([
        setDoc(doc(db, 'users', sessao.usuario.id), patchUser, { merge: true }),
        setDoc(doc(db, 'restaurants', sessao.tenantId, 'membros', sessao.usuario.id), patchMembro, { merge: true }),
      ])

      const novaSessao: Sessao = {
        ...sessao,
        usuario: {
          ...sessao.usuario,
          nome: dados.nome ?? sessao.usuario.nome,
          avatarInicial: dados.nome ? (dados.nome[0] || 'V').toUpperCase() : sessao.usuario.avatarInicial,
          photoURL: dados.photoURL ?? sessao.usuario.photoURL,
        },
      }
      // Mantém o cache de sessão em dia — sem isso, um próximo disparo do
      // onAuthStateChanged (ex.: refresh de token) reconstruiria a sessão do
      // zero e sobrescreveria essa edição com o valor cacheado antigo.
      sessaoCache.set(sessao.usuario.id, Promise.resolve(novaSessao))
      setSessao(novaSessao)
    },
    [sessao],
  )

  const sair = useCallback(async () => {
    sessionStorage.removeItem(CHAVE_DEMO)
    // Não deixa a loja escolhida na rede vazar pro próximo login.
    definirLojaAtiva(null)
    if (sessao) sessaoCache.delete(sessao.usuario.id)
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
      atualizarPerfil,
    }),
    [sessao, carregando, entrarDemo, entrarComEmail, criarConta, entrarComGoogle, sair, atualizarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
