import { useEffect, type ReactNode } from 'react'
import { BlogIndex, NaoEncontrada, PostPagina, RecursoPagina, RecursosIndex } from './paginas'
import { acharPost, POSTS } from './posts'
import { acharRecurso, RECURSOS } from './recursos'
import { metaDoIndice, metaDoPost, metaDoRecurso, metaDosRecursos, tagsDoHead, type Meta } from './seo'

/** O blog é um conjunto de documentos pré-renderizados: não há roteador no cliente, cada link é uma página nova. */

export const ROTAS_DO_BLOG = /^\/(blog|recursos)(\/|$)/

export interface Rota {
  elemento: ReactNode
  meta: Meta | null
  status: 200 | 404
}

export function resolverRota(caminhoBruto: string): Rota {
  const caminho = caminhoBruto.split('?')[0].replace(/\/+$/, '') || '/'
  if (caminho === '/blog') return { elemento: <BlogIndex />, meta: metaDoIndice(), status: 200 }
  if (caminho === '/recursos') return { elemento: <RecursosIndex />, meta: metaDosRecursos(), status: 200 }

  const post = caminho.startsWith('/blog/') ? acharPost(caminho.slice('/blog/'.length)) : undefined
  if (post) return { elemento: <PostPagina post={post} />, meta: metaDoPost(post), status: 200 }

  const recurso = caminho.startsWith('/recursos/') ? acharRecurso(caminho.slice('/recursos/'.length)) : undefined
  if (recurso) return { elemento: <RecursoPagina recurso={recurso} origem="direto" />, meta: metaDoRecurso(recurso), status: 200 }

  return { elemento: <NaoEncontrada />, meta: null, status: 404 }
}

/** Todos os caminhos que viram HTML estático no build. */
export function caminhosPrerenderizados(): string[] {
  return ['/blog', '/recursos', ...POSTS.map((p) => `/blog/${p.slug}`), ...RECURSOS.map((r) => `/recursos/${r.id}`)]
}

/**
 * Em produção o <head> já vem pronto do pré-render. Em desenvolvimento (vite, sem pré-render)
 * este efeito aplica título, descrição, canonical, Open Graph e JSON-LD no navegador.
 */
function useHeadNoCliente(meta: Meta | null) {
  useEffect(() => {
    if (!meta || document.querySelector('link[rel="canonical"]')) return
    const molde = document.createElement('template')
    molde.innerHTML = tagsDoHead(meta)
    document.title = molde.content.querySelector('title')?.textContent ?? document.title
    molde.content.querySelector('title')?.remove()
    document.head.append(molde.content)
  }, [meta])
}

export function BlogApp({ caminho }: { caminho: string }) {
  const rota = resolverRota(caminho)
  useHeadNoCliente(rota.meta)
  return <>{rota.elemento}</>
}
