import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { getRedirectResult } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/auth/AuthContext'
import { ErroDeSessao } from '@/auth/ErroDeSessao'
import { codigoDoErro, mensagemDeErroAuth } from '@/auth/erros'

export function EntrarPage() {
  const { sessao, carregando, erroSessao, entrarComEmail, entrarDemo, entrarComGoogle } = useAuth()
  const navegar = useNavigate()
  // Link de lembrete (WhatsApp): quem não estava logado volta para a tela do link depois de entrar.
  const voltar = (useLocation().state as { voltar?: unknown } | null)?.voltar
  const destino = typeof voltar === 'string' && voltar.startsWith('/painel') ? voltar : '/painel'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [uidEsperado, setUidEsperado] = useState<string | null>(null)

  // entrarComEmail/entrarComGoogle só esperam a autenticação do Firebase Auth
  // — a sessão (que provisiona/lê o restaurante no Firestore) monta depois,
  // de forma assíncrona. Navegar antes disso faz o RotaProtegida mandar de
  // volta pro /entrar achando que ninguém tá logado. Comparamos o uid (não só
  // "sessao existe") porque o navegador pode já ter uma sessão antiga
  // persistida (outra conta) quando esta página monta.
  // Conta nova pelo Google não passa pelo formulário de cadastro, então é aqui
  // que ela é mandada pro onboarding — senão o painel abre vazio e sem config.
  //
  // Sem login em andamento (ex.: volta do redirecionamento do Google, ou quem
  // já estava logado e abriu /entrar), uma sessão real pronta basta. A demo
  // não conta: quem está nela pode querer entrar com a conta de verdade.
  useEffect(() => {
    if (!sessao) return
    if (uidEsperado) {
      if (sessao.usuario.id === uidEsperado) navegar(sessao.precisaOnboarding ? '/onboarding' : destino)
      return
    }
    if (!enviando && !carregando && !sessao.demo) {
      navegar(sessao.precisaOnboarding ? '/onboarding' : destino, { replace: true })
    }
  }, [uidEsperado, sessao, enviando, carregando, navegar, destino])

  // Erro no login por redirecionamento do Google (domínio não autorizado,
  // conta já existente com outro método...) só aparece aqui, na volta.
  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      console.error('Falha no login Google (redirecionamento):', codigoDoErro(err) || err)
      setErro(mensagemDeErroAuth(err, 'Não deu pra entrar com o Google.'))
    })
  }, [])

  // Login ok mas a sessão não montou: solta o botão (o aviso aparece abaixo).
  useEffect(() => {
    if (erroSessao) {
      setEnviando(false)
      setUidEsperado(null)
    }
  }, [erroSessao])

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const uid = await entrarComEmail(email, senha, lembrar)
      setUidEsperado(uid)
    } catch (err) {
      console.error('Falha ao entrar:', codigoDoErro(err) || err)
      setEnviando(false)
      setErro(mensagemDeErroAuth(err, 'Não deu pra entrar. Confira e-mail e senha.'))
    }
  }

  function verDemo() {
    entrarDemo()
    navegar('/painel')
  }

  return (
    <AuthLayout>
      <div className="mb-7">
        <h2 className="text-tinta" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Bom te ver de novo, chefe
        </h2>
        <p className="pretty mt-1.5 text-sm text-tinta-3">
          Entre pra ver como está o caixa do seu restaurante.
        </p>
      </div>

      <form onSubmit={aoEnviar} className="flex flex-col gap-4">
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Campo
          rotulo="Senha"
          name="senha"
          type={mostrar ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          acessorio={
            <button
              type="button"
              onClick={() => setMostrar((v) => !v)}
              className="rotulo shrink-0 text-mar hover:underline"
            >
              {mostrar ? 'ocultar' : 'mostrar'}
            </button>
          }
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-tinta-2">
            <input
              type="checkbox"
              className="accent-mar"
              checked={lembrar}
              onChange={(e) => setLembrar(e.target.checked)}
            />
            Continuar conectado
          </label>
          <Link to="/esqueci" className="font-semibold text-mar hover:underline">
            Esqueci a senha
          </Link>
        </div>

        <ErroDeSessao />

        {erro && (
          <p className="rounded-campo border border-telha-alerta/40 bg-telha-alerta/8 px-3 py-2 text-sm text-telha-alerta">
            {erro}
          </p>
        )}

        <Button type="submit" variante="primario" bloco disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar no painel'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-tinta-4">
        <span className="h-px flex-1 bg-divisoria" />
        <span className="rotulo">ou</span>
        <span className="h-px flex-1 bg-divisoria" />
      </div>

      <button
        type="button"
        disabled={enviando}
        onClick={async () => {
          setErro(null)
          setEnviando(true)
          try {
            const uid = await entrarComGoogle(lembrar)
            // '' = foi por redirecionamento; a volta cai no efeito de sessão pronta.
            if (uid) setUidEsperado(uid)
          } catch (err) {
            console.error('Falha no login Google:', codigoDoErro(err) || err)
            setEnviando(false)
            setErro(mensagemDeErroAuth(err, 'Não deu pra entrar com o Google.'))
          }
        }}
        className="flex w-full items-center justify-center gap-3 rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie px-4 py-2.5 text-sm font-bold text-tinta-2 transition hover:bg-preenchimento disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
      >
        <GoogleIcon size={18} />
        Continuar com Google
      </button>

      {/* Atalho de demonstração (Fase 0 — sem backend de contas ainda) */}
      <button
        onClick={verDemo}
        className="mt-5 w-full rounded-botao border border-dashed border-mar/40 bg-mar/5 px-4 py-2.5 text-sm font-bold text-mar transition hover:bg-mar/10"
      >
        Ver demonstração com dados de exemplo
      </button>

      <p className="mt-6 text-center text-sm text-tinta-3">
        Não tem conta?{' '}
        <Link to="/criar" className="font-bold text-telhado hover:underline">
          Criar agora
        </Link>
      </p>
    </AuthLayout>
  )
}
