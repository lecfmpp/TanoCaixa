import { renderToString } from 'react-dom/server'
import { BlogApp, caminhosPrerenderizados, resolverRota } from './rotas'
import { tagsDoHead } from './seo'
import { POSTS } from './posts'
import { RECURSOS } from './recursos'

/** Usado pelo script de pré-render (scripts/prerender-blog.mjs). */
export function renderizar(caminho: string) {
  const rota = resolverRota(caminho)
  return {
    html: renderToString(<BlogApp caminho={caminho} />),
    head: rota.meta ? tagsDoHead(rota.meta) : '',
    status: rota.status,
  }
}

export { caminhosPrerenderizados }

/** Para o sitemap. */
export function urlsDoSitemap() {
  return [
    { caminho: '/blog', lastmod: POSTS.reduce((m, p) => (p.atualizadoEm > m ? p.atualizadoEm : m), '2000-01-01'), prioridade: 0.8 },
    { caminho: '/recursos', lastmod: '2026-10-21', prioridade: 0.6 },
    ...POSTS.map((p) => ({ caminho: `/blog/${p.slug}`, lastmod: p.atualizadoEm, prioridade: p.tipo === 'pilar' ? 0.9 : 0.7 })),
    ...RECURSOS.map((r) => ({ caminho: `/recursos/${r.id}`, lastmod: '2026-10-21', prioridade: 0.5 })),
  ]
}
