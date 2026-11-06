#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Templates do Tá no Caixa no Resend + e-mails de teste.
 *
 *   publicar   cria ou atualiza um template `tnc-<id>` por e-mail do
 *              catálogo (src/email/catalogo.ts) e publica.
 *   teste      manda TODOS os e-mails do catálogo, com os exemplos, para
 *              um endereço, com o segmento no assunto: "[TNC · Donos] …".
 *
 * Uso (de dentro de functions/, depois de `npm test` ou `npx tsc -p tsconfig.test.json`):
 *   RESEND_API_KEY=… node scripts/emails-resend.mjs publicar
 *   RESEND_API_KEY=… node scripts/emails-resend.mjs teste voce@exemplo.com
 * A chave pode vir do Secret Manager sem aparecer na tela:
 *   RESEND_API_KEY="$(gcloud secrets versions access latest --secret RESEND_API_KEY --project tanocaixa)" node …
 * ------------------------------------------------------------------ */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { CATALOGO, aliasDe, htmlDoTemplate, renderizar } = require('../lib-test/email/catalogo.js')
const { clienteResend } = require('../lib-test/email/resend.js')
const { REMETENTE, RESPONDER_PARA, URL_SITE } = require('../lib-test/email/layout.js')

const [acao, para] = process.argv.slice(2)
const apiKey = process.env.RESEND_API_KEY
if (!apiKey) throw new Error('falta RESEND_API_KEY')
const resend = clienteResend({ apiKey })

if (acao === 'publicar') {
  const existentes = new Map((await resend.listarTemplates()).map((t) => [t.alias ?? t.name, t.id]))
  for (const d of CATALOGO) {
    const alias = aliasDe(d.id)
    const { html, variaveis } = htmlDoTemplate(d.id)
    const corpo = { name: `[Tá no Caixa] ${d.id}`.slice(0, 50), subject: d.assunto, html, variables: variaveis }
    let id = existentes.get(alias)
    if (id) await resend.atualizarTemplate(id, corpo)
    else id = (await resend.criarTemplate({ ...corpo, alias, from: REMETENTE, reply_to: RESPONDER_PARA })).id
    await resend.publicarTemplate(id)
    console.log(`${existentes.has(alias) ? 'atualizado' : 'criado   '}  ${alias}`)
  }
} else if (acao === 'teste') {
  if (!para?.includes('@')) throw new Error('informe o e-mail: node scripts/emails-resend.mjs teste voce@exemplo.com')
  const lote = Date.now().toString(36)
  for (const d of CATALOGO) {
    const e = renderizar(d.id, d.variaveis, d.topico ? { descadastro: `${URL_SITE}/emails?exemplo=1` } : {})
    const assunto = `[${d.segmento}] ${e.assunto}`
    const base = { from: REMETENTE, to: [para], reply_to: RESPONDER_PARA, subject: assunto, tags: [{ name: 'tipo', value: 'teste_catalogo' }] }
    try {
      await resend.enviar({ ...base, template: e.template }, `catalogo-${lote}-${d.id}`)
      console.log(`enviado (template)  ${assunto}`)
    } catch (err) {
      await resend.enviar({ ...base, html: e.html, text: e.text }, `catalogo-${lote}-${d.id}-html`)
      console.log(`enviado (html)      ${assunto}   [template recusou: ${err.message}]`)
    }
  }
} else {
  console.log('uso: node scripts/emails-resend.mjs publicar | teste voce@exemplo.com')
  process.exit(1)
}
