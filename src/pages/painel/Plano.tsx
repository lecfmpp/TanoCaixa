import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Store } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { useAuth } from '@/auth/AuthContext'
import { functions } from '@/lib/firebase'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { DESCONTO_LOJA, PRECO_EXPANSAO, PRECO_LOJA, PRECO_LOJA_CHEIO, totalMensal } from '@/data/preco'
import { brlInteiro } from '@/lib/format'
import { useUI } from '@/ui/UIProvider'
import { DIAS_TESTE, abrirPortal, useAssinatura } from '@/data/assinatura'

const INCLUI = [
  'Lançamento do dia, foto da nota e compras',
  'Dashboard, metas e caminho até o equilíbrio',
  'DRE, despesas, estoque e produtos',
  'Rede e franquias, com a visão de cada loja',
  'Recado semanal por e-mail',
]
const EM_BREVE = ['PDV (frente de caixa e KDS)', 'CMV por ficha técnica']

/** Assinatura: um plano pago só, o Pro (com 1 loja). Lojas a mais entram pela
 * Expansão, opcional — a quantidade sai das lojas cadastradas na rede. */
export function Plano() {
  const { sessao } = useAuth()
  const { adicionarToast } = useUI()
  const status = useAssinatura().data
  // O servidor cobra pelas lojas cadastradas na rede: Pro + (lojas − 1) Expansão.
  const lojas = status?.lojas ?? 1
  const extras = lojas - 1
  const [abrindo, setAbrindo] = useState(false)

  async function portal() {
    if (!sessao) return
    setAbrindo(true)
    try {
      await abrirPortal(sessao.tenantId)
    } catch (e) {
      console.error('portal:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não abriu o portal', texto: 'Tente de novo em instantes.' })
      setAbrindo(false)
    }
  }

  async function contratar() {
    if (!sessao) return
    setAbrindo(true)
    try {
      const criarCheckout = httpsCallable(functions, 'criarCheckoutAssinatura')
      const res = await criarCheckout({
        restauranteId: sessao.tenantId,
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
      <SectionHeader titulo="Assinatura" subtitulo="Pro, com Expansão opcional pra mais lojas" semMes />

      {status && (
        <Cartao className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <span className="rotulo text-tinta-4">Sua situação</span>
            <p className="mt-1 text-[15px] font-bold text-tinta">
              {status.acesso === 'ativa'
                ? `Pro ativo${(status.lojasAssinadas ?? status.lojas) > 1 ? ` + Expansão · ${status.lojasAssinadas ?? status.lojas} lojas` : ''}`
                : status.acesso === 'pagamento_falhou'
                  ? 'Pagamento não passou — atualize o cartão'
                  : status.acesso === 'teste'
                    ? `Plano grátis · ${status.diasRestantes === 1 ? 'falta 1 dia' : `faltam ${status.diasRestantes} dias`} de ${DIAS_TESTE}`
                    : 'Teste grátis encerrado — assine pra voltar a usar'}
            </p>
            {status.acesso === 'ativa' && status.lojasAssinadas !== null && status.lojas > status.lojasAssinadas && (
              <p className="mt-1 text-xs text-tinta-4">Loja nova cadastrada: a Expansão passa pra {status.lojas - 1} {status.lojas - 1 === 1 ? 'loja' : 'lojas'} no próximo ciclo.</p>
            )}
          </div>
          {(status.acesso === 'ativa' || status.acesso === 'pagamento_falhou') && status.responsavel && (
            <Button variante="secundario" onClick={portal} disabled={abrindo}>Cartão e faturas</Button>
          )}
        </Cartao>
      )}
      {status?.acesso !== 'ativa' && status?.responsavel !== false && (
      <Cartao className="mx-auto w-full max-w-xl p-7">
        <span className="rounded-chip bg-mar px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-creme">Pro</span>
        <div className="mt-3 flex items-end gap-2">
          <span className="mono text-tinta-4 line-through" style={{ fontSize: 20 }}>R$ {PRECO_LOJA_CHEIO}</span>
          <span className="mono text-tinta" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em' }}>R$ {PRECO_LOJA}</span>
          <span className="mb-2 text-sm text-tinta-4">/mês · 1 loja</span>
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

        {/* Expansão: opcional, só pra quem tem mais de uma loja */}
        <div className="mt-6 rounded-cartao border border-[rgba(46,95,115,0.14)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-preenchimento text-mar"><Store size={18} /></span>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-tinta">
                  Expansão <span className="rounded-chip bg-preenchimento px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tinta-3">opcional</span>
                </div>
                <div className="text-sm text-tinta-3">R$ {PRECO_EXPANSAO}/mês por loja além da primeira.</div>
              </div>
            </div>
            <span className="mono shrink-0 text-sm font-bold text-tinta">{extras > 0 ? `+ ${brlInteiro(extras * PRECO_EXPANSAO)}` : '—'}</span>
          </div>
          <p className="mt-2.5 text-xs text-tinta-4">
            {extras > 0 ? (
              <>Você tem {lojas} lojas cadastradas: {extras} × R$ {PRECO_EXPANSAO}. Loja nova entra sozinha na Expansão.</>
            ) : (
              <>Tem mais de uma loja? Cadastre em <Link to="/painel/rede" className="font-bold text-mar hover:underline">Rede</Link> e ela entra aqui.</>
            )}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-cartao bg-preenchimento/50 px-4 py-3">
          <span className="text-sm font-bold text-tinta">Total por mês</span>
          <span className="mono text-lg font-bold text-tinta">{brlInteiro(totalMensal(lojas))}</span>
        </div>

        <Button variante="lancar" bloco className="mt-5 py-3" onClick={contratar} disabled={abrindo}>
          {abrindo ? 'Abrindo o pagamento…' : 'Assinar agora'}
        </Button>
        <p className="mt-3 text-center text-xs text-tinta-4">
          Pagamento seguro pelo Stripe. Cancela quando quiser, sem multa. Troca de cartão e faturas no portal da assinatura.
        </p>
      </Cartao>
      )}
      {status?.responsavel === false && (
        <p className="mx-auto max-w-xl text-center text-sm text-tinta-3">Quem assina é o dono da conta. Fale com ele pra liberar o acesso.</p>
      )}
    </div>
  )
}
