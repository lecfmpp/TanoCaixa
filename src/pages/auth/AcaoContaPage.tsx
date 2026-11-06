import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { AuthLayout } from './AuthLayout'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { auth } from '@/lib/firebase'
import { codigoDoErro, mensagemDeErroAuth } from '@/auth/erros'

type Estado = { fase: 'carregando' } | { fase: 'pronto'; titulo: string; texto: string } | { fase: 'erro'; texto: string } | { fase: 'senha'; email: string }

/**
 * Links dos e-mails de acesso (que saem pelo Resend, do tanocaixa.com):
 *   ?mode=verifyEmail&oobCode=…            confirma o e-mail
 *   ?mode=resetPassword&oobCode=…          cria a senha nova
 *   ?mode=verifyAndChangeEmail&oobCode=…   confirma o e-mail novo de login
 *   ?mode=recoverEmail&oobCode=…           desfaz uma troca de e-mail
 */
export function AcaoContaPage() {
  const [params] = useSearchParams()
  const modo = params.get('mode') ?? ''
  const codigo = params.get('oobCode') ?? ''
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })
  const [senha, setSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const feito = useRef(false)

  useEffect(() => {
    if (feito.current) return
    feito.current = true
    const falhou = (e: unknown) => {
      const c = codigoDoErro(e)
      setEstado({
        fase: 'erro',
        texto:
          c === 'auth/expired-action-code' || c === 'auth/invalid-action-code'
            ? 'Este link venceu ou já foi usado. Peça um novo.'
            : mensagemDeErroAuth(e, 'Não deu para concluir agora. Tente de novo.'),
      })
    }
    if (!codigo) return setEstado({ fase: 'erro', texto: 'Link incompleto. Abra de novo o botão do e-mail.' })
    if (modo === 'resetPassword') {
      verifyPasswordResetCode(auth, codigo).then((email) => setEstado({ fase: 'senha', email }), falhou)
    } else if (modo === 'verifyEmail' || modo === 'verifyAndChangeEmail' || modo === 'recoverEmail') {
      applyActionCode(auth, codigo).then(
        () =>
          setEstado({
            fase: 'pronto',
            titulo: modo === 'verifyEmail' ? 'E-mail confirmado' : 'E-mail de login atualizado',
            texto:
              modo === 'verifyEmail'
                ? 'Pronto, seu e-mail está confirmado.'
                : 'Pronto. Entre de novo com o e-mail certo para continuar.',
          }),
        falhou,
      )
    } else {
      setEstado({ fase: 'erro', texto: 'Link desconhecido. Abra de novo o botão do e-mail.' })
    }
  }, [modo, codigo])

  async function salvarSenha(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 6) return
    setSalvando(true)
    try {
      await confirmPasswordReset(auth, codigo, senha)
      setEstado({ fase: 'pronto', titulo: 'Senha nova criada', texto: 'Agora é só entrar com a senha nova.' })
    } catch (err) {
      setEstado({ fase: 'erro', texto: mensagemDeErroAuth(err, 'Não deu para salvar a senha. Peça um novo link.') })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <AuthLayout>
      {estado.fase === 'carregando' && <p className="text-sm text-tinta-3">Conferindo o link…</p>}

      {estado.fase === 'senha' && (
        <form onSubmit={salvarSenha} className="flex flex-col gap-4">
          <div>
            <h2 className="text-tinta" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Crie a senha nova</h2>
            <p className="pretty mt-1.5 text-sm text-tinta-3">Para a conta {estado.email}.</p>
          </div>
          <Campo
            rotulo="Senha nova"
            name="senha"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={senha}
            onChange={(ev) => setSenha(ev.target.value)}
            required
          />
          <Button type="submit" variante="primario" bloco disabled={salvando || senha.length < 6}>
            {salvando ? 'Salvando…' : 'Salvar senha nova'}
          </Button>
        </form>
      )}

      {(estado.fase === 'pronto' || estado.fase === 'erro') && (
        <div className="flex flex-col gap-4">
          <h2 className="text-tinta" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {estado.fase === 'pronto' ? estado.titulo : 'Não deu certo'}
          </h2>
          <p role="status" className="pretty text-sm text-tinta-2">{estado.texto}</p>
          <Link to={estado.fase === 'erro' && modo === 'resetPassword' ? '/esqueci' : '/entrar'} className="text-sm font-bold text-mar hover:underline">
            {estado.fase === 'erro' && modo === 'resetPassword' ? 'Pedir um novo link' : 'Ir para o login'}
          </Link>
        </div>
      )}
    </AuthLayout>
  )
}
