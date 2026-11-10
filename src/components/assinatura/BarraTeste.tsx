import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { Link } from 'react-router-dom'
import { CreditCard, AlertTriangle } from 'lucide-react'
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
  /** Começo do teste; sem ele, a barra conta com 14 dias. */
  testeDesde?: string | null
  ehDono: boolean
}

const situacaoFn = httpsCallable<{ restauranteId: string }, Resposta>(functions, 'situacaoDaAssinatura')
const checkoutFn = httpsCallable<
  { restauranteId: string; lojas: number; email: string; sucessoUrl: string; cancelUrl: string },
  { url?: string }
>(functions, 'criarCheckoutAssinatura')

/** "25/11", no fuso de Brasília. */
function diaDoFim(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
}

const DIA = 86_400_000

/** Quanto do teste ainda resta (0 a 1): enche no começo e esvazia até o fim. */
function fracaoRestante(s: Resposta): number {
  const fim = Date.parse(s.testeAte)
  const inicio = s.testeDesde ? Date.parse(s.testeDesde) : NaN
  const total = Number.isFinite(inicio) && fim > inicio ? (fim - inicio) / DIA : Math.max(14, s.diasRestantes)
  return Math.min(1, Math.max(0, s.diasRestantes / total))
}

/**
 * Aviso no topo do painel pro DONO da loja aberta: está no teste grátis e até
 * quando. "Assinar plano" já abre o pagamento do Stripe pra esta loja (R$ 149;
 * se a loja tiver rede, o servidor soma as outras lojas a R$ 79). Some quando a assinatura está ativa, na
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
  const dias = s.diasRestantes === 1 ? '1 dia' : `${s.diasRestantes} dias`
  const botao =
    'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-botao bg-telhado px-3 text-[13px] font-bold text-creme transition hover:brightness-95 disabled:opacity-60'

  // Uma linha só, em qualquer largura: recado curto (ou a barra de dias) + botão.
  return (
    <div
      role="status"
      className={cn(
        'flex h-12 items-center gap-3 border-b px-4 text-sm tab:px-7',
        urgente ? 'border-telha-alerta/25 bg-telha-alerta/10' : 'border-sol/40 bg-insight-fundo',
      )}
    >
      {falhou || acabou ? (
        <p className="flex min-w-0 flex-1 items-center gap-2 font-bold text-tinta">
          <AlertTriangle size={16} className="shrink-0 text-telha-alerta" />
          <span className="truncate">
            {falhou ? 'Pagamento falhou' : `Seu teste acabou em ${fim}`}
          </span>
        </p>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden shrink-0 font-bold text-tinta tab:inline">Teste grátis até {fim}</span>
          <div
            className="h-2 min-w-12 flex-1 overflow-hidden rounded-full bg-tinta/10 tab:max-w-60"
            role="progressbar"
            aria-label="Dias de teste que faltam"
            aria-valuenow={s.diasRestantes}
            aria-valuemin={0}
          >
            <div
              className={cn('h-full rounded-full', urgente ? 'bg-telha-alerta' : 'bg-mar')}
              style={{ width: `${Math.max(4, fracaoRestante(s) * 100)}%` }}
            />
          </div>
          <span className="mono shrink-0 whitespace-nowrap text-[13px] font-bold text-tinta">
            {dias}
            <span className="hidden font-normal text-tinta-3 cel:inline"> {s.diasRestantes === 1 ? 'restante' : 'restantes'}</span>
          </span>
        </div>
      )}
      {falhou ? (
        <Link to="/painel/assinatura" className={botao}>
          <CreditCard size={14} className="hidden cel:block" />
          Atualizar<span className="hidden cel:inline"> cartão</span>
        </Link>
      ) : (
        <button onClick={assinar} disabled={abrindo} className={botao}>
          <CreditCard size={14} className="hidden cel:block" />
          {abrindo ? 'Abrindo…' : 'Assinar'}
        </button>
      )}
    </div>
  )
}
