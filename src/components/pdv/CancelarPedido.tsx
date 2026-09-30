import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Campo } from '@/components/ui/Campo'
import { Chip } from '@/components/ui/Chip'
import { useUI } from '@/ui/UIProvider'
import { brl } from '@/lib/format'
import { mensagemDeErro } from '@/lib/erros'
import { useCancelarPedido } from '@/data/pdvHooks'
import type { PedidoPdvDoc } from '@/data/types'

const MOTIVOS = ['Cliente desistiu', 'Erro no pedido', 'Faltou ingrediente', 'Demorou demais', 'Outro']

/** Confirmação de cancelamento com motivo — o motivo fica no histórico do pedido. */
export function CancelarPedido({ pedido, aoFechar }: { pedido: PedidoPdvDoc; aoFechar: () => void }) {
  const { adicionarToast } = useUI()
  const cancelar = useCancelarPedido()
  const [motivo, setMotivo] = useState('')
  const [detalhe, setDetalhe] = useState('')

  async function confirmar() {
    try {
      await cancelar.mutateAsync({ pedido, motivo: [motivo, detalhe.trim()].filter(Boolean).join(' — ') })
      adicionarToast({ tipo: 'sucesso', titulo: `Pedido #${pedido.numero} cancelado`, texto: 'A mercadoria voltou pro estoque.' })
      aoFechar()
    } catch (e) {
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra cancelar', texto: mensagemDeErro(e, 'O pedido continua valendo.') })
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-noite/50 p-4 cel:items-center" onClick={aoFechar}>
      <div className="w-full max-w-[440px] overflow-hidden rounded-cartao-g bg-superficie shadow-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="h-1.5 w-full bg-telha-alerta" />
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2 className="text-tinta" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>Cancelar o pedido #{pedido.numero}?</h2>
            <p className="pretty mt-2 text-sm text-tinta-2">
              O pedido de {brl(pedido.total)} deixa de contar nas vendas e a mercadoria que ele tirou volta pro estoque.
            </p>
          </div>
          <div>
            <span className="rotulo mb-1.5 block text-tinta-4">Motivo</span>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS.map((m) => <Chip key={m} rotulo={m} selecionado={motivo === m} aoClicar={() => setMotivo(m)} />)}
            </div>
          </div>
          <Campo rotulo="Detalhe · opcional" value={detalhe} onChange={(e) => setDetalhe(e.target.value)} />
          <div className="flex items-center justify-end gap-3">
            <button onClick={aoFechar} className="rounded-botao px-4 py-2.5 text-sm font-bold text-tinta-2 hover:bg-preenchimento">Manter pedido</button>
            <Button className="!bg-telha-alerta" disabled={!motivo || cancelar.isPending} onClick={confirmar}>
              {cancelar.isPending ? 'Cancelando…' : 'Cancelar pedido'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
