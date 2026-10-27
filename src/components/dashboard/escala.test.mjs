import test from 'node:test'
import assert from 'node:assert/strict'
import { compacto, curtoK, escala } from './escala.ts'

test('compacto: mil, 100 mil sem decimal e milhão (antes "10000k" invadia o eixo)', () => {
  assert.equal(compacto(800), '800')
  assert.equal(compacto(7500), '7,5k')
  assert.equal(compacto(56000), '56k')
  assert.equal(compacto(103500), '104k')
  assert.equal(compacto(999000), '999k')
  assert.equal(compacto(1_000_000), '1M')
  assert.equal(compacto(1_250_000), '1,3M')
  assert.equal(compacto(10_000_000), '10M')
  assert.equal(compacto(-2_400_000), '-2,4M')
  assert.equal(compacto(-3000), '-3k')
  assert.equal(compacto(999_700), '1M') // perto de 1 milhão não vira "1000k"
})

test('compacto nunca passa de 6 caracteres (cabe na coluna de 44px do eixo)', () => {
  for (const n of [0, 5, 999, 1000, 12_345, 99_999, 100_000, 999_499, 999_500, 5e6, 5e7, 5e8, 9e9, -9e9]) assert.ok(compacto(n).length <= 6, `${n} -> ${compacto(n)}`)
})

test('curtoK acompanha o compacto a partir de 1 milhão', () => {
  assert.equal(curtoK(8100), '8,1k')
  assert.equal(curtoK(1_200_000), '1,2M')
  assert.equal(curtoK(450), '450')
})

test('escala: sem dados ainda tem ticks, e todos os dados cabem entre lo e hi', () => {
  const vazia = escala(0, 0)
  assert.ok(vazia.ticks.length >= 2 && vazia.hi > vazia.lo)
  const e = escala(-3000, 9000)
  assert.ok(e.lo <= -3000 && e.hi >= 9000)
  assert.ok(e.ticks.includes(0))
})

test('escala sem zero (percentual): respeita o intervalo pedido', () => {
  const e = escala(28, 32, false)
  assert.ok(e.lo <= 28 && e.hi >= 32)
})
