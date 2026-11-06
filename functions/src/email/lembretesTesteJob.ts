/* ------------------------------------------------------------------ *
 * Job das 9h (Brasília): lembretes do fim do teste.
 * Lê todas as lojas reais (`restaurants`) e a assinatura de cada uma — loja
 * que nunca passou pelo Stripe não tem doc em `assinaturas` e conta como
 * teste até FIM_DO_TESTE. Acha as lojas cujo teste acaba em 7, 2, 0 dias ou
 * acabou ontem, agrupa por dono (um e-mail por dono, com a lista de lojas)
 * e envia uma vez só por dono+passo+data de fim.
 * Isentas (Loja Teste), demos e lojas assinadas ficam de fora; a situação é
 * lida na hora do envio.
 * ------------------------------------------------------------------ */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { fimDoTesteDaConta } from '../assinatura'
import { ehLojaDemo, situacaoDaLoja, type AssinaturaDaLoja } from './contato'
import { donosDaLoja, type Dono } from './donos'
import { enviarUmaVez } from './enviarUmaVez'
import { diaSP, montarLembreteTeste, passoCombinaComSituacao, passoDoTeste, type LojaDoLembrete, type PassoTeste } from './lembretesTeste'
import { clienteResend } from './resend'
import { EMAIL_TESTE_PARA, modoAtual, RESEND_API_KEY } from './params'

export const lembretesFimDoTeste = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'America/Sao_Paulo', secrets: [RESEND_API_KEY], timeoutSeconds: 1800 },
  async () => {
    const db = getFirestore()
    const agora = new Date()
    const porDono = new Map<string, { dono: Dono; passo: PassoTeste; testeAte: string; lojas: LojaDoLembrete[] }>()

    const [lojas, assinaturas] = await Promise.all([db.collection('restaurants').get(), db.collection('assinaturas').get()])
    const assinaturaDe = new Map(assinaturas.docs.map((a) => [a.id, a.data() as AssinaturaDaLoja]))
    for (const lojaDoc of lojas.docs) {
      const rid = lojaDoc.id
      if (ehLojaDemo(rid)) continue
      const dados: AssinaturaDaLoja = assinaturaDe.get(rid) ?? {}
      const testeAte = fimDoTesteDaConta(dados.testeAte)
      const passo = passoDoTeste(testeAte, agora)
      if (!passo || !passoCombinaComSituacao(passo, situacaoDaLoja(dados, agora))) continue

      const [donos, dias] = await Promise.all([
        donosDaLoja(db, rid),
        db.collection(`restaurants/${rid}/receita_dia`).count().get(),
      ])
      const item: LojaDoLembrete = { rid, nome: (lojaDoc.data()?.nome as string | undefined) ?? 'sua loja', diasLancados: dias.data().count }
      for (const dono of donos) {
        const k = `${dono.uid}|${passo}|${diaSP(new Date(testeAte))}`
        const atual = porDono.get(k) ?? { dono, passo, testeAte, lojas: [] }
        atual.lojas.push(item)
        porDono.set(k, atual)
      }
    }

    const resend = clienteResend({ apiKey: RESEND_API_KEY.value() })
    const deps = { db, resend, modo: modoAtual(), testePara: EMAIL_TESTE_PARA.value() }
    const contagem: Record<string, number> = {}
    for (const { dono, passo, testeAte, lojas } of porDono.values()) {
      const email = montarLembreteTeste(passo, { primeiroNome: dono.primeiroNome, lojas, testeAte })
      const r = await enviarUmaVez(
        { chave: `${dono.uid}_teste_${passo}_${diaSP(new Date(testeAte))}`, para: dono.email, email, tipo: `teste_${passo}`, uid: dono.uid, usarTemplate: lojas.length === 1 },
        deps,
      )
      contagem[r] = (contagem[r] ?? 0) + 1
    }
    console.log(`lembretes do teste (${diaSP(agora)}, modo ${deps.modo}):`, JSON.stringify(contagem))
  },
)
