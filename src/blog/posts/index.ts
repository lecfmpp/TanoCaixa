import type { Post } from '../tipos'

/**
 * Todo arquivo `*.post.ts` desta pasta é um artigo. Basta exportar `default` como `Post`:
 * ele entra no índice, no sitemap, no pré-render e nas páginas relacionadas sozinho.
 */
const modulos = import.meta.glob<{ default: Post }>('./*.post.ts', { eager: true })

export const POSTS: Post[] = Object.values(modulos)
  .map((m) => m.default)
  .sort((a, b) => (a.publicadoEm === b.publicadoEm ? a.slug.localeCompare(b.slug) : a.publicadoEm < b.publicadoEm ? 1 : -1))

export function acharPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug)
}

/** Pilar primeiro, depois os mais recentes. */
export function postsDestaque(): Post[] {
  return [...POSTS].sort((a, b) => Number(b.tipo === 'pilar') - Number(a.tipo === 'pilar'))
}
