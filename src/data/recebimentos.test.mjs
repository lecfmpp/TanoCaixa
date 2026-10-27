import test from 'node:test'
import assert from 'node:assert/strict'
import { partesDoDia, partesNaJanela, recebimentoValido, somarPartes } from './recebimentos.ts'

const dia = (data, canais, id = `fech-${data}`) => ({ id, data, canais })

test('sem data de recebimento, o dinheiro cai no dia da venda', () => {
  assert.equal(recebimentoValido('2026-10-27', undefined), '2026-10-27')
  assert.equal(recebimentoValido('2026-10-27T12:00:00', ''), '2026-10-27')
})

test('recebimento antes da venda ou data inválida volta pro dia da venda', () => {
  assert.equal(recebimentoValido('2026-10-27', '2026-10-20'), '2026-10-27')
  assert.equal(recebimentoValido('2026-10-27', 'ontem'), '2026-10-27')
  assert.equal(recebimentoValido('2026-10-27', '2026-11-03'), '2026-11-03')
})

test('cada canal vira uma parte, com a venda e o recebimento', () => {
  const d = dia('2026-10-27', [
    { canal: 'balcao', valorBruto: 1000 },
    { canal: 'apps', valorBruto: 400, recebimentoEm: '2026-11-03' },
    { canal: 'outros', valorBruto: 0 },
  ])
  const ps = partesDoDia(d)
  assert.equal(ps.length, 2)
  assert.deepEqual(ps.map((p) => [p.canal, p.venda, p.recebimento]), [
    ['balcao', '2026-10-27', '2026-10-27'],
    ['apps', '2026-10-27', '2026-11-03'],
  ])
})

test('a mesma venda conta uma vez em cada base; o total não muda de lugar nem some', () => {
  const dias = [
    dia('2026-10-27', [{ canal: 'balcao', valorBruto: 1000 }, { canal: 'apps', valorBruto: 400, recebimentoEm: '2026-11-03' }]),
    dia('2026-10-28', [{ canal: 'apps', valorBruto: 250, recebimentoEm: '2026-11-04' }]),
  ]
  // Por venda, outubro tem tudo.
  assert.equal(somarPartes(partesNaJanela(dias, 'venda', '2026-10-01', '2026-10-31')), 1650)
  assert.equal(somarPartes(partesNaJanela(dias, 'venda', '2026-11-01', '2026-11-30')), 0)
  // Por recebimento, os apps caem em novembro.
  assert.equal(somarPartes(partesNaJanela(dias, 'recebimento', '2026-10-01', '2026-10-31')), 1000)
  assert.equal(somarPartes(partesNaJanela(dias, 'recebimento', '2026-11-01', '2026-11-30')), 650)
  // Somando as janelas, nada some nem duplica.
  const out = somarPartes(partesNaJanela(dias, 'recebimento', '2026-10-01', '2026-10-31'))
  const nov = somarPartes(partesNaJanela(dias, 'recebimento', '2026-11-01', '2026-11-30'))
  assert.equal(out + nov, 1650)
})
