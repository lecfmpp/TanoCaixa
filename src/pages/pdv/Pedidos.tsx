import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { useAgora } from '@/data/useAgora'
import { ResumoPedido } from '@/components/pdv/CartaoPedido'
import { CancelarPedido } from '@/components/pdv/CancelarPedido'
import { useUI } from '@/ui/UIProvider'
import { cn } from '@/lib/cn'
import { mensagemDeErro } from '@/lib/erros'
import { useMudarStatusPedido, usePedidosPdv } from '@/data/pdvHooks'
import { ROTULO_ACAO, proximoStatus } from '@/data/pdv'
import type { PedidoPdvDoc, StatusPedido } from '@/data/types'

const COLUNAS: { status: StatusPedido; titulo: string; cor: string }[] = [
  { status: 'em_preparo', titulo: 'Em preparo', cor: 'bg-sol' },
  { status: 'pronto', titulo: 'Pronto', cor: 'bg-mata' },
  { status: 'em_entrega', titulo: 'Em entrega', cor: 'bg-mar' },
  { status: 'concluido', titulo: 'Concluídos hoje', cor: 'bg-tinta-5' },
]

/** Fila do dia em colunas: do preparo até a entrega. */
export function Pedidos() {
  const { adicionarToast } = useUI()
  const pedidos = usePedidosPdv()
  const mudar = useMudarStatusPedido()
  const agora = useAgora()
  const [cancelando, setCancelando] = useState<PedidoPdvDoc | null>(null)
  const lista = pedidos.data ?? []

  async function avancar(p: PedidoPdvDoc) {
    const prox = proximoStatus(p)
    if (!prox) return
    try {
      await mudar.mutateAsync({ pedido: p, status: prox })
    } catch (e) {
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra atualizar', texto: mensagemDeErro(e, 'Tente de novo.') })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-tinta-3">A tela se atualiza sozinha a cada 10 segundos.</p>
        <Link to="/painel/pdv/pedido/novo"><Button variante="lancar"><Plus size={16} strokeWidth={2.5} /> Novo pedido</Button></Link>
      </div>

      {lista.length === 0 && !pedidos.isLoading && (
        <Cartao className="py-10 text-center text-sm text-tinta-3">Nenhum pedido hoje ainda. Lance o primeiro em <strong>Novo pedido</strong>.</Cartao>
      )}

      <div className="grid grid-cols-1 gap-3.5 tab:grid-cols-4">
        {COLUNAS.map((col) => {
          const doStatus = lista.filter((p) => p.status === col.status)
          return (
            <div key={col.status} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className={cn('h-2.5 w-2.5 rounded-full', col.cor)} />
                <h2 className="text-[14px] font-bold text-tinta">{col.titulo}</h2>
                <span className="mono rounded-chip bg-preenchimento px-2 py-0.5 text-xs font-bold text-tinta-3">{doStatus.length}</span>
              </div>
              {doStatus.map((p) => {
                const prox = proximoStatus(p)
                return (
                  <Cartao key={p.id} className="flex flex-col gap-3 p-4">
                    <ResumoPedido p={p} agora={agora} />
                    {prox && (
                      <div className="flex items-center gap-2">
                        <Button className="flex-1" disabled={mudar.isPending} onClick={() => avancar(p)}>{ROTULO_ACAO[prox]}</Button>
                        <button onClick={() => setCancelando(p)} className="rounded-botao border border-telha-alerta/30 px-3 py-2.5 text-xs font-bold text-telha-alerta hover:bg-telha-alerta/8">Cancelar</button>
                      </div>
                    )}
                  </Cartao>
                )
              })}
              {doStatus.length === 0 && <p className="rounded-cartao border border-dashed border-[rgba(46,95,115,0.18)] px-3 py-6 text-center text-xs text-tinta-4">vazio</p>}
            </div>
          )
        })}
      </div>
      {cancelando && <CancelarPedido pedido={cancelando} aoFechar={() => setCancelando(null)} />}
    </>
  )
}
