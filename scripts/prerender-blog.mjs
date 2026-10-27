// Pré-renderiza o blog e os materiais grátis: grava HTML estático (com o texto de cada artigo, <head> e
// JSON-LD prontos) em dist/blog/<slug>/index.html e dist/recursos/<id>/index.html. Quem não executa
// JavaScript (Google em muitos casos, outros buscadores e IAs) vê a página completa.
//
// Roda depois de:  vite build  &&  vite build --ssr src/blog/entry-server.tsx --outDir dist-ssr
// Também regera o dist/sitemap.xml somando as URLs do blog às que já estão em public/sitemap.xml.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()
const dist = path.join(raiz, 'dist')
const modelo = path.join(dist, 'blog.html')
const servidor = path.join(raiz, 'dist-ssr', 'entry-server.js')

if (!fs.existsSync(modelo) || !fs.existsSync(servidor)) {
  console.error('prerender-blog: rode o build do cliente e o build SSR antes (ver package.json).')
  process.exit(1)
}

const { renderizar, caminhosPrerenderizados, urlsDoSitemap } = await import(pathToFileURL(servidor).href)
const template = fs.readFileSync(modelo, 'utf8')
if (!template.includes('<div id="root"></div>') || !template.includes('<!--head-->')) {
  console.error('prerender-blog: o blog.html compilado perdeu o <div id="root"></div> ou o <!--head-->.')
  process.exit(1)
}

let escritos = 0
for (const caminho of caminhosPrerenderizados()) {
  const { html, head } = renderizar(caminho)
  const pagina = template.replace('<!--head-->', head).replace('<div id="root"></div>', `<div id="root">${html}</div>`)
  const pasta = path.join(dist, caminho)
  fs.mkdirSync(pasta, { recursive: true })
  fs.writeFileSync(path.join(pasta, 'index.html'), pagina)
  escritos++
}
fs.rmSync(modelo) // o modelo não deve ser servido como página
console.log(`prerender-blog: ${escritos} páginas gravadas em dist/`)

// Sitemap: o que já existe em public/sitemap.xml + blog e materiais.
const SITE = 'https://tanocaixa.com'
const existente = fs.existsSync(path.join(raiz, 'public', 'sitemap.xml')) ? fs.readFileSync(path.join(raiz, 'public', 'sitemap.xml'), 'utf8') : ''
const jaTem = new Set([...existente.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))
const blocos = [...existente.matchAll(/<url>[\s\S]*?<\/url>/g)].map((m) => `  ${m[0]}`)
for (const u of urlsDoSitemap()) {
  const loc = `${SITE}${u.caminho}`
  if (jaTem.has(loc)) continue
  blocos.push(`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.prioridade}</priority>\n  </url>`)
}
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${blocos.join('\n')}\n</urlset>\n`)
console.log(`prerender-blog: sitemap.xml com ${blocos.length} URLs`)
