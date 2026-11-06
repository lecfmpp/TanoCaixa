/* ------------------------------------------------------------------ *
 * Avisos no WhatsApp (grupo do Tá no Caixa) pela Green-API.
 *
 * Mesma instância do RetroFoot (plano Developer, até 3 conversas). Segredos:
 *   firebase functions:secrets:set GREEN_API_URL     (ex.: https://7105.api.greenapi.com)
 *   firebase functions:secrets:set GREEN_API_ID      (idInstance)
 *   firebase functions:secrets:set GREEN_API_TOKEN   (apiTokenInstance)
 * e o chatId do grupo (termina em @g.us) como parâmetro não secreto, em
 * functions/.env:   WHATSAPP_GRUPO=1203...@g.us
 * Sem os três segredos ou sem o grupo, nada é enviado (só vai para o log).
 *
 * O QUE AVISA
 *  - na hora: nota fiscal lançada, contagem de estoque feita, vendas do dia
 *    lançadas (fluxo de caixa) e caixa do PDV fechado — a partir da trilha
 *    `atividades`, que o app já grava a cada ação;
 *  - 21:30: resumo do dia por restaurante (vendas, entradas, notas);
 *  - 09:00: lembretes — contagem de estoque nos dias 1 e 28, e uma dica de uso
 *    toda segunda-feira.
 * Contas de demonstração (`demo-*`, `rede-demo*`) nunca geram aviso.
 * ------------------------------------------------------------------ */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { defineString } from 'firebase-functions/params'
import { getFirestore } from 'firebase-admin/firestore'
import {
  LEMBRETE_FIM_DO_MES,
  LEMBRETE_INICIO_DO_MES,
  textoAviso,
  textoDica,
  textoResumoGeral,
  textoResumoUsuario,
  type MovimentoDia,
} from './whatsappTexto'
import type { IdLembrete } from './lembretesCatalogo'
import { montarLembrete, type Variaveis } from './lembretesTexto'
import { SEGREDOS_PROVEDOR, configurado, enviarImagem, enviarTexto, type ResultadoEnvio } from './whatsappProvedor'

const WHATSAPP_GRUPO = defineString('WHATSAPP_GRUPO', { default: '' })
/** Se preenchido (ex.: "Fernando"), o resumo do dia fala só do que esse usuário fez. Vazio = todos. */
const RESUMO_USUARIO = defineString('RESUMO_USUARIO', { default: '' })
export const SEGREDOS = SEGREDOS_PROVEDOR
export const FUSO = 'America/Sao_Paulo'

/** ID do grupo interno de operação (avisos gerais). Nunca é o grupo de um cliente. */
export const grupoInterno = () => WHATSAPP_GRUPO.value()

/**
 * Envia texto ou, com `imagem`, a imagem com o texto como legenda.
 * Se a imagem falhar, o texto vai sozinho: o lembrete nunca se perde por causa dela.
 * Sem `chatId`, vai para o grupo interno. Nunca lança: devolve o resultado.
 */
export async function enviar(texto: string, imagem?: { url: string; arquivo: string }, chatId?: string): Promise<ResultadoEnvio> {
  const grupo = chatId || WHATSAPP_GRUPO.value()
  if (!grupo || !configurado()) {
    console.log('WhatsApp não configurado — mensagem não enviada:', texto)
    return { ok: false, erro: 'WhatsApp não configurado' }
  }
  if (imagem) {
    const r = await enviarImagem(grupo, imagem.url, imagem.arquivo, texto)
    // Tempo esgotado: a imagem pode ter chegado; mandar o texto duplicaria.
    if (r.ok || r.incerto) return r
    console.error('WhatsApp: imagem falhou, enviando só o texto', r.erro)
  }
  const r = await enviarTexto(grupo, texto)
  if (!r.ok) console.error('WhatsApp: envio falhou', r.erro)
  return r
}

/** Lembrete de rotina: imagem fixa do tipo + legenda com os dados do dia. */
export async function enviarLembrete(id: IdLembrete, vars: Variaveis, variante?: string, chatId?: string): Promise<ResultadoEnvio> {
  const { legenda, imagemUrl, arquivo } = montarLembrete(id, vars, variante)
  return enviar(legenda, { url: imagemUrl, arquivo }, chatId)
}

export const ehDemo = (rid: string) => rid.startsWith('demo-') || rid.startsWith('rede-demo')

/** 'YYYY-MM-DD' no fuso de São Paulo. */
export function diaSP(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(d)
}

async function nomeDoRestaurante(rid: string): Promise<string> {
  const snap = await getFirestore().doc(`restaurants/${rid}`).get()
  return (snap.get('nome') as string | undefined) ?? rid
}

/* ------------------------- Avisos na hora (atividades) ------------------- */

export const avisoAtividade = onDocumentCreated(
  { document: 'restaurants/{rid}/atividades/{id}', secrets: SEGREDOS },
  async (event) => {
    const { rid } = event.params
    const a = event.data?.data()
    if (!a || ehDemo(rid) || a.origem === 'integracao') return

    const msg = textoAviso({
      acao: String(a.acao ?? ''),
      entidade: String(a.entidade ?? ''),
      quem: String(a.quem || a.criadoPorNome || 'Alguém'),
      valor: typeof a.valor === 'number' ? a.valor : undefined,
      detalhes: a.detalhes,
      restaurante: await nomeDoRestaurante(rid),
    })
    if (msg) await enviar(msg)
  },
)

/* ------------------------------ Resumo do dia ---------------------------- */

/** Resumo do dia só com as ações de um usuário (casa pelo nome gravado em cada atividade). */
async function resumoDoUsuario(db: FirebaseFirestore.Firestore, hoje: string, usuario: string): Promise<void> {
  const inicio = new Date(`${hoje}T00:00:00-03:00`).toISOString()
  const alvo = usuario.toLowerCase()
  const restaurantes = (await db.collection('restaurants').get()).docs.filter((d) => !ehDemo(d.id))

  for (const r of restaurantes) {
    const snap = await db.collection('restaurants').doc(r.id).collection('atividades').where('criadoEm', '>=', inicio).get()
    const minhas = snap.docs
      .map((d) => d.data())
      .filter((a) => String(a.criadoPorNome ?? a.quem ?? '').toLowerCase().includes(alvo) && a.origem !== 'integracao')
    if (!minhas.length) continue

    const conta = (acao: string) => minhas.filter((a) => a.acao === acao)
    const soma = (l: typeof minhas) => ({ qtd: l.length, total: l.reduce((t, a) => t + (Number(a.valor) || 0), 0) })
    const ultima = minhas.map((a) => String(a.criadoEm)).sort().at(-1)!
    const ultimaHora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(ultima))

    await enviar(
      textoResumoUsuario({
        dia: hoje,
        usuario,
        restaurante: (r.get('nome') as string | undefined) ?? r.id,
        vendasDia: soma(conta('lançou as vendas de')).total,
        pedidos: soma(conta('lançou o pedido')),
        caixa: soma(conta('fechou o caixa do PDV')),
        notas: soma(conta('lançou a nota do')),
        despesas: soma(conta('lançou despesa')),
        contagem: soma(conta('contou')),
        ultimaHora,
      }),
    )
  }
}

export const resumoDoDia = onSchedule(
  { schedule: '30 21 * * *', timeZone: FUSO, secrets: SEGREDOS },
  async () => {
    const db = getFirestore()
    const hoje = diaSP()
    if (RESUMO_USUARIO.value().trim()) {
      await resumoDoUsuario(db, hoje, RESUMO_USUARIO.value().trim())
      return
    }
    const limiteAtividade = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const restaurantes = (await db.collection('restaurants').get()).docs.filter((d) => !ehDemo(d.id))

    const comMovimento: MovimentoDia[] = []
    const semMovimento: string[] = []
    let ativas = 0
    for (const r of restaurantes) {
      const base = db.collection('restaurants').doc(r.id)
      const [pedidos, receita, despesas] = await Promise.all([
        base.collection('pdv_pedidos').where('dia', '==', hoje).get(),
        base.collection('receita_dia').where('data', '==', hoje).get(),
        base.collection('despesas').where('dataCompetencia', '==', hoje).get(),
      ])
      const vendas = pedidos.docs.map((p) => p.data()).filter((p) => p.status !== 'cancelado')
      const m: MovimentoDia = {
        nome: (r.get('nome') as string | undefined) ?? r.id,
        vendas: vendas.length,
        totalPdv: vendas.reduce((s, p) => s + (Number(p.total) || 0), 0),
        totalCaixa: receita.docs.reduce((s, p) => s + (Number(p.get('totalDia')) || 0), 0),
        despesas: despesas.size,
        totalDespesas: despesas.docs.reduce((s, p) => s + (Number(p.get('valorTotal')) || 0), 0),
      }
      if (m.vendas || m.totalCaixa || m.despesas) {
        ativas++
        comMovimento.push(m)
        continue
      }
      // Conta de teste ou abandonada não conta: só quem usou o app na última semana.
      const recente = await base.collection('atividades').where('criadoEm', '>=', limiteAtividade).limit(1).get()
      if (!recente.empty) {
        ativas++
        semMovimento.push(m.nome)
      }
    }
    if (!ativas) return

    await enviar(textoResumoGeral(hoje, comMovimento, semMovimento))
  },
)

/* -------------------------------- Lembretes ------------------------------ */

export const lembretes = onSchedule(
  { schedule: '0 9 * * *', timeZone: FUSO, secrets: SEGREDOS },
  async () => {
    const [ano, mes, dia] = diaSP().split('-').map(Number)
    const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() // 1 = segunda

    if (dia === 1 || dia === 28) await enviar(dia === 1 ? LEMBRETE_INICIO_DO_MES : LEMBRETE_FIM_DO_MES)
    if (diaSemana === 1) {
      const semana = Math.floor(Date.UTC(ano, mes - 1, dia) / (7 * 24 * 3600 * 1000))
      await enviar(textoDica(semana))
    }
  },
)
