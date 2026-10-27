/* ------------------------------------------------------------------ *
 * Despesa recorrente ("Isso se repete todo mês"): regras puras de quando e como
 * gerar a repetição do mês. Sem Firebase, pra testar sem rede.
 *
 * Antes o campo `recorrente` só era gravado: nada lia, e a despesa nunca voltava.
 *
 * Como funciona
 *  - Uma SÉRIE é o conjunto de lançamentos com o mesmo `serieId`. Lançamento
 *    antigo marcado como recorrente (sem serieId) é agrupado por fornecedor +
 *    conta, pra não gerar uma cópia por mês de histórico.
 *  - Vale o ÚLTIMO lançamento da série: se ele continua `recorrente` e é de um
 *    mês ANTERIOR ao atual, gera o do mês atual. Desligar "se repete" no último
 *    lançamento encerra a série; corrigir o valor nele vale pros próximos meses.
 *  - Só o mês atual: não preenche meses que ficaram pra trás (não reescreve o passado).
 *  - Mesmo dia do mês (dia 31 em fevereiro cai no 28, mas em março volta ao 31) e
 *    vencimento deslocado pela mesma distância que tinha da competência.
 *  - Nasce "a pagar": quem paga marca como pago.
 * ------------------------------------------------------------------ */

export interface DespesaMin {
  id: string
  serieId?: string
  recorrente?: boolean
  fornecedor: string
  categoria: string
  valorTotal: number
  dataCompetencia: string
  dataVencimento?: string
  formaPagamento: string
  status: string
  descricao?: string
  observacao?: string
  tipoLancamento?: string
  /** Dia que a série pede (antes de ajustar ao tamanho do mês). */
  diaDoMes?: number
  vencDiaDoMes?: number
}

export interface Repeticao {
  /** Id do documento a criar: fixo por série e mês, então rodar duas vezes não duplica. */
  id: string
  serieId: string
  mes: string
  doc: Record<string, unknown>
}

const dois = (n: number) => String(n).padStart(2, '0')
export const mesDoDia = (iso: string): string => iso.slice(0, 7)

/** '2026-12' + 1 → '2027-01'. */
export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number)
  const t = a * 12 + (m - 1) + n
  return `${Math.floor(t / 12)}-${dois((t % 12) + 1)}`
}

const diasNoMes = (mes: string): number => {
  const [a, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

const diferencaDeMeses = (de: string, ate: string): number => {
  const [a1, m1] = de.split('-').map(Number)
  const [a2, m2] = ate.split('-').map(Number)
  return a2 * 12 + m2 - (a1 * 12 + m1)
}

/** Leva o dia pro mês `mes`, limitado ao último dia dele (31 → 28 em fevereiro). */
export function diaNoMes(mes: string, dia: number): string {
  return `${mes}-${dois(Math.min(Math.max(dia, 1), diasNoMes(mes)))}`
}

/**
 * Dia que a série pede. Se o `diaDoMes` salvo ainda explica a data (ex.: pede 31, a data
 * é 28 de fevereiro), vale ele; se a pessoa mexeu na data depois, vale a data dela.
 */
function diaPedido(iso: string, salvo: number | undefined): number {
  const real = Number(iso.slice(8, 10))
  if (!salvo) return real
  return Math.min(salvo, diasNoMes(mesDoDia(iso))) === real ? salvo : real
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Em ordem de data do lançamento, desempatando pelo id (estável). */
const maisRecente = (a: DespesaMin, b: DespesaMin) =>
  a.dataCompetencia.slice(0, 10).localeCompare(b.dataCompetencia.slice(0, 10)) || a.id.localeCompare(b.id)

/**
 * `hoje` = 'YYYY-MM-DD' no fuso de São Paulo; `agora` = ISO de quando roda.
 * Devolve o que criar no mês de `hoje`, uma repetição por série.
 */
export function planejarRepeticoes(despesas: DespesaMin[], hoje: string, agora: string): Repeticao[] {
  const mes = mesDoDia(hoje)
  const series = new Map<string, DespesaMin[]>()
  for (const d of despesas) {
    const chave = d.serieId ?? (d.recorrente ? `legado:${norm(d.fornecedor)}|${d.categoria}` : null)
    if (!chave) continue
    ;(series.get(chave) ?? series.set(chave, []).get(chave)!).push(d)
  }

  const saida: Repeticao[] = []
  for (const [chave, lancamentos] of series) {
    const ultimo = [...lancamentos].sort(maisRecente).at(-1)!
    if (!ultimo.recorrente) continue // série encerrada: desligaram "se repete" no último lançamento
    if (mesDoDia(ultimo.dataCompetencia) >= mes) continue // já tem o deste mês (ou é de um mês à frente)

    const serieId = chave.startsWith('legado:') ? ultimo.id : chave
    const competencia = ultimo.dataCompetencia.slice(0, 10)
    const diaComp = diaPedido(competencia, ultimo.diaDoMes)
    const novaCompetencia = diaNoMes(mes, diaComp)

    // Sem vencimento no original (pago na hora), a repetição vence no próprio dia: o aviso de "vence em X dias" funciona.
    let novoVencimento = novaCompetencia
    let vencDia: number | undefined
    const venc = ultimo.dataVencimento?.slice(0, 10)
    if (venc) {
      vencDia = diaPedido(venc, ultimo.vencDiaDoMes)
      novoVencimento = diaNoMes(somarMeses(mes, diferencaDeMeses(mesDoDia(competencia), mesDoDia(venc))), vencDia)
    }

    const id = `${serieId}_${mes}`
    saida.push({
      id,
      serieId,
      mes,
      doc: {
        id,
        serieId,
        fornecedor: ultimo.fornecedor,
        categoria: ultimo.categoria,
        valorTotal: ultimo.valorTotal,
        formaPagamento: ultimo.formaPagamento,
        status: 'a_pagar',
        recorrente: true,
        repetidaAuto: true,
        tipoLancamento: ultimo.tipoLancamento ?? 'conta',
        dataCompetencia: novaCompetencia,
        dataVencimento: novoVencimento,
        diaDoMes: diaComp,
        ...(vencDia ? { vencDiaDoMes: vencDia } : {}),
        ...(ultimo.descricao ? { descricao: ultimo.descricao } : {}),
        ...(ultimo.observacao ? { observacao: ultimo.observacao } : {}),
        criadoEm: agora,
        criadoPorId: 'sistema',
        criadoPorNome: 'Tá no Caixa',
        origem: 'integracao',
      },
    })
  }
  return saida
}
