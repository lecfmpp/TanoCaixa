/* ------------------------------------------------------------------ *
 * Receita por data de recebimento. Puro (sem React), testado em recebimentos.test.mjs.
 *
 * O DRE conta a venda no DIA DA VENDA (`ReceitaDiaDoc.data`, competência). O
 * recebimento é só uma segunda visão: quando o dinheiro de cada canal cai.
 * Canal sem `recebimentoEm` recebe no dia da venda — então nada muda para
 * quem não informa a data, e nenhuma soma do DRE depende deste arquivo.
 * ------------------------------------------------------------------ */

export interface CanalDoDia {
  canal: string
  valorBruto: number
  recebimentoEm?: string
}

export interface DiaDeVendas {
  id: string
  /** 'YYYY-MM-DD' — o dia da venda. */
  data: string
  canais: CanalDoDia[]
}

export type BaseReceita = 'venda' | 'recebimento'

export interface ParteRecebida {
  /** Id do dia de vendas de onde vem. */
  diaId: string
  canal: string
  valor: number
  /** Dia da venda. */
  venda: string
  /** Dia em que o dinheiro cai. */
  recebimento: string
}

/** Só aceita 'YYYY-MM-DD' que não seja anterior à venda (recebimento antes da venda não existe). */
export function recebimentoValido(venda: string, recebimentoEm: string | undefined): string {
  const v = venda.slice(0, 10)
  if (!recebimentoEm || !/^\d{4}-\d{2}-\d{2}$/.test(recebimentoEm)) return v
  return recebimentoEm < v ? v : recebimentoEm
}

/** Cada canal do dia, com o dia em que o dinheiro cai. */
export function partesDoDia(r: DiaDeVendas): ParteRecebida[] {
  return r.canais
    .filter((c) => c.valorBruto > 0)
    .map((c) => ({
      diaId: r.id,
      canal: c.canal,
      valor: c.valorBruto,
      venda: r.data.slice(0, 10),
      recebimento: recebimentoValido(r.data, c.recebimentoEm),
    }))
}

/** As partes cujo recebimento (ou venda, conforme a base) cai em [de, ate]. */
export function partesNaJanela(dias: DiaDeVendas[], base: BaseReceita, de: string, ate: string): ParteRecebida[] {
  return dias
    .flatMap(partesDoDia)
    .filter((p) => {
      const dia = base === 'recebimento' ? p.recebimento : p.venda
      return dia >= de && dia <= ate
    })
}

export const somarPartes = (ps: ParteRecebida[]) => ps.reduce((s, p) => s + p.valor, 0)
