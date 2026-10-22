// Gate de qualidade dos posts do blog (ver blog/FRAMEWORK.md §3–§6).
// Uso:  npm run blog:gate            (todos os posts)
//       npm run blog:gate -- taxa-do-ifood  (um slug)
// Sai com código 1 se houver FALHAS. Avisos não derrubam o gate.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = path.join(process.cwd(), 'src', 'blog', 'posts')
const alvo = process.argv[2]
const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith('.post.ts') && (!alvo || f === `${alvo}.post.ts`))
if (arquivos.length === 0) {
  console.error('Nenhum post encontrado.')
  process.exit(1)
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{1F000}-\u{1F2FF}]/u
const SEM_MARCA = (t) => t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
const BLOCOS_CAIXA = new Set(['tldr', 'numeros', 'tabela', 'comparacao', 'passos', 'erros', 'checklist', 'nota', 'citacao', 'exemplo', 'grafico', 'widget', 'print', 'cartao-link', 'cta', 'faq'])

function textosDoPost(p) {
  const out = [p.titulo, p.resumo]
  for (const b of p.blocos) {
    switch (b.t) {
      case 'h2': case 'h3': case 'p': case 'nota': case 'citacao': out.push(b.texto); break
      case 'ul': case 'ol': case 'tldr': case 'checklist': out.push(...b.itens); break
      case 'passos': case 'erros': for (const i of b.itens) out.push(i.titulo, i.texto); break
      case 'faq': for (const i of b.itens) out.push(i.p, i.r); break
      case 'exemplo': out.push(b.titulo, ...b.linhas.map((l) => l.rotulo), b.conclusao ?? ''); break
      case 'tabela': out.push(...b.cabecalho, ...b.linhas.flat(), b.legenda ?? ''); break
      case 'comparacao': for (const l of b.linhas) out.push(l.dim, l.a, l.b); break
      case 'numeros': for (const i of b.itens) out.push(i.valor, i.rotulo); break
      case 'print': out.push(b.alt, b.legenda); break
    }
  }
  return out.filter(Boolean)
}

const slugs = new Set()
let falhasTotais = 0
const linhasResumo = []

for (const arq of arquivos) {
  const p = (await import(pathToFileURL(path.join(pasta, arq)).href)).default
  const falhas = []
  const avisos = []
  const f = (c, m) => { if (!c) falhas.push(m) }
  const a = (c, m) => { if (!c) avisos.push(m) }

  const todos = textosDoPost(p)
  const texto = todos.map(SEM_MARCA).join(' ')
  const palavras = texto.split(/\s+/).filter(Boolean).length
  const h2 = p.blocos.filter((b) => b.t === 'h2')
  const faq = p.blocos.find((b) => b.t === 'faq')
  const ctasMeio = p.blocos.filter((b) => b.t === 'cta')
  const graficos = p.blocos.filter((b) => b.t === 'grafico').length
  const widgets = p.blocos.filter((b) => b.t === 'widget').length
  const tabelas = p.blocos.filter((b) => b.t === 'tabela' || b.t === 'comparacao').length

  // metadados
  f(arq === `${p.slug}.post.ts`, `slug "${p.slug}" diferente do nome do arquivo`)
  f(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug), 'slug precisa ser kebab-case sem acento')
  f(!slugs.has(p.slug), 'slug repetido'); slugs.add(p.slug)
  f(p.tituloMeta.length <= 60, `tituloMeta com ${p.tituloMeta.length} caracteres (máx. 60)`)
  f(p.descricao.length <= 160, `descricao com ${p.descricao.length} caracteres (máx. 160)`)
  a(p.descricao.length >= 110, `descricao curta (${p.descricao.length}); use 110–160`)
  f(p.titulo.length <= 70, `titulo com ${p.titulo.length} caracteres (máx. 70)`)
  f(p.resumo.length <= 220, `resumo com ${p.resumo.length} caracteres (máx. 220)`)
  f(/^\d{4}-\d{2}-\d{2}$/.test(p.publicadoEm) && /^\d{4}-\d{2}-\d{2}$/.test(p.atualizadoEm), 'datas precisam ser AAAA-MM-DD')
  f(p.secundarias.length >= 3, 'informe ao menos 3 palavras-chave secundárias')
  f(p.tituloMeta.toLowerCase().includes(p.palavraChave.split(' ')[0]), 'tituloMeta deveria conter a palavra-chave principal')
  f(todos.every((t) => !EMOJI.test(t)), 'emoji encontrado')

  // abertura
  const primeiro = p.blocos[0]
  f(primeiro?.t === 'tldr', 'o primeiro bloco precisa ser tldr')
  if (primeiro?.t === 'tldr') {
    f(primeiro.itens.length >= 4 && primeiro.itens.length <= 5, `tldr com ${primeiro.itens.length} itens (use 4 a 5)`)
    f(primeiro.itens.every((i) => /^\*\*[^*]+:\*\*/.test(i)), 'cada item do tldr começa com **lead-in:**')
  }

  // títulos
  f(h2.length >= 5, `só ${h2.length} H2 (mín. 5)`)
  const perguntas = h2.filter((b) => b.texto.trim().endsWith('?')).length
  f(h2.length === 0 || perguntas / h2.length >= 0.5, `só ${perguntas} de ${h2.length} H2 são perguntas (mín. 50%)`)
  f(h2.every((b) => b.texto !== b.texto.toUpperCase() || b.texto.length < 4), 'H2 em CAIXA ALTA')
  f(h2.every((b) => !/^[A-ZÀ-Ú][a-zà-ú]+( [A-ZÀ-Ú][a-zà-ú]+){3,}/.test(b.texto)), 'H2 em Title Case (use sentence case)')

  // faq
  f(!!faq, 'falta o bloco faq')
  if (faq) { f(faq.itens.length >= 4 && faq.itens.length <= 6, `faq com ${faq.itens.length} perguntas (use 4 a 6)`); f(faq.itens.every((i) => i.p.trim().endsWith('?')), 'toda pergunta do faq termina com ?') }

  // CTAs
  f(!!p.cta?.principal && !!p.cta?.secundario, 'cta.principal e cta.secundario são obrigatórios')
  f(ctasMeio.length === 1, `precisa de exatamente 1 bloco cta no meio (tem ${ctasMeio.length})`)
  if (p.cta?.principal && p.cta?.secundario) f(p.cta.principal.tipo !== p.cta.secundario.tipo, 'principal e secundário devem ser de tipos diferentes (recurso × teste)')
  const variante = (c) => (c.tipo === 'teste' ? `teste:${c.variante}` : `recurso:${c.id}`)
  if (ctasMeio[0] && p.cta?.principal) {
    const meio = variante(ctasMeio[0].cta)
    f(meio !== variante(p.cta.principal) && meio !== variante(p.cta.secundario ?? p.cta.principal), 'o CTA do meio repete o do fim do post')
  }

  // links internos
  const linksInternos = (todos.join(' ').match(/\]\(\/blog\/[a-z0-9-]+\)/g) ?? []).length + p.blocos.filter((b) => b.t === 'cartao-link').length
  f(linksInternos >= 2, `só ${linksInternos} link(s) interno(s) (mín. 2)`)
  f(p.blocos.some((b) => b.t === 'cartao-link'), 'falta um cartao-link')
  f(p.relacionados.length >= 2, 'relacionados precisa de 2+ slugs')
  if (p.tipo !== 'pilar') {
    f(p.relacionados[0] === 'sistema-para-restaurante', 'relacionados[0] deve ser o pilar sistema-para-restaurante')
    f(/\]\(\/blog\/sistema-para-restaurante\)/.test(todos.join(' ')) || p.blocos.some((b) => b.t === 'cartao-link' && b.slug === 'sistema-para-restaurante'), 'linke o pilar no texto: [sistema para restaurante](/blog/sistema-para-restaurante)')
  }

  // elementos
  f(graficos >= 1, 'falta ao menos 1 gráfico')
  f(tabelas >= 1, 'falta ao menos 1 tabela ou comparação')
  if (p.tipo === 'cluster' || p.tipo === 'nicho') f(widgets >= 1, 'clusters e nichos precisam de 1 widget (calculadora)')
  const sequencia = p.blocos.map((b) => (BLOCOS_CAIXA.has(b.t) ? 1 : 0))
  let seguidos = 0
  let maxSeguidos = 0
  for (const s of sequencia) { seguidos = s ? seguidos + 1 : 0; maxSeguidos = Math.max(maxSeguidos, seguidos) }
  f(maxSeguidos <= 2, `${maxSeguidos} blocos "caixa" seguidos; intercale com parágrafos`)
  const secoes = []
  let atual = null
  for (const b of p.blocos) { if (b.t === 'h2') { atual = { caixas: 0 }; secoes.push(atual) } else if (atual && BLOCOS_CAIXA.has(b.t)) atual.caixas++ }
  f(secoes.filter((s) => s.caixas === 0).length >= 2, 'pelo menos 2 seções devem ficar só em prosa')

  // tamanho
  const [min, max] = p.tipo === 'pilar' ? [1800, 3200] : [1000, 2400]
  a(palavras >= min, `${palavras} palavras (alvo ${min}+ para ${p.tipo})`)
  a(palavras <= max, `${palavras} palavras (passou de ${max})`)

  // legibilidade
  let longas = 0
  let frases = 0
  for (const b of p.blocos.filter((x) => x.t === 'p')) {
    const fs_ = SEM_MARCA(b.texto).split(/(?<=[.!?])\s+/)
    frases += fs_.length
    longas += fs_.filter((s) => s.split(/\s+/).length > 32).length
    if (fs_.length > 5) avisos.push(`parágrafo com ${fs_.length} frases: "${SEM_MARCA(b.texto).slice(0, 50)}…"`)
  }
  a(frases === 0 || longas / frases < 0.12, `${longas} de ${frases} frases passam de 32 palavras`)

  // fontes e honestidade
  const cita = /\b(ifood|saipos|goomer|anota ai|consumer|brendi|grandchef|olaclick|cardápio web)\b/i.test(texto) && /R\$\s?\d/.test(texto)
  f(!cita || (p.fontes?.length ?? 0) >= 1, 'cita app/concorrente com valores: inclua `fontes`')
  const integracao = /integra(ção|r|do)[^.]{0,60}(ifood|apps?)/i.test(texto) && !/em breve|chegando|não\s+(é|conecta|precisa)/i.test(texto)
  a(!integracao, 'menciona integração com iFood/apps: lembre que é "em breve"')
  a(!/\bPDV\b[^.]{0,40}(do Tá no Caixa|temos|incluso)/i.test(texto), 'cuidado: o PDV do Tá no Caixa está "em breve"')

  falhasTotais += falhas.length
  linhasResumo.push([p.slug, p.tipo, palavras, graficos, widgets, tabelas, falhas.length, avisos.length])
  if (falhas.length || avisos.length) {
    console.log(`\n${p.slug}`)
    for (const m of falhas) console.log(`  FALHA  ${m}`)
    for (const m of avisos) console.log(`  aviso  ${m}`)
  }
}

console.log('\nslug'.padEnd(52) + 'tipo'.padEnd(13) + 'palavras grafs widgets tabelas falhas avisos')
for (const [s, t, w, g, wd, tb, fa, av] of linhasResumo) console.log(s.padEnd(51) + ' ' + t.padEnd(12) + String(w).padStart(7) + String(g).padStart(6) + String(wd).padStart(8) + String(tb).padStart(8) + String(fa).padStart(7) + String(av).padStart(7))
console.log(falhasTotais === 0 ? '\nGate OK.' : `\nGate reprovado: ${falhasTotais} falha(s).`)
process.exit(falhasTotais === 0 ? 0 : 1)
