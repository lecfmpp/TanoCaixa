const test = require('node:test')
const assert = require('node:assert/strict')
const { deveLembrarNotasDoDia } = require('../lib/lembretesRegras.js')

const HOJE = '2026-10-05T03:00:00.000Z' // 00:00 em São Paulo
const nota = (criadoEm, extra = {}) => ({ acao: 'lançou a nota do', criadoEm, ...extra })

test('tem o hábito e não lançou hoje: lembra', () => {
  assert.equal(deveLembrarNotasDoDia([nota('2026-10-02T15:00:00.000Z')], HOJE), true)
})
test('já lançou nota hoje: não lembra', () => {
  assert.equal(deveLembrarNotasDoDia([nota('2026-10-02T15:00:00.000Z'), nota('2026-10-05T14:15:00.000Z')], HOJE), false)
})
test('nunca lança nota (nada nos últimos 14 dias): não lembra', () => {
  assert.equal(deveLembrarNotasDoDia([{ acao: 'lançou as vendas de', criadoEm: '2026-10-04T20:00:00.000Z' }], HOJE), false)
  assert.equal(deveLembrarNotasDoDia([], HOJE), false)
})
test('nota que veio de integração não conta como hábito', () => {
  assert.equal(deveLembrarNotasDoDia([nota('2026-10-02T15:00:00.000Z', { origem: 'integracao' })], HOJE), false)
})
