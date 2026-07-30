import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { AuthLayout } from './AuthLayout'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { useAuth, CHAVE_CONVITE, aceitarConviteFn } from '@/auth/AuthContext'
import { functions } from '@/lib/firebase'
import { rotuloPapel, normalizarPapel } from '@/types'

const verConviteFn = httpsCallable<{ token: string }, { restauranteNome: string; papel: string; valido: boolean }>(
  functions,
  'verConvite',
)

type Estado = 'carregando' | 'invalido' | 'valido'

export function ConvitePage() {
  const { token } = useParams<{ token: string }>()
  const navegar = useNavigate()
  const { sessao, entrarComEmail, criarConta, entrarComGoogle } = useAuth()

  const [estado, setEstado] = useState<Estado>('carregando')
  const [convite, setConvite] = useState<{ restauranteNome: string; papel: string } | null>(null)
  const [modo, setModo] = useState<'criar' | 'entrar'>('criar')
  const [nome, setNome] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [uidEsperado, setUidEsperado] = useState<string | null>(null)

  // criarConta/entrarComEmail só esperam a autenticação do Firebase Auth —
  // a sessão (incluindo aceitar o convite via Cloud Function) monta depois,
  // de forma assíncrona. Navegar antes disso manda o RotaProtegida de volta
  // pro /entrar achando que ninguém tá logado. Comparamos o uid (não só
  // "sessao existe") porque o navegador pode já ter uma sessão antiga
  // persistida (outra conta) quando esta página monta.
  useEffect(() => {
    if (uidEsperado && sessao?.usuario.id === uidEsperado) navegar('/painel')
  }, [uidEsperado, sessao, navegar])

  useEffect(() => {
    if (!token) return
    verConviteFn({ token })
      .then((r) => {
        if (!r.data.valido) {
          setEstado('invalido')
          return
        }
        setConvite({ restauranteNome: r.data.restauranteNome, papel: r.data.papel })
        setEstado('valido')
      })
      .catch(() => setEstado('invalido'))
  }, [token])

  async function aceitarJaLogado() {
    if (!token) return
    setEnviando(true)
    setErro(null)
    try {
      await aceitarConviteFn({ token })
      // Recarrega do zero pra reconstruir a sessão com o restaurante novo.
      window.location.assign('/painel')
    } catch {
      setErro('Não deu pra aceitar o convite. Tenta de novo.')
      setEnviando(false)
    }
  }

  async function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email') ?? '')
    setErro(null)
    setEnviando(true)
    sessionStorage.setItem(CHAVE_CONVITE, token)
    try {
      const uid = modo === 'criar' ? await criarConta(nome, email, senha) : await entrarComEmail(email, senha)
      // Não navega ainda — o efeito acima faz isso assim que `sessao` refletir
      // ESTE uid (inclui aceitar o convite via Cloud Function, que leva um instante).
      setUidEsperado(uid)
    } catch {
      sessionStorage.removeItem(CHAVE_CONVITE)
      setEnviando(false)
      setErro(
        modo === 'criar'
          ? 'Não deu pra criar a conta. Talvez esse e-mail já tenha cadastro, ou a senha esteja curta (mínimo 6).'
          : 'Não deu pra entrar. Confira e-mail e senha.',
      )
    }
  }

  async function aoClicarGoogle() {
    if (!token) return
    setErro(null)
    sessionStorage.setItem(CHAVE_CONVITE, token)
    try {
      const uid = await entrarComGoogle()
      setUidEsperado(uid)
    } catch {
      sessionStorage.removeItem(CHAVE_CONVITE)
      setErro('Não deu pra entrar com o Google. Tenta de novo.')
    }
  }

  if (estado === 'carregando') {
    return (
      <AuthLayout>
        <p className="text-sm text-tinta-3">Carregando convite…</p>
      </AuthLayout>
    )
  }

  if (estado === 'invalido' || !convite) {
    return (
      <AuthLayout>
        <h2 className="text-tinta" style={{ fontSize: 24, fontWeight: 800 }}>
          Convite não encontrado
        </h2>
        <p className="pretty mt-2 text-sm text-tinta-3">
          Esse link de convite não existe mais, expirou ou já foi usado. Peça pra quem te convidou gerar um novo.
        </p>
      </AuthLayout>
    )
  }

  const papelRotulo = rotuloPapel(normalizarPapel(convite.papel))

  if (sessao) {
    return (
      <AuthLayout>
        <h2 className="text-tinta" style={{ fontSize: 24, fontWeight: 800 }}>
          Você foi convidado
        </h2>
        <p className="pretty mt-2 text-sm text-tinta-3">
          Pra entrar em <b>{convite.restauranteNome}</b> como <b>{papelRotulo}</b>, usando a conta{' '}
          <b>{sessao.usuario.email}</b>.
        </p>
        {erro && (
          <p className="mt-3 rounded-campo border border-telha-alerta/40 bg-telha-alerta/8 px-3 py-2 text-sm text-telha-alerta">
            {erro}
          </p>
        )}
        <Button variante="primario" bloco className="mt-4" disabled={enviando} onClick={aceitarJaLogado}>
          {enviando ? 'Entrando…' : `Aceitar e entrar em ${convite.restauranteNome}`}
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-tinta" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Você foi convidado
        </h2>
        <p className="pretty mt-1.5 text-sm text-tinta-3">
          Pra entrar em <b>{convite.restauranteNome}</b> como <b>{papelRotulo}</b>, crie sua conta ou entre com uma
          já existente.
        </p>
      </div>

      <div className="mb-5 flex gap-1 rounded-botao bg-preenchimento p-1 text-sm font-bold">
        <button
          type="button"
          onClick={() => setModo('criar')}
          className={`flex-1 rounded-botao py-1.5 transition ${modo === 'criar' ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3'}`}
        >
          Criar conta
        </button>
        <button
          type="button"
          onClick={() => setModo('entrar')}
          className={`flex-1 rounded-botao py-1.5 transition ${modo === 'entrar' ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3'}`}
        >
          Já tenho conta
        </button>
      </div>

      <form onSubmit={aoEnviar} className="flex flex-col gap-4">
        {modo === 'criar' && (
          <Campo rotulo="Seu nome" name="nome" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        )}
        <Campo rotulo="E-mail" name="email" type="email" placeholder="voce@email.com" required />
        <Campo
          rotulo="Senha"
          name="senha"
          type="password"
          placeholder={modo === 'criar' ? 'crie uma senha' : 'sua senha'}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        {erro && (
          <p className="rounded-campo border border-telha-alerta/40 bg-telha-alerta/8 px-3 py-2 text-sm text-telha-alerta">
            {erro}
          </p>
        )}

        <Button type="submit" variante="primario" bloco disabled={enviando}>
          {enviando ? 'Enviando…' : modo === 'criar' ? 'Criar conta e entrar' : 'Entrar'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-tinta-4">
        <span className="h-px flex-1 bg-divisoria" />
        <span className="rotulo">ou</span>
        <span className="h-px flex-1 bg-divisoria" />
      </div>

      <button
        type="button"
        onClick={aoClicarGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie px-4 py-2.5 text-sm font-bold text-tinta-2 transition hover:bg-preenchimento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
      >
        <GoogleIcon size={18} />
        Continuar com Google
      </button>
    </AuthLayout>
  )
}
