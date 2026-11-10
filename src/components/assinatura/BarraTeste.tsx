import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { Link } from 'react-router-dom'
import { Clock, CreditCard, AlertTriangle } from 'lucide-react'
import { functions } from '@/lib/firebase'
import { cn } from '@/lib/cn'
import { useAuth } from '@/auth/AuthContext'
import { useTenant } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'

type Situacao = 'ativa' | 'pagamento_falhou' | 'teste' | 'teste_acabou'

interface Resposta {
  situacao: Situacao
  diasRestantes: number
  testeAte: string
  ehDono: boolean
}

const situacaoFn = httpsCallable<{ restauranteId: string }, Resposta>(functions, 'situacaoDaAssinatura')
const checkoutFn = httpsCallable<
  { restauranteId: string; lojas: number; email: string; sucessoUrl: string; cancelUrl: string },
  { url?: string }
>(functions, 'criarCheckoutAssinatura')

/** "25 de novembro", no fuso de Brasília. */
function diaDoFim(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })
}

/**
 * Aviso no topo do painel pro DONO da loja aberta: está no teste grátis e até
 * quando. "Assinar plano" já abre o pagamento do Stripe pra esta loja (uma
 * assinatura comum, 1 loja). Some quando a assinatura está ativa, na
 * demonstração e pra quem não é dono (quem paga é o dono).
 */
export function BarraTeste() {
  const { sessao } = useAuth()
  const tenant = useTenant()
  const { adicionarToast } = useUI()
  const [abrindo, setAbrindo] = useState(false)
  const ativo = !!sessao && !sessao.demo

  const q = useQuery({
    queryKey: [tenant, 'situacao-assinatura'],
    queryFn: async () => (await situacaoFn({ restauranteId: tenant })).data,
    enabled: ativo,
    staleTime: 5 * 60_000,
    retry: 1,
  })

  const s = q.data
  if (!ativo || !s || !s.ehDono || s.situacao === 'ativa') return null

  async function assinar() {
    if (!sessao) return
    setAbrindo(true)
    try {
      const { data } = await checkoutFn({
        restauranteId: tenant,
        lojas: 1,
        email: sessao.usuario.email,
        sucessoUrl: `${window.location.origin}/painel?assinatura=ok`,
        cancelUrl: `${window.location.origin}/painel`,
      })
      if (!data.url) throw new Error('checkout sem URL')
      window.location.href = data.url
    } catch (e) {
      console.error('checkout:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não abriu o pagamento', texto: 'Tente de novo em instantes.' })
      setAbrindo(false)
    }
  }

  const fim = diaDoFim(s.testeAte)
  const falhou = s.situacao === 'pagamento_falhou'
  const acabou = s.situacao === 'teste_acabou'
  const urgente = falhou || acabou || s.diasRestantes <= 3

  let titulo: string
  let apoio: string
  if (falhou) {
    titulo = 'O pagamento da assinatura não passou'
    apoio = 'Atualize o cartão pra continuar usando o Tá no Caixa.'
  } else if (acabou) {
    titulo = `Seu período de teste terminou em ${fim}`
    apoio = 'Assine o plano pra continuar lançando e vendo seus números.'
  } else {
    titulo = `Você está no período de teste grátis até ${fim}`
    apoio =
      s.diasRestantes === 1
        ? 'Falta 1 dia. Assine pra não perder o acesso.'
        : `Faltam ${s.diasRestantes} dias. Assine pra não perder o acesso.`
  }

  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-2 border-b px-4 py-2.5 text-sm cel:flex-row cel:items-center cel:gap-4 tab:px-7',
        urgente ? 'border-telha-alerta/25 bg-telha-alerta/10' : 'border-sol/40 bg-insight-fundo',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className={cn('mt-0.5 shrink-0', urgente ? 'text-telha-alerta' : 'text-insight-rotulo')}>
          {falhou || acabou ? <AlertTriangle size={17} /> : <Clock size={17} />}
        </span>
        <p className="min-w-0 text-insight-texto">
          <b className="font-bold text-tinta">{titulo}.</b> <span className="text-tinta-2">{apoio}</span>
        </p>
      </div>
      {falhou ? (
        <Link
          to="/painel/assinatura"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-botao bg-telhado px-4 py-2 text-sm font-bold text-creme transition hover:brightness-95 cel:self-auto"
        >
          <CreditCard size={15} />
          Atualizar pagamento
        </Link>
      ) : (
        <button
          onClick={assinar}
          disabled={abrindo}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-botao bg-telhado px-4 py-2 text-sm font-bold text-creme transition hover:brightness-95 disabled:opacity-60 cel:self-auto"
        >
          <CreditCard size={15} />
          {abrindo ? 'Abrindo pagamento…' : 'Assinar plano'}
        </button>
      )}
    </div>
  )
}
