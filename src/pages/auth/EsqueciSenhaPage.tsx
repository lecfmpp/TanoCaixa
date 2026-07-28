import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from './AuthLayout'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

type Canal = 'whatsapp' | 'email'

export function EsqueciSenhaPage() {
  const [canal, setCanal] = useState<Canal>('whatsapp')

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-tinta" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Recuperar acesso
        </h2>
        <p className="pretty mt-1.5 text-sm text-tinta-3">
          A gente te manda um código pra você criar uma senha nova.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="rotulo text-tinta-4">Onde te mando o código?</span>
        {(
          [
            { id: 'whatsapp', titulo: 'WhatsApp', dado: '(21) 9 ****-5432' },
            { id: 'email', titulo: 'E-mail', dado: 'h****@zaatar.com.br' },
          ] as const
        ).map((op) => (
          <button
            key={op.id}
            type="button"
            onClick={() => setCanal(op.id)}
            className={cn(
              'flex items-center justify-between rounded-campo border bg-superficie px-4 py-3.5 text-left transition',
              canal === op.id
                ? 'border-mar ring-2 ring-mar/15'
                : 'border-[rgba(46,95,115,0.14)] hover:border-mar/40',
            )}
          >
            <span>
              <span className="block text-sm font-bold text-tinta">{op.titulo}</span>
              <span className="mono text-xs text-tinta-3">{op.dado}</span>
            </span>
            <span
              className={cn(
                'grid h-5 w-5 place-items-center rounded-full border-2',
                canal === op.id ? 'border-mar' : 'border-tinta-5',
              )}
            >
              {canal === op.id && <span className="h-2.5 w-2.5 rounded-full bg-mar" />}
            </span>
          </button>
        ))}

        <Button variante="primario" bloco className="mt-2">
          Me manda o código
        </Button>
      </div>

      <p className="pretty mt-6 text-center text-sm text-tinta-3">
        Travou de vez?{' '}
        <a className="font-bold text-mata hover:underline" href="#">
          Fala com a gente no WhatsApp
        </a>
        .
      </p>
      <p className="mt-3 text-center text-sm">
        <Link to="/entrar" className="font-semibold text-mar hover:underline">
          ← Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  )
}
