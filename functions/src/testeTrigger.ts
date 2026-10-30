/* Começa o teste de 14 dias de cada restaurante novo, em assinaturas/{rid}.
 * create() falha se o doc já existe: loja extra (aberta por abrirLojaExtra já
 * com o status de quem paga) e quem já assinou não são mexidos. Demonstração fica de fora. */
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { fimDoTeste } from './assinatura'
import { ehDemo } from './whatsapp'

export const comecarTeste = onDocumentCreated('restaurants/{rid}', async (event) => {
  const { rid } = event.params
  if (ehDemo(rid)) return
  const agora = new Date()
  try {
    await getFirestore().doc(`assinaturas/${rid}`).create({
      status: 'teste',
      testeDesde: agora.toISOString(),
      testeAte: fimDoTeste(agora),
      atualizadoEm: agora.toISOString(),
    })
  } catch (e) {
    if ((e as { code?: number }).code === 6) return // ALREADY_EXISTS
    throw e
  }
})
