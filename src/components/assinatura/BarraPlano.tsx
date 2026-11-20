import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { abrirPortal, progressoDoTeste, useAssinatura } from '@/data/assinatura'
import { useUI } from '@/ui/UIProvider'

/**
 * Faixa no topo do painel: plano grátis com os dias que faltam e o botão de
 * assinar; ou o aviso de pagamento que falhou. Só pra quem pode assinar — o
 * gerente de loja não precisa ver a contagem.
 */
export function BarraPlano() {
  const { data: s } = useAssinatura()
  const { sessao } = useAuth()
  const { adicionarToast } = useUI()
  const [abrindo, setAbrindo] = useState(false)
  if (!s || !s.responsavel) return null

  if (s.acesso === 'pagamento_falhou') {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-telha-alerta/30 bg-[#F8E1DA] px-5 py-2.5 tab:px-7">
        <span className="min-w-0 flex-1 text-sm text-tinta">
          <strong className="font-bold">O pagamento da assinatura não passou.</strong> Atualize o cartão pra não perder o acesso.
        </span>
        <button
          disabled={abrindo}
          onClick={async () => {
            setAbrindo(true)
            try {
              await abrirPortal(sessao!.tenantId)
            } catch {
              adicionarToast({ tipo: 'erro', titulo: 'Não abriu o portal', texto: 'Tente de novo em instantes.' })
              setAbrindo(false)
            }
          }}
          className="shrink-0 rounded-botao bg-telha-alerta px-3.5 py-1.5 text-sm font-bold text-creme hover:brightness-95"
        >
          {abrindo ? 'Abrindo…' : 'Atualizar pagamento'}
        </button>
      </div>
    )
  }

  if (s.acesso !== 'teste') return null
  const pct = Math.round(progressoDoTeste(s) * 100)
  const ultimos = s.diasRestantes <= 3
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-sol/50 bg-[#FBEBD3] px-5 py-2.5 tab:px-7">
      <span className="shrink-0 rounded-chip bg-noite px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-creme">
        Plano grátis
      </span>
      <div className="flex min-w-[180px] flex-1 items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-white/70"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Teste grátis usado"
        >
          <div className={ultimos ? 'h-full rounded-full bg-telha-alerta' : 'h-full rounded-full bg-sol'} style={{ width: `${pct}%` }} />
        </div>
        <span className={ultimos ? 'shrink-0 text-sm font-bold text-telha-alerta' : 'shrink-0 text-sm font-bold text-tinta'}>
          {s.diasRestantes === 1 ? 'Falta 1 dia' : `Faltam ${s.diasRestantes} dias`}
        </span>
      </div>
      <Link
        to="/painel/assinatura"
        className="shrink-0 rounded-botao bg-telhado px-3.5 py-1.5 text-sm font-bold text-creme shadow-telhado hover:brightness-95"
      >
        Assine para continuar usando
      </Link>
    </div>
  )
}
