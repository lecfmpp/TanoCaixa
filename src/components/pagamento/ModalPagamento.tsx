import { useEffect, useState } from 'react'
import { CheckCircle2, TrendingUp } from 'lucide-react'
import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'
import { numeroBR } from '@/lib/csv'
import { mensagemDeErro } from '@/lib/erros'
import { diaDeHoje } from '@/data/derive'
import { CONTA } from '@/data/planoContas'
import { jurosDoPagamento, type ContaDoFluxo } from '@/data/fluxo'
import { useDesfazerPagamento, usePagarConta } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'

const dataBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

/**
 * O check de "paguei". Pergunta só o que muda o número: foi o valor do boleto
 * ou teve juros/multa? O juro vira lançamento próprio (conta "Multas,
 * atrasos") e aparece na despesa, no DRE e em tudo que soma contas.
 */
export function ModalPagamento({ conta, aoFechar }: { conta: ContaDoFluxo; aoFechar: () => void }) {
  const { adicionarToast } = useUI()
  const pagar = usePagarConta()
  const desfazer = useDesfazerPagamento()
  const [comJuros, setComJuros] = useState(false)
  const [valorTxt, setValorTxt] = useState(conta.valor.toFixed(2).replace('.', ','))
  const [dia, setDia] = useState(diaDeHoje())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aoFechar])

  const valorPago = comJuros ? numeroBR(valorTxt) : conta.valor
  const juros = jurosDoPagamento(conta.valor, valorPago)
  const menorQueBoleto = comJuros && valorPago < conta.valor
  const invalido = !dia || (comJuros && (juros <= 0 || menorQueBoleto))

  async function confirmar() {
    if (invalido) return
    try {
      const { jurosId } = await pagar.mutateAsync({ lancamentos: conta.lancamentos, valorPago, dia })
      aoFechar()
      adicionarToast({
        tipo: 'sucesso',
        titulo: juros > 0 ? `Pago, com ${brl(juros)} de juros` : 'Pago',
        texto: `${conta.fornecedor} · ${brl(conta.valor + juros)}`,
        rotuloAcao: 'Desfazer',
        // O primeiro lançamento ganhou o jurosId ao pagar — o desfazer precisa dele pra apagar o juro.
        onAcao: () => desfazer.mutate({ lancamentos: conta.lancamentos.map((l, i) => (i === 0 ? { ...l, jurosId } : l)) }),
      })
    } catch (e) {
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra registrar o pagamento', texto: mensagemDeErro(e, 'Tente de novo.') })
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-noite/50 p-4 cel:items-center" onClick={aoFechar}>
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-cartao-g bg-superficie shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="titulo-pagamento"
      >
        <div className="h-1.5 w-full bg-mata" />
        <div className="p-6">
          <h2 id="titulo-pagamento" className="text-tinta" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Confirmar pagamento
          </h2>

          <div className="mt-4 rounded-cartao bg-preenchimento/60 p-3.5">
            <div className="font-bold text-tinta">{conta.fornecedor}</div>
            <div className="text-xs text-tinta-4">
              {[conta.descricao, CONTA[conta.categoria]?.nome].filter(Boolean).join(' · ')}
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-tinta-3">{conta.temVencimento ? `Vence ${dataBR(conta.dia)}` : `Lançada ${dataBR(conta.dia)}`}</span>
              <span className="mono text-lg font-bold text-tinta">{brl(conta.valor)}</span>
            </div>
          </div>

          <p className="mt-5 text-sm font-bold text-tinta">Quanto saiu do caixa?</p>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <Opcao ativa={!comJuros} aoClicar={() => setComJuros(false)} icone={<CheckCircle2 size={18} />} titulo="Valor do boleto" apoio={brl(conta.valor)} />
            <Opcao ativa={comJuros} aoClicar={() => setComJuros(true)} icone={<TrendingUp size={18} />} titulo="Teve juros ou multa" apoio="paguei mais" />
          </div>

          {comJuros && (
            <div className="mt-4 flex flex-col gap-2">
              <label className="flex flex-col gap-1.5">
                <span className="rotulo text-tinta-4">Valor pago no total</span>
                <span className="flex items-center rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 focus-within:border-mar focus-within:ring-2 focus-within:ring-mar/15">
                  <span className="mr-1.5 text-tinta-4">R$</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={valorTxt}
                    onChange={(e) => setValorTxt(e.target.value)}
                    className="mono w-full bg-transparent py-2.5 text-[15px] text-tinta outline-none"
                  />
                </span>
              </label>
              {menorQueBoleto ? (
                <p className="text-xs font-semibold text-telha-alerta">O valor pago não pode ser menor que o boleto.</p>
              ) : juros > 0 ? (
                <div className="flex items-center justify-between rounded-cartao bg-telha-alerta/10 px-3.5 py-2.5 text-sm">
                  <span className="text-tinta-2">Juros/multa <span className="text-xs text-tinta-4">· entra no DRE em “Multas, atrasos”</span></span>
                  <span className="mono font-bold text-telha-alerta">+ {brl(juros)}</span>
                </div>
              ) : (
                <p className="text-xs text-tinta-4">Digite o total que saiu, com os juros.</p>
              )}
            </div>
          )}

          <label className="mt-4 flex flex-col gap-1.5">
            <span className="rotulo text-tinta-4">Pago em</span>
            <input
              type="date"
              value={dia}
              max={diaDeHoje()}
              onChange={(e) => setDia(e.target.value)}
              className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5 text-[15px] text-tinta outline-none focus:border-mar"
            />
          </label>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button onClick={aoFechar} className="rounded-botao px-4 py-2.5 text-sm font-bold text-tinta-2 transition hover:bg-preenchimento">
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={invalido || pagar.isPending}
              className="inline-flex items-center gap-1.5 rounded-botao bg-mata px-4 py-2.5 text-sm font-bold text-creme transition hover:brightness-95 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {pagar.isPending ? 'Salvando…' : `Confirmar ${brl(valorPago)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Opcao({ ativa, aoClicar, icone, titulo, apoio }: { ativa: boolean; aoClicar: () => void; icone: React.ReactNode; titulo: string; apoio: string }) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativa}
      className={cn(
        'flex flex-col items-start gap-1 rounded-cartao border-2 p-3 text-left transition',
        ativa ? 'border-mar bg-mar/5' : 'border-[rgba(46,95,115,0.14)] hover:border-mar/40',
      )}
    >
      <span className={ativa ? 'text-mar' : 'text-tinta-4'}>{icone}</span>
      <span className="text-sm font-bold text-tinta">{titulo}</span>
      <span className="mono text-xs text-tinta-4">{apoio}</span>
    </button>
  )
}
