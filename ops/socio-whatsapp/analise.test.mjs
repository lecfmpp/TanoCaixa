// node --test ops/socio-whatsapp/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  textoDaMensagem, normalizar, limpar, extrair, montarLembrete, montarRelatorio, podeEnviar, palavrasChave, dataCurta,
} from './analise.mjs'

const quem = { eu: 'Leandro', socio: 'Fernando', idsEu: ['5521111111111@c.us'], idsSocio: ['5521222222222@c.us'] }
const historico = JSON.parse(readFileSync(new URL('./exemplo-historico.json', import.meta.url), 'utf8'))
let ts = 1759000000
const msg = (type, texto, extra = {}) => ({ type, timestamp: ts++, typeMessage: 'textMessage', textMessage: texto, ...extra })

test('lê texto de textMessage, extendedTextMessage e legenda', () => {
  assert.equal(textoDaMensagem({ textMessage: 'oi' }), 'oi')
  assert.equal(textoDaMensagem({ extendedTextMessage: { text: 'link' } }), 'link')
  assert.equal(textoDaMensagem({ caption: 'foto' }), 'foto')
  assert.equal(textoDaMensagem({ typeMessage: 'audioMessage' }), '')
})

test('normalizar: outgoing = Leandro, incoming 1:1 = Fernando, ignora o próprio bot e mídia sem texto', () => {
  const m = normalizar(historico, quem)
  assert.equal(m.length, 6) // 7 mensagens, 1 do bot (sendByApi)
  assert.equal(m[0].autor, 'Leandro')
  assert.equal(m[1].autor, 'Fernando')
  assert.ok(!m.some((x) => x.texto.includes('Lembrete automático')))
})

test('normalizar: em grupo usa o senderId para saber quem falou', () => {
  const m = normalizar([
    { type: 'incoming', timestamp: 2, senderId: '5521222222222@c.us', textMessage: 'b' },
    { type: 'incoming', timestamp: 1, senderId: '5521111111111@c.us', textMessage: 'a' },
    { type: 'incoming', timestamp: 3, senderId: '5599@c.us', senderName: 'Contador', textMessage: 'c' },
  ], quem)
  assert.deepEqual(m.map((x) => x.autor), ['Leandro', 'Fernando', 'Contador'])
})

test('limpar tira e-mail, telefone, CPF e CNPJ', () => {
  const t = limpar('fala com joao@x.com.br no +55 (21) 99999-8888, cpf 123.456.789-09, cnpj 12.345.678/0001-90')
  assert.ok(!/joao@|99999|456\.789|345\.678/.test(t), t)
})

test('extrair: compromisso, pedido, aceite, feito e pergunta sem resposta', () => {
  const r = extrair(normalizar(historico, quem), quem)
  const leandro = r.pendencias.filter((p) => p.responsavel === 'Leandro')
  const fernando = r.pendencias.filter((p) => p.responsavel === 'Fernando')
  assert.equal(leandro.length, 1)
  assert.match(leandro[0].oque, /contrato social/)
  assert.equal(leandro[0].prazo, 'até sexta')
  assert.equal(leandro[0].combinado, true)
  assert.equal(fernando.length, 1)
  assert.match(fernando[0].oque, /restaurantes/)
  assert.equal(r.feitos.length, 1)
  assert.match(r.feitos[0].oque, /planilha/)
  assert.equal(r.perguntasSemResposta.length, 1)
  assert.equal(r.perguntasSemResposta[0].autor, 'Leandro')
  assert.equal(r.ondeParamos.ultimas.length, 5)
})

test('"feito" de uma pessoa não fecha a pendência da outra', () => {
  const m = normalizar([
    msg('incoming', 'Vou ligar para o contador amanhã'),
    msg('outgoing', 'Liguei pro contador, feito'),
  ], quem)
  const r = extrair(m, quem)
  assert.equal(r.pendencias.length, 1)
  assert.equal(r.pendencias[0].responsavel, 'Fernando')
})

test('"feito" só fecha item do mesmo assunto', () => {
  const m = normalizar([
    msg('incoming', 'Vou revisar o pitch deck'),
    msg('incoming', 'Vou mandar o orçamento do designer'),
    msg('incoming', 'Orçamento do designer enviei agora'),
  ], quem)
  const r = extrair(m, quem)
  assert.deepEqual(r.pendencias.map((p) => p.oque), ['Vou revisar o pitch deck'])
})

test('pergunta respondida não aparece como pendente', () => {
  const m = normalizar([msg('incoming', 'Qual o preço do plano?'), msg('outgoing', 'R$ 99')], quem)
  assert.equal(extrair(m, quem).perguntasSemResposta.length, 0)
})

test('lembrete do Fernando cita o que é dele e pergunta o próximo passo', () => {
  const r = extrair(normalizar(historico, quem), quem)
  const t = montarLembrete('Fernando', r, { outroNome: 'Leandro', hoje: new Date(1759300000000) })
  assert.match(t, /Oi, Fernando/)
  assert.match(t, /restaurantes do piloto/)
  assert.doesNotMatch(t, /contrato social/) // o item do Leandro não entra na lista dele
  assert.match(t, /Leandro perguntou e ficou sem resposta/)
  assert.match(t, /Próximo passo/)
})

test('lembrete sem pendências avisa que está tudo em dia', () => {
  const t = montarLembrete('Leandro', { pendencias: [], feitos: [], perguntasSemResposta: [], ondeParamos: null }, { outroNome: 'Fernando' })
  assert.match(t, /Nada pendente com você/)
})

test('relatório traz as seções e os dois rascunhos', () => {
  const r = extrair(normalizar(historico, quem), quem)
  const md = montarRelatorio(r, { eu: 'Leandro', socio: 'Fernando', hoje: new Date(1759300000000) })
  for (const s of ['Pendências em aberto', 'Feitos', 'Perguntas sem resposta', 'Onde paramos', 'lembrete — Fernando', 'lembrete — Leandro']) {
    assert.ok(md.includes(s), s)
  }
})

test('trava de envio: precisa da variável E do pedido explícito', () => {
  assert.equal(podeEnviar({}, true), false)
  assert.equal(podeEnviar({ SOCIO_WHATSAPP_ENVIAR: 'sim' }, false), false)
  assert.equal(podeEnviar({ SOCIO_WHATSAPP_ENVIAR: 'true' }, true), false)
  assert.equal(podeEnviar({ SOCIO_WHATSAPP_ENVIAR: ' SIM ' }, true), true)
})

test('palavrasChave ignora palavras vazias e acentos; dataCurta usa o fuso de SP', () => {
  assert.deepEqual(palavrasChave('Vou mandar a planilha até amanhã'), ['planilha'])
  assert.equal(dataCurta(new Date('2026-10-01T02:00:00Z')), 'qua 30/09')
})
