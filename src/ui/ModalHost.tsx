import { useEffect } from 'react'
import { useUI } from './UIProvider'
import { cn } from '@/lib/cn'

const COR_BARRA = {
  destrutivo: 'bg-telha-alerta',
  atencao: 'bg-sol',
  neutro: 'bg-mar',
}

export function ModalHost() {
  const { modal, fecharModal } = useUI()

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && fecharModal()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [modal, fecharModal])

  if (!modal) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-noite/50 p-4 cel:items-center" onClick={fecharModal}>
      <div
        className="w-full max-w-[440px] overflow-hidden rounded-cartao-g bg-superficie shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <div className={cn('h-1.5 w-full', COR_BARRA[modal.gravidade])} />
        <div className="p-6">
          <h2 className="text-tinta" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {modal.titulo}
          </h2>
          <p className="pretty mt-2 text-sm text-tinta-2">{modal.texto}</p>

          {modal.resumo && modal.resumo.length > 0 && (
            <div className="mt-4 rounded-cartao bg-preenchimento/60 p-3.5">
              {modal.resumo.map((r) => (
                <div key={r.rot} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-tinta-3">{r.rot}</span>
                  <span className="mono font-bold text-tinta">{r.val}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={fecharModal}
              className="rounded-botao px-4 py-2.5 text-sm font-bold text-tinta-2 transition hover:bg-preenchimento"
            >
              {modal.rotuloCancelar ?? 'Cancelar'}
            </button>
            <button
              onClick={() => {
                modal.onConfirmar()
                fecharModal()
              }}
              className={cn(
                'rounded-botao px-4 py-2.5 text-sm font-bold text-creme transition',
                modal.gravidade === 'destrutivo' ? 'bg-telha-alerta hover:brightness-95' : 'bg-mar hover:bg-mar-escuro',
              )}
            >
              {modal.rotuloConfirmar}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
