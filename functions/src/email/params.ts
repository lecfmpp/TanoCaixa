import { defineSecret, defineString } from 'firebase-functions/params'
import { lerModo } from './envio'

export const RESEND_API_KEY = defineSecret('RESEND_API_KEY')
/** desligado | teste | ativo. Padrão "teste": tudo vai pro EMAIL_TESTE_PARA. */
export const EMAILS_MODO = defineString('EMAILS_MODO', { default: 'teste' })
export const EMAIL_TESTE_PARA = defineString('EMAIL_TESTE_PARA', { default: 'ola@tanocaixa.com' })

export const modoAtual = () => lerModo(EMAILS_MODO.value())
