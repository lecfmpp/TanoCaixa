/* ------------------------------------------------------------------ *
 * E-mails de cobrança disparados pelo webhook do Stripe (regra e texto,
 * puros):
 *   invoice.paid (1ª fatura)            → "Pronto: a loja está assinada"
 *   invoice.payment_failed (1ª e última tentativa) → "Não conseguimos cobrar"
 *   customer.subscription.deleted       → "Sua assinatura foi cancelada"
 * O recibo de cada mês é do próprio Stripe (ligar no painel do Stripe).
 * ------------------------------------------------------------------ */
import { renderizar, type EmailPronto } from './catalogo'
import { comUtm, URL_SITE } from './layout'
import { linkAssinar } from './lembretesTeste'

export type EmailCobranca =
  | { tipo: 'ativa'; chave: string; valorCentavos: number; lojas: number; proximaCobranca?: string }
  | { tipo: 'falhou'; chave: string; ultimaTentativa: boolean; proximaTentativa?: string }
  | { tipo: 'cancelada'; chave: string; encerradaEm?: string }

type Obj = Record<string, unknown>
const iso = (unix: unknown) => (typeof unix === 'number' && unix > 0 ? new Date(unix * 1000).toISOString() : undefined)

/** Qual e-mail (se algum) um evento do Stripe pede. `chave` identifica o envio (uma vez só). */
export function emailDoEvento(tipoEvento: string, obj: Obj): EmailCobranca | null {
  if (tipoEvento === 'invoice.paid') {
    if (obj.billing_reason !== 'subscription_create') return null
    const linha = ((obj.lines as Obj | undefined)?.data as Obj[] | undefined)?.[0]
    return {
      tipo: 'ativa',
      chave: `ativa_${obj.id}`,
      valorCentavos: Number(obj.amount_paid) || 0,
      lojas: Number(linha?.quantity) || 1,
      proximaCobranca: iso((linha?.period as Obj | undefined)?.end),
    }
  }
  if (tipoEvento === 'invoice.payment_failed') {
    const ultima = obj.next_payment_attempt == null
    if (!ultima && Number(obj.attempt_count) !== 1) return null
    return {
      tipo: 'falhou',
      chave: `falhou_${obj.id}_${ultima ? 'final' : '1'}`,
      ultimaTentativa: ultima,
      proximaTentativa: iso(obj.next_payment_attempt),
    }
  }
  if (tipoEvento === 'customer.subscription.deleted') {
    return { tipo: 'cancelada', chave: `cancelada_${obj.id}`, encerradaEm: iso(obj.ended_at) ?? iso(obj.canceled_at) }
  }
  return null
}

const brl = (centavos: number) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const data = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })

export function linkPortal(rid: string, campanha: string): string {
  return comUtm(`${URL_SITE}/painel/assinatura?portal=1&loja=${encodeURIComponent(rid)}`, campanha, 'botao')
}

export function montarEmailCobranca(e: EmailCobranca, p: { primeiroNome: string; lojaNome: string; rid: string }): EmailPronto {
  const base = { NOME_VIRGULA: p.primeiroNome ? `${p.primeiroNome}, ` : '', LOJA: p.lojaNome }
  if (e.tipo === 'ativa') {
    return renderizar('cobranca-ativa', {
      ...base,
      VALOR: `${brl(e.valorCentavos)}${e.lojas > 1 ? ` (${e.lojas} lojas × R$ 149)` : ''}`,
      PROXIMA: e.proximaCobranca ? `Próxima cobrança: ${data(e.proximaCobranca)}` : '',
    })
  }
  if (e.tipo === 'falhou') {
    const id = e.ultimaTentativa ? 'cobranca-falhou-final' : 'cobranca-falhou'
    return renderizar(id, {
      ...base,
      QUANDO: e.proximaTentativa ? `Vamos tentar de novo em ${data(e.proximaTentativa)}.` : '',
      LINK: linkPortal(p.rid, `tnc-${id}`),
    })
  }
  return renderizar('cobranca-cancelada', {
    ...base,
    ENCERRADA: e.encerradaEm ? ` em ${data(e.encerradaEm)}` : '',
    LINK: linkAssinar(p.rid, 'cancelada'),
  })
}
