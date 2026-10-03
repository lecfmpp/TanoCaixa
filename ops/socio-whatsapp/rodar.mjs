#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Rotina "Sócios no WhatsApp" — lê a conversa Leandro ↔ Fernando,
 * extrai pendências e monta os lembretes.
 *
 * PADRÃO = RASCUNHO: imprime o relatório e os rascunhos, NÃO envia nada.
 * Para enviar de verdade precisam valer as duas coisas:
 *   1) variável SOCIO_WHATSAPP_ENVIAR=sim (decisão do Leandro), e
 *   2) a execução pedir: --enviar (no workflow: input "enviar").
 *
 * Uso:
 *   node ops/socio-whatsapp/rodar.mjs --arquivo historico.json   # offline
 *   node ops/socio-whatsapp/rodar.mjs                            # lê pela Green-API
 *   node ops/socio-whatsapp/rodar.mjs --listar-chats             # setup: acha o chatId
 *
 * Ambiente (nomes; valores ficam nos secrets do GitHub):
 *   GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN   credenciais da Green-API
 *   SOCIO_CHAT            chat a ler (grupo @g.us ou conversa @c.us)
 *   SOCIO_CHAT_FERNANDO   chatId do Fernando (5521…@c.us): identifica e recebe o lembrete
 *   SOCIO_CHAT_LEANDRO    chatId do Leandro: idem
 *   SOCIO_NOME_EU / SOCIO_NOME_SOCIO   (padrão: Leandro / Fernando)
 *   GEMINI_API_KEY        opcional: resumo por IA no relatório
 *   SOCIO_WHATSAPP_ENVIAR "sim" para liberar o envio (padrão: desligado)
 * ------------------------------------------------------------------ */
import { readFileSync, appendFileSync } from 'node:fs'
import { normalizar, extrair, montarRelatorio, montarLembrete, podeEnviar } from './analise.mjs'
import { credenciais, lerHistorico, listarChats, enviar } from './greenapi.mjs'
import { resumirComIA } from './resumo-ia.mjs'

const args = process.argv.slice(2)
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }
const env = process.env
const eu = env.SOCIO_NOME_EU || 'Leandro'
const socio = env.SOCIO_NOME_SOCIO || 'Fernando'

async function main() {
  const c = credenciais(env)

  if (args.includes('--listar-chats')) {
    if (!c) throw new Error('Faltam GREEN_API_URL / GREEN_API_ID / GREEN_API_TOKEN.')
    for (const x of await listarChats(c)) console.log(`${x.id}  ${x.type || ''}  ${x.name || ''}`)
    return
  }

  let historico
  if (arg('--arquivo')) historico = JSON.parse(readFileSync(arg('--arquivo'), 'utf8'))
  else {
    if (!c) throw new Error('Faltam GREEN_API_URL / GREEN_API_ID / GREEN_API_TOKEN (ou use --arquivo).')
    if (!env.SOCIO_CHAT) throw new Error('Falta SOCIO_CHAT (o chatId da conversa com o sócio).')
    historico = await lerHistorico(c, env.SOCIO_CHAT, Number(arg('--quantas') || 300))
  }

  const quem = {
    eu, socio,
    idsEu: env.SOCIO_CHAT_LEANDRO ? [env.SOCIO_CHAT_LEANDRO] : [],
    idsSocio: env.SOCIO_CHAT_FERNANDO ? [env.SOCIO_CHAT_FERNANDO] : [],
  }
  const msgs = normalizar(historico, quem)
  const resultado = extrair(msgs, quem)
  try { resultado.resumoIA = await resumirComIA(msgs, { eu, socio, env }) }
  catch (e) { console.error(`Resumo por IA falhou (segue sem): ${e.message}`) }

  const relatorio = montarRelatorio(resultado, { eu, socio })
  console.log(relatorio)
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, relatorio + '\n')

  if (!podeEnviar(env, args.includes('--enviar'))) {
    console.log('\nMODO RASCUNHO: nada foi enviado. (Para enviar: SOCIO_WHATSAPP_ENVIAR=sim E --enviar.)')
    return
  }
  if (!c) throw new Error('Envio liberado, mas faltam as credenciais da Green-API.')
  const destinos = [
    [socio, env.SOCIO_CHAT_FERNANDO, eu],
    [eu, env.SOCIO_CHAT_LEANDRO, socio],
  ]
  for (const [nome, chatId, outroNome] of destinos) {
    if (!chatId) { console.log(`Sem chatId para ${nome}: pulando.`); continue }
    await enviar(c, chatId, montarLembrete(nome, resultado, { outroNome }))
    console.log(`Lembrete enviado para ${nome}.`)
  }
}

main().catch((e) => { console.error(e.message); process.exit(1) })
