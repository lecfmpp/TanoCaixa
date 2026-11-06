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
import { comUtm, montarHtml, URL_SITE, type Bloco } from './layout'

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
function diaPorExtenso(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: FUSO })
}

export function montarLembreteTeste(
  passo: PassoTeste,
  p: { primeiroNome: string; lojas: LojaDoLembrete[]; testeAte: string },
): { assunto: string; html: string; text: string } {
  const oi = p.primeiroNome ? `${p.primeiroNome}, ` : ''
  const fim = diaPorExtenso(p.testeAte)
  const uma = p.lojas.length === 1
  const nomes = p.lojas.map((l) => l.nome).join(', ')
  const uso = p.lojas
    .filter((l) => (l.diasLancados ?? 0) > 0)
    .map((l) => `${l.diasLancados} ${l.diasLancados === 1 ? 'dia lançado' : 'dias lançados'} na ${l.nome}`)
  const preco = 'O plano é R$ 149 por loja/mês, no cartão. Cancela quando quiser, sem multa.'
  const botoes: Bloco[] = uma
    ? [{ botao: { texto: 'Assinar plano', url: linkAssinar(p.lojas[0].rid, passo) } }]
    : p.lojas.map((l) => ({ botao: { texto: `Assinar a ${l.nome}`, url: linkAssinar(l.rid, passo) } }))
  const motivo = 'Você recebe este aviso porque é dono de uma loja no Tá no Caixa em período de teste.'

  let assunto: string, previa: string, titulo: string, corpo: Bloco[]
  if (passo === 'd7') {
    assunto = `Seu teste do Tá no Caixa vai até ${fim}`
    previa = 'Um aviso com antecedência, sem pressa.'
    titulo = `${oi}seu teste vai até ${fim}`
    corpo = [
      { p: `Só um aviso com antecedência: o período de teste ${uma ? `da ${nomes}` : `das lojas ${nomes}`} termina em ${fim}, às 23:59.` },
      ...(uso.length ? [{ p: `Até agora: ${uso.join('; ')}.` }] : []),
      { p: preco },
      ...botoes,
    ]
  } else if (passo === 'd2') {
    assunto = 'Faltam 2 dias para o fim do teste'
    previa = 'Seus números ficam guardados. Para seguir lançando, é só assinar.'
    titulo = 'Faltam 2 dias para o fim do teste'
    corpo = [
      { p: `${oi}o teste ${uma ? `da ${nomes}` : `das suas lojas`} acaba em ${fim}, às 23:59. Tudo o que você lançou fica guardado.` },
      { p: 'Para continuar lançando e vendo seus números depois disso, é só assinar.' },
      ...botoes,
      { nota: preco },
    ]
  } else if (passo === 'd0') {
    assunto = 'Hoje é o último dia do teste'
    previa = 'O teste acaba hoje às 23:59.'
    titulo = 'Hoje é o último dia do teste'
    corpo = [
      { p: `${oi}o teste ${uma ? `da ${nomes}` : 'das suas lojas'} acaba hoje às 23:59. Assinando agora, nada para.` },
      ...botoes,
      { nota: preco },
    ]
  } else {
    assunto = 'Seus números continuam aqui'
    previa = 'O teste acabou e nada foi apagado.'
    titulo = 'Seus números continuam aqui'
    corpo = [
      { p: `${oi}o teste ${uma ? `da ${nomes}` : 'das suas lojas'} terminou ontem. Nada foi apagado: vendas, despesas e estoque estão do jeito que você deixou.` },
      { p: 'Assinando, você volta de onde parou.' },
      ...botoes,
      { nota: `${preco} Este é o último aviso sobre o teste.` },
    ]
  }
  const { html, text } = montarHtml({ previa, rotulo: 'Teste grátis', titulo, blocos: corpo, motivo })
  return { assunto, html, text }
}
