import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { Cartao } from '@/components/ui/Cartao'
import { useAuth } from '@/auth/AuthContext'
import type { StatusAssinatura } from '@/data/assinatura'

/** No lugar do painel quando o teste acabou e ninguém assinou. Os dados ficam guardados. */
export function TelaBloqueio({ status }: { status: StatusAssinatura }) {
  const { sair } = useAuth()
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Cartao className="w-full max-w-md p-7 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-insight-fundo text-telhado">
          <Lock size={22} />
        </span>
        <h1 className="mt-4 text-tinta" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Seu teste grátis acabou
        </h1>
        {status.responsavel ? (
          <>
            <p className="pretty mt-2 text-sm text-tinta-3">
              Tudo o que você lançou continua guardado. Assine pra voltar a usar — {status.lojas}{' '}
              {status.lojas === 1 ? 'loja' : 'lojas'} na conta.
            </p>
            <Link
              to="/painel/assinatura"
              className="mt-5 inline-block w-full rounded-botao bg-telhado px-4 py-3 text-[15px] font-bold text-creme shadow-telhado hover:brightness-95"
            >
              Assinar e continuar usando
            </Link>
          </>
        ) : (
          <p className="pretty mt-2 text-sm text-tinta-3">
            O acesso desta loja está pausado até o dono da conta assinar. Os dados continuam guardados — fale com ele.
          </p>
        )}
        <button onClick={sair} className="mt-4 text-sm font-semibold text-tinta-4 hover:text-tinta-2">
          Sair da conta
        </button>
      </Cartao>
    </div>
  )
}
