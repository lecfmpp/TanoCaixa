import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularContato, diferencaSegmentos, SEGMENTOS, situacaoDaLoja, type RetratoPessoa } from './contato'
import { aplicarModo, lerModo } from './envio'
import { montarLembreteTeste, passoCombinaComSituacao, passoDoTeste } from './lembretesTeste'
import { emailDoEvento, montarEmailCobranca } from './cobranca'
import { sincronizar, type Estado } from './contatoSync'
import { clienteResend } from './resend'

const FIM = '2026-11-26T02:59:59.000Z' // 25/11 23:59 em Brasília
const AGORA = new Date('2026-11-06T15:00:00Z')

const pessoa = (lojas: RetratoPessoa['lojas'], extra: Partial<RetratoPessoa> = {}): RetratoPessoa => ({
  uid: 'u1',
  email: 'Maria@X.com',
  nome: 'maria silva',
  criadoEm: '2026-10-20T10:00:00Z',
  entrouPor: 'direto',
  lojas,
  ...extra,
})

/* ------------------------------ situação ------------------------------ */

test('situação da loja: isenta, ativa, falhou, cancelada, teste e teste vencido', () => {
  assert.equal(situacaoDaLoja({ isenta: true, status: 'ativa' }, AGORA), 'isenta')
  assert.equal(situacaoDaLoja({ status: 'ativa' }, AGORA), 'ativa')
  assert.equal(situacaoDaLoja({ status: 'pagamento_falhou' }, AGORA), 'pagamento_falhou')
  assert.equal(situacaoDaLoja({ status: 'cancelada' }, AGORA), 'cancelada')
  assert.equal(situacaoDaLoja({ status: 'teste', testeAte: FIM }, AGORA), 'teste')
  assert.equal(situacaoDaLoja({ status: 'teste', testeAte: FIM }, new Date('2026-11-26T03:00:00Z')), 'sem_assinatura')
  assert.equal(situacaoDaLoja(undefined, AGORA), 'teste') // sem doc: vale o fim de teste padrão
})

/* ------------------------------ contato ------------------------------- */

test('dono em teste: propriedades e segmentos de dono em teste', () => {
  const c = calcularContato(
    pessoa([{ rid: 'r1', papel: 'dono', assinatura: { status: 'teste', testeAte: FIM }, diasLancados: 12, ultimoLancamento: '2026-11-05', membros: 3 }]),
    AGORA,
  )!
  assert.equal(c.email, 'maria@x.com')
  assert.equal(c.primeiroNome, 'Maria')
  assert.equal(c.propriedades.papel_principal, 'dono')
  assert.equal(c.propriedades.situacao, 'teste')
  assert.equal(c.propriedades.teste_ate, '2026-11-26')
  assert.equal(c.propriedades.lojas_sem_assinatura, 1)
  assert.equal(c.propriedades.dias_lancados, 12)
  assert.equal(c.propriedades.tem_equipe, 'sim')
  assert.deepEqual(c.segmentos, [SEGMENTOS.todos, SEGMENTOS.donos, SEGMENTOS.donosEmTeste].sort())
})

test('caixa e cozinha: nenhum dado de cobrança nem de faturamento', () => {
  const c = calcularContato(
    pessoa([
      { rid: 'r1', papel: 'caixa', assinatura: { status: 'teste', testeAte: FIM }, diasLancados: 30 },
      { rid: 'r2', papel: 'cozinha', assinatura: { status: 'pagamento_falhou' } },
    ]),
    AGORA,
  )!
  assert.equal(c.propriedades.papel_principal, 'caixa')
  assert.equal(c.propriedades.papeis, 'caixa,cozinha')
  for (const k of ['situacao', 'teste_ate', 'lojas_sem_assinatura', 'assinou_em', 'dias_lancados', 'ultimo_lancamento']) {
    assert.equal(c.propriedades[k], null, k)
  }
  assert.deepEqual(c.segmentos, [SEGMENTOS.todos, SEGMENTOS.caixa, SEGMENTOS.cozinha].sort())
})

test('dono de duas lojas: pior situação manda, cada segmento aparece', () => {
  const c = calcularContato(
    pessoa([
      { rid: 'r1', papel: 'dono', assinatura: { status: 'ativa', primeiraFaturaPagaEm: '2026-11-10T12:00:00Z' } },
      { rid: 'r2', papel: 'dono', assinatura: { status: 'pagamento_falhou' } },
      { rid: 'r3', papel: 'caixa', assinatura: { status: 'teste', testeAte: FIM } },
    ]),
    AGORA,
  )!
  assert.equal(c.propriedades.situacao, 'pagamento_falhou')
  assert.equal(c.propriedades.lojas_dono, 2)
  assert.equal(c.propriedades.lojas_sem_assinatura, 0)
  assert.equal(c.propriedades.assinou_em, '2026-11-10')
  assert.ok(c.segmentos.includes(SEGMENTOS.assinantes))
  assert.ok(c.segmentos.includes(SEGMENTOS.pagamentoFalhou))
  assert.ok(c.segmentos.includes(SEGMENTOS.caixa))
  assert.ok(!c.segmentos.includes(SEGMENTOS.donosEmTeste)) // o teste é da loja onde é caixa
})

test('loja isenta e demo não entram em segmento de cobrança', () => {
  const c = calcularContato(
    pessoa([
      { rid: 'rede-x-loja-teste', papel: 'dono', assinatura: { isenta: true, status: 'ativa' }, ultimoLancamento: '2026-11-05' },
      { rid: 'demo-abc', papel: 'dono', assinatura: { status: 'teste', testeAte: FIM } },
    ]),
    AGORA,
  )!
  assert.equal(c.propriedades.situacao, 'isenta')
  assert.equal(c.propriedades.lojas_dono, 1)
  assert.deepEqual(c.segmentos, [SEGMENTOS.todos, SEGMENTOS.donos].sort())
})

test('teste vencido vira "sem assinatura"; parado há 7 dias vira inativo', () => {
  const depois = new Date('2026-11-27T12:00:00Z')
  const c = calcularContato(
    pessoa([{ rid: 'r1', papel: 'dono', assinatura: { status: 'teste', testeAte: FIM }, diasLancados: 3, ultimoLancamento: '2026-11-10' }]),
    depois,
  )!
  assert.equal(c.propriedades.situacao, 'sem_assinatura')
  assert.ok(c.segmentos.includes(SEGMENTOS.donosSemAssinatura))
  assert.ok(c.segmentos.includes(SEGMENTOS.inativos7))
})

test('franqueador vê cobrança das lojas dele; gestão também', () => {
  const f = calcularContato(pessoa([{ rid: 'r1', papel: 'franqueador', assinatura: { status: 'teste', testeAte: FIM } }]), AGORA)!
  assert.equal(f.propriedades.papel_principal, 'franqueador')
  assert.equal(f.propriedades.situacao, 'teste')
  assert.ok(f.segmentos.includes(SEGMENTOS.franqueadores))
  assert.ok(!f.segmentos.includes(SEGMENTOS.donosEmTeste))
  const g = calcularContato(pessoa([{ rid: 'r1', papel: 'gerente' }]), AGORA)!
  assert.equal(g.propriedades.papel_principal, 'gestao')
})

test('dono que nunca lançou, com conta de 7+ dias, é inativo; conta nova não', () => {
  const velha = calcularContato(pessoa([{ rid: 'r1', papel: 'dono' }]), AGORA)!
  assert.ok(velha.segmentos.includes(SEGMENTOS.inativos7))
  const nova = calcularContato(pessoa([{ rid: 'r1', papel: 'dono' }], { criadoEm: '2026-11-04T10:00:00Z' }), AGORA)!
  assert.ok(!nova.segmentos.includes(SEGMENTOS.inativos7))
})

test('atividade recente (despesa, estoque) tira do inativo mesmo sem venda lançada', () => {
  const c = calcularContato(pessoa([{ rid: 'r1', papel: 'dono', ultimaAtividade: '2026-11-05T18:00:00Z' }]), AGORA)!
  assert.equal(c.propriedades.ultimo_lancamento, null)
  assert.equal(c.propriedades.ultima_atividade, '2026-11-05')
  assert.ok(!c.segmentos.includes(SEGMENTOS.inativos7))
})

test('sem e-mail: nada a sincronizar', () => {
  assert.equal(calcularContato(pessoa([], { email: '' }), AGORA), null)
})

test('diferença de segmentos só mexe nos "TNC · …"', () => {
  const d = diferencaSegmentos([SEGMENTOS.todos, SEGMENTOS.donos], [SEGMENTOS.todos, SEGMENTOS.caixa, 'RF · Todos (newsletter)'])
  assert.deepEqual(d, { entrar: [SEGMENTOS.donos], sair: [SEGMENTOS.caixa] })
})

/* ----------------------------- lembretes ------------------------------ */

test('dias dos lembretes no calendário de Brasília: 18, 23, 25 e 26/11', () => {
  const em = (iso: string) => passoDoTeste(FIM, new Date(iso))
  assert.equal(em('2026-11-18T12:00:00Z'), 'd7') // 09:00 em Brasília
  assert.equal(em('2026-11-23T12:00:00Z'), 'd2')
  assert.equal(em('2026-11-25T12:00:00Z'), 'd0')
  assert.equal(em('2026-11-26T13:00:00Z'), 'd1')
  assert.equal(em('2026-11-24T12:00:00Z'), null)
  assert.equal(em('2026-11-27T12:00:00Z'), null)
  assert.equal(em('2026-11-06T12:00:00Z'), null)
})

test('lembrete só combina com a situação certa', () => {
  assert.equal(passoCombinaComSituacao('d7', 'teste'), true)
  assert.equal(passoCombinaComSituacao('d0', 'ativa'), false)
  assert.equal(passoCombinaComSituacao('d1', 'sem_assinatura'), true)
  assert.equal(passoCombinaComSituacao('d1', 'teste'), false)
  assert.equal(passoCombinaComSituacao('d7', 'isenta'), false)
})

test('texto do lembrete: data, preço, link de assinar por loja', () => {
  const uma = montarLembreteTeste('d7', { primeiroNome: 'Maria', lojas: [{ rid: 'r1', nome: 'Kebab Store', diasLancados: 12 }], testeAte: FIM })
  assert.equal(uma.assunto, 'Seu teste do Tá no Caixa vai até 25 de novembro')
  assert.match(uma.text, /R\$ 149 por loja\/mês/)
  assert.match(uma.text, /12 dias lançados na Kebab Store/)
  assert.match(uma.html, /painel\/assinatura\?assinar=1&amp;loja=r1/)
  assert.match(uma.html, /utm_campaign=tnc-teste-d7/)
  const duas = montarLembreteTeste('d0', { primeiroNome: '', lojas: [{ rid: 'a', nome: 'Loja A' }, { rid: 'b', nome: 'Loja B' }], testeAte: FIM })
  assert.match(duas.text, /Assinar a Loja A: .*loja=a/)
  assert.match(duas.text, /Assinar a Loja B: .*loja=b/)
  assert.doesNotMatch(duas.html, /<script|undefined/)
})

/* ------------------------------ cobrança ------------------------------ */

test('cobrança: só a 1ª fatura confirma; falha na 1ª e na última tentativa; cancelamento', () => {
  assert.equal(emailDoEvento('invoice.paid', { id: 'in_1', billing_reason: 'subscription_cycle' }), null)
  const ativa = emailDoEvento('invoice.paid', {
    id: 'in_1', billing_reason: 'subscription_create', amount_paid: 29800,
    lines: { data: [{ quantity: 2, period: { end: 1797000000 } }] },
  })
  assert.deepEqual({ ...ativa, proximaCobranca: undefined }, { tipo: 'ativa', chave: 'ativa_in_1', valorCentavos: 29800, lojas: 2, proximaCobranca: undefined })
  assert.equal(emailDoEvento('invoice.payment_failed', { id: 'in_2', attempt_count: 2, next_payment_attempt: 1797000000 }), null)
  assert.equal(emailDoEvento('invoice.payment_failed', { id: 'in_2', attempt_count: 1, next_payment_attempt: 1797000000 })?.chave, 'falhou_in_2_1')
  assert.equal(emailDoEvento('invoice.payment_failed', { id: 'in_2', attempt_count: 4, next_payment_attempt: null })?.chave, 'falhou_in_2_final')
  assert.equal(emailDoEvento('customer.subscription.deleted', { id: 'sub_1' })?.tipo, 'cancelada')
  assert.equal(emailDoEvento('customer.subscription.updated', { id: 'sub_1' }), null)
})

test('texto de cobrança: valor, portal para trocar cartão, assinar de novo', () => {
  const p = { primeiroNome: 'Maria', lojaNome: 'Kebab Store', rid: 'r1' }
  const a = montarEmailCobranca({ tipo: 'ativa', chave: 'x', valorCentavos: 14900, lojas: 1 }, p)
  assert.match(a.text, /R\$\s?149,00 por mês/)
  const f = montarEmailCobranca({ tipo: 'falhou', chave: 'x', ultimaTentativa: false }, p)
  assert.match(f.html, /portal=1&amp;loja=r1/)
  const c = montarEmailCobranca({ tipo: 'cancelada', chave: 'x' }, p)
  assert.match(c.html, /assinar=1&amp;loja=r1/)
})

/* ------------------------------- modo -------------------------------- */

test('modo de envio: padrão é teste e redireciona pro e-mail interno', () => {
  const e = { from: 'a', to: ['cliente@x.com'], subject: 'Oi', html: '', text: '' }
  assert.equal(lerModo(undefined), 'teste')
  assert.equal(lerModo('qualquer'), 'teste')
  assert.equal(aplicarModo(e, 'desligado', 'eu@x.com'), null)
  assert.deepEqual(aplicarModo(e, 'ativo', 'eu@x.com'), e)
  const t = aplicarModo(e, 'teste', 'eu@x.com')!
  assert.deepEqual(t.to, ['eu@x.com'])
  assert.equal(t.subject, '[TESTE → cliente@x.com] Oi')
  assert.equal(aplicarModo(e, 'teste', ''), null)
})

/* -------------------------- sincronização ---------------------------- */

function resendFalso() {
  const chamadas: string[] = []
  const contatos = new Map<string, string[]>() // id → nomes de segmento
  const segs = new Map<string, string>([['seg-rf', 'RF · Todos (newsletter)']])
  let n = 0
  const f = (async (url: string, init: RequestInit) => {
    const caminho = url.replace('https://api.resend.com', '').split('?')[0]
    const m = init.method ?? 'GET'
    chamadas.push(`${m} ${caminho}`)
    const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200 })
    if (m === 'GET' && caminho === '/contact-properties') return ok({ data: [{ id: 'p', key: 'uid' }], has_more: false })
    if (m === 'POST' && caminho === '/contact-properties') return ok({ id: 'p' })
    if (m === 'GET' && caminho === '/segments') return ok({ data: [...segs].map(([id, name]) => ({ id, name })), has_more: false })
    if (m === 'POST' && caminho === '/segments') {
      const id = `seg${++n}`
      segs.set(id, JSON.parse(init.body as string).name)
      return ok({ id })
    }
    if (m === 'POST' && caminho === '/contacts') {
      contatos.set('c1', ['RF · Todos (newsletter)'])
      return ok({ id: 'c1' })
    }
    const seg = caminho.match(/^\/contacts\/c1\/segments(?:\/(.+))?$/)
    if (seg && m === 'GET') return ok({ data: contatos.get('c1')!.map((name) => ({ id: 'x', name })), has_more: false })
    if (seg && m === 'POST') { contatos.get('c1')!.push(segs.get(decodeURIComponent(seg[1]))!); return ok({}) }
    if (seg && m === 'DELETE') { const nome = segs.get(decodeURIComponent(seg[1])); contatos.set('c1', contatos.get('c1')!.filter((s) => s !== nome)); return ok({}) }
    if (m === 'DELETE' && caminho === '/contacts/c1') { contatos.delete('c1'); return ok({}) }
    return new Response('{}', { status: 404 })
  }) as unknown as typeof fetch
  return { resend: clienteResend({ apiKey: 'k', fetchFn: f, intervaloMs: 0, dormir: async () => {} }), chamadas, contatos }
}

function estadoMemoria() {
  const m = new Map<string, { contatoId: string; email: string; impressao: string }>()
  const e: Estado = { ler: async (u) => m.get(u), gravar: async (u, d) => void m.set(u, d), apagar: async (u) => void m.delete(u) }
  return e
}

test('sincronizar: cria contato, cria segmentos, entra nos certos e não mexe nos de outro projeto', async () => {
  const { resend, contatos, chamadas } = resendFalso()
  const estado = estadoMemoria()
  const cache = {}
  const r = pessoa([{ rid: 'r1', papel: 'dono', assinatura: { status: 'teste', testeAte: FIM }, ultimoLancamento: '2026-11-05' }])
  assert.equal(await sincronizar('u1', r, { resend, estado, cache, agora: AGORA }), 'atualizado')
  assert.deepEqual(
    contatos.get('c1')!.sort(),
    ['RF · Todos (newsletter)', SEGMENTOS.todos, SEGMENTOS.donos, SEGMENTOS.donosEmTeste].sort(),
  )
  assert.ok(chamadas.includes('POST /contact-properties'))

  // Mesma situação: nenhuma chamada nova.
  const antes = chamadas.length
  assert.equal(await sincronizar('u1', r, { resend, estado, cache, agora: AGORA }), 'sem-mudanca')
  assert.equal(chamadas.length, antes)

  // Assinou: sai de "em teste", entra em "assinantes".
  const pagou = pessoa([{ rid: 'r1', papel: 'dono', assinatura: { status: 'ativa' }, ultimoLancamento: '2026-11-05' }])
  await sincronizar('u1', pagou, { resend, estado, cache, agora: AGORA })
  assert.ok(contatos.get('c1')!.includes(SEGMENTOS.assinantes))
  assert.ok(!contatos.get('c1')!.includes(SEGMENTOS.donosEmTeste))
  assert.ok(contatos.get('c1')!.includes('RF · Todos (newsletter)'))

  // Conta apagada: contato sai do Resend.
  assert.equal(await sincronizar('u1', null, { resend, estado, cache, agora: AGORA }), 'removido')
  assert.equal(contatos.has('c1'), false)
})

test('cliente Resend tenta de novo em 429', async () => {
  let n = 0
  const f = (async () => (++n < 3 ? new Response('lento', { status: 429 }) : new Response('{"id":"e1"}', { status: 200 }))) as unknown as typeof fetch
  const r = clienteResend({ apiKey: 'k', fetchFn: f, intervaloMs: 0, dormir: async () => {} })
  assert.deepEqual(await r.enviar({ from: 'a', to: ['b@x.com'], subject: 's', html: '', text: '' }), { id: 'e1' })
  assert.equal(n, 3)
})
