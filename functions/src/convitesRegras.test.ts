import test from 'node:test'
import assert from 'node:assert/strict'
import { emailConfere, lojasDoConvite, pedidoDeLojas, podeConvidar, type ConviteDoc } from './convitesRegras'

test('convite por loja: só as lojas marcadas, cada uma com seu papel', () => {
  assert.deepEqual(
    pedidoDeLojas({ lojas: [{ restauranteId: 'fausto-curicica', papel: 'gestao' }, { restauranteId: 'kebab', papel: 'caixa' }] }),
    [
      { restauranteId: 'fausto-curicica', papel: 'gestao' },
      { restauranteId: 'kebab', papel: 'caixa' },
    ],
  )
})

test('loja repetida conta uma vez só (fica o primeiro papel)', () => {
  assert.deepEqual(
    pedidoDeLojas({ lojas: [{ restauranteId: 'a', papel: 'caixa' }, { restauranteId: 'a', papel: 'gestao' }] }),
    [{ restauranteId: 'a', papel: 'caixa' }],
  )
})

test('formato antigo { restauranteId, papel } continua valendo', () => {
  assert.deepEqual(pedidoDeLojas({ restauranteId: 'a', papel: 'cozinha' }), [{ restauranteId: 'a', papel: 'cozinha' }])
})

test('convite sem loja, com papel de dono/franqueador ou loja sem id é recusado', () => {
  assert.throws(() => pedidoDeLojas({ lojas: [] }))
  assert.throws(() => pedidoDeLojas({}))
  assert.throws(() => pedidoDeLojas({ lojas: [{ restauranteId: 'a', papel: 'dono' }] }))
  assert.throws(() => pedidoDeLojas({ lojas: [{ restauranteId: 'a', papel: 'franqueador' }] }))
  assert.throws(() => pedidoDeLojas({ lojas: [{ restauranteId: '', papel: 'caixa' }] }))
  assert.throws(() => pedidoDeLojas({ lojas: Array.from({ length: 31 }, (_, i) => ({ restauranteId: `l${i}`, papel: 'caixa' })) }))
})

test('quem pode convidar: dono, franqueador (dono da rede) e gestão', () => {
  assert.equal(podeConvidar('dono'), true)
  assert.equal(podeConvidar('franqueador'), true)
  assert.equal(podeConvidar('gestao'), true)
  assert.equal(podeConvidar('gerente'), true)
  assert.equal(podeConvidar('caixa'), false)
  assert.equal(podeConvidar('cozinha'), false)
  assert.equal(podeConvidar(undefined), false)
})

test('convite antigo (sem lojas) vira uma loja só', () => {
  const base: ConviteDoc = {
    restauranteId: 'a', restauranteNome: 'Loja A', papel: 'caixa',
    criadoPor: 'u', criadoEm: '2026-11-06', status: 'pendente',
  }
  assert.deepEqual(lojasDoConvite(base), [{ restauranteId: 'a', restauranteNome: 'Loja A', papel: 'caixa' }])
  const novo = { ...base, lojas: [{ restauranteId: 'b', restauranteNome: 'Loja B', papel: 'gestao' }] }
  assert.deepEqual(lojasDoConvite(novo), novo.lojas)
})

test('convite de gestor preso a e-mail: só o e-mail certo aceita', () => {
  assert.equal(emailConfere({}, 'qualquer@x.com'), true)
  assert.equal(emailConfere({ email: 'gestor@x.com' }, 'Gestor@X.com '), true)
  assert.equal(emailConfere({ email: 'gestor@x.com' }, 'outro@x.com'), false)
  assert.equal(emailConfere({ email: 'gestor@x.com' }, ''), false)
})
