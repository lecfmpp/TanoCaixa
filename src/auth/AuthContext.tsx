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
  signInAnonymously,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  updateProfile,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '@/lib/firebase'
import { DEMO_TENANT } from '@/data/tenant'
import { ajustarDataDeReferencia, virouODia } from '@/data/derive'
import { nomeDoMesAtual } from '@/data/planoMes'
import { TETOS_PADRAO } from '@/data/planoContas'
import { definirLojaAtiva } from '@/data/lojaAtiva'
import { restauranteDemo, usuarioDemo } from '@/data/mock'
import { permissoesDoPapel, normalizarPapel, type Permissoes, type Sessao } from '@/types'

interface DadosCadastro {
  nome?: string
  restauranteNome?: string
  bairro?: string
  celularWhatsapp?: string
}

/** Dados do formulário de criar conta. Só nome, e-mail e senha são
 * obrigatórios (quem entra por convite não informa restaurante). */
export interface NovaConta {
  nome: string
  email: string
  senha: string
  restauranteNome?: string
  bairro?: string
  celularWhatsapp?: string
}

/** Mínimo de caracteres da senha, como a tela de cadastro avisa. */
export const SENHA_MINIMA = 8

/** Erro ao montar a sessão com uma mensagem pronta pra mostrar ao usuário. */
class ErroSessao extends Error {}

interface AuthContextValor {
  sessao: Sessao | null
  permissoes: Permissoes | null
  carregando: boolean
  /** Mensagem quando o login funcionou mas não deu pra montar a sessão
   * (ler/criar o restaurante, aceitar convite). */
  erroSessao: string | null
  /** Tenta montar a sessão de novo depois de um erroSessao. */
  tentarDeNovo: () => void
  entrarDemo: () => void
  /** Retorna o uid autenticado — use pra saber quando `sessao` passou a
   * refletir ESTE login (e não uma sessão antiga que já estava ativa). */
  entrarComEmail: (email: string, senha: string, lembrar?: boolean) => Promise<string>
  criarConta: (dados: NovaConta) => Promise<string>
  entrarComGoogle: (lembrar?: boolean) => Promise<string>
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
      // Conta nova começa sem meta (0 = "sem meta"): o onboarding pergunta.
      metaFaturamento: 0,
      tetos: TETOS_PADRAO,
      // Mês em que a conta foi aberta — o de verdade, não o da demonstração.
      aberturaMes: nomeDoMesAtual(),
      // O onboarding refina isso; loja única é o padrão seguro (sem linha de
      // franqueadora no DRE, sem visão de rede).
      tipoNegocio: 'loja_unica',
      memberUids: [user.uid],
      criadoPor: user.uid,
    },
    { merge: true },
  )
  const celular = dados?.celularWhatsapp || undefined
  await setDoc(
    doc(db, 'restaurants', rid, 'membros', user.uid),
    { nome, inicial: (nome[0] || 'V').toUpperCase(), cor: '#2E5F73', papel: 'dono', conviteStatus: 'ativo', celular },
    { merge: true },
  )
  await setDoc(
    doc(db, 'users', user.uid),
    { nome, email: user.email || '', restauranteId: rid, celularWhatsapp: celular },
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
      // Convite que falha NÃO pode virar restaurante novo: quem foi convidado
      // ficaria num restaurante vazio achando que entrou no do dono. O token
      // fica guardado pra o "Tentar de novo"; "Sair" é que descarta.
      try {
        const resp = await aceitarConviteFn({ token: tokenConvite, nome: user.displayName ?? undefined })
        rid = resp.data.restauranteId
        sessionStorage.removeItem(CHAVE_CONVITE)
      } catch (e) {
        console.warn('convite:', e)
        throw new ErroSessao(mensagemConviteFalhou(e))
      }
    } else {
      // Dados do formulário de cadastro (nome do restaurante, bairro), se
      // vieram de criarConta — ver comentário lá sobre por que não provisiona
      // direto (evita duas escritas concorrentes no mesmo restaurants/{rid}).
      // Só descarta depois de gravar: se falhar, o "Tentar de novo" ainda
      // tem os dados e não cria o restaurante com valores padrão.
      const bruto = sessionStorage.getItem(CHAVE_CADASTRO)
      const dadosCadastro = bruto ? (JSON.parse(bruto) as DadosCadastro) : undefined
      rid = await provisionarRestaurante(user, dadosCadastro)
      sessionStorage.removeItem(CHAVE_CADASTRO)
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
      celularWhatsapp: (uSnap.data()?.celularWhatsapp as string) || undefined,
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
    // Só o dono faz onboarding — quem entrou por convite cai direto no painel.
    // `tipoCozinha` preenchido cobre as contas criadas antes desta flag existir.
    precisaOnboarding: papel === 'dono' && !r.onboardingConcluido && !r.tipoCozinha,
  }
}

/** Mensagem para quando o aceitarConvite falha. Os erros "definitivos" da
 * Cloud Function (convite inexistente, expirado ou já usado) vêm com texto em
 * português pronto; os outros são quase sempre rede. */
function mensagemConviteFalhou(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? ''
  const texto = (e as { message?: string })?.message ?? ''
  if (['functions/not-found', 'functions/failed-precondition', 'functions/invalid-argument'].includes(codigo)) {
    return `Não deu pra aceitar o convite: ${texto || 'convite inválido'}. Peça um convite novo a quem te convidou.`
  }
  return 'Não deu pra aceitar o convite agora. Confira a internet e tente de novo.'
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
  // Promessa rejeitada não fica no cache: senão o "Tentar de novo" (e todo
  // disparo seguinte do onAuthStateChanged) devolveria o mesmo erro pra sempre.
  p.catch(() => {
    if (sessaoCache.get(user.uid) === p) sessaoCache.delete(user.uid)
  })
  return p
}

const MSG_SESSAO_GENERICA = 'Você entrou, mas não deu pra abrir o seu restaurante agora. Confira a internet e tente de novo.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessaoState] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroSessao, setErroSessao] = useState<string | null>(null)

  // A data de referência dos cálculos acompanha a sessão: a demonstração fica
  // parada em julho de 2026 (onde estão os dados de exemplo) e a conta real usa
  // o dia de hoje. Ajusta ANTES de renderizar, senão o painel calcula o mês
  // errado no primeiro render.
  const setSessao = useCallback((s: Sessao | null) => {
    ajustarDataDeReferencia(s?.demo ?? false)
    setSessaoState(s)
  }, [])

  // App aberto de um dia pro outro (caixa que fica ligado): a conta real passa
  // pro dia novo sozinha. Recria a sessão só pra re-renderizar o painel.
  useEffect(() => {
    const id = setInterval(() => {
      if (virouODia()) setSessaoState((s) => (s ? { ...s } : s))
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    // Rede de segurança: se o Auth não inicializar (ex.: persistência do
    // navegador quebrada), não deixa o app preso no splash pra sempre.
    const timeout = setTimeout(() => setCarregando(false), 8000)
    const cancelar = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout)
      if (user?.isAnonymous) {
        // Anônimo só existe por causa da demonstração — é o login que damos
        // pra ela poder chamar as Cloud Functions. O usuário fica no
        // IndexedDB e sobrevive ao fechar a aba, mas a flag de demo vive só
        // na sessão; sem restaurar aqui, a visita seguinte caía no fluxo de
        // conta real e provisionava um restaurante fantasma ("Meu
        // restaurante") pra cada visitante da demo.
        sessionStorage.setItem(CHAVE_DEMO, '1')
        setSessao(sessaoDemo())
      } else if (user) {
        sessionStorage.removeItem(CHAVE_DEMO)
        try {
          setSessao(await construirSessaoCacheada(user))
          setErroSessao(null)
        } catch (e) {
          console.warn('sessão:', e)
          setSessao(null)
          setErroSessao(e instanceof ErroSessao ? e.message : MSG_SESSAO_GENERICA)
        }
      } else if (sessionStorage.getItem(CHAVE_DEMO) === '1') {
        setSessao(sessaoDemo())
      } else {
        setSessao(null)
      }
      if (!user || user.isAnonymous) setErroSessao(null)
      setCarregando(false)
    })
    return cancelar
  }, [setSessao])

  const tentarDeNovo = useCallback(() => {
    const user = auth.currentUser
    if (!user || user.isAnonymous) {
      setErroSessao(null)
      return
    }
    setErroSessao(null)
    setCarregando(true)
    construirSessaoCacheada(user)
      .then((s) => setSessao(s))
      .catch((e) => {
        console.warn('sessão:', e)
        setErroSessao(e instanceof ErroSessao ? e.message : MSG_SESSAO_GENERICA)
      })
      .finally(() => setCarregando(false))
  }, [setSessao])

  const entrarDemo = useCallback(() => {
    sessionStorage.setItem(CHAVE_DEMO, '1')
    setSessao(sessaoDemo())
    setCarregando(false)
    // Login anônimo em segundo plano: a demo continua no tenant de exemplo,
    // mas passa a ter um principal do Firebase — é o que as Cloud Functions
    // exigem (a análise de foto por IA, por exemplo). Se o provedor anônimo
    // estiver desabilitado no projeto, a demo segue normal e só a foto avisa.
    signInAnonymously(auth).catch((e) => console.warn('demo anônima:', e))
  }, [setSessao])

  const entrarComEmail = useCallback(async (email: string, senha: string, lembrar = true) => {
    // "Continuar conectado" desmarcado: a sessão some ao fechar a aba.
    await setPersistence(auth, lembrar ? browserLocalPersistence : browserSessionPersistence)
    const cred = await signInWithEmailAndPassword(auth, email, senha)
    return cred.user.uid
  }, [])

  const criarConta = useCallback(
    async ({ nome, email, senha, restauranteNome, bairro, celularWhatsapp }: NovaConta) => {
      if (senha.length < SENHA_MINIMA) {
        throw Object.assign(new Error('senha curta'), { code: 'auth/weak-password' })
      }
      // Guarda os dados do formulário ANTES de criar a conta: createUserWithEmailAndPassword
      // já dispara o onAuthStateChanged (que roda construirSessao) antes mesmo
      // de terminarmos esta função — se cada um chamasse provisionarRestaurante
      // por conta própria, as duas escritas concorrentes em restaurants/{rid}
      // corriam risco de uma sobrescrever a outra com os valores padrão. Por
      // isso só o construirSessao provisiona; aqui só deixamos os dados prontos
      // pra ele achar (mesmo esquema do CHAVE_CONVITE).
      if (!sessionStorage.getItem(CHAVE_CONVITE)) {
        sessionStorage.setItem(CHAVE_CADASTRO, JSON.stringify({ nome, restauranteNome, bairro, celularWhatsapp }))
      }
      const cred = await createUserWithEmailAndPassword(auth, email, senha)
      if (nome) await updateProfile(cred.user, { displayName: nome })
      // Confirmação de e-mail: só envia, não bloqueia o acesso. Falha aqui
      // (cota, domínio não autorizado) não pode impedir o cadastro.
      sendEmailVerification(cred.user, { url: `${window.location.origin}/entrar` }).catch((e) =>
        console.warn('verificação de e-mail:', e),
      )
      return cred.user.uid
    },
    [],
  )

  const entrarComGoogle = useCallback(async (lembrar = true) => {
    await setPersistence(auth, lembrar ? browserLocalPersistence : browserSessionPersistence)
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
    [sessao, setSessao],
  )

  const sair = useCallback(async () => {
    sessionStorage.removeItem(CHAVE_DEMO)
    // Quem desiste depois de um convite que falhou não deve levar o token
    // pendurado pro próximo login nesta aba.
    sessionStorage.removeItem(CHAVE_CONVITE)
    setErroSessao(null)
    // Não deixa a loja escolhida na rede vazar pro próximo login.
    definirLojaAtiva(null)
    if (sessao) sessaoCache.delete(sessao.usuario.id)
    if (sessao?.demo) {
      // A demo pode ter um usuário anônimo pendurado — derruba ele também.
      if (auth.currentUser?.isAnonymous) await signOut(auth)
      setSessao(null)
      return
    }
    await signOut(auth)
    setSessao(null)
  }, [sessao, setSessao])

  const valor = useMemo<AuthContextValor>(
    () => ({
      sessao,
      permissoes: sessao ? permissoesDoPapel(sessao.usuario.papel) : null,
      carregando,
      erroSessao,
      tentarDeNovo,
      entrarDemo,
      entrarComEmail,
      criarConta,
      entrarComGoogle,
      sair,
      atualizarPerfil,
    }),
    [sessao, carregando, erroSessao, tentarDeNovo, entrarDemo, entrarComEmail, criarConta, entrarComGoogle, sair, atualizarPerfil],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValor {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
