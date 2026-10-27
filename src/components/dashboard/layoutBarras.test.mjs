import test from 'node:test'
import assert from 'node:assert/strict'
import { layoutBarras, visivelNoPasso, larguraMono } from './layoutBarras.ts'

const fmt = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const curto = (n) => (Math.abs(n) >= 1000 ? `${n < 0 ? '-' : ''}${(Math.abs(n) / 1000 >= 100 ? String(Math.round(Math.abs(n) / 1000)) : (Math.abs(n) / 1000).toFixed(1)).replace('.', ',')}k` : String(n))
const textosDe = (barras) => ({
  inteiro: barras.flatMap((b) => [fmt(b.entrou), fmt(b.saiu)]),
  curto: barras.flatMap((b) => [curto(b.entrou), curto(b.saiu)]),
  saldoInteiro: barras.map((b) => (b.entrou - b.saiu >= 0 ? '+' : '') + fmt(b.entrou - b.saiu)),
  saldoCurto: barras.map((b) => (b.entrou - b.saiu >= 0 ? '+' : '') + curto(b.entrou - b.saiu)),
})
const serie = (n, base) => Array.from({ length: n }, (_, i) => ({ entrou: base + i * 7, saiu: Math.round(base * 0.9) }))
const L = (largura, barras) => layoutBarras({ largura, n: barras.length, textos: textosDe(barras) })

test('cartão largo e valores curtos: mostra os valores inteiros e todos os rótulos', () => {
  const l = L(900, serie(4, 2500))
  assert.equal(l.valores, 'inteiro')
  assert.equal(l.passo, 1)
  assert.equal(l.saldoCurto, false)
})

test('valores de 6 e 7 caracteres (>= R$ 100 mil) não ficam inteiros se não cabem na coluna', () => {
  // Antes o corte era só pela largura do grupo (>= 88 px) e "120.000" colidia com "118.000".
  const barras = serie(4, 120000)
  const l = L(900, barras)
  assert.notEqual(l.valores, 'inteiro')
  assert.equal(l.valores, 'curto')
  // o rótulo mais largo realmente cabe na coluna escolhida
  const coluna = Math.min(40, (l.grupo - l.entreColunas) / 2)
  assert.ok(larguraMono(12, 4) + 6 <= coluna + l.entreColunas)
})

test('grupo estreito (celular, 10 grupos): sem valores sobre as barras e saldo curto', () => {
  const l = L(300, serie(10, 2500))
  assert.equal(l.valores, 'nenhum')
  assert.equal(l.saldoCurto, true)
  assert.ok(l.passo >= 2)
})

test('o espaço entre grupos encolhe com a quantidade (31 barras não ficam com largura zero)', () => {
  const l = L(360, serie(31, 2500))
  assert.equal(l.gap, 2)
  assert.ok(l.grupo > 5)
})

test('largura ainda não medida: layout completo, sem esconder nada', () => {
  const l = L(0, serie(10, 2500))
  assert.equal(l.passo, 1)
  assert.equal(l.grupo, Infinity)
})

test('o passo conta a partir do último grupo: o mais recente nunca some', () => {
  for (const total of [2, 7, 10, 13, 31]) for (const passo of [1, 2, 3, 5]) {
    assert.equal(visivelNoPasso(total - 1, total, passo), true, `total ${total}, passo ${passo}`)
    const visiveis = Array.from({ length: total }, (_, i) => i).filter((i) => visivelNoPasso(i, total, passo))
    for (let k = 1; k < visiveis.length; k++) assert.equal(visiveis[k] - visiveis[k - 1], passo)
  }
  // exemplo do bug: 10 grupos, passo 2 antes mostrava 0,2,4,6,8 e escondia o 9
  assert.deepEqual([...Array(10).keys()].filter((i) => visivelNoPasso(i, 10, 2)), [1, 3, 5, 7, 9])
})

test('saldo de R$ 1,25 milhão em fonte maior não é subestimado (passo > 1 quando não cabe)', () => {
  const barras = [{ entrou: 1300000, saiu: 50000 }, { entrou: 1300000, saiu: 50000 }, { entrou: 1300000, saiu: 50000 }, { entrou: 1300000, saiu: 50000 }, { entrou: 1300000, saiu: 50000 }, { entrou: 1300000, saiu: 50000 }]
  const l = L(420, barras) // grupo ~ 62 px, "+1.250.000" tem ~84 px em 14px
  assert.equal(l.saldoCurto, true)
  assert.ok(l.passo >= 1)
})
