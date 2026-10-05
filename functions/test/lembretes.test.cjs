const test = require('node:test')
const assert = require('node:assert/strict')
const { LEMBRETES, urlDaImagem } = require('../lib/lembretesCatalogo.js')
const { montarLembrete, preencher, varsDeVencimentos } = require('../lib/lembretesTexto.js')

test('catálogo: 17 lembretes, cada um com imagem, token único e legenda', () => {
  const ids = Object.keys(LEMBRETES)
  assert.equal(ids.length, 17)
  const tokens = new Set(ids.map((i) => LEMBRETES[i].token))
  assert.equal(tokens.size, 17)
  for (const i of ids) {
    assert.match(LEMBRETES[i].arquivo, /^\d\d-[a-z-]+\.png$/)
    assert.match(LEMBRETES[i].token, /^[0-9a-f-]{36}$/)
    assert.ok(LEMBRETES[i].corpo.length > 40)
    assert.ok(!LEMBRETES[i].corpo.includes('{ontem') && !LEMBRETES[i].corpo.includes('{vence'))
  }
})

test('URL da imagem aponta para o bucket do Storage com token', () => {
  const u = urlDaImagem(LEMBRETES.vendas_do_dia)
  assert.match(u, /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/tanocaixa\.firebasestorage\.app\/o\/lembretes-whatsapp%2F01-vendas-do-dia\.png\?alt=media&token=[0-9a-f-]{36}$/)
})

test('legenda preenche as variáveis e mantém o formato', () => {
  const r = montarLembrete('vendas_do_dia', { restaurante: 'Zaatar' })
  assert.equal(r.legenda, '💵 *Hoje ainda não há vendas lançadas*\nQuando fizer sentido, abra o Caixa e registre o total do dia. Com isso o fluxo de caixa fica certo e o resumo de amanhã sai fiel.\n_Zaatar_')
  assert.equal(r.arquivo, '01-vendas-do-dia.png')
})

test('variável faltando é erro (nunca manda {valor} cru)', () => {
  assert.throws(() => montarLembrete('vendas_do_dia', {}), /\{restaurante\}/)
  assert.throws(() => preencher('oi {x}', { x: '' }), /\{x\}/)
})

test('variantes usam a mesma imagem; cadastro e assinatura não levam restaurante', () => {
  const normal = montarLembrete('ponto_equilibrio', { falta: 'R$ 1,00', dias: 3, media: 'R$ 1,00', restaurante: 'Z' })
  const passou = montarLembrete('ponto_equilibrio', { restaurante: 'Z' }, 'passou')
  assert.equal(normal.imagemUrl, passou.imagemUrl)
  assert.match(passou.legenda, /já passou do ponto de equilíbrio/)
  assert.throws(() => montarLembrete('ponto_equilibrio', { restaurante: 'Z' }, 'nao-existe'), /não existe/)
  assert.doesNotMatch(montarLembrete('terminar_cadastro', { passo: 4 }).legenda, /_/)
  assert.match(montarLembrete('assinatura', { data: '12/10' }, 'pagamento').legenda, /Atualize o cartão/)
})

test('vencimentos: título no singular/plural e uma linha por item', () => {
  const um = varsDeVencimentos([{ fornecedor: 'Boa Safra', valor: 'R$ 860,00', situacao: 'vence amanhã (15/10)' }], 'Z')
  assert.equal(um.titulo, '1 vencimento pede atenção')
  const dois = varsDeVencimentos([{ fornecedor: 'A', valor: 'R$ 1,00', situacao: 'hoje' }, { fornecedor: 'B', valor: 'R$ 2,00', situacao: 'vencido há 2 dias' }], 'Z')
  assert.equal(dois.titulo, '2 vencimentos pedem atenção')
  const m = montarLembrete('vencimentos', dois).legenda
  assert.match(m, /^⏰ \*2 vencimentos pedem atenção\*\n• A: R\$ 1,00, hoje\n• B: R\$ 2,00, vencido há 2 dias\nAo pagar/)
})
