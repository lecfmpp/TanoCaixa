import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'

/**
 * Estrutura do painel: barra lateral fixa (>1100px) + conteúdo com scroll.
 * Abaixo de 1100px a barra vira gaveta acionada pelo topo.
 * (O modo "só ícones" 700–1100 fica pra Fase 8 — acabamento responsivo.)
 */
export function AppShell() {
  const [gaveta, setGaveta] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-fundo-app">
      {/* Sidebar fixa no desktop */}
      <div className="hidden tab:block">
        <Sidebar />
      </div>

      {/* Gaveta no mobile/tablet */}
      {gaveta && (
        <div className="fixed inset-0 z-50 tab:hidden">
          <div
            className="absolute inset-0 bg-noite/50"
            onClick={() => setGaveta(false)}
          />
          <div className="absolute left-0 top-0 h-full shadow-gaveta">
            <Sidebar aoNavegar={() => setGaveta(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo só no mobile/tablet */}
        <header className="flex items-center justify-between border-b border-divisoria bg-superficie px-4 py-3 tab:hidden">
          <Logo tom="escuro" tamanho={20} href="/painel" />
          <button
            onClick={() => setGaveta((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-botao text-tinta-2 hover:bg-preenchimento"
            aria-label="Abrir menu"
          >
            {gaveta ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <main className={cn('scroll-fina flex-1 overflow-y-auto', 'px-5 py-5 tab:px-7 tab:py-6')}>
          <div className="mx-auto max-w-[1180px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
