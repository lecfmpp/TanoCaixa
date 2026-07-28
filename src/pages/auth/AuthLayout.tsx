import type { ReactNode } from 'react'
import { Logo } from '@/components/ui/Logo'
import { fotos } from '@/lib/fotos'

/**
 * Layout split das telas de entrada. Esquerda 44%: foto do Rio (filtro Mar)
 * + logo + manchete + duas provas. Direita: o formulário (máx. 400px).
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-fundo-app">
      {/* Coluna da foto — some no celular */}
      <aside className="foto-rio relative hidden w-[44%] shrink-0 tab:flex flex-col justify-between p-10">
        <img src={fotos.cristo} alt="Rio de Janeiro ao pôr do sol" />
        {/* Scrim escuro para leitura do texto sobre a foto */}
        <div
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{ background: 'linear-gradient(180deg, rgba(22,48,58,.25) 0%, rgba(22,48,58,.3) 40%, rgba(22,48,58,.62) 100%)' }}
          aria-hidden
        />
        <div className="relative z-10">
          <Logo tom="claro" tamanho={24} />
        </div>

        <div className="relative z-10 max-w-[420px]">
          <h1
            className="text-creme"
            style={{
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
            }}
          >
            Saber se sobrou dinheiro não pode dar trabalho
          </h1>
          <div className="mt-8 flex gap-10">
            <div>
              <div className="mono text-creme" style={{ fontSize: 30, fontWeight: 700 }}>
                40s
              </div>
              <div className="mt-1 text-sm text-creme/75">pra lançar uma nota</div>
            </div>
            <div>
              <div className="mono text-creme" style={{ fontSize: 30, fontWeight: 700 }}>
                3s
              </div>
              <div className="mt-1 text-sm text-creme/75">pra saber se sobrou</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-creme/55">
          Zaatar Cozinha Árabe · Botafogo, Rio de Janeiro
        </div>
      </aside>

      {/* Coluna do formulário */}
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-[400px]">
          {/* Logo só aparece aqui quando a foto está escondida (celular) */}
          <div className="mb-8 tab:hidden">
            <Logo tom="escuro" tamanho={24} />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
