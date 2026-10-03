import test from 'node:test'
import assert from 'node:assert/strict'
import { enviarBoasVindas, montarEmail, primeiroNome, REMETENTE, type Cadeado } from './boasVindas'

function cadeadoMemoria() {
  const estado = new Map<string, string>()
  const c: Cadeado = {
    tomar: async (uid) => (estado.has(uid) ? false : (estado.set(uid, 'enviando'), true)),
    concluir: async (uid) => void estado.set(uid, 'enviado'),
    liberar: async (uid) => void estado.delete(uid),
  }
  return { c, estado }
}
function fetchFalso(status = 200) {
  const chamadas: Array<{ url: string; init: RequestInit }> = []
  const f = (async (url: string, init: RequestInit) => {
    chamadas.push({ url, init })
    return new Response(JSON.stringify({ id: 'abc' }), { status })
  }) as unknown as typeof fetch
  return { f, chamadas }
}

test('envia uma vez com remetente, idempotency key e sem promessa de integração', async () => {
  const { c } = cadeadoMemoria()
  const { f, chamadas } = fetchFalso()
  const r = await enviarBoasVindas('u1', { nome: 'maria silva', email: 'm@x.com' }, { apiKey: 'k', cadeado: c, fetchFn: f })
  assert.equal(r, 'enviado')
  assert.equal(chamadas.length, 1)
  const h = chamadas[0].init.headers as Record<string, string>
  assert.equal(h['Idempotency-Key'], 'boas-vindas/u1')
  const corpo = JSON.parse(chamadas[0].init.body as string)
  assert.equal(corpo.from, REMETENTE)
  assert.deepEqual(corpo.to, ['m@x.com'])
  assert.match(corpo.text, /Oi, Maria!/)
  assert.match(corpo.text, /Em breve/)
  assert.doesNotMatch(corpo.text, /conectad|sincroniz/i)
})

test('segunda chamada para o mesmo usuário não envia', async () => {
  const { c } = cadeadoMemoria()
  const { f, chamadas } = fetchFalso()
  const d = { apiKey: 'k', cadeado: c, fetchFn: f }
  await enviarBoasVindas('u1', { email: 'm@x.com' }, d)
  assert.equal(await enviarBoasVindas('u1', { email: 'm@x.com' }, d), 'ja-enviado')
  assert.equal(chamadas.length, 1)
})

test('falha do Resend libera o cadeado e permite nova tentativa', async () => {
  const { c, estado } = cadeadoMemoria()
  const ruim = fetchFalso(500)
  assert.equal(await enviarBoasVindas('u1', { email: 'm@x.com' }, { apiKey: 'k', cadeado: c, fetchFn: ruim.f }), 'falhou')
  assert.equal(estado.has('u1'), false)
  const bom = fetchFalso()
  assert.equal(await enviarBoasVindas('u1', { email: 'm@x.com' }, { apiKey: 'k', cadeado: c, fetchFn: bom.f }), 'enviado')
})

test('sem e-mail ou sem chave não chama a rede nem toma o cadeado', async () => {
  const { c, estado } = cadeadoMemoria()
  const { f, chamadas } = fetchFalso()
  assert.equal(await enviarBoasVindas('u1', { nome: 'A' }, { apiKey: 'k', cadeado: c, fetchFn: f }), 'sem-email')
  assert.equal(await enviarBoasVindas('u1', { email: 'a@b.c' }, { apiKey: '', cadeado: c, fetchFn: f }), 'sem-chave')
  assert.equal(chamadas.length, 0)
  assert.equal(estado.size, 0)
})

test('nome é escapado no HTML e cai para o e-mail quando vazio', () => {
  assert.equal(primeiroNome('', 'joao.silva@x.com'), 'Joao.silva')
  assert.match(montarEmail('<b>x</b>', 'a@b.c').html, /&lt;b&gt;x&lt;\/b&gt;/)
})
