/* ------------------------------------------------------------------ *
 * Job das 9h (Brasília): lembretes do fim do teste.
 * Lê `assinaturas`, acha as lojas cujo teste acaba em 7, 2, 0 dias ou
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
  { schedule: '0 9 * * *', timeZone: 'America/Sao_Paulo', secrets: [RESEND_API_KEY], timeoutSeconds: 300 },
  async () => {
    const db = getFirestore()
    const agora = new Date()
    const porDono = new Map<string, { dono: Dono; passo: PassoTeste; testeAte: string; lojas: LojaDoLembrete[] }>()

    const assinaturas = await db.collection('assinaturas').get()
    for (const a of assinaturas.docs) {
      const rid = a.id
      if (ehLojaDemo(rid)) continue
      const dados = a.data() as AssinaturaDaLoja
      const testeAte = fimDoTesteDaConta(dados.testeAte)
      const passo = passoDoTeste(testeAte, agora)
      if (!passo || !passoCombinaComSituacao(passo, situacaoDaLoja(dados, agora))) continue

      const [loja, donos, dias] = await Promise.all([
        db.doc(`restaurants/${rid}`).get(),
        donosDaLoja(db, rid),
        db.collection(`restaurants/${rid}/receita_dia`).count().get(),
      ])
      const item: LojaDoLembrete = { rid, nome: (loja.data()?.nome as string | undefined) ?? 'sua loja', diasLancados: dias.data().count }
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
      const { assunto, html, text } = montarLembreteTeste(passo, { primeiroNome: dono.primeiroNome, lojas, testeAte })
      const r = await enviarUmaVez(
        { chave: `${dono.uid}_teste_${passo}_${diaSP(new Date(testeAte))}`, para: dono.email, assunto, html, text, tipo: `teste_${passo}`, uid: dono.uid },
        deps,
      )
      contagem[r] = (contagem[r] ?? 0) + 1
    }
    console.log(`lembretes do teste (${diaSP(agora)}, modo ${deps.modo}):`, JSON.stringify(contagem))
  },
)
