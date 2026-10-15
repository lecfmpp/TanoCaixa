import test from 'node:test'
import assert from 'node:assert/strict'
import { DIAS_DE_TESTE, PRECO_CENTAVOS, diasDeTesteRestantes, estadoDaAssinatura, statusDoStripe, urlSegura } from './assinatura'

test('preço do plano único: R$ 149,00 e 14 dias de teste', () => {
  assert.equal(PRECO_CENTAVOS, 14900)
  assert.equal(DIAS_DE_TESTE, 14)
})

test('status do Stripe vira o nosso; o que não conhecemos NÃO libera nada', () => {
  assert.equal(statusDoStripe('active'), 'ativa')
  assert.equal(statusDoStripe('trialing'), 'ativa')
  assert.equal(statusDoStripe('past_due'), 'pagamento_falhou')
  assert.equal(statusDoStripe('unpaid'), 'pagamento_falhou')
  assert.equal(statusDoStripe('canceled'), 'cancelada')
  assert.equal(statusDoStripe('incomplete_expired'), 'cancelada')
  assert.equal(statusDoStripe('incomplete'), 'pendente')
  assert.equal(statusDoStripe('paused'), 'pendente')
  assert.equal(statusDoStripe(undefined), 'pendente')
  assert.equal(statusDoStripe('algo-novo'), 'pendente')
})

test('teste de 14 dias contado da criação', () => {
  const c = '2026-10-01T12:00:00.000Z'
  assert.equal(diasDeTesteRestantes(c, '2026-10-01T13:00:00.000Z'), 14)
  assert.equal(diasDeTesteRestantes(c, '2026-10-08T12:00:00.000Z'), 7)
  assert.equal(diasDeTesteRestantes(c, '2026-10-14T12:00:00.000Z'), 1)
  assert.equal(diasDeTesteRestantes(c, '2026-10-15T12:00:00.000Z'), 0)
  assert.equal(diasDeTesteRestantes(c, '2027-01-01T00:00:00.000Z'), 0)
})

test('estado: nunca assinou → teste ou teste encerrado; assinou → o que o webhook gravou', () => {
  const criadoEm = '2026-10-01T12:00:00.000Z'
  assert.deepEqual(estadoDaAssinatura({ criadoEm, agora: '2026-10-05T12:00:00.000Z' }), { situacao: 'em_teste', diasRestantes: 10, temPortal: false, precoCentavos: 14900 })
  assert.equal(estadoDaAssinatura({ criadoEm, agora: '2026-11-05T12:00:00.000Z' }).situacao, 'teste_encerrado')
  const ativa = estadoDaAssinatura({ status: 'ativa', customerId: 'cus_1', criadoEm, agora: '2026-11-05T12:00:00.000Z' })
  assert.equal(ativa.situacao, 'ativa')
  assert.equal(ativa.temPortal, true)
  assert.equal(estadoDaAssinatura({ status: 'pagamento_falhou', customerId: 'cus_1', criadoEm, agora: '2026-10-02T12:00:00.000Z' }).situacao, 'pagamento_falhou')
})

test('URLs de retorno: só o nosso site; qualquer outra coisa cai no padrão', () => {
  const padrao = 'https://tanocaixa.com/painel/assinatura'
  assert.equal(urlSegura('https://tanocaixa.com/painel?assinatura=ok', padrao), 'https://tanocaixa.com/painel?assinatura=ok')
  assert.equal(urlSegura('https://tanocaixa.web.app/painel/assinatura', padrao), 'https://tanocaixa.web.app/painel/assinatura')
  assert.equal(urlSegura('https://evil.com/phishing', padrao), padrao)
  assert.equal(urlSegura('https://tanocaixa.com.evil.com/x', padrao), padrao)
  assert.equal(urlSegura('javascript:alert(1)', padrao), padrao)
  assert.equal(urlSegura('não é url', padrao), padrao)
  assert.equal(urlSegura(undefined, padrao), padrao)
})
