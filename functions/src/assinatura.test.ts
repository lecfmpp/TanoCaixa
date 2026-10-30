import test from 'node:test'
import assert from 'node:assert/strict'
import { acessoDaConta, eventoEhMaisNovo, fimDoTeste, itensDaAssinatura, statusDoStripe, totalMensalCentavos, urlSegura } from './assinatura'

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

test('teste grátis: conta os dias que faltam e bloqueia quando acaba', () => {
  const inicio = new Date('2026-10-01T12:00:00Z')
  const ate = fimDoTeste(inicio)
  assert.equal(ate, '2026-10-15T12:00:00.000Z')
  assert.deepEqual(acessoDaConta(undefined, ate, inicio), { acesso: 'teste', diasRestantes: 14 })
  assert.deepEqual(acessoDaConta(null, ate, new Date('2026-10-15T11:00:00Z')), { acesso: 'teste', diasRestantes: 1 })
  assert.deepEqual(acessoDaConta('pendente', ate, new Date('2026-10-15T12:00:00Z')), { acesso: 'bloqueada', diasRestantes: 0 })
  assert.deepEqual(acessoDaConta('cancelada', ate, new Date('2026-11-01T00:00:00Z')), { acesso: 'bloqueada', diasRestantes: 0 })
  assert.deepEqual(acessoDaConta(undefined, undefined, inicio), { acesso: 'bloqueada', diasRestantes: 0 })
})

test('assinatura ativa libera mesmo depois do teste; pagamento falho segue liberado com aviso', () => {
  const depois = new Date('2027-01-01T00:00:00Z')
  assert.equal(acessoDaConta('ativa', '2026-10-15T12:00:00.000Z', depois).acesso, 'ativa')
  assert.equal(acessoDaConta('pagamento_falhou', '2026-10-15T12:00:00.000Z', depois).acesso, 'pagamento_falhou')
})

test('Pro cobre 1 loja; Expansão só entra a partir da segunda', () => {
  assert.deepEqual(itensDaAssinatura(1), { pro: 1, expansao: 0 })
  assert.deepEqual(itensDaAssinatura(3), { pro: 1, expansao: 2 })
  assert.deepEqual(itensDaAssinatura(0), { pro: 1, expansao: 0 })
  assert.deepEqual(itensDaAssinatura(999), { pro: 1, expansao: 49 })
  assert.equal(totalMensalCentavos(1), 14900)
  assert.equal(totalMensalCentavos(3), 14900 + 2 * 7900)
})
