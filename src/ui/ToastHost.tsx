import { Loader2, Check, AlertTriangle, X, Info } from 'lucide-react'
import { useUI, type TipoToast } from './UIProvider'
import { cn } from '@/lib/cn'

const ESTILO: Record<TipoToast, { barra: string; icone: React.ReactNode; fundo: string; texto: string }> = {
  sucesso: { barra: 'bg-mata', icone: <Check size={16} className="text-mata" strokeWidth={3} />, fundo: 'bg-superficie', texto: 'text-tinta' },
  andamento: { barra: 'bg-mar', icone: <Loader2 size={16} className="animate-spin text-mar" />, fundo: 'bg-superficie', texto: 'text-tinta' },
  atencao: { barra: 'bg-sol', icone: <AlertTriangle size={16} className="text-sol" />, fundo: 'bg-insight-fundo', texto: 'text-insight-texto' },
  erro: { barra: 'bg-telha-alerta', icone: <X size={16} className="text-telha-alerta" strokeWidth={3} />, fundo: 'bg-superficie', texto: 'text-tinta' },
  sistema: { barra: 'bg-creme/40', icone: <Info size={16} className="text-creme" />, fundo: 'bg-mar', texto: 'text-creme' },
}

export function ToastHost() {
  const { toasts, removerToast } = useUI()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2.5 p-4 cel:inset-auto cel:bottom-5 cel:right-5 cel:items-end">
      {toasts.map((t) => {
        const e = ESTILO[t.tipo]
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-[380px] overflow-hidden rounded-cartao shadow-cartao',
              e.fundo,
            )}
          >
            <span className={cn('w-1.5 shrink-0', e.barra)} />
            <div className="flex flex-1 items-start gap-3 p-3.5">
              <span className="mt-0.5 shrink-0">{e.icone}</span>
              <div className="min-w-0 flex-1">
                <div className={cn('text-sm font-bold', e.texto)}>{t.titulo}</div>
                {t.texto && (
                  <div className={cn('text-xs', t.tipo === 'sistema' ? 'text-creme/80' : 'text-tinta-3')}>
                    {t.texto}
                  </div>
                )}
              </div>
              {t.rotuloAcao && (
                <button
                  onClick={() => {
                    t.onAcao?.()
                    removerToast(t.id)
                  }}
                  className={cn(
                    'shrink-0 text-xs font-bold hover:underline',
                    t.tipo === 'sistema' ? 'text-creme' : 'text-mar',
                  )}
                >
                  {t.rotuloAcao}
                </button>
              )}
              {(t.tipo === 'erro' || t.tipo === 'sistema') && (
                <button onClick={() => removerToast(t.id)} className={cn('shrink-0', t.tipo === 'sistema' ? 'text-creme/70' : 'text-tinta-4')}>
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
