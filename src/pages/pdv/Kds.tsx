import { Cartao } from '@/components/ui/Cartao'
import { ResumoPedido } from '@/components/pdv/CartaoPedido'
import { useUI } from '@/ui/UIProvider'
import { mensagemDeErro } from '@/lib/erros'
import { useMudarStatusPedido, usePedidosPdv } from '@/data/pdvHooks'
import { useAgora } from '@/data/useAgora'

/** Tela da cozinha: só o que está em preparo, do mais antigo pro mais novo, com botão grande. */
export function Kds() {
  const { adicionarToast } = useUI()
  const pedidos = usePedidosPdv()
  const mudar = useMudarStatusPedido()
  const agora = useAgora(15_000)
  const fila = (pedidos.data ?? []).filter((p) => p.status === 'em_preparo').sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : 1))

  return (
    <>
      <p className="text-sm text-tinta-3">{fila.length ? `${fila.length} ${fila.length === 1 ? 'pedido' : 'pedidos'} na fila` : 'Cozinha em dia'} · atualiza sozinha.</p>
      {fila.length === 0 ? (
        <Cartao className="py-16 text-center">
          <p className="text-[20px] font-bold text-mata">Tudo pronto por aqui</p>
          <p className="mt-1 text-sm text-tinta-3">Os pedidos novos aparecem nesta tela assim que forem lançados.</p>
        </Cartao>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 cel:grid-cols-2 tab:grid-cols-3">
          {fila.map((p) => (
            <Cartao key={p.id} className="flex flex-col gap-4 border-2 border-[rgba(46,95,115,0.2)]">
              <ResumoPedido p={p} agora={agora} grande />
              <button
                disabled={mudar.isPending}
                onClick={async () => {
                  try {
                    await mudar.mutateAsync({ pedido: p, status: 'pronto' })
                  } catch (e) {
                    adicionarToast({ tipo: 'erro', titulo: 'Não deu pra atualizar', texto: mensagemDeErro(e, 'Tente de novo.') })
                  }
                }}
                className="h-14 rounded-botao bg-mata text-[17px] font-bold text-creme transition active:scale-[0.99] disabled:opacity-60"
              >
                Pronto
              </button>
            </Cartao>
          ))}
        </div>
      )}
    </>
  )
}
