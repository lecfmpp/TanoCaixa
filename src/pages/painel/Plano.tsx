import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { Check } from 'lucide-react'
import { functions } from '@/lib/firebase'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { useTenant } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import { mensagemDeErro } from '@/lib/erros'

type Situacao = 'em_teste' | 'teste_encerrado' | 'ativa' | 'pagamento_falhou' | 'pendente' | 'cancelada'
interface Estado {
  situacao: Situacao
  diasRestantes?: number
  temPortal: boolean
  precoCentavos: number
}

const status = httpsCallable<{ restauranteId: string }, Estado>(functions, 'statusAssinatura')
const checkout = httpsCallable<{ restauranteId: string; sucessoUrl: string; cancelUrl: string }, { url: string | null }>(functions, 'criarCheckoutAssinatura')
const portal = httpsCallable<{ restauranteId: string; returnUrl: string }, { url: string }>(functions, 'portalAssinatura')

/** O plano é um só: tudo do Tá no Caixa, por restaurante. */
const INCLUI = [
  'Vendas, caixa e PDV do dia',
  'Notas fiscais por foto, com custo e preço dos produtos',
  'Estoque e contagem, com o que saiu de cada item',
  'DRE, plano do mês e ponto de equilíbrio',
  'Equipe com permissões por papel',
  'Lembretes e avisos no WhatsApp do restaurante',
]

const TEXTO: Record<Situacao, { titulo: string; apoio: string }> = {
  em_teste: { titulo: 'Teste grátis em andamento', apoio: 'Sem cartão. Você assina quando fizer sentido, sem perder nenhum lançamento.' },
  teste_encerrado: { titulo: 'Seu teste de 14 dias terminou', apoio: 'Seus dados continuam guardados. Assine para seguir usando sem interrupção.' },
  ativa: { titulo: 'Assinatura ativa', apoio: 'Obrigado por assinar. Cartão, faturas e cancelamento ficam no portal de assinatura.' },
  pagamento_falhou: { titulo: 'Não conseguimos processar o último pagamento', apoio: 'Atualize o cartão no portal para manter o acesso sem interrupção.' },
  pendente: { titulo: 'Pagamento em confirmação', apoio: 'Assim que o Stripe confirmar, a situação muda aqui. Costuma levar alguns segundos.' },
  cancelada: { titulo: 'Assinatura cancelada', apoio: 'Seus dados continuam guardados. Você pode assinar de novo quando quiser.' },
}

export function Plano() {
  const t = useTenant()
  const { adicionarToast } = useUI()
  const [busca, setBusca] = useSearchParams()
  const voltouDoPagamento = busca.get('assinatura') === 'ok'

  const estado = useQuery({
    queryKey: [t, 'assinatura'],
    queryFn: async () => (await status({ restauranteId: t })).data,
    retry: false,
    // Depois do pagamento a confirmação chega por webhook: confere de novo por um tempo.
    refetchInterval: (q) => (voltouDoPagamento && q.state.data?.situacao !== 'ativa' ? 3000 : false),
  })

  useEffect(() => {
    if (voltouDoPagamento && estado.data?.situacao === 'ativa') {
      adicionarToast({ tipo: 'sucesso', titulo: 'Assinatura ativa', texto: 'Pagamento confirmado. Obrigado!' })
      setBusca({}, { replace: true })
    }
  }, [voltouDoPagamento, estado.data?.situacao, adicionarToast, setBusca])

  const abrir = useMutation({
    mutationFn: async (qual: 'checkout' | 'portal') => {
      const base = `${window.location.origin}/painel/assinatura`
      const r = qual === 'checkout'
        ? (await checkout({ restauranteId: t, sucessoUrl: `${base}?assinatura=ok`, cancelUrl: base })).data.url
        : (await portal({ restauranteId: t, returnUrl: base })).data.url
      if (!r) throw new Error('sem url')
      window.location.href = r
    },
    onError: (e) => adicionarToast({ tipo: 'erro', titulo: 'Não deu pra abrir o pagamento', texto: mensagemDeErro(e, 'Tente de novo em instantes.') }),
  })

  const d = estado.data
  const sit = d?.situacao
  const assinou = sit === 'ativa' || sit === 'pagamento_falhou'

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Assinatura" subtitulo="Plano único, por restaurante" />

      {estado.isError ? (
        <Cartao>
          <p className="text-sm text-tinta-3">Só o dono ou a gestão do restaurante cuidam da assinatura.</p>
        </Cartao>
      ) : (
        <Cartao className="flex flex-col gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-bold text-tinta">{sit ? TEXTO[sit].titulo : 'Carregando…'}</h2>
              {sit === 'em_teste' && d?.diasRestantes != null && (
                <span className="rounded-chip bg-sol/25 px-2.5 py-0.5 text-xs font-bold text-insight-rotulo">
                  {d.diasRestantes} {d.diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
                </span>
              )}
            </div>
            {sit && <p className="mt-1 text-sm text-tinta-3">{TEXTO[sit].apoio}</p>}
          </div>

          <div className="flex items-end gap-1">
            <span className="mono" style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ 149</span>
            <span className="mb-2 text-sm text-tinta-4">/mês por restaurante</span>
          </div>

          <ul className="flex flex-col gap-2.5">
            {INCLUI.map((x) => (
              <li key={x} className="flex items-start gap-2.5 text-sm text-tinta-2">
                <Check size={16} className="mt-0.5 shrink-0 text-mata" />
                {x}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            {assinou ? (
              <Button variante="primario" disabled={abrir.isPending || !d?.temPortal} onClick={() => abrir.mutate('portal')}>
                {abrir.isPending ? 'Abrindo…' : sit === 'pagamento_falhou' ? 'Atualizar cartão' : 'Gerenciar assinatura'}
              </Button>
            ) : sit === 'pendente' ? null : (
              <Button variante="primario" disabled={abrir.isPending || !sit} onClick={() => abrir.mutate('checkout')}>
                {abrir.isPending ? 'Abrindo…' : 'Assinar por R$ 149/mês'}
              </Button>
            )}
            {!assinou && sit !== 'pendente' && <span className="text-xs text-tinta-4">Pagamento seguro pelo Stripe. Cancela quando quiser.</span>}
          </div>
        </Cartao>
      )}
    </div>
  )
}
