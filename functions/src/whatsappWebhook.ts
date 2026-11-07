/* ------------------------------------------------------------------ *
 * Webhook do provedor de WhatsApp (Green API ou W-API).
 *
 * URL a cadastrar no painel do provedor (recebimento, envio e status):
 *   https://<região>-tanocaixa.cloudfunctions.net/whatsappWebhook?t=<WHATSAPP_WEBHOOK_TOKEN>
 * Sem o token certo, a chamada é ignorada (responde 403).
 *
 * O que trata:
 *  - mensagem recebida num grupo com um código "TNC-123456": liga o grupo à loja
 *    do código, se o número do dono estiver no grupo (ou se foi o dono que mandou);
 *  - status de mensagem enviada: atualiza o histórico (enviado → entregue → lido);
 *  - conexão do número: grava em whatsapp_estado/instancia.
 * Sempre responde 200 rápido para o provedor não reenviar sem fim.
 * ------------------------------------------------------------------ */
import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore } from 'firebase-admin/firestore'
import { SEGREDOS, enviar } from './whatsapp'
import { provedorAtual } from './whatsappProvedor'
import { atualizarStatusEnvio, celularDoDono, conectarGrupo, refGrupo } from './whatsappGrupoDb'
import {
  codigoValido,
  extrairCodigo,
  finalDoCelular,
  MAX_TENTATIVAS_CODIGO,
  interpretarWebhook,
  textoConectado,
  textoFaltaDono,
  textoGrupoDeOutraLoja,
} from './whatsappGrupoRegras'

const WHATSAPP_WEBHOOK_TOKEN = defineSecret('WHATSAPP_WEBHOOK_TOKEN')

const JANELA_TENTATIVAS_MS = 60 * 60 * 1000
const refTentativas = (grupoId: string) => getFirestore().doc(`whatsapp_tentativas/${grupoId}`)

async function tentativasEsgotadas(grupoId: string): Promise<boolean> {
  const d = (await refTentativas(grupoId).get()).data()
  if (!d || Date.now() - Date.parse(String(d.desde)) > JANELA_TENTATIVAS_MS) return false
  return Number(d.erros ?? 0) >= MAX_TENTATIVAS_CODIGO
}

async function contarTentativa(grupoId: string): Promise<void> {
  const ref = refTentativas(grupoId)
  await getFirestore().runTransaction(async (t) => {
    const d = (await t.get(ref)).data()
    const agora = new Date()
    const nova = !d || agora.getTime() - Date.parse(String(d.desde)) > JANELA_TENTATIVAS_MS
    const erros = nova ? 1 : Number(d!.erros ?? 0) + 1
    t.set(ref, { desde: nova ? agora.toISOString() : d!.desde, erros, expiraEm: new Date(agora.getTime() + 2 * JANELA_TENTATIVAS_MS) })
    if (erros === MAX_TENTATIVAS_CODIGO) console.error(`whatsappWebhook: grupo ${grupoId} errou o código ${erros} vezes, bloqueado por 1 h`)
  })
}

/** Pareamento: o código veio de um grupo; liga o grupo à loja se estiver tudo certo. */
async function parear(codigo: string, grupoId: string, remetente: string): Promise<void> {
  const db = getFirestore()
  const ref = db.doc(`whatsapp_codigos/${codigo}`)
  // Limite de tentativas por grupo: código errado conta; acima do limite na
  // última hora, o grupo é ignorado (nem confere o código).
  if (await tentativasEsgotadas(grupoId)) return
  const snap = await ref.get()
  if (!snap.exists || !codigoValido(snap.get('expiraEm') as string | undefined)) {
    await contarTentativa(grupoId)
    return // código errado ou velho: silêncio
  }
  const rid = snap.get('rid') as string
  const loja = ((await db.doc(`restaurants/${rid}`).get()).get('nome') as string | undefined) ?? 'sua loja'

  const r = await conectarGrupo(rid, grupoId, { origem: 'codigo', por: remetente, remetente }, (g) => enviar(textoConectado(loja), undefined, g))
  if (r.ok) {
    await ref.delete()
    return
  }
  if (r.motivo === 'outra_loja') await enviar(textoGrupoDeOutraLoja(), undefined, grupoId)
  else if (r.motivo === 'dono_fora') await enviar(textoFaltaDono(finalDoCelular(await celularDoDono(rid))), undefined, grupoId)
  else console.error(`whatsappWebhook: código ${codigo} de ${grupoId}, mas sem acesso ao grupo`)
  await refGrupo(rid).set({ statusMotivo: r.mensagem }, { merge: true })
}

export const whatsappWebhook = onRequest({ secrets: [...SEGREDOS, WHATSAPP_WEBHOOK_TOKEN] }, async (req, res) => {
  const token = WHATSAPP_WEBHOOK_TOKEN.value()
  if (!token || req.query.t !== token) {
    res.status(403).send('forbidden')
    return
  }
  try {
    const evento = interpretarWebhook(provedorAtual(), req.body)
    if (evento?.tipo === 'recebida' && evento.deGrupo) {
      const codigo = extrairCodigo(evento.texto)
      if (codigo) await parear(codigo, evento.chatId, evento.remetente)
    } else if (evento?.tipo === 'status') {
      await atualizarStatusEnvio(evento.idMensagem, evento.status, evento.erro)
    } else if (evento?.tipo === 'conexao') {
      await getFirestore().doc('whatsapp_estado/instancia').set({ conectado: evento.conectado, em: new Date().toISOString() }, { merge: true })
      if (!evento.conectado) console.error('WhatsApp: o número do Tá no Caixa desconectou do provedor')
    }
  } catch (e) {
    console.error('whatsappWebhook falhou', e)
  }
  res.status(200).send('ok')
})
