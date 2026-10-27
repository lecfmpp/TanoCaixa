import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { AuthLayout } from './AuthLayout'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { auth } from '@/lib/firebase'
import { codigoDoErro, mensagemDeErroAuth } from '@/auth/erros'

/** Códigos que NÃO mostramos como erro: dizer "não achamos conta com esse
 * e-mail" deixaria qualquer um descobrir quem é cliente. */
const NEUTROS = new Set(['auth/user-not-found', 'auth/invalid-credential'])

export function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await sendPasswordResetEmail(auth, email.trim(), { url: `${window.location.origin}/entrar` })
      setEnviado(true)
    } catch (err) {
      const codigo = codigoDoErro(err)
      if (NEUTROS.has(codigo)) {
        setEnviado(true)
      } else {
        console.error('Falha ao enviar link de senha:', codigo || err)
        setErro(mensagemDeErroAuth(err, 'Não deu pra enviar o link agora.'))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthLayout>
      <Link to="/entrar" className="mb-6 inline-block text-sm font-semibold text-mar hover:underline">
        ← Voltar pro login
      </Link>

      <div className="mb-6">
        <h2 className="text-tinta" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Acontece com todo mundo
        </h2>
        <p className="pretty mt-1.5 text-sm text-tinta-3">
          Digite o e-mail da sua conta que a gente manda um link pra você criar uma senha nova.
        </p>
      </div>

      {enviado ? (
        <div className="flex flex-col gap-4">
          <p
            role="status"
            className="pretty rounded-campo border border-mata/30 bg-mata/8 px-4 py-3 text-sm text-tinta-2"
          >
            Se existir uma conta com <b>{email.trim()}</b>, enviamos o link pra criar uma senha nova. Confira a caixa
            de entrada e o spam — o link vale por pouco tempo.
          </p>
          <Button
            variante="secundario"
            bloco
            onClick={() => {
              setEnviado(false)
              setErro(null)
            }}
          >
            Usar outro e-mail
          </Button>
          <Link to="/entrar" className="text-center text-sm font-bold text-mar hover:underline">
            Voltar pro login
          </Link>
        </div>
      ) : (
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

          {erro && (
            <p className="rounded-campo border border-telha-alerta/40 bg-telha-alerta/8 px-3 py-2 text-sm text-telha-alerta">
              {erro}
            </p>
          )}

          <Button type="submit" variante="primario" bloco disabled={enviando}>
            {enviando ? 'Enviando…' : 'Me manda o link'}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
