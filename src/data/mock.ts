/* ------------------------------------------------------------------ *
 * Dados de exemplo (Fase 0). Restaurante de referência do handoff:
 * Zaatar Cozinha Árabe — delivery-first, Botafogo/RJ, ~R$ 50 mil/mês.
 * Números batem com o design de referência do Início.
 * ------------------------------------------------------------------ */
import type {
  Atividade,
  BarraPeriodo,
  Periodo,
  Restaurante,
  Usuario,
} from '@/types'

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

export type Tom = 'positivo' | 'negativo' | 'neutro'
export interface Delta {
  texto: string
  tom: Tom
}

/** Resumo dos 4 cartões do Início + gráfico, por período. */
export interface ResumoInicio {
  entrou: number
  saiu: number
  sobrou: number
  margem: number // %
  pontoEquilibrio: number
  entrouDelta: Delta
  saiuDelta: Delta
  pontoDelta: Delta
  subtitulo: string
  tituloGrafico: string
  barras: BarraPeriodo[]
}

export const resumoPorPeriodo: Record<Periodo, ResumoInicio> = {
  mes: {
    entrou: 47320,
    saiu: 39180,
    sobrou: 8140,
    margem: 17.2,
    pontoEquilibrio: 41400,
    entrouDelta: { texto: '+8% vs. junho', tom: 'positivo' },
    saiuDelta: { texto: '+11% vs. junho', tom: 'negativo' },
    pontoDelta: { texto: 'virou no dia 21', tom: 'positivo' },
    subtitulo: 'julho de 2026, faltam 4 dias',
    tituloGrafico: 'Entrou × saiu, semana a semana',
    barras: [
      { rotulo: '1ª sem', entrou: 11240, saiu: 10110 },
      { rotulo: '2ª sem', entrou: 13240, saiu: 9520 },
      { rotulo: '3ª sem', entrou: 10360, saiu: 9260 },
      { rotulo: '4ª sem', entrou: 12480, saiu: 10290 },
    ],
  },
  semana: {
    entrou: 13180,
    saiu: 9500,
    sobrou: 3680,
    margem: 27.9,
    pontoEquilibrio: 9500,
    entrouDelta: { texto: '+6% vs. semana passada', tom: 'positivo' },
    saiuDelta: { texto: '+3% vs. semana passada', tom: 'negativo' },
    pontoDelta: { texto: 'virou na quinta', tom: 'positivo' },
    subtitulo: 'esta semana',
    tituloGrafico: 'Entrou × saiu, dia a dia',
    barras: [
      { rotulo: 'Seg', entrou: 1180, saiu: 1640 },
      { rotulo: 'Ter', entrou: 1540, saiu: 1180 },
      { rotulo: 'Qua', entrou: 1720, saiu: 840 },
      { rotulo: 'Qui', entrou: 1980, saiu: 1360 },
      { rotulo: 'Sex', entrou: 2860, saiu: 1320 },
      { rotulo: 'Sáb', entrou: 3180, saiu: 980 },
      { rotulo: 'Dom', entrou: 720, saiu: 2180 },
    ],
  },
}

/* Feed "Quem mexeu no quê" — sem selos; o autor já diz a origem
 * (Automático = integração). Horários relativos a hoje (28/07/2026). */
export const feedAtividades: Atividade[] = [
  {
    id: 'a1',
    quem: 'Jamile',
    quemInicial: 'J',
    quemCor: '#C05437',
    acao: 'lançou a nota do',
    entidade: 'Frigorífico Salomão',
    valor: 1284,
    origem: 'ia_foto',
    quando: new Date(2026, 6, 28, 17, 20),
  },
  {
    id: 'a2',
    quem: 'Wesley',
    quemInicial: 'W',
    quemCor: '#2F6B4A',
    acao: 'contou',
    entidade: '12 itens do estoque',
    valor: 4180.6,
    origem: 'celular',
    quando: new Date(2026, 6, 28, 15, 4),
  },
  {
    id: 'a3',
    quem: 'Automático',
    quemInicial: '',
    quemCor: '#AEB9B8',
    acao: 'puxou as vendas do',
    entidade: 'iFood e da Rappi',
    valor: 928.9,
    origem: 'integracao',
    quando: new Date(2026, 6, 28, 6, 0),
  },
  {
    id: 'a4',
    quem: 'Halim',
    quemInicial: 'H',
    quemCor: '#2E5F73',
    acao: 'fechou o caixa de',
    entidade: 'sábado',
    valor: 1412.3,
    origem: 'computador',
    quando: new Date(2026, 6, 27, 23, 12),
  },
]

/** Progresso da contagem de estoque (rodapé da barra lateral). */
export const contagemProgresso = { feitos: 10, total: 10, mes: 'julho' }
