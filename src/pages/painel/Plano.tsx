import { useState } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { useAuth } from '@/auth/AuthContext'
import { functions } from '@/lib/firebase'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { DESCONTO_LOJA, PRECO_LOJA, PRECO_LOJA_CHEIO } from '@/data/preco'
import { brlInteiro } from '@/lib/format'
import { useUI } from '@/ui/UIProvider'

const INCLUI = [
  'Lançamento do dia, foto da nota e compras',
  'Dashboard, metas e caminho até o equilíbrio',
  'DRE, despesas, estoque e produtos',
  'Rede e franquias, com a visão de cada loja',
  'Recado semanal por e-mail',
]
const EM_BREVE = ['PDV (frente de caixa e KDS)', 'CMV por ficha técnica']
const MAX_LOJAS = 50

/** Assinatura: um plano só, R$ 149 por loja/mês. */
export function Plano() {
  const { sessao } = useAuth()
  const { adicionarToast } = useUI()
  const [lojas, setLojas] = useState(1)
  const [abrindo, setAbrindo] = useState(false)

  async function contratar() {
    if (!sessao) return
    setAbrindo(true)
    try {
      const criarCheckout = httpsCallable(functions, 'criarCheckoutAssinatura')
      const res = await criarCheckout({
        restauranteId: sessao.tenantId,
        lojas,
        email: sessao.usuario.email,
        sucessoUrl: `${window.location.origin}/painel?assinatura=ok`,
        cancelUrl: `${window.location.origin}/painel/assinatura`,
      })
      const { url } = res.data as { url?: string }
      if (!url) throw new Error('checkout sem URL')
      window.location.href = url
    } catch (e) {
      console.error('Erro ao criar checkout:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não abriu o pagamento', texto: 'Tente de novo em instantes.' })
      setAbrindo(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader titulo="Assinatura" subtitulo="Um plano só, cobrado por loja" />
      <Cartao className="mx-auto w-full max-w-xl p-7">
        <div className="flex items-end gap-2">
          <span className="mono text-tinta-4 line-through" style={{ fontSize: 20 }}>R$ {PRECO_LOJA_CHEIO}</span>
          <span className="mono text-tinta" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ {PRECO_LOJA}</span>
          <span className="mb-2 text-sm text-tinta-4">/loja/mês</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-mata">R$ {DESCONTO_LOJA} de desconto por enquanto.</p>

        <ul className="mt-5 flex flex-col gap-2.5">
          {INCLUI.map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-sm text-tinta-2">
              <Check size={16} className="mt-0.5 shrink-0 text-mata" strokeWidth={3} />{t}
            </li>
          ))}
          {EM_BREVE.map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-sm text-tinta-3">
              <span className="mt-0.5 w-4 shrink-0 text-center text-tinta-4">·</span>
              <span>{t} <SeloEmBreve className="ml-1" /></span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between rounded-cartao bg-preenchimento/50 p-4">
          <div>
            <div className="text-sm font-bold text-tinta">Quantas lojas?</div>
            <div className="mono mt-0.5 text-sm text-tinta-3">{lojas} × R$ {PRECO_LOJA} = {brlInteiro(lojas * PRECO_LOJA)}/mês</div>
          </div>
          <div className="flex items-center gap-3">
            <Button variante="secundario" aria-label="Menos uma loja" disabled={lojas <= 1} onClick={() => setLojas((n) => Math.max(1, n - 1))} className="px-2.5"><Minus size={16} /></Button>
            <span className="mono w-6 text-center text-lg font-bold text-tinta">{lojas}</span>
            <Button variante="secundario" aria-label="Mais uma loja" disabled={lojas >= MAX_LOJAS} onClick={() => setLojas((n) => Math.min(MAX_LOJAS, n + 1))} className="px-2.5"><Plus size={16} /></Button>
          </div>
        </div>

        <Button variante="lancar" bloco className="mt-5 py-3" onClick={contratar} disabled={abrindo}>
          {abrindo ? 'Abrindo o pagamento…' : 'Assinar agora'}
        </Button>
        <p className="mt-3 text-center text-xs text-tinta-4">
          Pagamento seguro pelo Stripe. Cancela quando quiser, sem multa. Troca de cartão e faturas no portal da assinatura.
        </p>
      </Cartao>
    </div>
  )
}
