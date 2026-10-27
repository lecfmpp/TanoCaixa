/* ------------------------------------------------------------------ *
 * Lembretes de rotina por WhatsApp, um grupo por restaurante.
 *
 * Quem recebe: só restaurantes com documento em `whatsapp_grupos/{rid}`
 * ({ grupoId: '1203…@g.us', ativos: { <idLembrete>: true } }). Coleção só do
 * servidor (nenhuma regra do Firestore a libera para o app); o dashboard fala
 * com ela pelos callables abaixo, que checam dono/gestão.
 *
 * Quando: duas rodadas por dia (manhã 9h, noite 18h30). No máximo 1 lembrete por
 * restaurante por dia (marcador `lembretes_enviados/{rid}_{dia}`, criado de forma
 * atômica) e cada tipo respeita seu intervalo mínimo (`ultimoEnvio`). Tudo
 * começa DESLIGADO: só envia o que o restaurante ligou no dashboard.
 * ------------------------------------------------------------------ */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { SEGREDOS, FUSO, diaSP, ehDemo, enviarLembrete } from './whatsapp'
import { LEMBRETES, type IdLembrete } from './lembretesCatalogo'
import { REGRAS, PRIORIDADE, EM_BREVE, diasEntre, type Ctx, type DespesaMin } from './lembretesRegras'
import { normalizarPapel } from './papel'

// Lazy: o app do Firebase Admin só está inicializado quando uma função roda.
const db = { doc: (p: string) => getFirestore().doc(p), collection: (p: string) => getFirestore().collection(p) }

interface GrupoDoc {
  grupoId?: string
  ativos?: Partial<Record<IdLembrete, boolean>>
  ultimoEnvio?: Partial<Record<IdLembrete, string>> // YYYY-MM-DD
}

/* ------------------------------ Carregar dados --------------------------- */

const iso = (d: Date) => d.toISOString()
const diasAtras = (n: number) => iso(new Date(Date.now() - n * 24 * 3600 * 1000))
const diaAtras = (hoje: string, n: number) => new Date(Date.parse(`${hoje}T12:00:00-03:00`) - n * 24 * 3600 * 1000).toISOString().slice(0, 10)

/** Fim do mês de uma contagem antiga ('2026-07' → '2026-07-31'). */
const fimDoMes = (mes: string) => {
  const [a, m] = mes.split('-').map(Number)
  return `${mes}-${String(new Date(Date.UTC(a, m, 0)).getUTCDate()).padStart(2, '0')}`
}

async function carregarContexto(rid: string, hoje: string): Promise<Ctx> {
  const base = db.collection('restaurants').doc(rid)
  const [ano, mes, diaDoMes] = hoje.split('-').map(Number)
  const [restSnap, abertas, recentes, receita, pedidos, caixas, contagens, produtos, plano, pratos, atividades, ifood, convites] = await Promise.all([
    base.get(),
    base.collection('despesas').where('status', 'in', ['a_pagar', 'vence']).get(),
    base.collection('despesas').where('dataCompetencia', '>=', diaAtras(hoje, 62)).get(),
    base.collection('receita_dia').where('data', '==', hoje).get(),
    base.collection('pdv_pedidos').where('dia', '==', hoje).limit(1).get(),
    base.collection('pdv_caixas').where('status', '==', 'aberto').get(),
    base.collection('contagens').get(),
    base.collection('produtos').limit(1).get(),
    base.collection('planos').doc(hoje.slice(0, 7)).get(),
    base.collection('pratos').get(),
    base.collection('atividades').where('criadoEm', '>=', diasAtras(14)).get(),
    base.collection('integracoes').doc('ifood').get(),
    db.collection('convites').where('restauranteId', '==', rid).where('status', '==', 'pendente').get(),
  ])

  const porId = new Map<string, DespesaMin>()
  for (const d of [...recentes.docs, ...abertas.docs]) {
    const x = d.data()
    porId.set(d.id, {
      id: d.id,
      notaId: x.notaId,
      fornecedor: String(x.fornecedor ?? ''),
      valorTotal: Number(x.valorTotal) || 0,
      dataCompetencia: String(x.dataCompetencia ?? ''),
      dataVencimento: x.dataVencimento || undefined,
      status: String(x.status ?? ''),
      tipoLancamento: x.tipoLancamento,
      criadoEm: x.criadoEm,
      itens: Array.isArray(x.itens)
        ? x.itens.map((i: Record<string, unknown>) => ({ produto: String(i.produto ?? ''), unidade: i.unidade as string | undefined, precoUnitario: Number(i.precoUnitario) || 0, variacao: typeof i.variacao === 'number' ? i.variacao : undefined }))
        : undefined,
    })
  }

  const datasContagem = contagens.docs.map((c) => String(c.get('data') ?? '').slice(0, 10) || (c.get('mesReferencia') ? fimDoMes(String(c.get('mesReferencia'))) : '')).filter(Boolean).sort()

  return {
    hoje,
    inicioDoDia: new Date(`${hoje}T00:00:00-03:00`).toISOString(),
    diaDoMes,
    diaSemana: new Date(Date.UTC(ano, mes - 1, diaDoMes)).getUTCDay(),
    restaurante: (restSnap.get('nome') as string | undefined) ?? rid,
    despesas: [...porId.values()],
    receitaHoje: receita.docs.reduce((s, d) => s + (Number(d.get('totalDia')) || 0), 0),
    pedidosPdvHoje: pedidos.size,
    caixasAbertos: caixas.docs.map((c) => ({ numero: Number(c.get('numero')) || 0, dia: String(c.get('dia') ?? ''), abertoEm: String(c.get('abertoEm') ?? '') })),
    temProdutos: !produtos.empty,
    ultimaContagem: datasContagem.at(-1),
    planoDoMesExiste: plano.exists,
    pratos: pratos.docs.map((p) => ({ nome: String(p.get('nome') ?? ''), ativo: p.get('ativo') !== false, tipo: String(p.get('tipo') ?? 'prato'), fichaItens: Array.isArray(p.get('ficha')) ? (p.get('ficha') as unknown[]).length : 0 })),
    atividades: atividades.docs.map((a) => ({ acao: String(a.get('acao') ?? ''), criadoEm: String(a.get('criadoEm') ?? ''), quem: a.get('criadoPorNome') as string | undefined, origem: a.get('origem') as string | undefined })),
    ifood: ifood.exists ? { status: String(ifood.get('status') ?? ''), ultimoSyncEm: ifood.get('ultimoSyncEm') as string | undefined } : undefined,
    convitesPendentes: convites.docs.map((c) => ({ papel: String(c.get('papel') ?? ''), criadoEm: String(c.get('criadoEm') ?? '') })),
  }
}

/* --------------------------------- Rodadas -------------------------------- */

async function rodar(rodada: 'manha' | 'noite'): Promise<void> {
  const hoje = diaSP()
  const grupos = await db.collection('whatsapp_grupos').get()
  for (const g of grupos.docs) {
    const rid = g.id
    const cfg = g.data() as GrupoDoc
    if (ehDemo(rid) || !cfg.grupoId) continue
    const ligados = PRIORIDADE.filter((id) => cfg.ativos?.[id] && REGRAS[id]?.quando === rodada)
    if (!ligados.length) continue

    try {
      const ctx = await carregarContexto(rid, hoje)
      for (const id of ligados) {
        const regra = REGRAS[id]!
        const ultimo = cfg.ultimoEnvio?.[id]
        if (ultimo && diasEntre(ultimo, hoje) < regra.cooldownDias) continue
        const disparo = regra.detectar(ctx)
        if (!disparo) continue

        // 1 por restaurante por dia: create falha se outro lembrete já saiu hoje.
        try {
          await db.doc(`lembretes_enviados/${rid}_${hoje}`).create({ restaurante: rid, dia: hoje, lembrete: id, enviadoEm: new Date().toISOString() })
        } catch {
          break
        }
        await enviarLembrete(id, disparo.vars, disparo.variante, cfg.grupoId)
        await g.ref.set({ ultimoEnvio: { [id]: hoje } }, { merge: true })
        break
      }
    } catch (e) {
      console.error(`lembretes ${rodada}: falhou para ${rid}`, e)
    }
  }
}

export const lembretesManha = onSchedule({ schedule: '0 9 * * *', timeZone: FUSO, secrets: SEGREDOS, timeoutSeconds: 300 }, () => rodar('manha'))
export const lembretesNoite = onSchedule({ schedule: '30 18 * * *', timeZone: FUSO, secrets: SEGREDOS, timeoutSeconds: 300 }, () => rodar('noite'))

/* ----------------------- Dashboard (callables) --------------------------- */

const TITULOS: Record<IdLembrete, string> = {
  vendas_do_dia: 'Vendas do dia',
  caixa_aberto: 'Caixa do PDV aberto',
  notas_do_dia: 'Notas do dia',
  vencimentos: 'Contas a vencer',
  alta_de_preco: 'Preço em alta',
  relatorio_compras: 'Compras do mês',
  contagem_estoque: 'Contagem de estoque',
  diferenca_estoque: 'Diferença no estoque',
  plano_do_mes: 'Plano do mês',
  dre_mes_anterior: 'DRE do mês anterior',
  ponto_equilibrio: 'Ponto de equilíbrio',
  cmv_acima_meta: 'CMV acima da meta',
  pratos_sem_ficha: 'Pratos sem ficha técnica',
  terminar_cadastro: 'Terminar o cadastro',
  convite_pendente: 'Convite de equipe pendente',
  assinatura: 'Assinatura',
  ifood_parado: 'Integração com o iFood',
}

async function exigirGestao(uid: string | undefined, restauranteId: string | undefined): Promise<{ rid: string; papel: 'dono' | 'gestao' }> {
  if (!uid) throw new HttpsError('unauthenticated', 'Faça login primeiro')
  if (!restauranteId) throw new HttpsError('invalid-argument', 'restauranteId obrigatório')
  const membro = await db.doc(`restaurants/${restauranteId}/membros/${uid}`).get()
  const papel = normalizarPapel(membro.data()?.papel as string | undefined)
  if (!membro.exists || (papel !== 'dono' && papel !== 'gestao')) throw new HttpsError('permission-denied', 'Só dono ou gestão')
  return { rid: restauranteId, papel }
}

async function configDoRestaurante(rid: string, papel: 'dono' | 'gestao') {
  const snap = await db.doc(`whatsapp_grupos/${rid}`).get()
  const cfg = (snap.data() ?? {}) as GrupoDoc
  return {
    temGrupo: !!cfg.grupoId,
    grupoId: cfg.grupoId ?? '',
    /** Só o dono troca o grupo (a gestão liga e desliga lembretes). */
    podeEditarGrupo: papel === 'dono',
    lembretes: (Object.keys(LEMBRETES) as IdLembrete[]).map((id) => ({
      id,
      titulo: TITULOS[id],
      grupo: LEMBRETES[id].grupo,
      quando: LEMBRETES[id].gatilho,
      disponivel: !EM_BREVE.includes(id),
      ativo: !!cfg.ativos?.[id],
    })),
  }
}

/** Estado do dashboard: tem grupo? e quais lembretes estão ligados. Sem grupo, o app esconde a seção. */
export const lembretesWhatsappConfig = onCall(async (req) => {
  const { rid, papel } = await exigirGestao(req.auth?.uid, (req.data as { restauranteId?: string } | undefined)?.restauranteId)
  return configDoRestaurante(rid, papel)
})

/** Liga ou desliga um lembrete. Só vale se o restaurante tem grupo e o lembrete já está disponível. */
export const lembretesWhatsappSalvar = onCall(async (req) => {
  const { restauranteId, id, ativo } = (req.data ?? {}) as { restauranteId?: string; id?: string; ativo?: boolean }
  const { rid, papel } = await exigirGestao(req.auth?.uid, restauranteId)
  if (!id || !(id in LEMBRETES) || typeof ativo !== 'boolean') throw new HttpsError('invalid-argument', 'id e ativo obrigatórios')
  if (EM_BREVE.includes(id as IdLembrete)) throw new HttpsError('failed-precondition', 'Esse lembrete ainda não está disponível')
  const ref = db.doc(`whatsapp_grupos/${rid}`)
  const snap = await ref.get()
  if (!snap.get('grupoId')) throw new HttpsError('failed-precondition', 'Este restaurante ainda não tem grupo de WhatsApp')
  await ref.set({ ativos: { [id]: ativo } }, { merge: true })
  return configDoRestaurante(rid, papel)
})

/** ID de grupo do WhatsApp: dígitos (e hífen) + @g.us. Conversas individuais não valem. */
export const ehIdDeGrupo = (v: string) => /^\d{8,}(-\d+)?@g\.us$/.test(v)

/** Troca o grupo do restaurante (migração do grupo de teste para o grupo do cliente). Só o dono. */
export const lembretesWhatsappGrupo = onCall(async (req) => {
  const { restauranteId, grupoId } = (req.data ?? {}) as { restauranteId?: string; grupoId?: string }
  const { rid, papel } = await exigirGestao(req.auth?.uid, restauranteId)
  if (papel !== 'dono') throw new HttpsError('permission-denied', 'Só o dono troca o grupo')
  const novo = (grupoId ?? '').trim()
  if (!ehIdDeGrupo(novo)) throw new HttpsError('invalid-argument', 'ID de grupo inválido. Ele termina em @g.us (ex.: 120363012345678901@g.us).')
  const ref = db.doc(`whatsapp_grupos/${rid}`)
  if (!(await ref.get()).exists) throw new HttpsError('failed-precondition', 'Este restaurante ainda não tem grupo de WhatsApp')
  await ref.set({ grupoId: novo, grupoTrocadoEm: new Date().toISOString(), grupoTrocadoPor: req.auth!.uid }, { merge: true })
  return configDoRestaurante(rid, papel)
})
