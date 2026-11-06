const test = require('node:test')
const assert = require('node:assert/strict')
const r = require('../lib/whatsappGrupoRegras.js')

test('celular do dono: formas com e sem o 9, com 55', () => {
  assert.deepEqual(r.formasDoCelular('(21) 99876-5432'), ['5521998765432', '552198765432'])
  assert.deepEqual(r.formasDoCelular('+55 21 9876-5432'), ['552198765432', '5521998765432'])
  assert.deepEqual(r.formasDoCelular('5511912345678'), ['5511912345678', '551112345678'])
  assert.deepEqual(r.formasDoCelular(''), [])
  assert.deepEqual(r.formasDoCelular(undefined), [])
})

test('dono presente: casa o número em qualquer formato de ID', () => {
  const grupo = ['5511900001111@c.us', '552198765432@c.us', '5531988887777@s.whatsapp.net']
  assert.equal(r.donoPresente(grupo, '(21) 99876-5432'), true) // registrado sem o 9
  assert.equal(r.donoPresente(['5521998765432:12@s.whatsapp.net'], '21 99876-5432'), true)
  assert.equal(r.donoPresente(grupo, '(21) 91111-2222'), false)
  assert.equal(r.donoPresente(grupo, undefined), false)
})

test('lista só com IDs anônimos (@lid) não decide a conferência', () => {
  assert.equal(r.listaTemTelefones(['247531950833748@lid', '183545595199545@lid']), false)
  assert.equal(r.listaTemTelefones(['247531950833748@lid', '5521998765432@s.whatsapp.net']), true)
})

test('final do celular, sem expor o número', () => {
  assert.equal(r.finalDoCelular('(21) 99876-5432'), 'final 5432')
  assert.equal(r.finalDoCelular(undefined), 'do dono')
})

test('código de pareamento: gera TNC-#### e acha em textos variados', () => {
  assert.match(r.gerarCodigo(), /^TNC-\d{4}$/)
  assert.equal(r.gerarCodigo(() => 0), 'TNC-1000')
  assert.equal(r.gerarCodigo(() => 0.99999), 'TNC-9999')
  assert.equal(r.extrairCodigo('TNC-4821'), 'TNC-4821')
  assert.equal(r.extrairCodigo('oi, o código é tnc 4821 ok'), 'TNC-4821')
  assert.equal(r.extrairCodigo('Tnc4821'), 'TNC-4821')
  assert.equal(r.extrairCodigo('TNC-48210'), null)
  assert.equal(r.extrairCodigo('bom dia'), null)
  assert.equal(r.extrairCodigo(undefined), null)
})

test('código vale até expirar', () => {
  const agora = new Date('2026-11-06T12:00:00Z')
  assert.equal(r.codigoValido('2026-11-06T12:10:00Z', agora), true)
  assert.equal(r.codigoValido('2026-11-06T11:59:00Z', agora), false)
  assert.equal(r.codigoValido(undefined, agora), false)
})

test('status do grupo: só envia conectado; falhas seguidas viram erro', () => {
  assert.equal(r.podeEnviar('conectado', true), true)
  assert.equal(r.podeEnviar(undefined, true), true) // grupos antigos, sem status gravado
  assert.equal(r.podeEnviar('dono_fora', true), false)
  assert.equal(r.podeEnviar('erro', true), false)
  assert.equal(r.podeEnviar('conectado', false), false)
  assert.equal(r.statusDaConferencia({ acessivel: false, donoDentro: false }), 'sem_acesso')
  assert.equal(r.statusDaConferencia({ acessivel: true, donoDentro: false }), 'dono_fora')
  assert.equal(r.statusDaConferencia({ acessivel: true, donoDentro: true }), 'conectado')
  assert.equal(r.statusDepoisDoEnvio('conectado', false, 1), 'conectado')
  assert.equal(r.statusDepoisDoEnvio('conectado', false, 2), 'erro')
  assert.equal(r.statusDepoisDoEnvio('erro', true, 0), 'conectado')
})

test('status do envio nunca volta para trás', () => {
  assert.equal(r.avancaStatus(undefined, 'enviado'), true)
  assert.equal(r.avancaStatus('enviado', 'entregue'), true)
  assert.equal(r.avancaStatus('lido', 'entregue'), false)
  assert.equal(r.avancaStatus('enviado', 'falhou'), true)
  assert.equal(r.avancaStatus('entregue', 'falhou'), false)
})

test('webhook da W-API: mensagem de grupo, envio, status e conexão', () => {
  const recebida = r.interpretarWebhook('wapi', {
    event: 'webhookReceived', isGroup: true, fromMe: false,
    chat: { id: '120363220363669000@g.us' }, sender: { id: '5521998765432' },
    msgContent: { conversation: 'TNC-4821' },
  })
  assert.deepEqual(recebida, { tipo: 'recebida', chatId: '120363220363669000@g.us', deGrupo: true, remetente: '5521998765432', texto: 'TNC-4821' })
  assert.equal(r.interpretarWebhook('wapi', { event: 'webhookReceived', fromMe: true, chat: { id: 'x@g.us' } }), null)
  const ext = r.interpretarWebhook('wapi', { event: 'webhookReceived', isGroup: true, chat: { id: 'x@g.us' }, sender: { id: '1' }, msgContent: { extendedTextMessage: { text: 'tnc 1234' } } })
  assert.equal(ext.texto, 'tnc 1234')
  assert.deepEqual(r.interpretarWebhook('wapi', { event: 'webhookDelivery', messageId: 'M1', fromMe: true }), { tipo: 'status', idMensagem: 'M1', status: 'enviado' })
  assert.deepEqual(r.interpretarWebhook('wapi', { event: 'webhookStatus', messageId: 'M1', status: 'READ' }), { tipo: 'status', idMensagem: 'M1', status: 'lido' })
  assert.deepEqual(r.interpretarWebhook('wapi', { event: 'webhookStatus', messageId: 'M1', status: 'RECEIVED' }), { tipo: 'status', idMensagem: 'M1', status: 'entregue' })
  assert.deepEqual(r.interpretarWebhook('wapi', { event: 'webhookDisconnected', disconnected: true }), { tipo: 'conexao', conectado: false })
  assert.equal(r.interpretarWebhook('wapi', { event: 'webhookChatPresence' }), null)
})

test('webhook da Green API: mensagem de grupo, status e conexão', () => {
  const recebida = r.interpretarWebhook('green', {
    typeWebhook: 'incomingMessageReceived',
    senderData: { chatId: '120363012345678901@g.us', sender: '5521998765432@c.us' },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'TNC-4821' } },
  })
  assert.deepEqual(recebida, { tipo: 'recebida', chatId: '120363012345678901@g.us', deGrupo: true, remetente: '5521998765432@c.us', texto: 'TNC-4821' })
  assert.deepEqual(r.interpretarWebhook('green', { typeWebhook: 'outgoingMessageStatus', idMessage: 'A1', status: 'delivered' }), { tipo: 'status', idMensagem: 'A1', status: 'entregue' })
  assert.deepEqual(r.interpretarWebhook('green', { typeWebhook: 'outgoingMessageStatus', idMessage: 'A1', status: 'notInGroup' }), { tipo: 'status', idMensagem: 'A1', status: 'falhou', erro: 'notInGroup' })
  assert.deepEqual(r.interpretarWebhook('green', { typeWebhook: 'stateInstanceChanged', stateInstance: 'authorized' }), { tipo: 'conexao', conectado: true })
  assert.equal(r.interpretarWebhook('green', { typeWebhook: 'incomingCall' }), null)
})

test('textos fixos não deixam variável vazia', () => {
  assert.match(r.textoTeste('Cantina', 'Ana', '14:32'), /Cantina.*\n.*Ana às 14:32/s)
  assert.match(r.textoConectado('Cantina'), /Cantina/)
  assert.match(r.textoFaltaDono('final 5432'), /final 5432/)
})

test('link de convite do grupo: acha o código em formatos variados', () => {
  assert.equal(r.codigoDoConvite('https://chat.whatsapp.com/EtqqYyOBkBTDwlcsk3Bt1d'), 'EtqqYyOBkBTDwlcsk3Bt1d')
  assert.equal(r.codigoDoConvite('  chat.whatsapp.com/EtqqYyOBkBTDwlcsk3Bt1d?mode=r_c '), 'EtqqYyOBkBTDwlcsk3Bt1d')
  assert.equal(r.codigoDoConvite('Entre no meu grupo: https://chat.whatsapp.com/invite/EtqqYyOBkBTDwlcsk3Bt1d'), 'EtqqYyOBkBTDwlcsk3Bt1d')
  assert.equal(r.codigoDoConvite('https://wa.me/5521998765432'), null)
  assert.equal(r.codigoDoConvite('https://chat.whatsapp.com/curto'), null)
  assert.equal(r.codigoDoConvite(undefined), null)
  assert.equal(r.linkDoConvite('EtqqYyOBkBTDwlcsk3Bt1d'), 'https://chat.whatsapp.com/EtqqYyOBkBTDwlcsk3Bt1d')
})

test('exemplo de cada lembrete: imagem, legenda com o nome da loja e link do app', () => {
  const { exemploDoLembrete } = require('../lib/lembretesExemplos.js')
  const { LEMBRETES } = require('../lib/lembretesCatalogo.js')
  for (const id of Object.keys(LEMBRETES)) {
    const e = exemploDoLembrete(id, 'Cantina da Praça')
    assert.ok(e, `sem exemplo: ${id}`)
    assert.match(e.imagemUrl, /^https:\/\/firebasestorage\.googleapis\.com\//)
    assert.match(e.link, /^https:\/\/tanocaixa\.com\//)
    assert.ok(e.legenda.includes(`Abrir no app: ${e.link}`), `link fora da legenda: ${id}`)
    assert.doesNotMatch(e.legenda, /\{[a-z_0-9]+\}/, `variável sobrando: ${id}`)
  }
  assert.match(exemploDoLembrete('vendas_do_dia', 'Cantina da Praça').legenda, /_Cantina da Praça_$/)
})
