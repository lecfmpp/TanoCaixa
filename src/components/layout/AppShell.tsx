import { useEffect, useState } from 'react'
import { Outlet, useLocation, useSearchParams } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { SeletorLoja } from './SeletorLoja'
import { BarraPlano } from '@/components/assinatura/BarraPlano'
import { TelaBloqueio } from '@/components/assinatura/TelaBloqueio'
import { useAssinatura } from '@/data/assinatura'
import { useRede } from '@/data/hooks'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'
import { usePlanoContas } from '@/data/hooks'
import { useMesRef } from '@/ui/periodo'
import { useUI, type TipoGaveta } from '@/ui/UIProvider'

/** Com o teste vencido, só dá pra assinar ou mexer no perfil. */
const LIVRES_SEM_ASSINATURA = ['/painel/assinatura', '/painel/perfil']

/** Gavetas que um link de lembrete (?acao=…) pode abrir direto. */
const ACOES_POR_LINK: TipoGaveta[] = ['despesa', 'compra', 'produto', 'estoque', 'fechamento']

/**
 * Estrutura do painel: barra lateral fixa (>1100px) + conteúdo com scroll.
 * Abaixo de 1100px a barra vira gaveta acionada pelo topo.
 * (O modo "só ícones" 700–1100 fica pra Fase 8 — acabamento responsivo.)
 */
export function AppShell() {
  // Carrega o plano de contas da loja antes de qualquer tela renderizar: é ele
  // que diz quais contas existem no DRE, nos filtros e nas gavetas.
  usePlanoContas()
  const [gaveta, setGaveta] = useState(false)
  // Trocar o mês refaz a página inteira: os números leem o mês na hora de renderizar.
  const mes = useMesRef()
  const assinatura = useAssinatura().data
  const { pathname } = useLocation()
  const bloqueado = assinatura?.acesso === 'bloqueada' && !LIVRES_SEM_ASSINATURA.includes(pathname)
  const temVariasLojas = (useRede().data?.lojas.length ?? 0) > 1

  // Link do lembrete de WhatsApp: /painel/compras?acao=compra abre a tela com a gaveta já aberta.
  const { abrirGaveta } = useUI()
  const [busca, setBusca] = useSearchParams()
  const acao = busca.get('acao')
  useEffect(() => {
    if (!acao) return
    if ((ACOES_POR_LINK as string[]).includes(acao)) abrirGaveta(acao as TipoGaveta)
    const resto = new URLSearchParams(busca)
    resto.delete('acao')
    setBusca(resto, { replace: true })
  }, [acao, abrirGaveta, busca, setBusca])

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
        <header className="flex items-center justify-between gap-3 border-b border-divisoria bg-superficie px-4 py-3 tab:hidden">
          <Logo tom="escuro" tamanho={20} href="/painel" />
          <div className="min-w-0 flex-1 flex justify-end">
            <SeletorLoja compacto />
          </div>
          <button
            onClick={() => setGaveta((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-botao text-tinta-2 hover:bg-preenchimento"
            aria-label="Abrir menu"
          >
            {gaveta ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Topo no desktop: lojas da conta (dono com mais de uma loja) */}
        {temVariasLojas && (
          <div className="hidden border-b border-divisoria bg-superficie px-7 py-2.5 tab:block">
            <SeletorLoja />
          </div>
        )}
        <BarraPlano />

        <main className={cn('scroll-fina flex-1 overflow-y-auto', 'px-5 py-5 tab:px-7 tab:py-6')}>
          <div className="mx-auto max-w-[1180px]">
            {bloqueado && assinatura ? <TelaBloqueio status={assinatura} /> : <Outlet key={mes} />}
          </div>
        </main>
      </div>
    </div>
  )
}
