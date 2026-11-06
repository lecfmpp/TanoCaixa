import test from 'node:test'
import assert from 'node:assert/strict'
import { eventoEhMaisNovo, statusDoStripe, urlSegura, fimDoTesteDaConta, situacaoDoPainel, FIM_DO_TESTE } from './assinatura'

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

test('teste grátis vai até 25/11 (Brasília) pra todo mundo; teste mais longo fica', () => {
  assert.equal(fimDoTesteDaConta(undefined), FIM_DO_TESTE)
  assert.equal(fimDoTesteDaConta('2026-11-12T05:12:41.139Z'), FIM_DO_TESTE)
  assert.equal(fimDoTesteDaConta('lixo'), FIM_DO_TESTE)
  assert.equal(fimDoTesteDaConta('2026-12-04T10:00:00.000Z'), '2026-12-04T10:00:00.000Z')
  // 25/11 23:59 em Brasília ainda é dia 25
  assert.equal(new Date(FIM_DO_TESTE).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), '25/11/2026')
})

test('situação da barra: ativa some, pagamento falhou avisa, teste conta os dias', () => {
  const agora = new Date('2026-11-06T15:00:00.000Z')
  assert.deepEqual(situacaoDoPainel('ativa', FIM_DO_TESTE, agora), { situacao: 'ativa', diasRestantes: 0 })
  assert.deepEqual(situacaoDoPainel('pagamento_falhou', FIM_DO_TESTE, agora), { situacao: 'pagamento_falhou', diasRestantes: 0 })
  assert.deepEqual(situacaoDoPainel('teste', FIM_DO_TESTE, agora), { situacao: 'teste', diasRestantes: 20 })
  assert.deepEqual(situacaoDoPainel(undefined, FIM_DO_TESTE, agora), { situacao: 'teste', diasRestantes: 20 })
  assert.deepEqual(situacaoDoPainel('cancelada', FIM_DO_TESTE, new Date('2026-11-27T00:00:00.000Z')), { situacao: 'teste_acabou', diasRestantes: 0 })
})
