const test = require('node:test')
const assert = require('node:assert/strict')
const { deveLembrarNotasDoDia, REGRAS, PRIORIDADE, EM_BREVE, diasEntre, mesAnterior } = require('../lib/lembretesRegras.js')
const { montarLembrete } = require('../lib/lembretesTexto.js')
const { LEMBRETES } = require('../lib/lembretesCatalogo.js')

const HOJE = '2026-10-05T03:00:00.000Z' // 00:00 em São Paulo
const nota = (criadoEm, extra = {}) => ({ acao: 'lançou a nota do', criadoEm, ...extra })

const ctx = (extra = {}) => ({
  hoje: '2026-10-05', inicioDoDia: HOJE, diaDoMes: 5, diaSemana: 1, restaurante: 'Kebab Store',
  despesas: [], receitaHoje: 0, pedidosPdvHoje: 0, caixasAbertos: [], temProdutos: true, ultimaContagem: undefined,
  planoDoMesExiste: true, pratos: [], atividades: [{ acao: 'lançou as vendas de', criadoEm: '2026-10-03T20:00:00.000Z' }],
  ifood: undefined, convitesPendentes: [], ...extra,
})
const legenda = (id, d) => montarLembrete(id, d.vars, d.variante).legenda.replace(/ /g, ' ')

test('notas do dia: hábito sem nota hoje lembra; nota hoje, sem hábito ou integração não', () => {
  assert.equal(deveLembrarNotasDoDia([nota('2026-10-02T15:00:00.000Z')], HOJE), true)
  assert.equal(deveLembrarNotasDoDia([nota('2026-10-02T15:00:00.000Z'), nota('2026-10-05T14:15:00.000Z')], HOJE), false)
  assert.equal(deveLembrarNotasDoDia([], HOJE), false)
  assert.equal(deveLembrarNotasDoDia([nota('2026-10-02T15:00:00.000Z', { origem: 'integracao' })], HOJE), false)
})

test('toda regra pertence ao catálogo, e "em breve" não tem regra', () => {
  for (const id of PRIORIDADE) assert.ok(LEMBRETES[id], id)
  for (const id of EM_BREVE) assert.equal(REGRAS[id], undefined, id)
  assert.equal(PRIORIDADE.length + EM_BREVE.length, Object.keys(LEMBRETES).length)
})

test('vendas do dia: só com hábito e nada lançado hoje', () => {
  const r = REGRAS.vendas_do_dia.detectar
  assert.ok(r(ctx()))
  assert.equal(r(ctx({ receitaHoje: 100 })), null)
  assert.equal(r(ctx({ pedidosPdvHoje: 1 })), null)
  assert.equal(r(ctx({ atividades: [] })), null)
  assert.match(legenda('vendas_do_dia', r(ctx())), /Hoje ainda não há vendas lançadas/)
})

test('vendas do dia: reconhece o hábito pelos textos antigos do app (fechou o caixa de…)', () => {
  const r = REGRAS.vendas_do_dia.detectar
  const so = (acao) => ctx({ atividades: [{ acao, criadoEm: '2026-09-29T21:00:00.000Z' }] })
  assert.ok(r(so('fechou o caixa de')))
  assert.ok(r(so('lançou as vendas dos')))
  assert.ok(r(so('fechou o caixa do PDV')))
  assert.equal(r(so('lançou a nota do')), null)
  assert.equal(r(so('cadastrou o produto')), null)
})

test('caixa aberto: só de dia anterior; mostra número e quando abriu', () => {
  const r = REGRAS.caixa_aberto.detectar
  assert.equal(r(ctx({ caixasAbertos: [{ numero: 3, dia: '2026-10-05', abertoEm: '2026-10-05T12:00:00.000Z' }] })), null)
  const d = r(ctx({ caixasAbertos: [{ numero: 3, dia: '2026-10-04', abertoEm: '2026-10-04T21:10:00.000Z' }] }))
  assert.match(legenda('caixa_aberto', d), /O caixa #3 segue aberto desde ontem às 18h10/)
})

test('vencimentos: vencido, hoje e amanhã entram; longe e pago não; nota com 2 lançamentos conta uma vez', () => {
  const r = REGRAS.vencimentos.detectar
  const d = (id, venc, extra = {}) => ({ id, fornecedor: id, valorTotal: 100, dataCompetencia: '2026-10-01', dataVencimento: venc, status: 'a_pagar', ...extra })
  assert.equal(r(ctx({ despesas: [d('Longe', '2026-10-20'), d('Pago', '2026-10-04', { status: 'pago' })] })), null)
  const m = legenda('vencimentos', r(ctx({ despesas: [d('Luz', '2026-10-03'), d('Boa Safra', '2026-10-06', { notaId: 'n1' }), d('Boa Safra', '2026-10-06', { id: 'x2', notaId: 'n1' })] })))
  assert.match(m, /^⏰ \*2 vencimentos pedem atenção\*\n• Luz: R\$ 100,00, vencido há 2 dias\n• Boa Safra: R\$ 200,00, vence amanhã \(06\/10\)\nAo pagar/)
})

test('alta de preço: usa a variação que o app já grava, de nota de hoje ou ontem', () => {
  const r = REGRAS.alta_de_preco.detectar
  const despesa = (criadoEm, variacao) => ({ id: 'a', fornecedor: 'Boa Safra', valorTotal: 50, dataCompetencia: '2026-10-05', status: 'pago', criadoEm, itens: [{ produto: 'Tomate', unidade: 'kg', precoUnitario: 7.41, variacao }] })
  assert.equal(r(ctx({ despesas: [despesa('2026-10-05T12:00:00.000Z', 3)] })), null)
  assert.equal(r(ctx({ despesas: [despesa('2026-09-20T12:00:00.000Z', 14)] })), null)
  const m = legenda('alta_de_preco', r(ctx({ despesas: [despesa('2026-10-05T12:00:00.000Z', 14)] })))
  assert.match(m, /Tomate subiu 14% na Boa Safra\*\nDe R\$ 6,50 para R\$ 7,41 o kg, na compra de 05\/10/)
})

test('relatório de compras: dias 1 a 3, mês anterior, com e sem alta de preço', () => {
  const r = REGRAS.relatorio_compras.detectar
  const c = (item, extra = {}) => ({ id: item, notaId: item, fornecedor: item, valorTotal: 100, dataCompetencia: '2026-09-10', status: 'pago', tipoLancamento: 'compra', ...extra })
  assert.equal(r(ctx({ diaDoMes: 4, despesas: [c('A')] })), null)
  assert.equal(r(ctx({ diaDoMes: 2, despesas: [] })), null)
  const sem = legenda('relatorio_compras', r(ctx({ diaDoMes: 2, despesas: [c('Salomão', { valorTotal: 300 }), c('Boa Safra')] })))
  assert.match(sem, /Setembro: R\$ 400,00 em 2 notas\*\nMaior fornecedor: Salomão \(R\$ 300,00, 75%\)\.\nO relatório/)
  const com = legenda('relatorio_compras', r(ctx({ diaDoMes: 2, despesas: [c('Boa Safra', { itens: [{ produto: 'Tomate', precoUnitario: 7, variacao: 14 }] })] })))
  assert.match(com, /Maior alta de preço: Tomate, \+14%\./)
})

test('contagem de estoque: mais de 14 dias; nunca contou não recebe', () => {
  const r = REGRAS.contagem_estoque.detectar
  assert.equal(r(ctx({ ultimaContagem: '2026-09-28' })), null)
  assert.equal(r(ctx({ ultimaContagem: undefined })), null)
  assert.match(legenda('contagem_estoque', r(ctx({ ultimaContagem: '2026-09-18' }))), /A última contagem foi em 18\/09/)
})

test('plano do mês: dias 1 a 5 sem plano, em restaurante ativo', () => {
  const r = REGRAS.plano_do_mes.detectar
  assert.equal(r(ctx({ planoDoMesExiste: true })), null)
  assert.equal(r(ctx({ diaDoMes: 6, planoDoMesExiste: false })), null)
  assert.match(legenda('plano_do_mes', r(ctx({ planoDoMesExiste: false }))), /Outubro começou e o plano ainda não foi definido/)
})

test('pratos sem ficha: segunda-feira; até 3 na lista, mais que isso com "e mais N"', () => {
  const r = REGRAS.pratos_sem_ficha.detectar
  const p = (n) => ({ nome: n, ativo: true, tipo: 'prato', fichaItens: 0 })
  assert.equal(r(ctx({ diaSemana: 2, pratos: [p('Kibe')] })), null)
  assert.equal(r(ctx({ pratos: [{ ...p('Kibe'), fichaItens: 2 }] })), null)
  assert.match(legenda('pratos_sem_ficha', r(ctx({ pratos: [p('Kibe')] }))), /1 prato ainda sem ficha: Kibe/)
  assert.match(legenda('pratos_sem_ficha', r(ctx({ pratos: ['A', 'B', 'C', 'D', 'E'].map(p) }))), /5 pratos ainda sem ficha: A, B, C e mais 2/)
})

test('convite pendente: 3+ dias; iFood parado: conectado sem sync há mais de 2 dias', () => {
  assert.equal(REGRAS.convite_pendente.detectar(ctx({ convitesPendentes: [{ papel: 'caixa', criadoEm: '2026-10-04T10:00:00.000Z' }] })), null)
  assert.match(legenda('convite_pendente', REGRAS.convite_pendente.detectar(ctx({ convitesPendentes: [{ papel: 'caixa', criadoEm: '2026-09-28T10:00:00.000Z' }] }))), /convite para um novo membro \(caixa\) foi enviado em 28\/09/)
  assert.equal(REGRAS.ifood_parado.detectar(ctx({ ifood: { status: 'conectado', ultimoSyncEm: '2026-10-04T06:00:00.000Z' } })), null)
  assert.match(legenda('ifood_parado', REGRAS.ifood_parado.detectar(ctx({ ifood: { status: 'conectado', ultimoSyncEm: '2026-10-01T06:00:00.000Z' } }))), /última sincronização com o iFood foi em 01\/10/)
})

test('utilidades de data', () => {
  assert.equal(diasEntre('2026-10-03', '2026-10-05'), 2)
  assert.equal(diasEntre('2026-09-30', '2026-10-01'), 1)
  assert.equal(mesAnterior('2026-01'), '2025-12')
})
