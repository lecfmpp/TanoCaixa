import { useState } from 'react'
import { Check } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { useAuth } from '@/auth/AuthContext'
import { functions } from '@/lib/firebase'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { SeloPro } from '@/components/ui/SeloPro'
import { usePlano, useRede, useTenant } from '@/data/hooks'
import { INCLUI_GRATIS, NOME_RECURSO, type RecursoPro } from '@/data/planos'
import { DESCONTO_LOJA, PRECO_LOJA, PRECO_LOJA_CHEIO, PRECO_LOJA_EXTRA } from '@/data/preco'
import { brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useUI } from '@/ui/UIProvider'

const RECURSOS_PRO: RecursoPro[] = ['dre_completo', 'foto_ia', 'lembretes_whatsapp', 'rede', 'equipe_ilimitada']
const EM_BREVE = ['PDV (frente de caixa e KDS)']

/** Assinatura: Grátis ou Pro (R$ 149 a primeira loja + R$ 79 por loja extra, por mês). */
export function Plano() {
  const { sessao } = useAuth()
  const t = useTenant()
  const { adicionarToast } = useUI()
  const { pro, assinatura, carregando } = usePlano()
  const rede = useRede().data
  const [abrindo, setAbrindo] = useState(false)

  // Quem já tem rede paga as lojas que já existem: a principal + as extras. O servidor confere.
  const lojas = pro ? Math.max(1, assinatura?.lojas ?? 1) : Math.max(1, rede?.lojas.length ?? 1)
  const extras = lojas - 1
  const total = PRECO_LOJA + extras * PRECO_LOJA_EXTRA

  async function irPara(funcao: 'criarCheckoutAssinatura' | 'portalAssinatura') {
    if (!sessao) return
    setAbrindo(true)
    try {
      const chamar = httpsCallable(functions, funcao)
      const res = await chamar(
        funcao === 'criarCheckoutAssinatura'
          ? {
              restauranteId: t,
              email: sessao.usuario.email,
              sucessoUrl: `${window.location.origin}/painel/assinatura?assinatura=ok`,
              cancelUrl: `${window.location.origin}/painel/assinatura`,
            }
          : { restauranteId: t, returnUrl: `${window.location.origin}/painel/assinatura` },
      )
      const { url } = res.data as { url?: string }
      if (!url) throw new Error('Stripe sem URL')
      window.location.href = url
    } catch (e) {
      console.error(`Erro em ${funcao}:`, e)
      adicionarToast({ tipo: 'erro', titulo: 'Não abriu o pagamento', texto: (e instanceof Error && e.message) || 'Tente de novo em instantes.' })
      setAbrindo(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        titulo="Assinatura"
        subtitulo={carregando ? 'Carregando…' : pro ? 'Você está no Pro' : 'Você está no Grátis'}
        semMes
      />

      <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 tab:grid-cols-2">
        {/* Grátis */}
        <Cartao className={cn('flex flex-col p-7', !pro && 'border-mar/40')}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-tinta">Grátis</h2>
            {!pro && !carregando && <span className="text-xs font-bold text-mar">Seu plano</span>}
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="mono text-tinta" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ 0</span>
            <span className="mb-2 text-sm text-tinta-4">pra sempre</span>
          </div>
          <ul className="mt-5 flex flex-col gap-2.5">
            {INCLUI_GRATIS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-tinta-2">
                <Check size={16} className="mt-0.5 shrink-0 text-mata" strokeWidth={3} />{item}
              </li>
            ))}
          </ul>
        </Cartao>

        {/* Pro */}
        <Cartao className={cn('flex flex-col p-7', pro && 'border-mar/40')}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-tinta">Pro <SeloPro /></h2>
            {pro && <span className="text-xs font-bold text-mar">Seu plano</span>}
          </div>
          <div className="mt-2 flex items-end gap-2">
            <span className="mono text-tinta-4 line-through" style={{ fontSize: 18 }}>R$ {PRECO_LOJA_CHEIO}</span>
            <span className="mono text-tinta" style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ {PRECO_LOJA}</span>
            <span className="mb-2 text-sm text-tinta-4">/mês</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-mata">R$ {DESCONTO_LOJA} de desconto por enquanto.</p>
          <p className="mt-1 text-sm text-tinta-3">+ R$ {PRECO_LOJA_EXTRA}/mês por loja extra da rede.</p>

          <ul className="mt-5 flex flex-col gap-2.5">
            <li className="flex items-start gap-2.5 text-sm text-tinta-2">
              <Check size={16} className="mt-0.5 shrink-0 text-mata" strokeWidth={3} />Tudo do Grátis, e mais:
            </li>
            {RECURSOS_PRO.map((r) => (
              <li key={r} className="flex items-start gap-2.5 text-sm text-tinta-2">
                <Check size={16} className="mt-0.5 shrink-0 text-mata" strokeWidth={3} />{NOME_RECURSO[r]}
              </li>
            ))}
            {EM_BREVE.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-tinta-3">
                <span className="mt-0.5 w-4 shrink-0 text-center text-tinta-4">·</span>
                <span>{item} <SeloEmBreve className="ml-1" /></span>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-cartao bg-preenchimento/50 p-4">
            <div className="text-sm font-bold text-tinta">{lojas === 1 ? '1 loja' : `${lojas} lojas`}</div>
            <div className="mono mt-0.5 text-sm text-tinta-3">
              R$ {PRECO_LOJA}
              {extras > 0 && ` + ${extras} × R$ ${PRECO_LOJA_EXTRA}`} = {brlInteiro(total)}/mês
            </div>
            {!pro && extras > 0 && (
              <p className="mt-1 text-xs text-tinta-4">As lojas que já estão na sua rede entram juntas.</p>
            )}
          </div>

          {pro ? (
            <Button variante="secundario" bloco className="mt-5 py-3" onClick={() => irPara('portalAssinatura')} disabled={abrindo}>
              {abrindo ? 'Abrindo o portal…' : 'Gerenciar assinatura'}
            </Button>
          ) : (
            <Button variante="lancar" bloco className="mt-5 py-3" onClick={() => irPara('criarCheckoutAssinatura')} disabled={abrindo || carregando}>
              {abrindo ? 'Abrindo o pagamento…' : 'Assinar o Pro'}
            </Button>
          )}
          <p className="mt-3 text-center text-xs text-tinta-4">
            Pagamento seguro pelo Stripe. Cancela quando quiser, sem multa, e volta pro Grátis. Troca de cartão e faturas no portal da assinatura.
          </p>
        </Cartao>
      </div>
    </div>
  )
}
