import type { ReactNode } from 'react'
import { MarcaLogo } from '@/components/ui/Logo'

/** Cabeçalho e rodapé do blog. O blog roda fora do roteador do app: todos os links são <a> comuns. */

export function LogoLink({ tom = 'escuro', tamanho = 18 }: { tom?: 'claro' | 'escuro'; tamanho?: number }) {
  const lado = Math.round(tamanho * 1.7)
  return (
    <a href="/" aria-label="Tá no Caixa, página inicial" className="inline-flex w-auto shrink-0 items-center" style={{ gap: Math.round(lado * 0.28) }}>
      <MarcaLogo tom={tom} tamanho={tamanho} />
    </a>
  )
}

export function BlogHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-divisoria/70 bg-fundo-app/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <LogoLink />
        <nav className="hidden items-center gap-7 text-sm font-semibold text-tinta-2 tab:flex" aria-label="Principal">
          <a href="/#como" className="hover:text-tinta">Como funciona</a>
          <a href="/blog" className="text-tinta hover:text-mar">Blog</a>
          <a href="/recursos" className="hover:text-tinta">Materiais grátis</a>
          <a href="/#preco" className="hover:text-tinta">Preço</a>
        </nav>
        <div className="flex items-center gap-2.5">
          <a href="/entrar" className="hidden text-sm font-bold text-tinta-2 hover:text-tinta cel:block">Entrar</a>
          <a href="/criar?origem=blog-cabecalho" className="rounded-botao bg-telhado px-4 py-2 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95">Testar de graça</a>
        </div>
      </div>
    </header>
  )
}

export function BlogFooter() {
  const cols: [string, [string, string][]][] = [
    ['Produto', [['Como funciona', '/#como'], ['Funcionalidades', '/#painel'], ['Preço', '/#preco']]],
    ['Conteúdo', [['Blog', '/blog'], ['Materiais grátis', '/recursos'], ['Taxa do iFood', '/blog/taxa-do-ifood'], ['Como calcular CMV', '/blog/como-calcular-cmv-restaurante']]],
    ['Conta', [['Entrar', '/entrar'], ['Testar de graça', '/criar']]],
  ]
  return (
    <footer className="mt-20 border-t border-divisoria bg-fundo-app">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-8 tab:grid-cols-4">
          <div>
            <LogoLink />
            <p className="pretty mt-3 max-w-[230px] text-sm text-tinta-3">Gestão financeira para quem cozinha.</p>
          </div>
          {cols.map(([t, links]) => (
            <div key={t}>
              <div className="rotulo text-tinta-4">{t}</div>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-tinta-2">
                {links.map(([l, href]) => (
                  <li key={l}>
                    <a href={href} className="hover:text-tinta">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-divisoria pt-6 text-xs text-tinta-4">tanocaixa.com · Rio de Janeiro, RJ. Gestão financeira para quem cozinha.</div>
      </div>
    </footer>
  )
}

export function Pagina({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-fundo-app text-tinta">
      <BlogHeader />
      <main>{children}</main>
      <BlogFooter />
    </div>
  )
}
