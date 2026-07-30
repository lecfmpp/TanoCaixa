/**
 * Traduz códigos do Firebase Auth em recados que o dono do restaurante entende.
 * Sem isso o `catch` engolia a causa e todo mundo via a mesma mensagem-chute.
 */
const MENSAGENS: Record<string, string> = {
  'auth/email-already-in-use': 'Esse e-mail já tem conta. Tente entrar ou recuperar a senha.',
  'auth/invalid-email': 'Esse e-mail não parece válido. Confere se não faltou algo.',
  'auth/weak-password': 'A senha é curta demais. Use pelo menos 6 caracteres.',
  'auth/password-does-not-meet-requirements':
    'A senha não atende às regras do projeto. Use letras, números e pelo menos 6 caracteres.',
  'auth/operation-not-allowed':
    'O cadastro por e-mail e senha está desligado no Firebase. Ative em Authentication → Sign-in method.',
  'auth/admin-restricted-operation':
    'O cadastro está restrito a administradores no Firebase. Libere em Authentication → Settings.',
  'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com o Firebase. Confira sua internet.',
  'auth/user-not-found': 'Não achamos conta com esse e-mail.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-disabled': 'Essa conta foi desativada.',
  'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Vamos tentar por redirecionamento.',
  'auth/unauthorized-domain':
    'Este domínio não está autorizado no Firebase. Adicione em Authentication → Settings → Authorized domains.',
}

/** Extrai o código de um erro do Firebase, se houver. */
export function codigoDoErro(e: unknown): string {
  const c = (e as { code?: unknown })?.code
  return typeof c === 'string' ? c : ''
}

/**
 * Mensagem amigável para o usuário. Códigos desconhecidos aparecem no texto
 * para não ficarmos às cegas quando algo novo surgir.
 */
export function mensagemDeErroAuth(e: unknown, fallback: string): string {
  const codigo = codigoDoErro(e)
  if (codigo && MENSAGENS[codigo]) return MENSAGENS[codigo]
  if (codigo) return `${fallback} (${codigo})`
  return fallback
}
