#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Tira uma pessoa de todas as lojas, MENOS as que você mandar manter.
 *
 * O Firestore não tem SQL: o acesso a uma loja é o uid estar em
 * restaurants/{id}.memberUids (+ o doc restaurants/{id}/membros/{uid}).
 * Este script mexe nos dois, e também em users/{uid}.acessos e
 * users/{uid}.restauranteId (a loja que abre no login).
 *
 * SIMULA por padrão. Só grava com --aplicar.
 *
 * Uso (de dentro de functions/, que já tem o firebase-admin):
 *   gcloud auth application-default login         # uma vez, com sua conta
 *   node scripts/revogar-acesso-lojas.mjs --email felipe@exemplo.com --manter "fausto curicica"
 *   node scripts/revogar-acesso-lojas.mjs --email felipe@exemplo.com --manter "fausto curicica" --aplicar
 *
 * --manter: palavras que precisam aparecer TODAS em "nome + bairro" da loja
 *           (sem acento, sem maiúscula). Se nenhuma loja bater, não mexe em nada.
 * --uid:    no lugar de --email, se você já souber o uid.
 * ------------------------------------------------------------------ */
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const args = process.argv.slice(2)
const arg = (nome) => {
  const i = args.indexOf(`--${nome}`)
  return i >= 0 ? args[i + 1] : undefined
}
const aplicar = args.includes('--aplicar')
const email = arg('email')?.trim().toLowerCase()
let uid = arg('uid')
const manter = arg('manter')

if ((!email && !uid) || !manter) {
  console.error('Uso: node scripts/revogar-acesso-lojas.mjs --email <email> --manter "fausto curicica" [--aplicar]')
  process.exit(1)
}

initializeApp({ credential: applicationDefault(), projectId: 'tanocaixa' })
const db = getFirestore()

const semAcento = (t) => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const termos = semAcento(manter).split(/\s+/).filter(Boolean)
const fica = (r) => termos.every((t) => semAcento(`${r.nome} ${r.bairro}`).includes(t))

if (!uid) {
  uid = (await getAuth().getUserByEmail(email)).uid
}
const userRef = db.doc(`users/${uid}`)
const user = (await userRef.get()).data() ?? {}
console.log(`Pessoa: ${user.nome ?? '?'} <${user.email ?? email ?? '?'}>  uid=${uid}`)
console.log(`Loja que abre no login hoje: ${user.restauranteId ?? '(nenhuma)'}\n`)

const snap = await db.collection('restaurants').where('memberUids', 'array-contains', uid).get()
const lojas = await Promise.all(
  snap.docs.map(async (d) => {
    const m = await d.ref.collection('membros').doc(uid).get()
    const r = d.data()
    return { id: d.id, nome: r.nome ?? '?', bairro: r.bairro ?? '', papel: m.data()?.papel ?? '(sem doc de membro)' }
  }),
)

const manterLojas = lojas.filter(fica)
const tirar = lojas.filter((l) => !fica(l))

console.log('Lojas em que a pessoa é membro hoje:')
for (const l of lojas) console.log(`  ${fica(l) ? 'MANTÉM' : 'TIRA  '}  ${l.nome} · ${l.bairro}  (${l.papel})  [${l.id}]`)
console.log()

if (!manterLojas.length) {
  console.error(`Nenhuma loja bate com "${manter}". Nada foi alterado — confira o nome/bairro acima.`)
  process.exit(2)
}
if (!tirar.length) {
  console.log('Nada a tirar: a pessoa já está só nas lojas que ficam.')
  process.exit(0)
}

const novaLojaDoLogin = tirar.some((l) => l.id === user.restauranteId) ? manterLojas[0].id : user.restauranteId

if (!aplicar) {
  console.log(`SIMULAÇÃO: tiraria ${tirar.length} loja(s).`)
  if (novaLojaDoLogin !== user.restauranteId) console.log(`  e a loja do login passaria a ser ${manterLojas[0].nome} [${novaLojaDoLogin}]`)
  console.log('Rode de novo com --aplicar pra gravar.')
  process.exit(0)
}

const batch = db.batch()
for (const l of tirar) {
  batch.update(db.doc(`restaurants/${l.id}`), { memberUids: FieldValue.arrayRemove(uid) })
  batch.delete(db.doc(`restaurants/${l.id}/membros/${uid}`))
}
const patchUser = Object.fromEntries(tirar.map((l) => [`acessos.${l.id}`, FieldValue.delete()]))
if (novaLojaDoLogin !== user.restauranteId) patchUser.restauranteId = novaLojaDoLogin
if (Object.keys(patchUser).length && (await userRef.get()).exists) batch.update(userRef, patchUser)
await batch.commit()

console.log(`Feito: tirei ${tirar.length} loja(s). A pessoa precisa sair e entrar de novo pra ver só ${manterLojas.map((l) => l.nome).join(', ')}.`)
