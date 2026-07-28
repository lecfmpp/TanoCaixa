/**
 * Tenant (restaurante) atual. Enquanto a autenticação por e-mail/senha não
 * é habilitada no console, o app roda no tenant de demonstração — que tem
 * regras Firestore abertas SÓ para ele. Ao habilitar o auth, o tenant real
 * vem do membro do usuário.
 */
export const DEMO_TENANT = 'demo-zaatar'

/** Origem de uma ação (autoria). */
export type Origem = 'celular' | 'computador' | 'integracao' | 'ia_foto'

/**
 * De onde o app está sendo usado agora — vira a `origem` das ações.
 * Heurística simples por largura de tela.
 */
export function origemAtual(): Origem {
  if (typeof window !== 'undefined' && window.innerWidth < 700) return 'celular'
  return 'computador'
}
