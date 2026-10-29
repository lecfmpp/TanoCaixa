#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Põe todos os restaurantes no plano Grátis (projeto tanocaixa).
 *
 * O plano mora em `assinaturas/{restauranteId}` e sai do `status`: só
 * 'ativa' ou 'pagamento_falhou' liberam o Pro. Este script grava
 * `{ status: 'gratis', plano: 'gratis' }` em cada restaurante real.
 *
 * - Demonstração (`demo-*`, `rede-demo*`) fica de fora.
 * - Quem tem assinatura ativa no Stripe NÃO é mexido (seria tirar o Pro de quem
 *   está pagando). Aparece na lista; pra incluir, passe --incluir-pagantes e
 *   cancele a assinatura no Stripe à parte.
 * - customerId/subscriptionId que já existem ficam no doc (merge).
 *
 * Uso (de dentro de functions/):
 *   gcloud auth application-default login        # conta com acesso ao tanocaixa
 *   node scripts/migrar-plano-gratis.cjs          # só mostra o que faria
 *   node scripts/migrar-plano-gratis.cjs --aplicar
 * ------------------------------------------------------------------ */
const { initializeApp, applicationDefault } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')

const aplicar = process.argv.includes('--aplicar')
const incluirPagantes = process.argv.includes('--incluir-pagantes')
const ehDemo = (id) => id.startsWith('demo-') || id.startsWith('rede-demo')
const pago = (s) => s === 'ativa' || s === 'pagamento_falhou'

initializeApp({ credential: applicationDefault(), projectId: 'tanocaixa' })
const db = getFirestore()

async function main() {
  const restaurantes = (await db.collection('restaurants').get()).docs.filter((d) => !ehDemo(d.id))
  const refs = restaurantes.map((r) => db.doc(`assinaturas/${r.id}`))
  const assinaturas = refs.length ? await db.getAll(...refs) : []

  const mudar = []
  const pagantes = []
  restaurantes.forEach((r, i) => {
    const a = assinaturas[i].data()
    const linha = { id: r.id, nome: r.data().nome ?? '—', status: a?.status ?? '(sem assinatura)' }
    if (pago(a?.status) && !incluirPagantes) pagantes.push(linha)
    else if (a?.status !== 'gratis') mudar.push(linha)
  })

  console.log(`Restaurantes reais: ${restaurantes.length}`)
  console.log(`Vão para o Grátis: ${mudar.length}`)
  mudar.forEach((l) => console.log(`  ${l.id}  ${l.nome}  [${l.status}]`))
  console.log(`Com assinatura ativa (não mexidos): ${pagantes.length}`)
  pagantes.forEach((l) => console.log(`  ${l.id}  ${l.nome}  [${l.status}]`))

  if (!aplicar) {
    console.log('\nNada gravado. Rode de novo com --aplicar pra gravar.')
    return
  }
  const agora = new Date().toISOString()
  for (let i = 0; i < mudar.length; i += 400) {
    const lote = db.batch()
    mudar.slice(i, i + 400).forEach((l) =>
      lote.set(db.doc(`assinaturas/${l.id}`), { status: 'gratis', plano: 'gratis', migradoParaGratisEm: agora, atualizadoEm: agora }, { merge: true }),
    )
    await lote.commit()
  }
  console.log(`\nGravado: ${mudar.length} restaurante(s) no Grátis.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
