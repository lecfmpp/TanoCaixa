import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { AuthLayout } from './AuthLayout'
import { functions } from '@/lib/firebase'

const NOMES: Record<string, string> = {
  dicas: 'dicas de uso',
  recado: 'recado de segunda',
  novidades: 'novidades do Tá no Caixa',
  tudo: 'e-mails de dicas, recado e novidades',
}

const descadastrar = httpsCallable<{ u: string; t: string; s: string }, { ok: boolean }>(functions, 'descadastrarEmail')

/** "Não quero mais receber" dos e-mails: funciona sem login (link assinado). */
export function EmailsPage() {
  const [params] = useSearchParams()
  const u = params.get('u') ?? ''
  const t = params.get('t') ?? ''
  const s = params.get('s') ?? ''
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando')
  const feito = useRef(false)

  useEffect(() => {
    if (feito.current) return
    feito.current = true
    if (!u || !t || !s) return setEstado('erro')
    descadastrar({ u, t, s }).then(
      () => setEstado('ok'),
      () => setEstado('erro'),
    )
  }, [u, t, s])

  return (
    <AuthLayout>
      <div className="flex flex-col gap-4">
        <h2 className="text-tinta" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          {estado === 'ok' ? 'Pronto, descadastrado' : estado === 'erro' ? 'Não deu certo' : 'Um momento…'}
        </h2>
        {estado === 'ok' && (
          <p className="pretty text-sm text-tinta-2">
            Você não vai mais receber {NOMES[t] ?? 'estes e-mails'}. Avisos da conta, como senha e cobrança, continuam
            chegando. Para mudar de ideia, é em Ajustes › E-mails que recebo.
          </p>
        )}
        {estado === 'erro' && (
          <p className="pretty text-sm text-tinta-2">
            Este link não funcionou. Entre no Tá no Caixa e desligue em Ajustes › E-mails que recebo.
          </p>
        )}
        <Link to="/painel/ajustes#emails" className="text-sm font-bold text-mar hover:underline">
          Abrir Ajustes
        </Link>
      </div>
    </AuthLayout>
  )
}
