/* ------------------------------------------------------------------ *
 * Vencimentos: boleto e nota que ainda não foram pagos.
 *
 * Alimenta as tags de aviso (Compras, Despesas) e o alerta do Início:
 * "vencido há 3 dias", "vence hoje", "vence em 2 dias".
 * ------------------------------------------------------------------ */
import { ehCompra } from './compras'
import type { DespesaDoc } from './types'

/** Até quantos dias à frente um vencimento vira lembrete. */
export const JANELA_LEMBRETE = 7

export type SituacaoVencimento = 'vencido' | 'hoje' | 'proximo' | 'ok'

export interface Vencimento {
  /** Id da nota, ou do lançamento quando ele veio avulso. */
  id: string
  natureza: 'nota' | 'conta'
  fornecedor: string
  descricao?: string
  valor: number
  /** 'YYYY-MM-DD' */
  vencimento: string
  /** Dias até vencer. Negativo = já venceu. */
  dias: number
  situacao: SituacaoVencimento
  /** Lançamentos que precisam ser marcados como pagos juntos. */
  lancamentoIds: string[]
}

const DIA_MS = 86_400_000

function diaUTC(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}

/** Dias entre `hoje` e o vencimento, pelo calendário (sem sofrer com fuso). */
export function diasAte(vencimento: string, hoje: string): number {
  return Math.round((diaUTC(vencimento) - diaUTC(hoje)) / DIA_MS)
}

export function situacaoDoVencimento(dias: number): SituacaoVencimento {
  if (dias < 0) return 'vencido'
  if (dias === 0) return 'hoje'
  if (dias <= JANELA_LEMBRETE) return 'proximo'
  return 'ok'
}

/** "vencido há 3 dias", "vence hoje", "vence amanhã", "vence em 5 dias". */
export function rotuloVencimento(dias: number): string {
  if (dias < 0) return `vencido há ${-dias} ${dias === -1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'vence hoje'
  if (dias === 1) return 'vence amanhã'
  return `vence em ${dias} dias`
}

/**
 * Tudo que está em aberto e tem vencimento, do mais atrasado ao mais distante.
 * Nota com mais de um lançamento (alimento + bebida) aparece como UMA linha:
 * quem paga o boleto paga a nota inteira.
 */
export function vencimentosEmAberto(despesas: DespesaDoc[], hoje: string): Vencimento[] {
  const grupos = new Map<string, DespesaDoc[]>()
  for (const d of despesas) {
    if (d.status === 'pago' || !d.dataVencimento) continue
    const chave = ehCompra(d) && d.notaId ? d.notaId : d.id
    grupos.set(chave, [...(grupos.get(chave) ?? []), d])
  }
  return [...grupos.entries()]
    .map(([id, lancs]) => {
      const vencimento = lancs.map((l) => l.dataVencimento!.slice(0, 10)).sort()[0]
      const dias = diasAte(vencimento, hoje)
      return {
        id,
        natureza: ehCompra(lancs[0]) ? ('nota' as const) : ('conta' as const),
        fornecedor: lancs[0].fornecedor,
        descricao: lancs[0].descricao,
        valor: lancs.reduce((s, l) => s + l.valorTotal, 0),
        vencimento,
        dias,
        situacao: situacaoDoVencimento(dias),
        lancamentoIds: lancs.map((l) => l.id),
      }
    })
    .sort((a, b) => a.dias - b.dias)
}

/** Só o que merece aviso agora: vencido ou dentro da janela de lembrete. */
export function lembretes(despesas: DespesaDoc[], hoje: string): Vencimento[] {
  return vencimentosEmAberto(despesas, hoje).filter((v) => v.situacao !== 'ok')
}
