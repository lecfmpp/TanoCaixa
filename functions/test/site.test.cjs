// Site do cliente: status "aberto agora", rotas por subdomínio, validações e render.
const test = require('node:test')
const assert = require('node:assert/strict')
const m = require('../lib/site/modelo.js')
const r = require('../lib/site/render.js')

const loja = (o = {}) => ({ ...m.novaLoja('Tijuca', 'Rua Conde de Bonfim, 412'), ...o })

test('status: aberto dentro do horário, fechado fora', () => {
  const l = loja({ abre: '11:30', fecha: '23:00' })
  assert.equal(m.textosStatus([l], 2, 12 * 60).lojas[0].aberta, true)
  assert.equal(m.textosStatus([l], 2, 10 * 60).lojas[0].texto, 'Fechado · abre às 11h30')
  assert.equal(m.textosStatus([l], 2, 23 * 60 + 5).lojas[0].texto, 'Fechado · abre amanhã às 11h30')
})

test('status: expediente que passa da meia-noite', () => {
  const l = loja({ abre: '18:00', fecha: '02:00', dias: [5] }) // só sexta
  assert.equal(m.textosStatus([l], 5, 23 * 60).lojas[0].aberta, true)
  assert.equal(m.textosStatus([l], 6, 60).lojas[0].aberta, true) // sábado 1h, turno de sexta
  assert.equal(m.textosStatus([l], 6, 3 * 60).lojas[0].aberta, false)
  assert.equal(m.textosStatus([l], 4, 23 * 60).lojas[0].aberta, false) // quinta não abre
})

test('status geral com várias lojas', () => {
  const s = m.textosStatus([loja(), loja({ abre: '18:00' }), loja()], 1, 12 * 60)
  assert.equal(s.longo, 'Aberto agora · 2 de 3 lojas')
  assert.equal(s.resumo, '3 lojas · 2 abertas agora')
})

test('rota: subdomínio e modo caminho', () => {
  assert.deepEqual(m.resolverRota('faustoburger.tanocaixa.com.br', '/links'), { sub: 'faustoburger', pagina: 'links', base: '', dominio: 'faustoburger.tanocaixa.com.br' })
  assert.equal(m.resolverRota('a.b.tanocaixa.com.br', '/'), null)
  assert.equal(m.resolverRota('sitecliente-xyz.a.run.app', '/fausto/links').sub, 'fausto')
  assert.equal(m.resolverRota('sitecliente-xyz.a.run.app', '/fausto/links').base, '/fausto')
})

test('validações de subdomínio e links', () => {
  assert.equal(m.erroSubdominio('faustoburger'), null)
  assert.ok(m.erroSubdominio('www'))
  assert.ok(m.erroSubdominio('-abc'))
  assert.ok(m.erroSubdominio('ab'))
  assert.equal(m.erroLinkApp('ifood', 'https://www.ifood.com.br/delivery/rio/loja'), null)
  assert.ok(m.erroLinkApp('uber', 'https://www.ifood.com.br/x'))
  assert.ok(m.erroLinkApp('n99', 'javascript:alert(1)'))
  assert.equal(m.erroWhatsapp('5521990000001'), null)
})

test('textoDias', () => {
  assert.equal(m.textoDias([0, 1, 2, 3, 4, 5, 6]), 'Todos os dias')
  assert.equal(m.textoDias([1, 2, 3, 4, 5]), 'Seg a sex')
  assert.equal(m.textoDias([0, 3, 4, 5, 6]), 'Qua a dom')
  assert.equal(m.textoDias([1, 3]), 'Seg, qua')
})

function dados(extra = {}) {
  const config = {
    ...m.configPadrao('Fausto <Burger>', 'Tijuca'),
    slogan: 'Smash na chapa',
    promo: { titulo: 'Terça do Smash com nome longo', texto: '2 por R$ 49,90', regra: 'Só hoje', imagemUrl: '', dia: '', fixa: true },
    ...extra,
  }
  config.lojas[0].apps = { ifood: 'https://www.ifood.com.br/x', uber: 'javascript:alert(1)' }
  config.lojas[0].whatsapp = '5521990000001'
  const itens = m.montarItens(
    [
      { id: 'a', nome: 'Clássico', categoria: 'Burgers', preco: 32.9, ativo: true },
      { id: 'b', nome: 'Fritas', categoria: 'Acompanhamentos', preco: 14.9, ativo: true },
      { id: 'c', nome: 'Inativo', categoria: 'Burgers', preco: 10, ativo: false },
    ],
    { a: { destaque: true } },
  )
  return { config, itens }
}

test('render: escapa texto, ignora link perigoso, limita título da promo', () => {
  const html = r.renderSite(dados(), { dominio: 'fausto.tanocaixa.com.br' })
  assert.ok(html.includes('Fausto &lt;Burger&gt;'))
  assert.ok(!html.includes('<Burger>'))
  assert.ok(!html.includes('javascript:alert'))
  assert.ok(html.includes('Terça do Smash com'))
  assert.ok(!html.includes('Terça do Smash com nome'))
  assert.ok(html.includes('R$\u00A032,90'))
  assert.ok(!html.includes('Inativo'))
  assert.ok(html.includes('2 por R$&nbsp;49,90'))
  assert.ok(html.includes('class="stt '))
  assert.ok(html.includes('application/ld+json'))
  assert.ok(html.includes('https://wa.me/5521990000001'))
})

test('render: seção oculta some; promo do dia some no dia seguinte', () => {
  const d = dados()
  d.config.secoes = d.config.secoes.map((s) => (s.chave === 'cardapio' ? { ...s, visivel: false } : s))
  d.config.promo = { ...d.config.promo, fixa: false, dia: '2020-01-01' }
  const html = r.renderSite(d, { dominio: 'x.tanocaixa.com.br' })
  assert.ok(!html.includes('id="cardapio"'))
  assert.ok(!html.includes('id="promo"'))
})

test('render: sem taxa e tempo, não mostra rótulos vazios', () => {
  const d = dados()
  d.config.lojas[0].taxa = ''
  d.config.lojas[0].tempoEntrega = ''
  const html = r.renderSite(d, { dominio: 'x.tanocaixa.com.br' })
  assert.ok(!html.includes('taxa a partir de'))
  assert.ok(!html.includes('entrega  ·'))
  assert.ok(!html.includes('de entrega'))
})

test('render: aba de detalhes leva itens e avaliações no JSON', () => {
  const d = dados()
  d.itens = m.montarItens([{ id: 'a', nome: 'Clássico', categoria: 'Burgers', preco: 32.9, ativo: true }], {
    a: { avaliacoes: [{ nome: 'Ana', nota: 9, texto: 'Ótimo </script> burger' }, { nome: 'x', nota: 3, texto: '' }] },
  })
  assert.equal(d.itens[0].avaliacoes.length, 1)
  assert.equal(d.itens[0].avaliacoes[0].nota, 5)
  const html = r.renderSite(d, { dominio: 'x.tanocaixa.com.br' })
  assert.ok(html.includes('id="folha"'))
  assert.ok(html.includes('data-item="a"'))
  assert.ok(!html.includes('Ótimo </script>'))
})

test('render: página de links', () => {
  const html = r.renderLinks(dados(), { dominio: 'fausto.tanocaixa.com.br' })
  assert.ok(html.includes('Pedir no iFood'))
  assert.ok(html.includes('selo-app'))
  assert.ok(!html.includes('Pedir no Uber Eats'))
  assert.ok(html.includes('/#cardapio'))
})

test('o JS embutido é válido', () => {
  const html = r.renderSite(dados(), { dominio: 'fausto.tanocaixa.com.br' })
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1])
  for (const s of scripts) assert.doesNotThrow(() => new Function(s))
})
