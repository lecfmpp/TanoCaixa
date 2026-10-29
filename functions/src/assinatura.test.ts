import test from 'node:test'
import assert from 'node:assert/strict'
import { acessoDaAssinatura, eventoEhMaisNovo, fimDoTeste, itensDaAssinatura, statusDoStripe, totalMensalCentavos, urlSegura } from './assinatura'

test('status do Stripe vira o nosso; o que não conhecemos NÃO libera nada', () => {
  assert.equal(statusDoStripe('active'), 'ativa')
  assert.equal(statusDoStripe('trialing'), 'ativa')
  assert.equal(statusDoStripe('past_due'), 'pagamento_falhou')
  assert.equal(statusDoStripe('unpaid'), 'pagamento_falhou')
  assert.equal(statusDoStripe('canceled'), 'cancelada')
  assert.equal(statusDoStripe('incomplete_expired'), 'cancelada')
  assert.equal(statusDoStripe('incomplete'), 'pendente')
  assert.equal(statusDoStripe('complete'), 'pendente') // status da SESSÃO de checkout, não da assinatura
  assert.equal(statusDoStripe(undefined), 'pendente')
})

test('URLs de retorno: só o nosso site; qualquer outra coisa cai no padrão', () => {
  const padrao = 'https://tanocaixa.web.app/painel/assinatura'
  assert.equal(urlSegura('https://tanocaixa.com/painel?assinatura=ok', padrao), 'https://tanocaixa.com/painel?assinatura=ok')
  assert.equal(urlSegura('https://tanocaixa.web.app/painel/assinatura', padrao), 'https://tanocaixa.web.app/painel/assinatura')
  assert.equal(urlSegura('https://evil.com/phishing', padrao), padrao)
  assert.equal(urlSegura('https://tanocaixa.com.evil.com/x', padrao), padrao)
  assert.equal(urlSegura('javascript:alert(1)', padrao), padrao)
  assert.equal(urlSegura('não é url', padrao), padrao)
  assert.equal(urlSegura(undefined, padrao), padrao)
})

test('evento antigo não sobrescreve o mais novo', () => {
  assert.equal(eventoEhMaisNovo(100, undefined), true)
  assert.equal(eventoEhMaisNovo(200, 100), true)
  assert.equal(eventoEhMaisNovo(100, 100), true)
  assert.equal(eventoEhMaisNovo(50, 100), false)
})

test('pago, no teste ou vencido: o teste dura 14 dias', () => {
  const hoje = new Date('2026-10-29T12:00:00Z')
  const fim = fimDoTeste(hoje)
  assert.equal(fim, '2026-11-12T12:00:00.000Z')
  assert.equal(acessoDaAssinatura('ativa', undefined, hoje), 'pago')
  assert.equal(acessoDaAssinatura('pagamento_falhou', fim, hoje), 'pago')
  assert.equal(acessoDaAssinatura('teste', fim, hoje), 'teste')
  assert.equal(acessoDaAssinatura('teste', fim, new Date('2026-11-13T00:00:00Z')), 'vencido')
  assert.equal(acessoDaAssinatura('cancelada', undefined, hoje), 'vencido')
  assert.equal(acessoDaAssinatura(undefined, undefined, hoje), 'vencido')
})

test('primeira loja R$ 149, cada loja extra R$ 79', () => {
  assert.deepEqual(itensDaAssinatura(1), { principal: 1, extras: 0 })
  assert.deepEqual(itensDaAssinatura(3), { principal: 1, extras: 2 })
  assert.deepEqual(itensDaAssinatura(0), { principal: 1, extras: 0 })
  assert.equal(totalMensalCentavos(1), 14900)
  assert.equal(totalMensalCentavos(3), 14900 + 2 * 7900)
})
