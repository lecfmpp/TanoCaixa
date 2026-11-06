import test from 'node:test'
import assert from 'node:assert/strict'
import { CATALOGO, htmlDoTemplate, renderizar, sobrouVariavel, variaveisNoTexto } from './catalogo'
import { conferirDescadastro, lerPreferencias, linkDescadastro, linkUmClique } from './preferencias'
import { paraResend } from './enviarUmaVez'
import { passoInatividade, proximoPasso, SEQUENCIAS } from './sequencias'
import { semanasDoRecado, variaveisRecado, variaveisRecadoRede } from './recado'
import { dentroDoLimite, linkNoNossoDominio } from './acesso'
import { resumoDoConvite } from './convitesEmail'

/* ------------------------------ catálogo ------------------------------ */

test('catálogo: ids únicos, todo e-mail renderiza com os exemplos sem sobrar variável', () => {
  const ids = CATALOGO.map((d) => d.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const d of CATALOGO) {
    const faltam = variaveisNoTexto(d).filter((k) => !(k in d.variaveis))
    assert.deepEqual(faltam, [], `${d.id}: sem exemplo para ${faltam}`)
    const e = renderizar(d.id, d.variaveis, d.topico ? { descadastro: 'https://tanocaixa.com/emails?x' } : {})
    assert.ok(!sobrouVariavel(e.assunto + e.html + e.text), d.id)
    assert.ok(e.html.includes('apple-touch-icon.png'), `${d.id}: sem logo`)
    assert.equal(e.template.id, `tnc-${d.id}`)
  }
})

test('catálogo: e-mail de uso/novidades tem descadastro; transacional não', () => {
  for (const d of CATALOGO) {
    const e = renderizar(d.id, d.variaveis, { descadastro: 'https://tanocaixa.com/emails?x' })
    if (d.tipo === 'transacional') {
      assert.equal(d.topico, undefined, d.id)
    } else {
      assert.ok(d.topico, d.id)
      assert.match(e.html, /Não quero mais receber/, d.id)
      assert.equal(e.template.variables.LINK_DESCADASTRO, 'https://tanocaixa.com/emails?x')
    }
  }
})

test('catálogo: toda sequência aponta pra um e-mail que existe', () => {
  const ids = new Set(CATALOGO.map((d) => d.id))
  for (const passos of Object.values(SEQUENCIAS)) for (const p of passos) assert.ok(ids.has(p.id), p.id)
})

test('caixa e cozinha: nenhum e-mail fala de lucro, faturamento ou preço', () => {
  for (const d of CATALOGO.filter((x) => /^(caixa|cozinha)-/.test(x.id))) {
    const e = renderizar(d.id, d.variaveis)
    assert.doesNotMatch(e.text, /R\$|lucro\b(?! nem)|faturamento|149/i, d.id)
  }
})

test('botões: cada um leva pra tela que promete, e os da loja levam a loja', () => {
  const destinos: Record<string, string> = {}
  for (const d of CATALOGO) {
    const e = renderizar(d.id, { ...d.variaveis, LOJA_ID: 'r1' })
    const botoes = [...e.html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].filter((m) => !/^Não quero|^tanocaixa\.com$/.test(m[2]) && !m[1].endsWith('tanocaixa.com'))
    assert.ok(botoes.length >= 1, `${d.id}: sem botão`)
    for (const [, href, texto] of botoes) {
      const url = href.replace(/&amp;/g, '&')
      destinos[`${d.id}|${texto}`] = url
      if (/^Lançar/.test(texto)) assert.match(url, /[?&]acao=(fechamento|despesa|estoque)/, `${d.id}: "${texto}" não abre o lançamento`)
      if (/equipe/i.test(texto)) assert.match(url, /\/painel\/configuracoes\/equipe\?/, `${d.id}: "${texto}"`)
      if (/^Assinar/.test(texto)) assert.match(url, /\/painel\/assinatura\?.*assinar=1/, `${d.id}`)
      if (/cartão/.test(texto)) assert.match(url, /\/painel\/assinatura\?.*portal=1/, `${d.id}`)
      if (url.includes('{{{') || url.includes('%7B')) assert.fail(`${d.id}: link com variável sobrando`)
      if (d.variaveis.LOJA_ID && url.includes('/painel') && !url.includes('/painel/rede') && !/[?&]loja=/.test(url) && !url.includes('assinatura')) assert.fail(`${d.id}: "${texto}" não leva a loja`)
    }
  }
  assert.match(destinos['cozinha-d8|Perguntar ao estoque'], /\/painel\/estoque\?.*#perguntar$/)
  assert.match(destinos['franq-d8|Comparar as lojas'], /\/painel\/rede\?.*#lojas$/)
  assert.match(destinos['dono-d3|Lançar uma despesa'], /\/painel\/despesas\?acao=despesa&.*loja=r1/)
})

test('template do Resend: variáveis no lugar e declaradas', () => {
  const t = htmlDoTemplate('teste-d7')
  assert.match(t.html, /\{\{\{DATA_FIM\}\}\}/)
  assert.match(t.html, /\{\{\{LINK\}\}\}/)
  assert.deepEqual(t.variaveis.map((v) => v.key).sort(), ['DATA_FIM', 'LINK', 'LOJA_DA', 'NOME_VIRGULA', 'USO'])
  assert.ok(htmlDoTemplate('dono-d1').variaveis.some((v) => v.key === 'LINK_DESCADASTRO'))
})

test('parágrafo com variável vazia some; valor com < > é limpo', () => {
  const e = renderizar('teste-d7', { NOME_VIRGULA: '', DATA_FIM: '25 de novembro', LOJA_DA: 'da <b>X</b>', USO: '', LINK: 'https://tanocaixa.com/x' })
  assert.doesNotMatch(e.html, /<b>X/)
  assert.doesNotMatch(e.text, /Até agora/)
  assert.equal(e.assunto, 'Seu teste do Tá no Caixa vai até 25 de novembro')
})

/* ---------------------------- preferências ---------------------------- */

test('preferências: padrão dicas e recado ligados, novidades desligado', () => {
  assert.deepEqual(lerPreferencias(undefined), { dicas: true, recado: true, novidades: false })
  assert.deepEqual(lerPreferencias({ dicas: false, novidades: true }), { dicas: false, recado: true, novidades: true })
})

test('descadastro: link assinado confere; adulterado não', () => {
  const link = new URL(linkDescadastro('u1', 'dicas', 'segredo'))
  const s = link.searchParams.get('s')!
  assert.equal(link.pathname, '/emails')
  assert.equal(conferirDescadastro('u1', 'dicas', s, 'segredo'), true)
  assert.equal(conferirDescadastro('u2', 'dicas', s, 'segredo'), false)
  assert.equal(conferirDescadastro('u1', 'recado', s, 'segredo'), false)
  assert.equal(conferirDescadastro('u1', 'dicas', s, 'outro'), false)
  assert.equal(conferirDescadastro('u1', 'qualquer', s, 'segredo'), false)
})

test('descadastro de um clique: cabeçalho aponta pra /api/descadastrar com a mesma assinatura', () => {
  const pagina = linkDescadastro('u1', 'dicas', 'segredo')
  const umClique = new URL(linkUmClique(pagina))
  assert.equal(umClique.pathname, '/api/descadastrar')
  assert.equal(umClique.search, new URL(pagina).search)
  const saida = paraResend({ chave: 'k', para: 'a@b.com', email: { assunto: 'x', html: '', text: '', template: { id: 't' } } as never, tipo: 'uso', descadastro: pagina }, false) as { headers?: Record<string, string> }
  assert.equal(saida.headers?.['List-Unsubscribe'], `<${umClique.toString()}>`)
  assert.equal(saida.headers?.['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
})

/* ----------------------------- sequências ----------------------------- */

const ctx = { diasLancados: 0, despesas: 0, membrosNaLoja: 1, lojasLancando: 0 }
const inicio = '2026-12-07T03:00:00.000Z'
const em = (dias: number) => new Date(Date.parse(inicio) + dias * 86_400_000 + 3_600_000)

test('sequência do dono: passo certo no dia, condição e janela', () => {
  assert.equal(proximoPasso('dono', { inicio, agora: em(0), estado: { enviados: [] }, ctx }), null)
  assert.equal(proximoPasso('dono', { inicio, agora: em(1), estado: { enviados: [] }, ctx }), 'dono-d1')
  assert.equal(proximoPasso('dono', { inicio, agora: em(1), estado: { enviados: [] }, ctx: { ...ctx, diasLancados: 2 } }), null)
  assert.equal(proximoPasso('dono', { inicio, agora: em(3), estado: { enviados: ['dono-d1'] }, ctx }), 'dono-d3')
  assert.equal(proximoPasso('dono', { inicio, agora: em(30), estado: { enviados: [] }, ctx }), null) // passou da janela
})

test('sequência: no máximo 1 e-mail de uso a cada 3 dias', () => {
  const estado = { enviados: ['dono-d1'], ultimoEm: em(2).toISOString() }
  assert.equal(proximoPasso('dono', { inicio, agora: em(3), estado, ctx }), null)
  assert.equal(proximoPasso('dono', { inicio, agora: em(5), estado, ctx }), 'dono-d3')
})

test('sequência do dono pausa na última semana do teste', () => {
  const testeAcabaEm = new Date(em(4).getTime()).toISOString()
  assert.equal(proximoPasso('dono', { inicio, agora: em(1), estado: { enviados: [] }, ctx, testeAcabaEm }), null)
  assert.equal(proximoPasso('caixa', { inicio, agora: em(0), estado: { enviados: [] }, ctx, testeAcabaEm }), 'caixa-d0')
})

test('franqueador: D3 se a rede tem menos de 2 lojas lançando, D8 se tem', () => {
  assert.equal(proximoPasso('franqueador', { inicio, agora: em(3), estado: { enviados: ['franq-d0'] }, ctx }), 'franq-d3')
  assert.equal(proximoPasso('franqueador', { inicio, agora: em(8), estado: { enviados: ['franq-d0', 'franq-d3'] }, ctx: { ...ctx, lojasLancando: 3 } }), 'franq-d8')
})

test('inatividade: 7 e 21 dias depois do último uso', () => {
  assert.equal(passoInatividade('2026-12-01', new Date('2026-12-08T15:00:00Z')), 'inativo-7')
  assert.equal(passoInatividade('2026-12-01', new Date('2026-12-22T15:00:00Z')), 'inativo-21')
  assert.equal(passoInatividade('2026-12-01', new Date('2026-12-04T15:00:00Z')), null)
  assert.equal(passoInatividade(undefined, new Date()), null)
})

/* ------------------------------- recado ------------------------------- */

test('recado: semana passada é segunda a domingo (Brasília)', () => {
  const { passada, anterior } = semanasDoRecado(new Date('2026-11-09T11:00:00Z')) // segunda 08h
  assert.deepEqual(passada, { de: '2026-11-02', ate: '2026-11-08' })
  assert.deepEqual(anterior, { de: '2026-10-26', ate: '2026-11-01' })
})

test('recado: números, comparação e alerta; semana vazia não gera recado', () => {
  const v = variaveisRecado({ nome: 'Loja', entrou: 10800, saiu: 4000, entrouAntes: 10000, diasComVenda: 6 }, ['2026-11-07'])!
  assert.match(v.ENTROU, /10\.800/)
  assert.equal(v.COMPARACAO, 'Entrou 8% mais que na semana anterior.')
  assert.equal(v.ALERTA, 'Ficou sem lançamento: sábado.')
  assert.equal(variaveisRecado({ nome: 'Loja', entrou: 0, saiu: 0, entrouAntes: 5, diasComVenda: 0 }), null)
  const r = variaveisRecadoRede([{ nome: 'A', entrou: 100 }, { nome: 'B', entrou: 0 }])!
  assert.equal(r.N_LOJAS, '2')
  assert.match(r.SEM_LANCAMENTO, /^B ficou sem lançamento/)
})

/* ---------------------------- acesso/convite --------------------------- */

test('acesso: link do Firebase vira link do tanocaixa.com com o mesmo código', () => {
  const l = linkNoNossoDominio('https://tanocaixa.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=ABC123&apiKey=k&lang=pt')
  assert.equal(l, 'https://tanocaixa.com/conta/acao?mode=resetPassword&oobCode=ABC123')
})

test('acesso: no máximo 3 pedidos por hora', () => {
  const agora = 10_000_000
  let p: number[] = []
  for (let i = 0; i < 3; i++) {
    const r = dentroDoLimite(p, agora + i)
    assert.equal(r.ok, true)
    p = r.pedidos
  }
  assert.equal(dentroDoLimite(p, agora + 10).ok, false)
  assert.equal(dentroDoLimite(p, agora + 3_600_001).ok, true)
})

test('convite: resumo com papel e o que a pessoa faz', () => {
  assert.deepEqual(resumoDoConvite({ restauranteNome: 'Kebab', papel: 'caixa' }), {
    loja: 'Kebab', papel: 'Caixa', oQueFaz: 'No Tá no Caixa você abre, fecha e confere o caixa da loja.',
  })
  const r = resumoDoConvite({ restauranteNome: 'A', papel: 'caixa', lojas: [{ restauranteId: 'a', restauranteNome: 'A', papel: 'caixa' }, { restauranteId: 'b', restauranteNome: 'B', papel: 'gestao' }] })
  assert.equal(r.loja, 'A e mais 1 loja')
  assert.equal(r.papel, 'Caixa / Gestão')
})
