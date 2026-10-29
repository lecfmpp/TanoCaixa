import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { usePlano } from '@/data/hooks'
import { cn } from '@/lib/cn'

/** Avisa que o teste está acabando ou acabou. Não trava nada: só lembra de assinar.
 * Aparece pra quem pode assinar (dono e gestão) e some na própria página de assinatura. */
export function AvisoAssinatura() {
  const { sessao } = useAuth()
  const { pathname } = useLocation()
  const { acesso, diasDeTeste, carregando } = usePlano()
  const papel = sessao?.usuario.papel
  if (carregando || acesso === 'pago' || pathname === '/painel/assinatura') return null
  if (papel !== 'dono' && papel !== 'gestao') return null
  if (acesso === 'teste' && (diasDeTeste === null || diasDeTeste > 3)) return null

  const vencido = acesso === 'vencido'
  const texto = vencido
    ? 'Seu teste de 14 dias acabou. Assine o Pro pra seguir com o Tá no Caixa.'
    : diasDeTeste === 0
      ? 'Seu teste acaba hoje. Assine o Pro pra não perder o ritmo.'
      : `Faltam ${diasDeTeste} ${diasDeTeste === 1 ? 'dia' : 'dias'} do seu teste. Assine o Pro pra não perder o ritmo.`

  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-2 rounded-cartao px-4 py-3 text-sm cel:flex-row cel:items-center cel:justify-between',
        vencido ? 'bg-telhado text-creme' : 'bg-sol/25 text-insight-texto',
      )}
    >
      <span className="font-semibold">{texto}</span>
      <Link
        to="/painel/assinatura"
        className={cn(
          'shrink-0 self-start rounded-botao px-3 py-1.5 font-bold cel:self-auto',
          vencido ? 'bg-creme text-telhado' : 'bg-mar text-creme hover:bg-mar-escuro',
        )}
      >
        Assinar o Pro
      </Link>
    </div>
  )
}
