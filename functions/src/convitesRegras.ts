/* ------------------------------------------------------------------ *
 * Regras puras do convite por loja (sem Firestore), pra testar sem rede.
 * ------------------------------------------------------------------ */
import { HttpsError } from 'firebase-functions/v2/https'
import { normalizarPapel } from './papel'

/** Papéis que um convite pode dar. Dono e franqueador não se convidam. */
const PAPEIS_CONVITE = ['gestao', 'caixa', 'cozinha'] as const
/** Teto de lojas num convite só — rede grande convida em mais de um link. */
const MAX_LOJAS = 30

export interface LojaDoConvite {
  restauranteId: string
  restauranteNome: string
  papel: string
}

export interface ConviteDoc {
  /** Lojas e papel em cada uma. Convites antigos não têm (só os 3 campos abaixo). */
  lojas?: LojaDoConvite[]
  /** Primeira loja do convite — mantido pra convites antigos e pra exibição curta. */
  restauranteId: string
  restauranteNome: string
  papel: string
  criadoPor: string
  criadoEm: string
  status: 'pendente' | 'aceito' | 'revogado'
  usadoPor?: string
  aceitoEm?: string
  /** Convite de gestor (convidarGestor): só quem entrar com este e-mail aceita. */
  email?: string
}

/** Lojas do convite, inclusive dos convites gerados antes do convite por loja. */
export function lojasDoConvite(c: ConviteDoc): LojaDoConvite[] {
  if (c.lojas?.length) return c.lojas
  return [{ restauranteId: c.restauranteId, restauranteNome: c.restauranteNome, papel: c.papel }]
}

/** Quem pode convidar pra uma loja: dono, franqueador (dono da rede) ou gestão. */
export function podeConvidar(papelBruto: string | undefined): boolean {
  if (papelBruto === 'franqueador') return true
  const p = normalizarPapel(papelBruto)
  return p === 'dono' || p === 'gestao'
}

/**
 * Normaliza o pedido: aceita `{ lojas: [{restauranteId, papel}] }` e o formato
 * antigo `{ restauranteId, papel }`. Remove lojas repetidas (fica a primeira).
 */
export function pedidoDeLojas(data: unknown): { restauranteId: string; papel: string }[] {
  const d = (data ?? {}) as { lojas?: unknown; restauranteId?: unknown; papel?: unknown }
  const brutas = Array.isArray(d.lojas) ? d.lojas : d.restauranteId ? [{ restauranteId: d.restauranteId, papel: d.papel }] : []
  const vistas = new Set<string>()
  const lojas: { restauranteId: string; papel: string }[] = []
  for (const b of brutas as { restauranteId?: unknown; papel?: unknown }[]) {
    const restauranteId = typeof b?.restauranteId === 'string' ? b.restauranteId.trim() : ''
    const papel = typeof b?.papel === 'string' ? b.papel : ''
    if (!restauranteId) throw new HttpsError('invalid-argument', 'Loja sem id no convite')
    if (!(PAPEIS_CONVITE as readonly string[]).includes(papel)) {
      throw new HttpsError('invalid-argument', `papel inválido: ${papel || '(vazio)'}`)
    }
    if (vistas.has(restauranteId)) continue
    vistas.add(restauranteId)
    lojas.push({ restauranteId, papel })
  }
  if (!lojas.length) throw new HttpsError('invalid-argument', 'Escolha pelo menos uma loja pro convite')
  if (lojas.length > MAX_LOJAS) throw new HttpsError('invalid-argument', `No máximo ${MAX_LOJAS} lojas por convite`)
  return lojas
}


/** Convite preso a e-mail: só aceita quem entrou com aquele e-mail. */
export function emailConfere(c: Pick<ConviteDoc, 'email'>, emailDoLogin: string): boolean {
  return !c.email || c.email.trim().toLowerCase() === emailDoLogin.trim().toLowerCase()
}
