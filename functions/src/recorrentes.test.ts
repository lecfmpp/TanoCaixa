import test from 'node:test'
import assert from 'node:assert/strict'
import { diaNoMes, planejarRepeticoes, somarMeses, type DespesaMin } from './recorrentes'

const AGORA = '2026-11-01T03:10:00.000Z'
const d = (extra: Partial<DespesaMin> & { id: string }): DespesaMin => ({
  fornecedor: 'Aluguel', categoria: 'aluguel', valorTotal: 3400, dataCompetencia: '2026-10-05', formaPagamento: 'boleto', status: 'pago', recorrente: true, ...extra,
})
const plano = (lista: DespesaMin[], hoje = '2026-11-01') => planejarRepeticoes(lista, hoje, AGORA)

test('somarMeses vira o ano e volta', () => {
  assert.equal(somarMeses('2026-12', 1), '2027-01')
  assert.equal(somarMeses('2026-01', -1), '2025-12')
  assert.equal(somarMeses('2026-10', 0), '2026-10')
})

test('diaNoMes limita ao último dia (31 em fevereiro, e ano bissexto)', () => {
  assert.equal(diaNoMes('2026-02', 31), '2026-02-28')
  assert.equal(diaNoMes('2028-02', 31), '2028-02-29')
  assert.equal(diaNoMes('2026-04', 31), '2026-04-30')
  assert.equal(diaNoMes('2026-11', 5), '2026-11-05')
})

test('vira o mês: a despesa recorrente de outubro gera a de novembro, a pagar e com o mesmo valor', () => {
  const [r] = plano([d({ id: 'd1', dataVencimento: '2026-10-05' })])
  assert.equal(r.id, 'd1_2026-11')
  assert.equal(r.serieId, 'd1')
  assert.equal(r.doc.dataCompetencia, '2026-11-05')
  assert.equal(r.doc.dataVencimento, '2026-11-05')
  assert.equal(r.doc.status, 'a_pagar')
  assert.equal(r.doc.valorTotal, 3400)
  assert.equal(r.doc.recorrente, true)
  assert.equal(r.doc.repetidaAuto, true)
  assert.equal(r.doc.criadoPorId, 'sistema')
})

test('no mesmo mês do lançamento não repete (a pessoa acabou de cadastrar)', () => {
  assert.deepEqual(plano([d({ id: 'd1' })], '2026-10-26'), [])
})

test('não recorrente não repete', () => {
  assert.deepEqual(plano([d({ id: 'd1', recorrente: false })]), [])
})

test('já existe o lançamento do mês (da própria série): não duplica', () => {
  const lista = [d({ id: 'd1', serieId: 'd1' }), d({ id: 'd1_2026-11', serieId: 'd1', dataCompetencia: '2026-11-05' })]
  assert.deepEqual(plano(lista), [])
})

test('desligar "se repete" no último lançamento encerra a série', () => {
  const lista = [d({ id: 'd1', serieId: 'd1' }), d({ id: 'd1_2026-10', serieId: 'd1', dataCompetencia: '2026-10-05', recorrente: false })]
  assert.deepEqual(plano(lista), [])
})

test('corrigir o valor no último lançamento vale pros próximos', () => {
  const lista = [d({ id: 'd1', serieId: 'd1', dataCompetencia: '2026-09-05', valorTotal: 3400 }), d({ id: 'd1_2026-10', serieId: 'd1', dataCompetencia: '2026-10-05', valorTotal: 3650 })]
  const [r] = plano(lista)
  assert.equal(r.doc.valorTotal, 3650)
  assert.equal(r.serieId, 'd1')
})

test('sem preencher o passado: série parada há 3 meses gera só o mês atual', () => {
  const rs = plano([d({ id: 'd1', serieId: 'd1', dataCompetencia: '2026-07-05' })])
  assert.equal(rs.length, 1)
  assert.equal(rs[0].mes, '2026-11')
})

test('lançamento antigo (sem serieId) de vários meses vira UMA repetição, não uma por mês', () => {
  const lista = [
    d({ id: 'a', dataCompetencia: '2026-08-05', valorTotal: 3000 }),
    d({ id: 'b', dataCompetencia: '2026-09-05', valorTotal: 3200 }),
    d({ id: 'c', dataCompetencia: '2026-10-05', valorTotal: 3400, fornecedor: ' aluguel  ' }),
  ]
  const rs = plano(lista)
  assert.equal(rs.length, 1)
  assert.equal(rs[0].doc.valorTotal, 3400)
  assert.equal(rs[0].serieId, 'c')
})

test('fornecedores ou contas diferentes são séries diferentes', () => {
  const rs = plano([d({ id: 'a' }), d({ id: 'b', fornecedor: 'Light', categoria: 'luz', valorTotal: 1240 })])
  assert.equal(rs.length, 2)
})

test('dia 31: fevereiro cai no 28 e março volta ao 31', () => {
  const jan = d({ id: 'j', serieId: 'j', dataCompetencia: '2026-01-31', dataVencimento: '2026-01-31' })
  const [fev] = plano([jan], '2026-02-01')
  assert.equal(fev.doc.dataCompetencia, '2026-02-28')
  assert.equal(fev.doc.diaDoMes, 31)
  const febDoc = { ...(fev.doc as unknown as DespesaMin), recorrente: true }
  const [mar] = plano([jan, febDoc], '2026-03-01')
  assert.equal(mar.doc.dataCompetencia, '2026-03-31')
  assert.equal(mar.doc.dataVencimento, '2026-03-31')
})

test('se a pessoa mudou a data da repetição, vale a data dela', () => {
  const ajustada = d({ id: 'x', serieId: 's', dataCompetencia: '2026-10-10', diaDoMes: 5 }) // pedia 5, ela moveu pra 10
  const [r] = plano([ajustada])
  assert.equal(r.doc.dataCompetencia, '2026-11-10')
})

test('vencimento no mês seguinte à competência mantém a distância', () => {
  const [r] = plano([d({ id: 'c', dataCompetencia: '2026-10-25', dataVencimento: '2026-11-05' })], '2026-11-01')
  assert.equal(r.doc.dataCompetencia, '2026-11-25')
  assert.equal(r.doc.dataVencimento, '2026-12-05')
})

test('pago na hora (sem vencimento): a repetição vence no próprio dia, pra aparecer no aviso', () => {
  const [r] = plano([d({ id: 'p', formaPagamento: 'pix', dataVencimento: undefined })])
  assert.equal(r.doc.dataVencimento, '2026-11-05')
  assert.equal(r.doc.status, 'a_pagar')
})

test('o id é fixo por série e mês (rodar de novo não cria outro)', () => {
  const lista = [d({ id: 'd1', serieId: 'd1' })]
  assert.equal(plano(lista)[0].id, plano(lista)[0].id)
  assert.equal(plano(lista, '2026-11-30')[0].id, 'd1_2026-11')
})

test('compra de mercadoria marcada como recorrente NÃO se repete (caso real: fornecedor de alimentos de 30/07)', () => {
  assert.deepEqual(plano([d({ id: 'c1', fornecedor: 'Carioca 2020 Alimentos Ltda', categoria: 'cmv_alimentos', valorTotal: 131.64 })]), []) // lançamento antigo: vale a conta do DRE
  assert.deepEqual(plano([d({ id: 'c2', categoria: 'cmv_bebidas' })]), [])
  assert.deepEqual(plano([d({ id: 'c3', categoria: 'mercadoria' })]), []) // nome antigo da conta
  assert.deepEqual(plano([d({ id: 'c4', tipoLancamento: 'compra', categoria: 'aluguel' })]), []) // o tipo manda
  assert.deepEqual(plano([d({ id: 'c5', notaId: 'nf-1' })]), []) // veio de nota fiscal
  assert.deepEqual(plano([d({ id: 'c6', itens: [{ produtoId: 'p' }] })]), [])
})

test('conta da casa com tipoLancamento "conta" repete mesmo se o nome da conta for outro', () => {
  assert.equal(plano([d({ id: 'k1', tipoLancamento: 'conta', categoria: 'cmv_alimentos' })]).length, 1) // o tipo manda, como no app
  assert.equal(plano([d({ id: 'k2', categoria: 'luz' })]).length, 1)
})

test('a cópia só leva os campos da conta: nada de pagamento, edição ou nota do original', () => {
  const [r] = plano([{ ...d({ id: 'n' }), pagoEm: '2026-10-05', pagoPorNome: 'Ana', editadoPorNome: 'Ana', duplicadoDe: 'x' } as unknown as DespesaMin])
  for (const campo of ['pagoEm', 'pagoPorNome', 'editadoPorNome', 'duplicadoDe', 'itens', 'notaId']) assert.equal(campo in r.doc, false, campo)
})
