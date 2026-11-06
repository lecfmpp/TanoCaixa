/* ------------------------------------------------------------------ *
 * Quando o status de alguém muda no app ou no Stripe, o contato no Resend
 * acompanha:
 *   - users/{uid}                    cadastro, nome, e-mail
 *   - restaurants/{rid}/membros/{uid} convite aceito, papel mudado, removido
 *   - restaurants/{rid}              entrou/saiu gente da loja (memberUids)
 *   - assinaturas/{rid}              tudo que o webhook do Stripe grava e o teste
 * E todo dia às 6h uma conferência passa por todo mundo (pega o teste que
 * venceu e os dias sem lançar, que mudam sem ninguém gravar nada). A
 * primeira execução da conferência é a carga inicial.
 *
 * Tudo só roda com SINCRONIZAR_CONTATOS=true (padrão: desligado).
 * ------------------------------------------------------------------ */
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineBoolean } from 'firebase-functions/params'
import { getFirestore } from 'firebase-admin/firestore'
import { clienteResend } from './resend'
import { RESEND_API_KEY } from './params'
import { carregarRetrato, estadoFirestore, sincronizar, type CacheResend } from './contatoSync'

const SINCRONIZAR_CONTATOS = defineBoolean('SINCRONIZAR_CONTATOS', { default: false })
const FUSO = 'America/Sao_Paulo'

// Cache por instância (segmentos e propriedades já existentes no Resend).
const cache: CacheResend = {}

async function sincronizarUids(uids: Iterable<string>, motivo: string, forcar = false) {
  if (!SINCRONIZAR_CONTATOS.value()) return
  const db = getFirestore()
  const resend = clienteResend({ apiKey: RESEND_API_KEY.value() })
  const estado = estadoFirestore(db)
  const contagem: Record<string, number> = {}
  for (const uid of new Set(uids)) {
    try {
      const r = await sincronizar(uid, await carregarRetrato(db, uid), { resend, estado, cache, forcar })
      contagem[r] = (contagem[r] ?? 0) + 1
    } catch (e) {
      contagem.falhou = (contagem.falhou ?? 0) + 1
      console.error(`contato resend ${uid} (${motivo}):`, e instanceof Error ? e.message : e)
    }
  }
  console.log(`contatos resend (${motivo}):`, JSON.stringify(contagem))
}

const opcoes = { secrets: [RESEND_API_KEY], timeoutSeconds: 120 }

export const contatoResendUsuario = onDocumentWritten({ document: 'users/{uid}', ...opcoes }, async (ev) => {
  await sincronizarUids([ev.params.uid], 'usuario')
})

export const contatoResendMembro = onDocumentWritten({ document: 'restaurants/{rid}/membros/{uid}', ...opcoes }, async (ev) => {
  await sincronizarUids([ev.params.uid], 'membro')
})

export const contatoResendLoja = onDocumentWritten({ document: 'restaurants/{rid}', ...opcoes }, async (ev) => {
  const antes = (ev.data?.before.data()?.memberUids as string[] | undefined) ?? []
  const depois = (ev.data?.after.data()?.memberUids as string[] | undefined) ?? []
  const mudou = [...antes.filter((u) => !depois.includes(u)), ...depois.filter((u) => !antes.includes(u))]
  if (mudou.length) await sincronizarUids(mudou, 'loja')
})

export const contatoResendAssinatura = onDocumentWritten({ document: 'assinaturas/{rid}', ...opcoes }, async (ev) => {
  const loja = await getFirestore().doc(`restaurants/${ev.params.rid}`).get()
  await sincronizarUids((loja.data()?.memberUids as string[] | undefined) ?? [], 'assinatura')
})

export const conferirContatosResend = onSchedule(
  { schedule: '0 6 * * *', timeZone: FUSO, secrets: [RESEND_API_KEY], timeoutSeconds: 540 },
  async () => {
    const usuarios = await getFirestore().collection('users').select().get()
    await sincronizarUids(
      usuarios.docs.map((d) => d.id),
      'conferencia',
    )
  },
)
