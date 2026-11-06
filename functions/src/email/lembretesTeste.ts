/* ------------------------------------------------------------------ *
 * Lembretes do fim do teste grátis — regra e texto (puros).
 *
 * Só pro DONO, só de loja sem assinatura, poucos e sem drama:
 *   D-7  "vai até 25/11"
 *   D-2  "faltam 2 dias"
 *   D-0  "hoje é o último dia"
 *   D+1  "seus números continuam aqui"
 * Os dias contam no calendário de Brasília a partir do dia em que o teste
 * acaba (25/11 para quem tem testeAte = 2026-11-26T02:59:59Z).
 * Todo botão leva pro mesmo checkout do "Assinar plano" do painel.
 * ------------------------------------------------------------------ */
import { renderizar, type EmailPronto } from './catalogo'
import { comUtm, URL_SITE } from './layout'

export type PassoTeste = 'd7' | 'd2' | 'd0' | 'd1'
const FUSO = 'America/Sao_Paulo'

/** 'YYYY-MM-DD' no fuso de Brasília. */
export function diaSP(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86_400_000)
}

/** Qual lembrete cabe hoje para um teste que acaba em `testeAte` (ou nenhum). */
export function passoDoTeste(testeAte: string, agora: Date): PassoTeste | null {
  const faltam = diasEntre(diaSP(agora), diaSP(new Date(testeAte)))
  if (faltam === 7) return 'd7'
  if (faltam === 2) return 'd2'
  if (faltam === 0) return 'd0'
  if (faltam === -1) return 'd1'
  return null
}

/** Passos antes do fim exigem teste ainda valendo; o D+1, teste já acabado. */
export function passoCombinaComSituacao(passo: PassoTeste, situacao: string): boolean {
  return passo === 'd1' ? situacao === 'sem_assinatura' : situacao === 'teste'
}

export interface LojaDoLembrete {
  rid: string
  nome: string
  diasLancados?: number
}

export function linkAssinar(rid: string, passo: string): string {
  return comUtm(`${URL_SITE}/painel/assinatura?assinar=1&loja=${encodeURIComponent(rid)}`, `tnc-teste-${passo}`, 'botao')
}

/** "25 de novembro" */
export function diaPorExtenso(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: FUSO })
}

export function montarLembreteTeste(
  passo: PassoTeste,
  p: { primeiroNome: string; lojas: LojaDoLembrete[]; testeAte: string },
): EmailPronto {
  const uma = p.lojas.length === 1
  const uso = p.lojas
    .filter((l) => (l.diasLancados ?? 0) > 0)
    .map((l) => `${l.diasLancados} ${l.diasLancados === 1 ? 'dia lançado' : 'dias lançados'} na ${l.nome}`)
  const vars = {
    NOME_VIRGULA: p.primeiroNome ? `${p.primeiroNome}, ` : '',
    DATA_FIM: diaPorExtenso(p.testeAte),
    LOJA_DA: uma ? `da ${p.lojas[0].nome}` : `das lojas ${p.lojas.map((l) => l.nome).join(', ')}`,
    USO: uso.length ? `Até agora: ${uso.join('; ')}.` : '',
    LINK: linkAssinar(p.lojas[0].rid, passo),
  }
  // Mais de uma loja: um botão por loja (aí vai montado no código, sem template).
  const botoes = uma ? undefined : p.lojas.map((l) => ({ texto: `Assinar a ${l.nome}`, url: linkAssinar(l.rid, passo) }))
  return renderizar(`teste-${passo}`, vars, { botoes })
}
