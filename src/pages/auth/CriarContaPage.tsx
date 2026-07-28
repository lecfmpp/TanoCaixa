import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/auth/AuthContext'
import { cn } from '@/lib/cn'

/** Medidor de força bem simples, em linguagem de balcão. */
function forcaSenha(senha: string): { nivel: number; frase: string } {
  let n = 0
  if (senha.length >= 8) n++
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) n++
  if (/\d/.test(senha)) n++
  if (/[^A-Za-z0-9]/.test(senha)) n++
  const frases = [
    'muito curta — capriche mais um pouco',
    'fraca — dá pra melhorar',
    'razoável — quase lá',
    'boa senha',
    'senha forte, tá tranquilo',
  ]
  return { nivel: n, frase: senha ? frases[n] : 'use 8+ letras, um número e um símbolo' }
}

export function CriarContaPage() {
  const navegar = useNavigate()
  const { criarConta } = useAuth()
  const [senha, setSenha] = useState('')
  const [aceite, setAceite] = useState(false)
  const forca = useMemo(() => forcaSenha(senha), [senha])

  async function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nome = String(fd.get('nome') ?? '')
    const email = String(fd.get('email') ?? '')
    try {
      // Cadastro real no Firebase (funciona quando o provedor estiver habilitado).
      if (email && senha) await criarConta(nome, email, senha)
    } catch {
      // Provedor ainda não habilitado — segue no fluxo de demonstração.
    }
    navegar('/onboarding')
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-tinta" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Criar sua conta
        </h2>
        <p className="pretty mt-1.5 text-sm text-tinta-3">
          Leva 40 segundos. Depois a gente conhece o restaurante.
        </p>
      </div>

      <form onSubmit={aoEnviar} className="flex flex-col gap-4">
        <Campo rotulo="Seu nome" name="nome" placeholder="Halim Nassar" required />

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Restaurante" name="restaurante" placeholder="Zaatar" required />
          <Campo rotulo="Bairro" name="bairro" placeholder="Botafogo" required />
        </div>

        <Campo
          rotulo="Celular (WhatsApp)"
          name="whatsapp"
          type="tel"
          placeholder="(21) 99814-2207"
          destaque
          required
        />
        <p className="-mt-2 text-xs text-tinta-4">
          É por aqui que a gente te avisa quando um teto estoura.
        </p>

        <Campo
          rotulo="E-mail"
          name="email"
          type="email"
          placeholder="voce@seurestaurante.com.br"
          required
        />

        <div>
          <Campo
            rotulo="Senha"
            name="senha"
            type="password"
            placeholder="crie uma senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition',
                  i < forca.nivel
                    ? forca.nivel <= 1
                      ? 'bg-telha-alerta'
                      : forca.nivel === 2
                        ? 'bg-sol'
                        : 'bg-mata'
                    : 'bg-trilho',
                )}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-tinta-4">{forca.frase}</p>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-tinta-2">
          <input
            type="checkbox"
            className="mt-0.5 accent-mar"
            checked={aceite}
            onChange={(e) => setAceite(e.target.checked)}
            required
          />
          <span className="pretty">
            Concordo em tratar meus dados conforme a{' '}
            <a className="font-semibold text-mar hover:underline" href="#">
              Política de Privacidade
            </a>{' '}
            (LGPD).
          </span>
        </label>

        <Button type="submit" variante="lancar" bloco disabled={!aceite}>
          Criar conta e começar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-tinta-3">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-bold text-mar hover:underline">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  )
}
