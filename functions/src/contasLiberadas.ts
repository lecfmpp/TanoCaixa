/**
 * Contas que já usam as notificações de WhatsApp por loja (ainda em teste).
 * Tem que bater com CONTAS_COM_CONFIGURACOES em src/auth/site.ts: a tela
 * esconde o painel, e aqui o servidor recusa as chamadas de qualquer outra
 * conta (mesmo quem chama a função direto, sem passar pela tela).
 */
export const CONTAS_WHATSAPP_LIBERADO = ['lecfmpp@gmail.com', 'suporte@spoonconsultoria.com.br']

export function whatsappLiberado(email: string | undefined): boolean {
  return !!email && CONTAS_WHATSAPP_LIBERADO.includes(email.trim().toLowerCase())
}
