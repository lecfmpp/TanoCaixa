import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/auth/AuthContext'

export function EntrarPage() {
  const { entrarComEmail, entrarDemo } = useAuth()
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await entrarComEmail(email, senha)
      navegar('/painel')
    } catch {
      setErro(
        'Não deu pra entrar. Confira e-mail e senha — ou use a demonstração aqui embaixo.',
      )
    } finally {
      setEnviando(false)
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

      <div className="flex flex-col gap-2.5">
        <Button variante="secundario" bloco>
          Continuar com Google
        </Button>
        <Button variante="secundario" bloco>
          Continuar com Apple
        </Button>
      </div>

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
