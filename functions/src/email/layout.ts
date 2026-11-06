/* ------------------------------------------------------------------ *
 * Layout comum dos e-mails do Tá no Caixa (HTML de tabela, que funciona
 * em Gmail/Outlook/Apple Mail) + versão em texto. Cores da marca do app.
 * ------------------------------------------------------------------ */

export const URL_SITE = 'https://tanocaixa.com'
export const REMETENTE = 'Tá no Caixa <ola@tanocaixa.com>'
export const RESPONDER_PARA = 'ola@tanocaixa.com'

const COR = { fundo: '#f0eee2', cartao: '#fbfaf2', borda: '#e1dfce', tinta: '#1c2a2e', tinta2: '#45585d', tinta3: '#6a7a7e', botao: '#c05437', botaoTexto: '#f7f5ea', mar: '#2e5f73' }
const FONTE = "Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

export function escapaHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** Bloco do corpo: parágrafo, lista ou botão. Texto sempre escapado. */
export type Bloco =
  | { p: string }
  | { lista: string[] }
  | { botao: { texto: string; url: string } }
  | { nota: string }

export interface ConteudoEmail {
  /** Texto que aparece ao lado do assunto na caixa de entrada. */
  previa: string
  rotulo?: string
  titulo: string
  blocos: Bloco[]
  /** Por que a pessoa recebe isto (rodapé). */
  motivo: string
}

/** Junta UTM no link do site; outros domínios ficam como estão. */
export function comUtm(url: string, campanha: string, conteudo: string): string {
  if (!url.startsWith(URL_SITE)) return url
  const u = new URL(url)
  u.searchParams.set('utm_source', 'email')
  u.searchParams.set('utm_medium', 'email')
  u.searchParams.set('utm_campaign', campanha)
  u.searchParams.set('utm_content', conteudo)
  return u.toString()
}

function blocoHtml(b: Bloco): string {
  if ('p' in b) return `<p style="margin:0 0 14px 0;color:${COR.tinta2};font-family:${FONTE};font-size:15px;line-height:1.6;">${escapaHtml(b.p)}</p>`
  if ('nota' in b) return `<p style="margin:14px 0 0 0;color:${COR.tinta3};font-family:${FONTE};font-size:13px;line-height:1.6;">${escapaHtml(b.nota)}</p>`
  if ('lista' in b)
    return (
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">` +
      b.lista
        .map(
          (i) =>
            `<tr><td width="18" valign="top" style="color:${COR.botao};font-family:${FONTE};font-size:15px;line-height:1.6;font-weight:700;">•</td>` +
            `<td valign="top" style="padding-bottom:6px;color:${COR.tinta2};font-family:${FONTE};font-size:15px;line-height:1.6;">${escapaHtml(i)}</td></tr>`,
        )
        .join('') +
      `</table>`
    )
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 18px 0;"><tr>` +
    `<td bgcolor="${COR.botao}" style="background-color:${COR.botao};border-radius:12px;">` +
    `<a href="${escapaHtml(b.botao.url)}" target="_blank" style="display:inline-block;padding:14px 26px;color:${COR.botaoTexto};font-family:${FONTE};font-size:15px;font-weight:700;line-height:1;text-decoration:none;border-radius:12px;">${escapaHtml(b.botao.texto)}</a>` +
    `</td></tr></table>`
  )
}

function blocoTexto(b: Bloco): string {
  if ('p' in b) return b.p
  if ('nota' in b) return b.nota
  if ('lista' in b) return b.lista.map((i) => `• ${i}`).join('\n')
  return `${b.botao.texto}: ${b.botao.url}`
}

export function montarHtml(c: ConteudoEmail): { html: string; text: string } {
  const html =
    `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tá no Caixa</title></head>` +
    `<body style="margin:0;padding:0;background-color:${COR.fundo};">` +
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapaHtml(c.previa)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COR.fundo}" style="background-color:${COR.fundo};"><tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">` +
    `<tr><td style="padding:0 4px 16px 4px;color:${COR.mar};font-family:${FONTE};font-size:18px;font-weight:800;">Tá no Caixa</td></tr>` +
    `<tr><td bgcolor="${COR.cartao}" style="background-color:${COR.cartao};border:1px solid ${COR.borda};border-radius:16px;padding:28px 30px;">` +
    (c.rotulo
      ? `<p style="margin:0;color:${COR.tinta3};font-family:${FONTE};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;">${escapaHtml(c.rotulo)}</p>`
      : '') +
    `<h1 style="margin:8px 0 14px 0;color:${COR.tinta};font-family:${FONTE};font-size:22px;line-height:1.3;font-weight:800;">${escapaHtml(c.titulo)}</h1>` +
    c.blocos.map(blocoHtml).join('') +
    `<p style="margin:18px 0 0 0;color:${COR.tinta2};font-family:${FONTE};font-size:15px;line-height:1.6;">Dúvidas? É só responder este e-mail.<br>Equipe Tá no Caixa</p>` +
    `</td></tr>` +
    `<tr><td style="padding:18px 4px 0 4px;color:${COR.tinta3};font-family:${FONTE};font-size:11px;line-height:1.6;">${escapaHtml(c.motivo)}<br>` +
    `<a href="${URL_SITE}" style="color:${COR.tinta3};text-decoration:underline;">tanocaixa.com</a></td></tr>` +
    `</table></td></tr></table></body></html>`
  const text = [c.titulo, '', ...c.blocos.flatMap((b) => [blocoTexto(b), '']), 'Dúvidas? É só responder este e-mail.', 'Equipe Tá no Caixa', '', c.motivo, URL_SITE].join('\n')
  return { html, text }
}
