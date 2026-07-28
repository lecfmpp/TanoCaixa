/* ------------------------------------------------------------------ *
 * Dados de exemplo (Fase 0). Restaurante de referência do handoff:
 * Zaatar Cozinha Árabe — delivery-first, Botafogo/RJ, ~R$ 50 mil/mês.
 * Serão substituídos por leituras reais do Firestore nas próximas fases.
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

/** Resumo dos 4 cartões do Início, por período. */
export interface ResumoInicio {
  entrou: number
  saiu: number
  sobrou: number
  margem: number // %
  pontoEquilibrio: number
  pontoEquilibrioDia: number
  viradaPonto: string // dia em que virou / previsão
  barras: BarraPeriodo[]
  sobraPeriodo: number
}

export const resumoPorPeriodo: Record<Periodo, ResumoInicio> = {
  mes: {
    entrou: 52480,
    saiu: 43100,
    sobrou: 9380,
    margem: 17.9,
    pontoEquilibrio: 42900,
    pontoEquilibrioDia: 1651,
    viradaPonto: 'virou dia 24',
    sobraPeriodo: 9380,
    barras: [
      { rotulo: 'Sem 1', entrou: 12100, saiu: 10900 },
      { rotulo: 'Sem 2', entrou: 13400, saiu: 10200 },
      { rotulo: 'Sem 3', entrou: 12900, saiu: 11400 },
      { rotulo: 'Sem 4', entrou: 14080, saiu: 10600 },
    ],
  },
  semana: {
    entrou: 14080,
    saiu: 10600,
    sobrou: 3480,
    margem: 24.7,
    pontoEquilibrio: 9900,
    pontoEquilibrioDia: 1651,
    viradaPonto: 'virou quinta',
    sobraPeriodo: 3480,
    barras: [
      { rotulo: 'Seg', entrou: 1420, saiu: 1980 },
      { rotulo: 'Ter', entrou: 1680, saiu: 1240 },
      { rotulo: 'Qua', entrou: 1910, saiu: 920 },
      { rotulo: 'Qui', entrou: 2140, saiu: 1520 },
      { rotulo: 'Sex', entrou: 3120, saiu: 1460 },
      { rotulo: 'Sáb', entrou: 3610, saiu: 1080 },
      { rotulo: 'Dom', entrou: 200, saiu: 2400 },
    ],
  },
}

export const insightInicio = {
  rotulo: 'Recado do dia',
  texto:
    'Seu hortifrúti subiu 12% essa semana. A compra no Fornecedor Zona Sul veio mais cara que o normal.',
  acaoSugerida: 'Cotar com o Hortifrúti do Zé antes da próxima feira',
}

/** Base "hoje" fixa para a demo, para o feed não mudar a cada render. */
const hoje = new Date(2026, 6, 28, 20, 10) // 28/07/2026 20:10

function menos(minutos: number): Date {
  return new Date(hoje.getTime() - minutos * 60_000)
}

export const feedAtividades: Atividade[] = [
  {
    id: 'a1',
    quem: 'Halim',
    quemInicial: 'H',
    quemCor: '#2E5F73',
    acao: 'lançou despesa',
    entidade: 'Hortifrúti Zona Sul',
    valor: 842,
    origem: 'ia_foto',
    quando: menos(28), // hoje 19:42
  },
  {
    id: 'a2',
    quem: 'iFood',
    quemInicial: 'iF',
    quemCor: '#C05437',
    acao: 'importou as vendas do dia',
    entidade: '38 pedidos',
    valor: 2310,
    origem: 'integracao',
    quando: menos(60 * 14 + 10), // hoje 06:00
  },
  {
    id: 'a3',
    quem: 'Yara',
    quemInicial: 'Y',
    quemCor: '#EFAB5C',
    acao: 'contou no estoque',
    entidade: 'Grão-de-bico · 8 kg',
    origem: 'celular',
    quando: menos(60 * 27), // ontem ~17:10
  },
  {
    id: 'a4',
    quem: 'Halim',
    quemInicial: 'H',
    quemCor: '#2E5F73',
    acao: 'fechou o dia',
    entidade: 'Salão + delivery',
    valor: 3180,
    origem: 'computador',
    quando: menos(60 * 21), // ontem 23:10
  },
  {
    id: 'a5',
    quem: 'Rafa',
    quemInicial: 'R',
    quemCor: '#1E4354',
    acao: 'lançou despesa',
    entidade: 'Gás · Ultragaz',
    valor: 460,
    origem: 'celular',
    quando: menos(60 * 30), // ontem ~14:10
  },
]
