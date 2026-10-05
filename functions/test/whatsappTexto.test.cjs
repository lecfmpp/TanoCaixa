const test = require('node:test')
const assert = require('node:assert/strict')
const t = require('../lib/whatsappTexto.js')

const base = { acao: 'lançou a nota do', entidade: 'Hortifruti Boa Safra', quem: 'Leandro Campos', valor: 860, restaurante: 'Zaatar' }

test('nota a pagar mostra valor, itens, vencimento e quem lançou, sem repetir', () => {
  const m = t.textoAviso({ ...base, detalhes: { vencimento: '2026-10-15', formaPagamento: 'boleto', status: 'a_pagar', itens: 8 } })
  assert.equal(m, ['🧾 *Nota fiscal lançada*', 'Hortifruti Boa Safra', 'Valor: R$ 860,00', 'Itens: 8', 'Vencimento: 15/10/2026 (boleto)', 'Lançada por Leandro Campos', '_Zaatar_'].join('\n').replace(/R\$ /, 'R$ '))
})

test('nota paga não mostra vencimento', () => {
  const m = t.textoAviso({ ...base, detalhes: { formaPagamento: 'pix', status: 'pago', itens: 1 } })
  assert.match(m, /Pagamento: pago \(Pix\)/)
  assert.doesNotMatch(m, /Vencimento/)
})

test('nota sem detalhes (atividade antiga) continua válida', () => {
  const m = t.textoAviso(base)
  assert.match(m, /^🧾 \*Nota fiscal lançada\*\nHortifruti Boa Safra\nValor:/)
  assert.doesNotMatch(m, /Itens|Vencimento/)
})

test('cada tipo de mensagem tem emoji próprio e distinto', () => {
  const e = Object.values(t.EMOJI)
  assert.equal(new Set(e).size, e.length)
  const aviso = (acao) => t.textoAviso({ ...base, acao, valor: 10 })
  assert.ok(aviso('contou').startsWith(t.EMOJI.contagem))
  assert.ok(aviso('lançou as vendas de').startsWith(t.EMOJI.vendas))
  assert.ok(aviso('fechou o caixa do PDV').startsWith(t.EMOJI.caixa))
  assert.ok(t.LEMBRETE_FIM_DO_MES.startsWith(t.EMOJI.lembrete))
  assert.ok(t.textoDica(0).startsWith(t.EMOJI.dica))
  assert.equal(aviso('abriu o caixa do PDV'), null)
})
