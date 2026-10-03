/* Gatilho do e-mail de boas-vindas.
 *
 * Por que onDocumentCreated em users/{uid} (e não auth onCreate):
 *  - o documento users/{uid} só nasce no fim do provisionamento do primeiro
 *    cadastro (e-mail/senha ou Google), já com nome e e-mail gravados; o
 *    gatilho de Auth dispararia antes do nome existir;
 *  - Cloud Functions v2 não tem gatilho de Auth simples (só bloqueante, que
 *    exige Identity Platform e atrasaria o cadastro se o Resend falhar);
 *  - um login seguinte não recria o documento, então não reenvia.
 * Idempotência: cadeado em emails_enviados/{uid}_boas_vindas (create() falha
 * se já existe) + Idempotency-Key no Resend. Só o Admin SDK escreve ali. */
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { enviarBoasVindas, type Cadeado } from './boasVindas'

const RESEND_API_KEY = defineSecret('RESEND_API_KEY')

function cadeadoFirestore(): Cadeado {
  const ref = (uid: string) => getFirestore().doc(`emails_enviados/${uid}_boas_vindas`)
  return {
    tomar: async (uid) => {
      try {
        await ref(uid).create({ tipo: 'boas_vindas', uid, status: 'enviando', criadoEm: FieldValue.serverTimestamp() })
        return true
      } catch (e) {
        if ((e as { code?: number }).code === 6) return false // ALREADY_EXISTS
        throw e
      }
    },
    concluir: async (uid, resendId) => {
      await ref(uid).set({ status: 'enviado', resendId: resendId ?? null, enviadoEm: FieldValue.serverTimestamp() }, { merge: true })
    },
    liberar: async (uid, erro) => {
      console.error(`boas-vindas falhou (${uid}): ${erro}`)
      await ref(uid).delete()
    },
  }
}

export const boasVindas = onDocumentCreated(
  { document: 'users/{uid}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const dados = event.data?.data() as { nome?: string; email?: string } | undefined
    const r = await enviarBoasVindas(event.params.uid, dados, {
      apiKey: RESEND_API_KEY.value(),
      cadeado: cadeadoFirestore(),
    })
    console.log(`boas-vindas ${event.params.uid}: ${r}`)
  },
)
