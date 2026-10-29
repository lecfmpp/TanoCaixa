#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Dá 14 dias de teste, a partir de agora, pra todo restaurante que já existe
 * (projeto tanocaixa). Grava em `assinaturas/{rid}`:
 *   { status: 'teste', testeDesde, testeAte }
 * Restaurante novo ganha o mesmo sozinho (gatilho comecarTeste).
 *
 * Fica de fora:
 * - demonstração (`demo-*`, `rede-demo*`);
 * - quem tem assinatura ativa no Stripe, e as lojas extras dele (pagadorId);
 * - quem já está num teste que ainda não venceu (dá pra rodar de novo).
 * customerId/subscriptionId que já existem ficam no doc (merge).
 *
 * Uso (de dentro de functions/):
 *   gcloud auth application-default login        # conta com acesso ao tanocaixa
 *   node scripts/migrar-teste-14-dias.cjs         # só mostra o que faria
 *   node scripts/migrar-teste-14-dias.cjs --aplicar
 * ------------------------------------------------------------------ */
const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const aplicar = process.argv.includes('--aplicar')
const DIAS_TESTE = 14 // igual a src/assinatura.ts
const ehDemo = (id) => id.startsWith('demo-') || id.startsWith('rede-demo')
const pago = (s) => s === 'ativa' || s === 'pagamento_falhou'

initializeApp({ credential: applicationDefault(), projectId: 'tanocaixa' })
const db = getFirestore()

async function main() {
  const restaurantes = (await db.collection('restaurants').get()).docs.filter((d) => !ehDemo(d.id))
  const refs = restaurantes.map((r) => db.doc(`assinaturas/${r.id}`))
  const assinaturas = refs.length ? await db.getAll(...refs) : []

  const agora = new Date()
  const testeAte = new Date(agora.getTime() + DIAS_TESTE * 24 * 3600 * 1000).toISOString()
  const mudar = []
  const deFora = []
  restaurantes.forEach((r, i) => {
    const a = assinaturas[i].data()
    const linha = { id: r.id, nome: r.data().nome ?? '—', status: a?.status ?? '(sem assinatura)' }
    if (pago(a?.status)) deFora.push({ ...linha, motivo: 'paga' })
    else if (a?.pagadorId) deFora.push({ ...linha, motivo: `loja extra de ${a.pagadorId}` })
    else if (a?.testeAte && new Date(a.testeAte) > agora) deFora.push({ ...linha, motivo: `teste até ${a.testeAte.slice(0, 10)}` })
    else mudar.push(linha)
  })

  console.log(`Restaurantes reais: ${restaurantes.length}`)
  console.log(`Ganham teste até ${testeAte.slice(0, 10)}: ${mudar.length}`)
  mudar.forEach((l) => console.log(`  ${l.id}  ${l.nome}  [${l.status}]`))
  console.log(`Ficam como estão: ${deFora.length}`)
  deFora.forEach((l) => console.log(`  ${l.id}  ${l.nome}  [${l.motivo}]`))

  if (!aplicar) {
    console.log('\nNada gravado. Rode de novo com --aplicar pra gravar.')
    return
  }
  for (let i = 0; i < mudar.length; i += 400) {
    const lote = db.batch()
    mudar.slice(i, i + 400).forEach((l) =>
      lote.set(
        db.doc(`assinaturas/${l.id}`),
        { status: 'teste', testeDesde: agora.toISOString(), testeAte, atualizadoEm: agora.toISOString() },
        { merge: true },
      ),
    )
    await lote.commit()
  }
  console.log(`\nGravado: ${mudar.length} restaurante(s) com teste até ${testeAte.slice(0, 10)}.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
