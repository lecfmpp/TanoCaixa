import { textoPuro } from './inline'
import { formatarData } from './formatar'
import type { Post, Recurso } from './tipos'
import { POSTS } from './posts'

export const SITE = 'https://tanocaixa.com'
export const MARCA = 'Tá no Caixa'

export interface Meta {
  titulo: string
  descricao: string
  /** Caminho canônico, ex.: /blog/taxa-do-ifood */
  caminho: string
  imagem: string
  tipo: 'website' | 'article'
  publicado?: string
  atualizado?: string
  jsonLd: object[]
}

const ORGANIZACAO = {
  '@type': 'Organization',
  '@id': `${SITE}/#organizacao`,
  name: MARCA,
  url: SITE,
  logo: { '@type': 'ImageObject', url: `${SITE}/favicon.png`, width: 512, height: 512 },
}

function migalhas(itens: { nome: string; caminho: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((i, idx) => ({ '@type': 'ListItem', position: idx + 1, name: i.nome, item: `${SITE}${i.caminho}` })),
  }
}

export function metaDoPost(p: Post): Meta {
  const url = `${SITE}/blog/${p.slug}`
  const imagem = `${SITE}/blog/${p.slug}.png`
  const faq = p.blocos.find((b) => b.t === 'faq')
  const jsonLd: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: p.titulo,
      description: p.descricao,
      image: [imagem],
      datePublished: p.publicadoEm,
      dateModified: p.atualizadoEm,
      inLanguage: 'pt-BR',
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      author: ORGANIZACAO,
      publisher: ORGANIZACAO,
      articleSection: p.categoria,
      keywords: [p.palavraChave, ...p.secundarias].join(', '),
    },
    migalhas([
      { nome: 'Início', caminho: '/' },
      { nome: 'Blog', caminho: '/blog' },
      { nome: p.titulo, caminho: `/blog/${p.slug}` },
    ]),
  ]
  if (faq && faq.t === 'faq') {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.itens.map((i) => ({ '@type': 'Question', name: i.p, acceptedAnswer: { '@type': 'Answer', text: textoPuro(i.r) } })),
    })
  }
  return { titulo: p.tituloMeta, descricao: p.descricao, caminho: `/blog/${p.slug}`, imagem, tipo: 'article', publicado: p.publicadoEm, atualizado: p.atualizadoEm, jsonLd }
}

export function metaDoIndice(): Meta {
  return {
    titulo: 'Blog Tá no Caixa: gestão financeira de restaurante',
    descricao: 'Guias e calculadoras para dono de restaurante: taxa do iFood, CMV, ponto de equilíbrio, custo do prato e como escolher sistema.',
    caminho: '/blog',
    imagem: `${SITE}/blog/blog.png`,
    tipo: 'website',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `Blog do ${MARCA}`,
        url: `${SITE}/blog`,
        inLanguage: 'pt-BR',
        publisher: ORGANIZACAO,
        blogPost: POSTS.map((p) => ({ '@type': 'BlogPosting', headline: p.titulo, url: `${SITE}/blog/${p.slug}`, datePublished: p.publicadoEm })),
      },
      migalhas([
        { nome: 'Início', caminho: '/' },
        { nome: 'Blog', caminho: '/blog' },
      ]),
    ],
  }
}

export function metaDosRecursos(): Meta {
  return {
    titulo: 'Materiais grátis para restaurante | Tá no Caixa',
    descricao: 'Planilha de CMV, guia de lucro por pedido do iFood e checklists de fechamento de caixa e de escolha de sistema. Baixe grátis.',
    caminho: '/recursos',
    imagem: `${SITE}/blog/blog.png`,
    tipo: 'website',
    jsonLd: [
      migalhas([
        { nome: 'Início', caminho: '/' },
        { nome: 'Materiais grátis', caminho: '/recursos' },
      ]),
    ],
  }
}

export function metaDoRecurso(r: Recurso): Meta {
  return {
    titulo: `${r.titulo} (grátis)`.slice(0, 60),
    descricao: r.resumo,
    caminho: `/recursos/${r.id}`,
    imagem: `${SITE}/blog/blog.png`,
    tipo: 'website',
    jsonLd: [
      migalhas([
        { nome: 'Início', caminho: '/' },
        { nome: 'Materiais grátis', caminho: '/recursos' },
        { nome: r.titulo, caminho: `/recursos/${r.id}` },
      ]),
    ],
  }
}

/** "21 de outubro de 2026" para exibir, ISO para o schema. */
export const dataLonga = formatarData

/** Tags de <head> para um `Meta`: usadas no pré-render e no cliente. */
export function tagsDoHead(m: Meta): string {
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const url = `${SITE}${m.caminho}`
  const linhas = [
    `<title>${e(m.titulo)}</title>`,
    `<meta name="description" content="${e(m.descricao)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:locale" content="pt_BR" />`,
    `<meta property="og:site_name" content="${MARCA}" />`,
    `<meta property="og:type" content="${m.tipo}" />`,
    `<meta property="og:title" content="${e(m.titulo)}" />`,
    `<meta property="og:description" content="${e(m.descricao)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${m.imagem}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${e(m.titulo)}" />`,
    `<meta name="twitter:description" content="${e(m.descricao)}" />`,
    `<meta name="twitter:image" content="${m.imagem}" />`,
  ]
  if (m.publicado) linhas.push(`<meta property="article:published_time" content="${m.publicado}" />`)
  if (m.atualizado) linhas.push(`<meta property="article:modified_time" content="${m.atualizado}" />`)
  for (const ld of m.jsonLd) linhas.push(`<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`)
  return linhas.join('\n    ')
}
