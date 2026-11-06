/* ------------------------------------------------------------------ *
 * E-mails de convite (transacionais):
 *   conviteEmailCriado   convite com `emailConvidado` → "{Quem} chamou você"
 *   conviteEmailAceito   convite passou a "aceito" → aviso pra quem convidou
 *   lembrarConvites      todo dia 11h: convite pendente há 3 dias → 1 lembrete
 * ------------------------------------------------------------------ */
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { renderizar } from './catalogo'
import { primeiroNome } from './contato'
import { enviarUmaVez } from './enviarUmaVez'
import { URL_SITE } from './layout'
import { EMAIL_TESTE_PARA, modoAtual, RESEND_API_KEY } from './params'
import { clienteResend } from './resend'

interface Convite {
  restauranteId: string
  restauranteNome: string
  papel: string
  lojas?: Array<{ restauranteId: string; restauranteNome: string; papel: string }>
  criadoPor: string
  criadoEm: string
  status: string
  emailConvidado?: string
  usadoPor?: string
}

export const ROTULO_PAPEL: Record<string, string> = { gestao: 'Gestão', caixa: 'Caixa', cozinha: 'Cozinha', dono: 'Dono', franqueador: 'Franqueador' }
export const O_QUE_FAZ: Record<string, string> = {
  gestao: 'Como Gestão, você vê e lança tudo: vendas, despesas, estoque, caixa, DRE e metas.',
  caixa: 'No Tá no Caixa você abre, fecha e confere o caixa da loja.',
  cozinha: 'No Tá no Caixa você cuida de produtos e estoque: entradas, saídas e o que está acabando.',
}

/** Nome da loja (ou "X e mais N lojas") e o papel, a partir do convite. */
export function resumoDoConvite(c: Pick<Convite, 'restauranteNome' | 'papel' | 'lojas'>): { loja: string; papel: string; oQueFaz: string } {
  const lojas = c.lojas?.length ? c.lojas : [{ restauranteNome: c.restauranteNome, papel: c.papel }]
  const papeis = [...new Set(lojas.map((l) => l.papel))]
  return {
    loja: lojas.length === 1 ? lojas[0].restauranteNome : `${lojas[0].restauranteNome} e mais ${lojas.length - 1} ${lojas.length === 2 ? 'loja' : 'lojas'}`,
    papel: papeis.map((p) => ROTULO_PAPEL[p] ?? p).join(' / '),
    oQueFaz: papeis.length === 1 ? O_QUE_FAZ[papeis[0]] ?? '' : '',
  }
}

async function nomeDe(db: Firestore, uid: string): Promise<{ nome: string; email: string }> {
  const u = (await db.doc(`users/${uid}`).get()).data() ?? {}
  const email = ((u.email as string | undefined) ?? '').trim().toLowerCase()
  return { nome: primeiroNome(u.nome as string | undefined, email) || 'Alguém da equipe', email }
}

const deps = (db: Firestore) => ({ db, resend: clienteResend({ apiKey: RESEND_API_KEY.value() }), modo: modoAtual(), testePara: EMAIL_TESTE_PARA.value() })

export const conviteEmailCriado = onDocumentCreated({ document: 'convites/{token}', secrets: [RESEND_API_KEY] }, async (ev) => {
  const c = ev.data?.data() as Convite | undefined
  if (!c?.emailConvidado || c.status !== 'pendente') return
  const db = getFirestore()
  const quem = await nomeDe(db, c.criadoPor)
  const r = resumoDoConvite(c)
  const email = renderizar('convite', { QUEM: quem.nome, LOJA: r.loja, PAPEL: r.papel, O_QUE_FAZ: r.oQueFaz, LINK: `${URL_SITE}/convite/${ev.params.token}` })
  const res = await enviarUmaVez({ chave: `convite_${ev.params.token}`, para: c.emailConvidado, email, tipo: 'convite', restauranteId: c.restauranteId }, deps(db))
  console.log(`convite ${ev.params.token}: ${res}`)
})

export const conviteEmailAceito = onDocumentUpdated({ document: 'convites/{token}', secrets: [RESEND_API_KEY] }, async (ev) => {
  const antes = ev.data?.before.data() as Convite | undefined
  const depois = ev.data?.after.data() as Convite | undefined
  if (!depois || antes?.status === 'aceito' || depois.status !== 'aceito' || !depois.usadoPor) return
  const db = getFirestore()
  const [quem, novo] = await Promise.all([nomeDe(db, depois.criadoPor), nomeDe(db, depois.usadoPor)])
  if (!quem.email.includes('@') || depois.usadoPor === depois.criadoPor) return
  const r = resumoDoConvite(depois)
  const email = renderizar('convite-aceito', { OI: `Oi, ${quem.nome}!`, NOVO: novo.nome, LOJA: r.loja, PAPEL: r.papel })
  const res = await enviarUmaVez({ chave: `convite_aceito_${ev.params.token}`, para: quem.email, email, tipo: 'convite_aceito', uid: depois.criadoPor, restauranteId: depois.restauranteId }, deps(db))
  console.log(`convite aceito ${ev.params.token}: ${res}`)
})

export const lembrarConvites = onSchedule(
  { schedule: '0 11 * * *', timeZone: 'America/Sao_Paulo', secrets: [RESEND_API_KEY], timeoutSeconds: 300 },
  async () => {
    const db = getFirestore()
    const agora = Date.now()
    const pendentes = await db.collection('convites').where('status', '==', 'pendente').get()
    const d = deps(db)
    const contagem: Record<string, number> = {}
    for (const doc of pendentes.docs) {
      const c = doc.data() as Convite
      const idade = agora - Date.parse(c.criadoEm)
      if (!c.emailConvidado || idade < 3 * 86_400_000 || idade > 4 * 86_400_000) continue
      const quem = await nomeDe(db, c.criadoPor)
      const r = resumoDoConvite(c)
      const email = renderizar('convite-lembrete', { QUEM: quem.nome, LOJA: r.loja, PAPEL: r.papel, LINK: `${URL_SITE}/convite/${doc.id}` })
      const res = await enviarUmaVez({ chave: `convite_lembrete_${doc.id}`, para: c.emailConvidado, email, tipo: 'convite_lembrete', restauranteId: c.restauranteId }, d)
      contagem[res] = (contagem[res] ?? 0) + 1
    }
    console.log('lembretes de convite:', JSON.stringify(contagem))
  },
)
