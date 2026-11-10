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
  /** Quando alguém confirmou que o dinheiro caiu (o "Marcar como recebido"). */
  recebidoEm?: string
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
  /**
   * O dinheiro já está no caixa. Quem recebe no dia da venda (loja) já nasce
   * recebido; quem paga depois (apps) fica "a receber" até alguém confirmar.
   */
  recebido: boolean
  /** Dia confirmado do recebimento ('YYYY-MM-DD'), quando alguém marcou. */
  recebidoEm?: string
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
    .map((c) => {
      const venda = r.data.slice(0, 10)
      const recebimento = recebimentoValido(r.data, c.recebimentoEm)
      return {
        diaId: r.id,
        canal: c.canal,
        valor: c.valorBruto,
        venda,
        recebimento,
        recebido: recebimento === venda || !!c.recebidoEm,
        ...(c.recebidoEm ? { recebidoEm: c.recebidoEm.slice(0, 10) } : {}),
      }
    })
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

/** Só o que ainda vai cair: pagamento depois da venda, sem confirmação. */
export const aReceber = (ps: ParteRecebida[]) => ps.filter((p) => !p.recebido)

export const somarPartes = (ps: ParteRecebida[]) => ps.reduce((s, p) => s + p.valor, 0)
