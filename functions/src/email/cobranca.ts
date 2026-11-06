/* ------------------------------------------------------------------ *
 * E-mails de cobrança disparados pelo webhook do Stripe (regra e texto,
 * puros):
 *   invoice.paid (1ª fatura)            → "Pronto: a loja está assinada"
 *   invoice.payment_failed (1ª e última tentativa) → "Não conseguimos cobrar"
 *   customer.subscription.deleted       → "Sua assinatura foi cancelada"
 * O recibo de cada mês é do próprio Stripe (ligar no painel do Stripe).
 * ------------------------------------------------------------------ */
import { comUtm, montarHtml, URL_SITE } from './layout'
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

export function montarEmailCobranca(
  e: EmailCobranca,
  p: { primeiroNome: string; lojaNome: string; rid: string },
): { assunto: string; html: string; text: string } {
  const oi = p.primeiroNome ? `${p.primeiroNome}, ` : ''
  const motivo = 'Você recebe este e-mail porque é dono de uma loja com assinatura no Tá no Caixa.'
  if (e.tipo === 'ativa') {
    const { html, text } = montarHtml({
      previa: 'Assinatura confirmada. Pode seguir lançando.',
      rotulo: 'Assinatura',
      titulo: `Pronto: a ${p.lojaNome} está assinada`,
      blocos: [
        { p: `${oi}obrigado por assinar o Tá no Caixa. Está tudo liberado, é só seguir lançando.` },
        {
          lista: [
            `Valor: ${brl(e.valorCentavos)} por mês${e.lojas > 1 ? ` (${e.lojas} lojas × R$ 149)` : ''}`,
            ...(e.proximaCobranca ? [`Próxima cobrança: ${data(e.proximaCobranca)}`] : []),
            'O recibo de cada mês chega por e-mail, enviado pelo Stripe.',
            'A nota fiscal é emitida à parte e enviada depois.',
          ],
        },
        { botao: { texto: 'Abrir o Tá no Caixa', url: comUtm(`${URL_SITE}/painel`, 'tnc-assinatura-ativa', 'botao') } },
        { nota: 'Para trocar o cartão, ver faturas ou cancelar: Assinatura › Trocar cartão e ver faturas, no app.' },
      ],
      motivo,
    })
    return { assunto: `Pronto: a ${p.lojaNome} está assinada`, html, text }
  }
  if (e.tipo === 'falhou') {
    const quando = e.proximaTentativa ? ` Vamos tentar de novo em ${data(e.proximaTentativa)}.` : ''
    const { html, text } = montarHtml({
      previa: 'Troque o cartão em um minuto para não interromper o acesso.',
      rotulo: 'Assinatura',
      titulo: e.ultimaTentativa ? `A cobrança da ${p.lojaNome} não passou de novo` : `Não conseguimos cobrar o cartão da ${p.lojaNome}`,
      blocos: [
        {
          p: e.ultimaTentativa
            ? `${oi}tentamos cobrar algumas vezes e o cartão não passou. Para não interromper o acesso da loja, atualize o cartão.`
            : `${oi}a cobrança da assinatura não passou. Acontece: cartão vencido, limite ou bloqueio do banco.${quando}`,
        },
        { botao: { texto: 'Trocar o cartão', url: linkPortal(p.rid, e.ultimaTentativa ? 'tnc-pagamento-falhou-final' : 'tnc-pagamento-falhou') } },
        { nota: 'Seus lançamentos continuam guardados.' },
      ],
      motivo,
    })
    return { assunto: e.ultimaTentativa ? `Última tentativa: a cobrança da ${p.lojaNome} não passou` : `Não conseguimos cobrar o cartão da ${p.lojaNome}`, html, text }
  }
  const { html, text } = montarHtml({
    previa: 'Seus dados ficam guardados.',
    rotulo: 'Assinatura',
    titulo: `A assinatura da ${p.lojaNome} foi cancelada`,
    blocos: [
      { p: `${oi}a assinatura da ${p.lojaNome} foi encerrada${e.encerradaEm ? ` em ${data(e.encerradaEm)}` : ''}. Vendas, despesas e estoque ficam guardados do jeito que estão.` },
      { p: 'Se quiser voltar, é só assinar de novo e continuar de onde parou.' },
      { botao: { texto: 'Assinar de novo', url: linkAssinar(p.rid, 'cancelada') } },
      { nota: 'Cancelou sem querer ou teve algum problema? Responda este e-mail que a gente ajuda.' },
    ],
    motivo,
  })
  return { assunto: `A assinatura da ${p.lojaNome} foi cancelada`, html, text }
}
