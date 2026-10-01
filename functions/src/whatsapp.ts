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
import { defineSecret, defineString } from 'firebase-functions/params'
import { getFirestore } from 'firebase-admin/firestore'

const GREEN_API_URL = defineSecret('GREEN_API_URL')
const GREEN_API_ID = defineSecret('GREEN_API_ID')
const GREEN_API_TOKEN = defineSecret('GREEN_API_TOKEN')
const WHATSAPP_GRUPO = defineString('WHATSAPP_GRUPO', { default: '' })
const SEGREDOS = [GREEN_API_URL, GREEN_API_ID, GREEN_API_TOKEN]
const FUSO = 'America/Sao_Paulo'

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Best-effort: falhar aqui nunca pode derrubar a função que chamou. */
async function enviar(texto: string): Promise<void> {
  const grupo = WHATSAPP_GRUPO.value()
  if (!grupo || !GREEN_API_URL.value() || !GREEN_API_ID.value() || !GREEN_API_TOKEN.value()) {
    console.log('WhatsApp não configurado — mensagem não enviada:', texto)
    return
  }
  try {
    const url = `${GREEN_API_URL.value()}/waInstance${GREEN_API_ID.value()}/sendMessage/${GREEN_API_TOKEN.value()}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: grupo, message: texto, linkPreview: false }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!resp.ok) console.error(`WhatsApp -> HTTP ${resp.status}`, (await resp.text()).slice(0, 200))
  } catch (e) {
    console.error('WhatsApp falhou (rede)', e)
  }
}

const ehDemo = (rid: string) => rid.startsWith('demo-') || rid.startsWith('rede-demo')

/** 'YYYY-MM-DD' no fuso de São Paulo. */
function diaSP(d = new Date()): string {
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

    const acao = String(a.acao ?? '')
    const entidade = String(a.entidade ?? '')
    const quem = String(a.quem || a.criadoPorNome || 'Alguém')
    const valor = typeof a.valor === 'number' ? a.valor : undefined

    let msg: string | null = null
    if (acao === 'lançou a nota do') {
      msg = `🧾 *Nota fiscal lançada*\n${quem} lançou a nota do ${entidade}${valor ? ` — ${brl(valor)}` : ''}.`
    } else if (acao === 'contou') {
      msg = `📦 *Contagem de estoque feita*\n${quem} contou ${entidade}${valor ? ` — estoque em ${brl(valor)}` : ''}.`
    } else if (acao === 'lançou as vendas de') {
      msg = `💵 *Vendas do dia lançadas*\n${quem} lançou as vendas de ${entidade}${valor ? `: ${brl(valor)}` : ''}.`
    } else if (acao === 'fechou o caixa do PDV') {
      msg = `🔒 *Caixa fechado* (${entidade})\n${quem} fechou o caixa${valor !== undefined ? ` — faturamento ${brl(valor)}` : ''}.`
    }
    if (!msg) return
    await enviar(`${msg}\n_${await nomeDoRestaurante(rid)}_`)
  },
)

/* ------------------------------ Resumo do dia ---------------------------- */

export const resumoDoDia = onSchedule(
  { schedule: '30 21 * * *', timeZone: FUSO, secrets: SEGREDOS },
  async () => {
    const db = getFirestore()
    const hoje = diaSP()
    const restaurantes = (await db.collection('restaurants').get()).docs.filter((d) => !ehDemo(d.id))

    const blocos: string[] = []
    const semMovimento: string[] = []
    for (const r of restaurantes) {
      const base = db.collection('restaurants').doc(r.id)
      const [pedidos, receita, despesas] = await Promise.all([
        base.collection('pdv_pedidos').where('dia', '==', hoje).get(),
        base.collection('receita_dia').where('data', '==', hoje).get(),
        base.collection('despesas').where('dataCompetencia', '==', hoje).get(),
      ])
      const vendas = pedidos.docs.map((p) => p.data()).filter((p) => p.status !== 'cancelado')
      const totalPdv = vendas.reduce((s, p) => s + (Number(p.total) || 0), 0)
      const totalCaixa = receita.docs.reduce((s, p) => s + (Number(p.get('totalDia')) || 0), 0)
      const totalDespesas = despesas.docs.reduce((s, p) => s + (Number(p.get('valorTotal')) || 0), 0)
      const nome = (r.get('nome') as string | undefined) ?? r.id

      if (!vendas.length && !totalCaixa && !despesas.size) {
        semMovimento.push(nome)
        continue
      }
      const linhas = [`*${nome}*`]
      if (vendas.length) linhas.push(`• ${vendas.length} ${vendas.length === 1 ? 'venda' : 'vendas'} no PDV — ${brl(totalPdv)}`)
      if (totalCaixa) linhas.push(`• Fluxo de caixa: entrou ${brl(totalCaixa)}`)
      if (despesas.size) linhas.push(`• ${despesas.size} ${despesas.size === 1 ? 'nota/despesa' : 'notas/despesas'} — ${brl(totalDespesas)}`)
      blocos.push(linhas.join('\n'))
    }

    if (!blocos.length && !semMovimento.length) return
    const partes = [`📊 *Resumo do dia* — ${hoje.split('-').reverse().join('/')}`]
    if (blocos.length) partes.push(blocos.join('\n\n'))
    if (semMovimento.length) {
      partes.push(`Sem lançamentos hoje: ${semMovimento.join(', ')}. Dá tempo de lançar as vendas antes de dormir 😉`)
    }
    await enviar(partes.join('\n\n'))
  },
)

/* -------------------------------- Lembretes ------------------------------ */

/** Dicas de uso, uma por segunda-feira, em rodízio. Tom positivo e com o próximo passo. */
const DICAS = [
  '💡 *Dica da semana*: lance as vendas todo dia, no fim do expediente. Em 1 minuto o fluxo de caixa fica certo e o resumo da segunda sai fiel.',
  '💡 *Dica da semana*: fotografou a nota? Confira os itens e o preço antes de confirmar — é assim que o app avisa quando um fornecedor aumentou o preço.',
  '💡 *Dica da semana*: faça a contagem de estoque sempre com a loja fechada. Contar com o movimento rolando bagunça o que saiu de verdade.',
  '💡 *Dica da semana*: use o PDV para vender — cada pedido já baixa o estoque pela ficha técnica e fecha a receita do dia sozinho.',
  '💡 *Dica da semana*: lance a nota no dia em que ela chega. Nota acumulada vira conta esquecida e CMV errado.',
  '💡 *Dica da semana*: dê uma olhada no plano do mês — ele mostra se mercadoria, pessoal e taxas estão dentro do teto antes de estourar.',
]

export const lembretes = onSchedule(
  { schedule: '0 9 * * *', timeZone: FUSO, secrets: SEGREDOS },
  async () => {
    const [ano, mes, dia] = diaSP().split('-').map(Number)
    const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() // 1 = segunda

    if (dia === 1 || dia === 28) {
      await enviar(
        dia === 1
          ? '📦 *Dia de contar o estoque!* Começou o mês: faça a contagem com a loja fechada e o app calcula o que saiu e o CMV certinho.'
          : '📦 *Lembrete*: o mês está acabando. Reserve um tempinho para contar o estoque até o dia 1 — assim o CMV do mês fecha certo.',
      )
    }
    if (diaSemana === 1) {
      const semana = Math.floor(Date.UTC(ano, mes - 1, dia) / (7 * 24 * 3600 * 1000))
      await enviar(DICAS[semana % DICAS.length])
    }
  },
)
