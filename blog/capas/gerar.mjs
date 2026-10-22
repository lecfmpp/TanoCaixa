// Gera as capas 1200×630 do blog (public/blog/<slug>.png e blog.png).
// Uso: node blog/capas/gerar.mjs [slug]
// Precisa do Chrome do Playwright (PLAYWRIGHT_CORE aponta para um node_modules com playwright-core).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(process.env.PLAYWRIGHT_CORE ?? '/Users/clawdio/openclaw-app/node_modules/')
const { chromium } = require('playwright-core')
const chrome = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'

const raiz = process.cwd()
const pasta = path.join(raiz, 'src', 'blog', 'posts')
const saida = path.join(raiz, 'public', 'blog')
fs.mkdirSync(saida, { recursive: true })
const alvo = process.argv[2]

const simbolo = fs.readFileSync(path.join(raiz, 'public/logo/tnc-simbolo-principal.svg'), 'utf8')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
const fmt = (v) => (v >= 1000 ? 'R$ ' + v.toLocaleString('pt-BR') : String(v).replace('.', ','))

function diagrama(c) {
  const it = c.itens
  const max = Math.max(...it.map((i) => i.valor ?? 1), 1)
  if (c.tipo === 'bars') {
    return `<div class="bars">${it.map((i, n) => `<div class="b"><div class="bar" style="height:${Math.max(18, ((i.valor ?? 1) / max) * 100)}%;background:${n === it.length - 1 ? '#efab5c' : '#fbfaf2'}"></div><span>${esc(i.rotulo)}</span>${i.valor != null ? `<em>${fmt(i.valor)}</em>` : ''}</div>`).join('')}</div>`
  }
  if (c.tipo === 'versus') {
    return `<div class="vs">${it.slice(0, 2).map((i, n) => `<div class="card ${n ? 'sol' : ''}"><span>${esc(i.rotulo)}</span>${i.valor != null ? `<b>${fmt(i.valor)}</b>` : ''}</div>`).join('<i>×</i>')}</div>`
  }
  if (c.tipo === 'steps') {
    return `<div class="steps">${it.map((i, n) => `<div class="card ${n === it.length - 1 ? 'sol' : ''}"><span>${esc(i.rotulo)}</span>${i.valor != null ? `<b>${fmt(i.valor)}</b>` : ''}</div>`).join('<i>›</i>')}</div>`
  }
  // spread: lista de linhas com barras proporcionais
  return `<div class="spread">${it.map((i, n) => `<div class="l"><span>${esc(i.rotulo)}</span><div class="t"><div style="width:${Math.max(6, ((i.valor ?? 1) / max) * 100)}%;background:${n === it.length - 1 ? '#efab5c' : '#fbfaf2'}"></div></div>${i.valor != null ? `<b>${fmt(i.valor)}</b>` : ''}</div>`).join('')}</div>`
}

function html({ titulo, etiqueta, capa }) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=JetBrains+Mono:wght@500;700&display=swap"><style>
*{box-sizing:border-box;margin:0}body{width:1200px;height:630px;background:#2e5f73;color:#f7f5ea;font-family:Archivo,sans-serif;padding:56px 64px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;position:relative}
body:before{content:"";position:absolute;right:-160px;top:-160px;width:520px;height:520px;border-radius:50%;background:#1e4354}
.top,.mid,.bot{position:relative}.top{display:flex;align-items:center;gap:14px;font-weight:800;font-size:28px}.top svg{width:44px;height:44px}
.et{font:700 18px 'JetBrains Mono',monospace;letter-spacing:.12em;color:#efab5c;margin-bottom:18px}
h1{font-weight:800;font-size:${titulo.length > 52 ? 54 : 62}px;line-height:1.05;letter-spacing:-.02em;max-width:1000px}
.bot{min-height:150px;display:flex;align-items:flex-end}
.card{background:#1e4354;border-radius:18px;padding:18px 24px;min-width:170px}.card.sol{background:#efab5c;color:#16303a}.card span{display:block;font:600 16px 'JetBrains Mono',monospace;opacity:.85}.card b{display:block;font-size:34px;margin-top:6px}
.steps,.vs{display:flex;align-items:center;gap:14px}.steps i,.vs i{font-style:normal;font-size:34px;color:#efab5c}
.bars{display:flex;gap:26px;align-items:flex-end;height:150px}.b{display:flex;flex-direction:column;justify-content:flex-end;height:100%;width:130px;gap:4px}.bar{border-radius:8px 8px 0 0}.b span{font:600 14px 'JetBrains Mono',monospace}.b em{font-style:normal;font-weight:800;font-size:18px}
.spread{width:100%;display:flex;flex-direction:column;gap:12px}.l{display:grid;grid-template-columns:230px 1fr 130px;align-items:center;gap:16px}.l span{font:600 16px 'JetBrains Mono',monospace}.t{height:14px;background:#1e4354;border-radius:8px}.t div{height:100%;border-radius:8px}.l b{text-align:right;font-size:20px}
</style></head><body><div class="top">${simbolo}<span>Tá no Caixa</span></div><div class="mid"><div class="et">${esc(etiqueta)}</div><h1>${esc(titulo)}</h1></div><div class="bot">${capa ? diagrama(capa) : ''}</div></body></html>`
}

const itens = []
for (const f of fs.readdirSync(pasta).filter((x) => x.endsWith('.post.ts') && (!alvo || x === `${alvo}.post.ts`))) {
  const p = (await import(pathToFileURL(path.join(pasta, f)).href)).default
  itens.push({ nome: p.slug, titulo: p.titulo, etiqueta: p.capa.etiqueta, capa: p.capa })
}
if (!alvo) itens.push({ nome: 'blog', titulo: 'Blog: gestão financeira para restaurante e delivery', etiqueta: 'GUIAS · CALCULADORAS · COMPARATIVOS', capa: { tipo: 'steps', etiqueta: '', itens: [{ rotulo: 'Entrou' }, { rotulo: 'Saiu' }, { rotulo: 'Sobrou' }] } })

const browser = await chromium.launch({ executablePath: chrome })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const i of itens) {
  await page.setContent(html(i), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path.join(saida, `${i.nome}.png`) })
  console.log('capa', i.nome)
}
await browser.close()
