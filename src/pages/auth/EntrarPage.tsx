import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { GoogleIcon } from '@/components/ui/GoogleIcon'
import { useAuth } from '@/auth/AuthContext'
import { codigoDoErro, mensagemDeErroAuth } from '@/auth/erros'

export function EntrarPage() {
  const { sessao, entrarComEmail, entrarDemo, entrarComGoogle } = useAuth()
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
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
  useEffect(() => {
    if (uidEsperado && sessao?.usuario.id === uidEsperado) {
      navegar(sessao.precisaOnboarding ? '/onboarding' : '/painel')
    }
  }, [uidEsperado, sessao, navegar])

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const uid = await entrarComEmail(email, senha)
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
          Julho fechou com sobra. Vem ver.
        </p>
      </div>

      <form onSubmit={aoEnviar} className="flex flex-col gap-4">
        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="halim@zaatarrio.com.br"
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
            <input type="checkbox" className="accent-mar" defaultChecked />
            Continuar conectado
          </label>
          <Link to="/esqueci" className="font-semibold text-mar hover:underline">
            Esqueci a senha
          </Link>
        </div>

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
        onClick={async () => {
          try {
            const uid = await entrarComGoogle()
            setUidEsperado(uid)
          } catch (err) {
            console.error('Falha no login Google:', codigoDoErro(err) || err)
            setErro(mensagemDeErroAuth(err, 'Não deu pra entrar com o Google.'))
          }
        }}
        className="flex w-full items-center justify-center gap-3 rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie px-4 py-2.5 text-sm font-bold text-tinta-2 transition hover:bg-preenchimento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mar"
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
