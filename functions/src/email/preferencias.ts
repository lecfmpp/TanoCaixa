/* ------------------------------------------------------------------ *
 * Preferências de e-mail (LGPD). Quem manda é o Firestore:
 *   users/{uid}.emails = { dicas, recado, novidades, atualizadoEm, origem }
 * Transacional (senha, convite, cobrança, fim do teste) não tem opção:
 * sempre sai. Dicas e recado são legítimo interesse (ligados até a pessoa
 * desligar); novidades só com aceite (desligado até a pessoa ligar).
 *
 * Todo e-mail que não é transacional leva um link de descadastro
 * assinado (HMAC), que funciona sem login: /emails?u=&t=&s=
 * O cabeçalho List-Unsubscribe (Gmail/Yahoo, um clique) aponta pra
 * /api/descadastrar?u=&t=&s= — a função descadastrarUmClique.
 * ------------------------------------------------------------------ */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Topico } from './catalogo'
import { URL_SITE } from './layout'

export interface Preferencias {
  dicas: boolean
  recado: boolean
  novidades: boolean
}

export const PADRAO: Preferencias = { dicas: true, recado: true, novidades: false }
export const TOPICOS: Topico[] = ['dicas', 'recado', 'novidades']

export function lerPreferencias(emails: unknown): Preferencias {
  const e = (emails ?? {}) as Partial<Record<Topico, unknown>>
  return {
    dicas: typeof e.dicas === 'boolean' ? e.dicas : PADRAO.dicas,
    recado: typeof e.recado === 'boolean' ? e.recado : PADRAO.recado,
    novidades: typeof e.novidades === 'boolean' ? e.novidades : PADRAO.novidades,
  }
}

// A assinatura usa a RESEND_API_KEY como segredo: trocar a chave invalida
// os links de descadastro de todos os e-mails já enviados.
const assinar = (uid: string, topico: string, segredo: string) =>
  createHmac('sha256', `tnc-descadastro:${segredo}`).update(`${uid}|${topico}`).digest('base64url').slice(0, 22)

export function linkDescadastro(uid: string, topico: Topico | 'tudo', segredo: string): string {
  const q = new URLSearchParams({ u: uid, t: topico, s: assinar(uid, topico, segredo) })
  return `${URL_SITE}/emails?${q.toString()}`
}

/** Mesmo link, no endereço que responde ao POST de um clique (RFC 8058). */
export function linkUmClique(linkPagina: string): string {
  return linkPagina.replace(`${URL_SITE}/emails?`, `${URL_SITE}/api/descadastrar?`)
}

export function conferirDescadastro(uid: string, topico: string, assinatura: string, segredo: string): boolean {
  if (!uid || !(topico === 'tudo' || (TOPICOS as string[]).includes(topico))) return false
  const certo = Buffer.from(assinar(uid, topico, segredo))
  const veio = Buffer.from(assinatura ?? '')
  return certo.length === veio.length && timingSafeEqual(certo, veio)
}
