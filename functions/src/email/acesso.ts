/* ------------------------------------------------------------------ *
 * Senha, verificação e troca de e-mail pelo Resend (o Firebase Auth não
 * envia mais nada). O Admin SDK gera o código; o link vai pro nosso
 * domínio (tanocaixa.com/conta/acao), que conclui a ação no app.
 *
 *   enviarEmailDeAcesso({ tipo: 'senha', email })          sem login
 *   enviarEmailDeAcesso({ tipo: 'verificacao' })           logado
 *   enviarEmailDeAcesso({ tipo: 'troca_email', novoEmail }) logado
 *
 * "Esqueci a senha" responde igual exista ou não a conta (não revela quem
 * tem cadastro) e tem limite de 3 pedidos por e-mail por hora.
 * Esses e-mails são pedidos pela própria pessoa: saem de verdade mesmo no
 * modo "teste" (só o modo "desligado" segura).
 * ------------------------------------------------------------------ */
import { createHash } from 'node:crypto'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { renderizar } from './catalogo'
import { primeiroNome } from './contato'
import { enviarComReserva } from './enviarUmaVez'
import { URL_SITE } from './layout'
import { EMAIL_TESTE_PARA, modoAtual, RESEND_API_KEY } from './params'
import { clienteResend } from './resend'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const LIMITE_POR_HORA = 3
/**
 * Erros do Admin SDK pra e-mail sem conta (o generatePasswordResetLink usa
 * 'auth/email-not-found'). No "esqueci a senha" viram sucesso, pra resposta
 * não revelar quem tem conta.
 */
export const CONTA_INEXISTENTE = new Set(['auth/user-not-found', 'auth/email-not-found'])

/** Link do Firebase (…/__/auth/action?mode=…&oobCode=…) → mesmo código no nosso domínio. */
export function linkNoNossoDominio(linkFirebase: string): string {
  const u = new URL(linkFirebase)
  const q = new URLSearchParams({ mode: u.searchParams.get('mode') ?? '', oobCode: u.searchParams.get('oobCode') ?? '' })
  return `${URL_SITE}/conta/acao?${q.toString()}`
}

/** Dentro do limite? Guarda os horários dos pedidos da última hora. */
export function dentroDoLimite(pedidos: number[], agora: number): { ok: boolean; pedidos: number[] } {
  const recentes = pedidos.filter((t) => agora - t < 3_600_000)
  if (recentes.length >= LIMITE_POR_HORA) return { ok: false, pedidos: recentes }
  return { ok: true, pedidos: [...recentes, agora] }
}

const acao = { url: `${URL_SITE}/entrar` }

export const enviarEmailDeAcesso = onCall({ secrets: [RESEND_API_KEY] }, async (req) => {
  const { tipo, email: emailInformado, novoEmail } = (req.data ?? {}) as { tipo?: string; email?: string; novoEmail?: string }
  const auth = getAuth()
  const db = getFirestore()

  let para: string
  let id: 'acesso-senha' | 'acesso-verificacao' | 'acesso-troca-email'
  let gerar: () => Promise<string>
  let nome = ''
  if (tipo === 'senha') {
    para = (emailInformado ?? '').trim().toLowerCase()
    if (!EMAIL.test(para)) throw new HttpsError('invalid-argument', 'E-mail inválido')
    id = 'acesso-senha'
    gerar = () => auth.generatePasswordResetLink(para, acao)
  } else if (tipo === 'verificacao' || tipo === 'troca_email') {
    const uid = req.auth?.uid
    const atual = (req.auth?.token.email ?? '').toLowerCase()
    if (!uid || !atual) throw new HttpsError('unauthenticated', 'Faça login primeiro')
    // O token pode ser de antes do updateProfile (cadastro agora): lê o nome na conta.
    const nomeConta = (req.auth?.token.name as string | undefined) || (await auth.getUser(uid).catch(() => null))?.displayName || undefined
    nome = primeiroNome(nomeConta, atual)
    if (tipo === 'verificacao') {
      para = atual
      id = 'acesso-verificacao'
      gerar = () => auth.generateEmailVerificationLink(atual, acao)
    } else {
      para = (novoEmail ?? '').trim().toLowerCase()
      if (!EMAIL.test(para) || para === atual) throw new HttpsError('invalid-argument', 'Novo e-mail inválido')
      id = 'acesso-troca-email'
      gerar = () => auth.generateVerifyAndChangeEmailLink(atual, para, acao)
    }
  } else {
    throw new HttpsError('invalid-argument', 'tipo deve ser senha, verificacao ou troca_email')
  }

  // Limite por e-mail de destino (hash: o Firestore não guarda o endereço).
  const limiteRef = db.doc(`limites_acesso/${createHash('sha256').update(`${id}|${para}`).digest('hex').slice(0, 40)}`)
  const limite = await db.runTransaction(async (tx) => {
    const atual = ((await tx.get(limiteRef)).data()?.pedidos as number[] | undefined) ?? []
    const r = dentroDoLimite(atual, Date.now())
    tx.set(limiteRef, { pedidos: r.pedidos })
    return r.ok
  })
  if (!limite) throw new HttpsError('resource-exhausted', 'Muitos pedidos. Tente de novo daqui a uma hora.')

  let link: string
  try {
    link = linkNoNossoDominio(await gerar())
  } catch (e) {
    // Conta inexistente no "esqueci a senha": responde ok mesmo assim.
    if (tipo === 'senha' && CONTA_INEXISTENTE.has((e as { code?: string }).code ?? '')) return { ok: true }
    console.error(`acesso ${id}:`, (e as Error).message)
    throw new HttpsError('internal', 'Não deu para gerar o link agora')
  }

  const vars = { OI: nome ? `Oi, ${nome}!` : 'Oi!', LINK: link, EMAIL_CONTA: para, EMAIL_NOVO: para }
  const modo = modoAtual() === 'desligado' ? 'desligado' : 'ativo'
  if (modo === 'desligado') return { ok: true }
  const chave = `acesso_${id}_${createHash('sha256').update(`${para}|${Date.now()}`).digest('hex').slice(0, 24)}`
  await enviarComReserva(
    { chave, para, email: renderizar(id, vars), tipo: id },
    true,
    { resend: clienteResend({ apiKey: RESEND_API_KEY.value() }), modo, testePara: EMAIL_TESTE_PARA.value() },
    chave,
  )
  return { ok: true }
})
