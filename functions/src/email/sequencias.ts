/* ------------------------------------------------------------------ *
 * Sequências de uso por papel (regra pura).
 *
 * Cada papel tem os passos dele (dia desde a entrada + condição). Um
 * passo só sai se:
 *   - já chegou o dia e não passou da janela (5 dias de folga);
 *   - a condição dele vale (ex.: "ainda não lançou venda");
 *   - não foi enviado antes;
 *   - a pessoa não recebeu e-mail de uso nos últimos 3 dias;
 *   - (dono) não está nos 7 dias antes do fim do teste.
 * Quem tem vários papéis recebe só a sequência do papel principal.
 * ------------------------------------------------------------------ */
import type { PapelContato } from './contato'

export interface ContextoUso {
  diasLancados: number
  despesas: number
  membrosNaLoja: number
  /** Franqueador: lojas da rede com 5+ dias lançados. */
  lojasLancando: number
}

interface Passo {
  id: string
  dia: number
  quando?: (c: ContextoUso) => boolean
}

export const SEQUENCIAS: Record<PapelContato, Passo[]> = {
  // O D0 do dono é a boas-vindas (gatilho do cadastro).
  dono: [
    { id: 'dono-d1', dia: 1, quando: (c) => c.diasLancados === 0 },
    { id: 'dono-d3', dia: 3, quando: (c) => c.despesas < 3 },
    { id: 'dono-d6', dia: 6, quando: (c) => c.membrosNaLoja <= 1 },
    { id: 'dono-d9', dia: 9, quando: (c) => c.diasLancados >= 5 },
    { id: 'dono-d13', dia: 13 },
    { id: 'dono-d20', dia: 20, quando: (c) => c.diasLancados >= 20 },
  ],
  gestao: [
    { id: 'gestao-d0', dia: 0 },
    { id: 'gestao-d2', dia: 2, quando: (c) => c.diasLancados === 0 },
    { id: 'gestao-d6', dia: 6 },
    { id: 'gestao-d10', dia: 10 },
  ],
  caixa: [
    { id: 'caixa-d0', dia: 0 },
    { id: 'caixa-d3', dia: 3 },
    { id: 'caixa-d10', dia: 10 },
  ],
  cozinha: [
    { id: 'cozinha-d0', dia: 0 },
    { id: 'cozinha-d3', dia: 3 },
    { id: 'cozinha-d8', dia: 8 },
  ],
  franqueador: [
    { id: 'franq-d0', dia: 0 },
    { id: 'franq-d3', dia: 3, quando: (c) => c.lojasLancando < 2 },
    { id: 'franq-d8', dia: 8, quando: (c) => c.lojasLancando >= 2 },
  ],
}

export const JANELA_DIAS = 5
export const INTERVALO_MIN_DIAS = 3

export interface EstadoUso {
  enviados: string[]
  /** ISO do último e-mail de uso enviado. */
  ultimoEm?: string
}

const DIA = 86_400_000

export function proximoPasso(
  papel: PapelContato,
  p: { inicio: string; agora: Date; estado: EstadoUso; ctx: ContextoUso; testeAcabaEm?: string },
): string | null {
  if (p.estado.ultimoEm && p.agora.getTime() - Date.parse(p.estado.ultimoEm) < INTERVALO_MIN_DIAS * DIA) return null
  if (papel === 'dono' && p.testeAcabaEm) {
    const falta = Date.parse(p.testeAcabaEm) - p.agora.getTime()
    if (falta > -DIA && falta < 7 * DIA) return null // reta final do teste: só os lembretes do teste
  }
  const dias = Math.floor((p.agora.getTime() - Date.parse(p.inicio)) / DIA)
  for (const passo of SEQUENCIAS[papel]) {
    if (p.estado.enviados.includes(passo.id)) continue
    if (dias < passo.dia || dias > passo.dia + JANELA_DIAS) continue
    if (passo.quando && !passo.quando(p.ctx)) continue
    return passo.id
  }
  return null
}

/** Inatividade: 7 e 21 dias depois do último uso (uma vez cada, por "parada"). */
export function passoInatividade(ultimoUso: string | undefined, agora: Date): 'inativo-7' | 'inativo-21' | null {
  if (!ultimoUso) return null
  const dias = Math.floor((agora.getTime() - Date.parse(`${ultimoUso}T12:00:00-03:00`)) / DIA)
  if (dias >= 7 && dias < 7 + JANELA_DIAS) return 'inativo-7'
  if (dias >= 21 && dias < 21 + JANELA_DIAS) return 'inativo-21'
  return null
}
