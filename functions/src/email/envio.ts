/* ------------------------------------------------------------------ *
 * Chave geral dos e-mails novos (lembretes do teste e cobrança):
 *   desligado → não manda nada (só registra no log)
 *   teste     → manda TUDO para EMAIL_TESTE_PARA, com o destino real no assunto
 *   ativo     → manda para quem deve receber
 * O padrão é "teste": publicar as funções não dispara e-mail para cliente.
 * ------------------------------------------------------------------ */
import type { EmailSaida } from './resend'

export type ModoEmail = 'desligado' | 'teste' | 'ativo'

export function lerModo(v: string | undefined): ModoEmail {
  return v === 'ativo' || v === 'desligado' ? v : 'teste'
}

/** Ajusta o e-mail ao modo. `null` = não enviar. */
export function aplicarModo(e: EmailSaida, modo: ModoEmail, testePara: string): EmailSaida | null {
  if (modo === 'desligado') return null
  if (modo === 'ativo') return e
  const para = testePara.trim()
  if (!para.includes('@')) return null
  return { ...e, to: [para], subject: `[TESTE → ${e.to.join(', ')}] ${e.subject}` }
}
