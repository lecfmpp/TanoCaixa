/* ------------------------------------------------------------------ *
 * Identidade da DEMONSTRAÇÃO (só usada quando alguém clica em "Ver
 * demonstração"). Restaurante de referência do handoff: Zaatar Cozinha
 * Árabe — delivery-first, Botafogo/RJ. Os números da demo vêm do seed
 * (src/data/seed.ts), gravados no tenant de exemplo; conta real nunca usa
 * nada daqui. Os resumos e o feed fixos que moravam aqui não eram usados
 * por nenhuma tela e saíram.
 * ------------------------------------------------------------------ */
import type { Restaurante, Usuario } from '@/types'

export const restauranteDemo: Restaurante = {
  id: 'zaatar',
  nome: 'Zaatar Cozinha Árabe',
  bairro: 'Botafogo',
  cidade: 'Rio de Janeiro',
  tipoOperacao: 'delivery_salao',
  tipoCozinha: 'Árabe',
}

export const usuarioDemo: Usuario = {
  id: 'halim',
  nome: 'Halim',
  email: 'halim@zaatar.com.br',
  celularWhatsapp: '(21) 99876-5432',
  avatarInicial: 'H',
  avatarCor: '#2E5F73',
  papel: 'dono',
}
