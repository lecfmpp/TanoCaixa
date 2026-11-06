/* ------------------------------------------------------------------ *
 * Webhook do provedor de WhatsApp (Green API ou W-API).
 *
 * URL a cadastrar no painel do provedor (recebimento, envio e status):
 *   https://<região>-tanocaixa.cloudfunctions.net/whatsappWebhook?t=<WHATSAPP_WEBHOOK_TOKEN>
 * Sem o token certo, a chamada é ignorada (responde 403).
 *
 * O que trata:
 *  - mensagem recebida num grupo com um código "TNC-1234": liga o grupo à loja
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
import { apagarCampo, atualizarStatusEnvio, celularDoDono, conferirGrupo, gravarConferencia, refGrupo, registrarEnvio } from './whatsappGrupoDb'
import {
  codigoValido,
  donoPresente,
  extrairCodigo,
  finalDoCelular,
  interpretarWebhook,
  textoConectado,
  textoFaltaDono,
  textoGrupoDeOutraLoja,
} from './whatsappGrupoRegras'

const WHATSAPP_WEBHOOK_TOKEN = defineSecret('WHATSAPP_WEBHOOK_TOKEN')

/** Pareamento: o código veio de um grupo; liga o grupo à loja se estiver tudo certo. */
async function parear(codigo: string, grupoId: string, remetente: string): Promise<void> {
  const db = getFirestore()
  const ref = db.doc(`whatsapp_codigos/${codigo}`)
  const snap = await ref.get()
  if (!snap.exists || !codigoValido(snap.get('expiraEm') as string | undefined)) return // código velho: silêncio
  const rid = snap.get('rid') as string

  const outro = await db.collection('whatsapp_grupos').where('grupoId', '==', grupoId).limit(2).get()
  if (outro.docs.some((d) => d.id !== rid)) {
    await enviar(textoGrupoDeOutraLoja(), undefined, grupoId)
    return
  }

  const celular = await celularDoDono(rid)
  const c = await conferirGrupo(grupoId, celular)
  const foiODono = donoPresente([remetente], celular)
  if (c.status === 'sem_acesso') {
    console.error(`whatsappWebhook: código ${codigo} de ${grupoId}, mas sem acesso ao grupo`, c.erro)
    return
  }
  if (!c.donoDentro && !foiODono) {
    await enviar(textoFaltaDono(finalDoCelular(celular)), undefined, grupoId)
    await refGrupo(rid).set({ statusMotivo: 'o código veio de um grupo sem o número do dono' }, { merge: true })
    return
  }

  await refGrupo(rid).set(
    { grupoId, origem: 'codigo', conectadoEm: new Date().toISOString(), conectadoPor: remetente, codigo: apagarCampo(), codigoExpiraEm: apagarCampo() },
    { merge: true },
  )
  await gravarConferencia(rid, { ...c, status: 'conectado', donoDentro: true })
  await ref.delete()

  const loja = ((await db.doc(`restaurants/${rid}`).get()).get('nome') as string | undefined) ?? 'sua loja'
  const r = await enviar(textoConectado(loja), undefined, grupoId)
  await registrarEnvio(rid, { tipo: 'boas_vindas', grupoId }, r)
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
