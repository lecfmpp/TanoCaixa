import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { brl } from '@/lib/format'
import { mensagemDeErro } from '@/lib/erros'
import { diaDeHoje } from '@/data/derive'
import { useDesfazerRecebimento, useMarcarRecebido } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import type { CanalVenda } from '@/data/planoContas'
import type { ReceitaDiaDoc } from '@/data/types'

const dataBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

/** O que está "a receber": um canal (app, delivery) de um dia de vendas. */
export interface ContaAReceber {
  r: ReceitaDiaDoc
  canal: CanalVenda
  nome: string
  valor: number
  /** Dia previsto pro dinheiro cair. */
  previsto: string
}

/**
 * O check de "recebi", espelho do de "paguei": confirma o valor e o dia em
 * que o dinheiro caiu. Não mexe no DRE — a venda conta no dia em que foi feita.
 */
export function ModalRecebimento({ conta, aoFechar }: { conta: ContaAReceber; aoFechar: () => void }) {
  const { adicionarToast } = useUI()
  const marcar = useMarcarRecebido()
  const desfazer = useDesfazerRecebimento()
  const [dia, setDia] = useState(diaDeHoje())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aoFechar])

  async function confirmar() {
    if (!dia) return
    try {
      await marcar.mutateAsync({ r: conta.r, canal: conta.canal, dia })
      aoFechar()
      adicionarToast({
        tipo: 'sucesso',
        titulo: 'Recebido',
        texto: `${conta.nome} · ${brl(conta.valor)}`,
        rotuloAcao: 'Desfazer',
        onAcao: () => desfazer.mutate({ r: conta.r, canal: conta.canal }),
      })
    } catch (e) {
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra registrar o recebimento', texto: mensagemDeErro(e, 'Tente de novo.') })
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-noite/50 p-4 cel:items-center" onClick={aoFechar}>
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-cartao-g bg-superficie shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="titulo-recebimento"
      >
        <div className="h-1.5 w-full bg-mata" />
        <div className="p-6">
          <h2 id="titulo-recebimento" className="text-tinta" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Confirmar recebimento
          </h2>

          <div className="mt-4 rounded-cartao bg-preenchimento/60 p-3.5">
            <div className="font-bold text-tinta">{conta.nome}</div>
            <div className="text-xs text-tinta-4">Venda de {dataBR(conta.r.data)}</div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-tinta-3">Previsto pra {dataBR(conta.previsto)}</span>
              <span className="mono text-lg font-bold text-tinta">{brl(conta.valor)}</span>
            </div>
          </div>

          <label className="mt-5 flex flex-col gap-1.5">
            <span className="rotulo text-tinta-4">Caiu no caixa em</span>
            <input
              type="date"
              value={dia}
              min={conta.r.data.slice(0, 10)}
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
              disabled={!dia || marcar.isPending}
              className="inline-flex items-center gap-1.5 rounded-botao bg-mata px-4 py-2.5 text-sm font-bold text-creme transition hover:brightness-95 disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {marcar.isPending ? 'Salvando…' : `Confirmar ${brl(conta.valor)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
