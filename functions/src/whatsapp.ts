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
/** Se preenchido (ex.: "Fernando"), o resumo do dia fala só do que esse usuário fez. Vazio = todos. */
const RESUMO_USUARIO = defineString('RESUMO_USUARIO', { default: '' })
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

interface MovimentoDia {
  nome: string
  vendas: number
  totalPdv: number
  totalCaixa: number
  despesas: number
  totalDespesas: number
}

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
    const total = (l: typeof minhas) => l.reduce((s, a) => s + (Number(a.valor) || 0), 0)
    const notas = conta('lançou a nota do')
    const despesas = conta('lançou despesa')
    const contagens = conta('contou')
    const vendasDia = conta('lançou as vendas de')
    const pedidos = conta('lançou o pedido')
    const caixas = conta('fechou o caixa do PDV')
    const ultima = minhas.map((a) => String(a.criadoEm)).sort().at(-1)!

    const nome = (r.get('nome') as string | undefined) ?? r.id
    const linhas = [`📊 *Resumo do dia* — ${hoje.split('-').reverse().join('/')}`, `👤 ${usuario} · _${nome}_`, '']
    if (vendasDia.length) linhas.push(`💵 Vendas lançadas: ${brl(total(vendasDia))}`)
    if (pedidos.length) linhas.push(`🧾 ${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'} no PDV — ${brl(total(pedidos))}`)
    if (caixas.length) linhas.push(`🔒 Caixa fechado — faturamento ${brl(total(caixas))}`)
    if (notas.length) linhas.push(`📥 ${notas.length} ${notas.length === 1 ? 'nota fiscal lançada' : 'notas fiscais lançadas'} — ${brl(total(notas))}`)
    if (despesas.length) linhas.push(`💸 ${despesas.length} ${despesas.length === 1 ? 'despesa' : 'despesas'} — ${brl(total(despesas))}`)
    if (contagens.length) linhas.push(`📦 Contagem de estoque feita${total(contagens) ? ` — estoque em ${brl(total(contagens))}` : ''}`)
    const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date(ultima))
    linhas.push('', `🕘 Última ação às ${hora} (${minhas.length} no total)`)
    await enviar(linhas.join('\n'))
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

    const soma = (f: (m: MovimentoDia) => number) => comMovimento.reduce((s, m) => s + f(m), 0)
    const pedidos = soma((m) => m.vendas)
    const entrouCaixa = soma((m) => m.totalCaixa)
    const notas = soma((m) => m.despesas)

    const linhas = [`📊 *Resumo do dia* — ${hoje.split('-').reverse().join('/')}`, '']
    linhas.push(`🏪 ${comMovimento.length} de ${ativas} restaurantes lançaram hoje`)
    if (pedidos) linhas.push(`🧾 ${pedidos} ${pedidos === 1 ? 'venda' : 'vendas'} no PDV — ${brl(soma((m) => m.totalPdv))}`)
    if (entrouCaixa) linhas.push(`💵 Entrou no caixa: ${brl(entrouCaixa)}`)
    if (notas) linhas.push(`📥 ${notas} ${notas === 1 ? 'nota/despesa' : 'notas/despesas'} — ${brl(soma((m) => m.totalDespesas))}`)

    // Só os 5 maiores, para a mensagem caber numa tela.
    const maiores = [...comMovimento]
      .sort((a, b) => b.totalPdv + b.totalCaixa - (a.totalPdv + a.totalCaixa))
      .slice(0, 5)
    if (maiores.length) {
      linhas.push('', '*Maiores do dia*')
      for (const m of maiores) {
        const v = m.totalPdv + m.totalCaixa
        linhas.push(`• ${m.nome}${v ? ` — ${brl(v)}` : ` — ${m.despesas} ${m.despesas === 1 ? 'nota' : 'notas'}`}`)
      }
    }

    if (semMovimento.length) {
      const nomes = [...new Set(semMovimento)]
      const resto = nomes.length > 3 ? ` e mais ${nomes.length - 3}` : ''
      linhas.push('', `⏳ ${semMovimento.length} ainda sem lançamento (${nomes.slice(0, 3).join(', ')}${resto}). Dá tempo de lançar antes de dormir 😉`)
    }
    await enviar(linhas.join('\n'))
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
