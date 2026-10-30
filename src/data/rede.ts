/* ------------------------------------------------------------------ *
 * Rede de lojas — franquia ou várias lojas do mesmo dono.
 *
 * Cada loja continua sendo um tenant próprio (restaurants/{id}), com sua
 * equipe, seu caixa e seu DRE. A rede é só o guarda-chuva: um doc raiz
 * `redes/{id}` que lista as lojas e diz quem é o dono da rede.
 *
 * O franqueador entra em memberUids de cada loja que ele cria, e é isso que
 * as regras do Firestore usam pra liberar a leitura do consolidado.
 * ------------------------------------------------------------------ */

import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { nomeDoMesAtual } from './planoMes'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '@/lib/firebase'
import { TETOS_PADRAO } from './planoContas'
import type { TipoNegocio } from '@/types'

export interface LojaDaRede {
  restauranteId: string
  nome: string
  bairro: string
  cidade: string
  /** Loja que a franqueadora opera direto (não é de um franqueado). */
  propria?: boolean
}

export interface RedeDoc {
  id: string
  nome: string
  tipo: 'franquia' | 'multi_loja'
  donoUid: string
  lojas: LojaDaRede[]
  criadoEm: string
  /** Só na rede de demonstração — versiona os dados de exemplo. */
  seedVersao?: number
}

function redeRef(id: string) {
  return doc(db, 'redes', id)
}

export async function getRede(id: string): Promise<RedeDoc | null> {
  const snap = await getDoc(redeRef(id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as RedeDoc) : null
}

/** Rede que este usuário é dono. Usado quando `users/{uid}.redeId` não existe. */
export async function getRedeDoDono(uid: string): Promise<RedeDoc | null> {
  const snap = await getDocs(query(collection(db, 'redes'), where('donoUid', '==', uid)))
  const d = snap.docs[0]
  return d ? ({ id: d.id, ...d.data() } as RedeDoc) : null
}

export async function salvarRede(id: string, dados: Partial<RedeDoc>): Promise<void> {
  await setDoc(redeRef(id), dados, { merge: true })
}

/** Cria a rede do usuário e já registra a loja atual como primeira unidade. */
export async function criarRede(p: {
  uid: string
  nome: string
  tipo: RedeDoc['tipo']
  primeiraLoja: LojaDaRede
}): Promise<RedeDoc> {
  const id = `rede-${p.uid.slice(0, 10)}`
  const rede: RedeDoc = {
    id,
    nome: p.nome,
    tipo: p.tipo,
    donoUid: p.uid,
    lojas: [{ ...p.primeiraLoja, propria: true }],
    criadoEm: new Date().toISOString(),
  }
  await salvarRede(id, rede)
  await setDoc(doc(db, 'users', p.uid), { redeId: id }, { merge: true })
  await setDoc(doc(db, 'restaurants', p.primeiraLoja.restauranteId), { redeId: id }, { merge: true })
  return rede
}

/**
 * Abre uma loja nova dentro da rede, como loja extra do Pro (+ R$ 79/mês).
 * Quem cria é a Cloud Function `abrirLojaExtra`: ela cobra no Stripe primeiro
 * (sem pagamento, nada de loja), cria o tenant com o dono da rede em
 * memberUids e registra na lista da rede. Aqui só completamos a configuração.
 */
export async function abrirLoja(p: {
  restauranteId: string
  nome: string
  bairro: string
  cidade: string
  tipoNegocio: TipoNegocio
}): Promise<LojaDaRede> {
  const abrir = httpsCallable<typeof p, LojaDaRede>(functions, 'abrirLojaExtra')
  const loja = (await abrir(p)).data
  await setDoc(
    doc(db, 'restaurants', loja.restauranteId),
    { tetos: TETOS_PADRAO, aberturaMes: nomeDoMesAtual() },
    { merge: true },
  )
  return loja
}
