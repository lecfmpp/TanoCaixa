const test = require('node:test')
const assert = require('node:assert/strict')

// ehIdDeGrupo vive no módulo do motor, que importa firebase-functions; reimplementa-se o teste pela regra pública.
test('ID de grupo do WhatsApp: só grupos (@g.us) com dígitos', () => {
  const { ehIdDeGrupo } = require('../lib/lembretesEngine.js')
  assert.equal(ehIdDeGrupo('120363012345678901@g.us'), true)
  assert.equal(ehIdDeGrupo('5521999998888-1600000000@g.us'), true)
  assert.equal(ehIdDeGrupo('5521999998888@c.us'), false) // conversa individual
  assert.equal(ehIdDeGrupo('abc@g.us'), false)
  assert.equal(ehIdDeGrupo(''), false)
  assert.equal(ehIdDeGrupo('120363012345678901@g.us; x'), false)
})
