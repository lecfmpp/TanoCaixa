/* ------------------------------------------------------------------ *
 * Repete, todo dia às 00h10 (São Paulo), as despesas marcadas como "se repete todo
 * mês" no mês que acabou de virar. A regra está em recorrentes.ts (testada).
 *
 * Cada repetição é gravada junto com um marcador em `recorrencias/{id}` (mesmo id,
 * mesmo lote): se a pessoa apagar a despesa do mês, o marcador impede que ela
 * volte no dia seguinte. Gravar duas vezes é inofensivo: o id é fixo e `create`
 * falha se já existir.
 * ------------------------------------------------------------------ */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import { repetirDoRestaurante, type BancoRec } from './recorrentesDb'

const FUSO = 'America/Sao_Paulo'

const ehDemo = (rid: string) => rid.startsWith('demo-') || rid.startsWith('rede-demo')

/** 'YYYY-MM-DD' no fuso de São Paulo. */
const diaSP = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(d)

export const repetirDespesasRecorrentes = onSchedule({ schedule: '10 0 * * *', timeZone: FUSO, timeoutSeconds: 300 }, async () => {
  const hoje = diaSP()
  const agora = new Date().toISOString()
  const restaurantes = await getFirestore().collection('restaurants').listDocuments()
  let total = 0
  for (const ref of restaurantes) {
    if (ehDemo(ref.id)) continue
    try {
      const n = await repetirDoRestaurante(getFirestore() as unknown as BancoRec, ref.id, hoje, agora)
      if (n) console.log(`recorrentes ${ref.id}: ${n} despesa(s) repetida(s) em ${hoje.slice(0, 7)}`)
      total += n
    } catch (e) {
      console.error(`recorrentes: falhou em ${ref.id}`, e)
    }
  }
  console.log(`recorrentes: ${total} repetição(ões) em ${restaurantes.length} restaurante(s) (${hoje})`)
})
