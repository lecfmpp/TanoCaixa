/* ------------------------------------------------------------------ *
 * Lembretes de rotina por WhatsApp, um grupo por restaurante.
 *
 * Quem recebe: só restaurantes com documento em `whatsapp_grupos/{rid}` com
 * `grupoId` e status "conectado" (dono dentro do grupo, sem falhas seguidas).
 * O dono cria o grupo no WhatsApp dele, adiciona o número do Tá no Caixa e
 * manda o código que o painel mostra (ver whatsappWebhook.ts). Coleção só do
 * servidor; o painel fala com ela pelos callables abaixo, que checam dono/gestão.
 * Cada tentativa de envio fica em `whatsapp_grupos/{rid}/envios`.
 *
 * Quando: duas rodadas por dia (manhã 9h, noite 18h30). No máximo 1 lembrete por
 * restaurante por dia (marcador `lembretes_enviados/{rid}_{dia}`, criado de forma
 * atômica) e cada tipo respeita seu intervalo mínimo (`ultimoEnvio`). Tudo
 * começa DESLIGADO: só envia o que o restaurante ligou no dashboard.
 * ------------------------------------------------------------------ */
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { SEGREDOS, FUSO, diaSP, ehDemo, enviarLembrete, enviar } from './whatsapp'
import { WHATSAPP_NUMERO, configurado } from './whatsappProvedor'
import {
  anotarResultado,
  apagarCampo,
  celularDoDono,
  conferirGrupo,
  gravarConferencia,
  refGrupo,
  registrarEnvio,
  testesNaUltimaHora,
  ultimosEnvios,
  type GrupoDoc,
} from './whatsappGrupoDb'
import { VALIDADE_CODIGO_MIN, codigoValido, finalDoCelular, gerarCodigo, podeEnviar, textoTeste, type StatusGrupo } from './whatsappGrupoRegras'
import { LEMBRETES, type IdLembrete } from './lembretesCatalogo'
import { REGRAS, PRIORIDADE, EM_BREVE, diasEntre, type Ctx, type DespesaMin } from './lembretesRegras'
import { normalizarPapel } from './papel'

// Lazy: o app do Firebase Admin só está inicializado quando uma função roda.
const db = { doc: (p: string) => getFirestore().doc(p), collection: (p: string) => getFirestore().collection(p) }


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
      ...(typeof x.parcelas === 'number' && x.parcelas > 1 ? { parcela: Number(x.parcela) || 1, parcelas: x.parcelas } : {}),
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
    if (ehDemo(rid) || !podeEnviar(cfg.status, !!cfg.grupoId)) continue
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
        const marca = db.doc(`lembretes_enviados/${rid}_${hoje}`)
        try {
          await marca.create({ restaurante: rid, dia: hoje, lembrete: id, enviadoEm: new Date().toISOString() })
        } catch {
          break
        }
        const r = await enviarLembrete(id, disparo.vars, disparo.variante, cfg.grupoId)
        await registrarEnvio(rid, { tipo: 'lembrete', lembrete: id, rodada, grupoId: cfg.grupoId! }, r)
        await anotarResultado(rid, cfg, r)
        if (r.ok) {
          await g.ref.set({ ultimoEnvio: { [id]: hoje } }, { merge: true })
        } else {
          // Falhou: o dia não fica gasto, a próxima rodada pode tentar de novo.
          await marca.delete()
        }
        break
      }
    } catch (e) {
      console.error(`lembretes ${rodada}: falhou para ${rid}`, e)
    }
  }
}

export const lembretesManha = onSchedule({ schedule: '0 9 * * *', timeZone: FUSO, secrets: SEGREDOS, timeoutSeconds: 300 }, () => rodar('manha'))
export const lembretesNoite = onSchedule({ schedule: '30 18 * * *', timeZone: FUSO, secrets: SEGREDOS, timeoutSeconds: 300 }, () => rodar('noite'))

/* ----------------------- Conferência diária dos grupos ------------------- */

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 8h30, antes da rodada da manhã: confere se cada grupo ainda está acessível e
 * com o dono dentro. Sem o dono, os lembretes param (status "dono_fora") até ele
 * voltar. Lojas que mudaram para erro aparecem num aviso no grupo interno.
 * Uma consulta por segundo: é o limite do provedor para dados de grupo.
 */
export const conferirGruposWhatsapp = onSchedule({ schedule: '30 8 * * *', timeZone: FUSO, secrets: SEGREDOS, timeoutSeconds: 540 }, async () => {
  if (!configurado()) return
  const grupos = await db.collection('whatsapp_grupos').get()
  const comProblema: string[] = []
  for (const g of grupos.docs) {
    const cfg = g.data() as GrupoDoc
    if (ehDemo(g.id) || !cfg.grupoId) continue
    try {
      const c = await conferirGrupo(cfg.grupoId, await celularDoDono(g.id))
      await gravarConferencia(g.id, c)
      if (c.status !== 'conectado' && cfg.status === 'conectado') {
        const nome = ((await db.doc(`restaurants/${g.id}`).get()).get('nome') as string | undefined) ?? g.id
        comProblema.push(`• ${nome}: ${c.status === 'dono_fora' ? 'dono saiu do grupo' : 'sem acesso ao grupo'}`)
      }
    } catch (e) {
      console.error(`conferirGruposWhatsapp: falhou para ${g.id}`, e)
    }
    await espera(1100)
  }
  if (comProblema.length) await enviar(`⚠️ *Grupos de WhatsApp com problema hoje*\n${comProblema.join('\n')}`)
})

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

/** O que o painel mostra. O número do Tá no Caixa vai inteiro (o dono precisa adicioná-lo); o do dono, só o final. */
async function configDoRestaurante(rid: string, papel: 'dono' | 'gestao') {
  const [snap, celular, envios] = await Promise.all([refGrupo(rid).get(), celularDoDono(rid), ultimosEnvios(rid)])
  const cfg = (snap.data() ?? {}) as GrupoDoc
  const status: StatusGrupo = cfg.grupoId ? cfg.status ?? 'conectado' : 'sem_grupo'
  const codigoAtivo = !cfg.grupoId && cfg.codigo && codigoValido(cfg.codigoExpiraEm) ? { codigo: cfg.codigo, expiraEm: cfg.codigoExpiraEm! } : null
  return {
    status,
    statusMotivo: cfg.statusMotivo ?? '',
    temGrupo: !!cfg.grupoId,
    grupoId: cfg.grupoId ?? '',
    pessoas: (snap.get('pessoas') as number | undefined) ?? null,
    conectadoEm: cfg.conectadoEm ?? null,
    /** Número do Tá no Caixa que o dono adiciona ao grupo. */
    numeroTaNoCaixa: WHATSAPP_NUMERO.value(),
    /** Celular do dono (que precisa estar no grupo), só o final. */
    celularDono: celular ? finalDoCelular(celular) : null,
    codigo: codigoAtivo,
    /** Dono e gestão configuram, trocam o grupo e testam. */
    podeEditarGrupo: true,
    /** Só o dono desconecta o grupo da loja. */
    podeDesconectar: papel === 'dono',
    lembretes: (Object.keys(LEMBRETES) as IdLembrete[]).map((id) => ({
      id,
      titulo: TITULOS[id],
      grupo: LEMBRETES[id].grupo,
      quando: LEMBRETES[id].gatilho,
      disponivel: !EM_BREVE.includes(id),
      ativo: !!cfg.ativos?.[id],
    })),
    envios: envios.map((e) => ({ ...e, titulo: e.tipo === 'lembrete' && e.lembrete ? TITULOS[e.lembrete as IdLembrete] ?? e.lembrete : null })),
  }
}

const dadosDe = <T>(req: { data?: unknown }) => (req.data ?? {}) as T

/** Estado do painel: status do grupo, código ativo, lembretes e últimos envios. */
export const lembretesWhatsappConfig = onCall(async (req) => {
  const { rid, papel } = await exigirGestao(req.auth?.uid, dadosDe<{ restauranteId?: string }>(req).restauranteId)
  return configDoRestaurante(rid, papel)
})

/** Liga ou desliga um lembrete. Só vale se o restaurante tem grupo e o lembrete já está disponível. */
export const lembretesWhatsappSalvar = onCall(async (req) => {
  const { restauranteId, id, ativo } = dadosDe<{ restauranteId?: string; id?: string; ativo?: boolean }>(req)
  const { rid, papel } = await exigirGestao(req.auth?.uid, restauranteId)
  if (!id || !(id in LEMBRETES) || typeof ativo !== 'boolean') throw new HttpsError('invalid-argument', 'id e ativo obrigatórios')
  if (EM_BREVE.includes(id as IdLembrete)) throw new HttpsError('failed-precondition', 'Esse lembrete ainda não está disponível')
  const ref = refGrupo(rid)
  if (!(await ref.get()).get('grupoId')) throw new HttpsError('failed-precondition', 'Conecte o grupo de WhatsApp primeiro')
  await ref.set({ ativos: { [id]: ativo } }, { merge: true })
  return configDoRestaurante(rid, papel)
})

/**
 * Gera o código de pareamento ("TNC-4821", 30 min). O dono manda o código no
 * grupo dele e o webhook liga o grupo à loja. Gerar de novo invalida o anterior.
 */
export const lembretesWhatsappCodigo = onCall(async (req) => {
  const { rid, papel } = await exigirGestao(req.auth?.uid, dadosDe<{ restauranteId?: string }>(req).restauranteId)
  const ref = refGrupo(rid)
  const antigo = (await ref.get()).get('codigo') as string | undefined
  const expiraEm = new Date(Date.now() + VALIDADE_CODIGO_MIN * 60 * 1000).toISOString()
  let codigo = ''
  for (let i = 0; i < 5 && !codigo; i++) {
    const tentativa = gerarCodigo()
    try {
      await db.doc(`whatsapp_codigos/${tentativa}`).create({ rid, expiraEm, criadoEm: new Date().toISOString(), criadoPor: req.auth!.uid })
      codigo = tentativa
    } catch {
      const existente = await db.doc(`whatsapp_codigos/${tentativa}`).get()
      if (!codigoValido(existente.get('expiraEm') as string | undefined)) {
        await existente.ref.set({ rid, expiraEm, criadoEm: new Date().toISOString(), criadoPor: req.auth!.uid })
        codigo = tentativa
      }
    }
  }
  if (!codigo) throw new HttpsError('resource-exhausted', 'Não deu para gerar o código agora. Tente de novo em instantes.')
  if (antigo && antigo !== codigo) await db.doc(`whatsapp_codigos/${antigo}`).delete().catch(() => undefined)
  await ref.set({ codigo, codigoExpiraEm: expiraEm }, { merge: true })
  return configDoRestaurante(rid, papel)
})

/** ID de grupo do WhatsApp: dígitos (e hífen) + @g.us. Conversas individuais não valem. */
export const ehIdDeGrupo = (v: string) => /^\d{8,}(-\d+)?@g\.us$/.test(v)

/** Liga a loja a um grupo pelo ID (caminho manual, para o suporte). Dono ou gestão. Confere o dono no grupo. */
export const lembretesWhatsappGrupo = onCall({ secrets: SEGREDOS }, async (req) => {
  const { restauranteId, grupoId } = dadosDe<{ restauranteId?: string; grupoId?: string }>(req)
  const { rid, papel } = await exigirGestao(req.auth?.uid, restauranteId)
  const novo = (grupoId ?? '').trim()
  if (!ehIdDeGrupo(novo)) throw new HttpsError('invalid-argument', 'ID de grupo inválido. Ele termina em @g.us (ex.: 120363012345678901@g.us).')
  const outro = await db.collection('whatsapp_grupos').where('grupoId', '==', novo).limit(2).get()
  if (outro.docs.some((d) => d.id !== rid)) throw new HttpsError('already-exists', 'Este grupo já recebe os lembretes de outra loja.')
  const c = await conferirGrupo(novo, await celularDoDono(rid))
  await refGrupo(rid).set({ grupoId: novo, origem: 'manual', conectadoEm: new Date().toISOString(), conectadoPor: req.auth!.uid, codigo: apagarCampo(), codigoExpiraEm: apagarCampo() }, { merge: true })
  await gravarConferencia(rid, c)
  return configDoRestaurante(rid, papel)
})

/** Desliga o grupo da loja (os lembretes param). Só o dono. */
export const lembretesWhatsappDesconectar = onCall(async (req) => {
  const { rid, papel } = await exigirGestao(req.auth?.uid, dadosDe<{ restauranteId?: string }>(req).restauranteId)
  if (papel !== 'dono') throw new HttpsError('permission-denied', 'Só o dono desconecta o grupo')
  await refGrupo(rid).set({ grupoId: apagarCampo(), status: 'sem_grupo', statusMotivo: '', statusEm: new Date().toISOString() }, { merge: true })
  return configDoRestaurante(rid, papel)
})

const LIMITE_TESTES_HORA = 5

/**
 * "Mandar mensagem de teste": confere o grupo (acesso e dono dentro), manda uma
 * mensagem fixa e devolve o resultado na hora. Não conta como lembrete do dia.
 */
export const lembretesWhatsappTeste = onCall({ secrets: SEGREDOS }, async (req) => {
  const { rid, papel } = await exigirGestao(req.auth?.uid, dadosDe<{ restauranteId?: string }>(req).restauranteId)
  const cfg = ((await refGrupo(rid).get()).data() ?? {}) as GrupoDoc
  if (!cfg.grupoId) throw new HttpsError('failed-precondition', 'Conecte o grupo de WhatsApp primeiro')
  if ((await testesNaUltimaHora(rid)) >= LIMITE_TESTES_HORA) throw new HttpsError('resource-exhausted', `No máximo ${LIMITE_TESTES_HORA} testes por hora. Tente de novo mais tarde.`)

  const c = await conferirGrupo(cfg.grupoId, await celularDoDono(rid))
  await gravarConferencia(rid, c)
  if (c.status !== 'conectado') {
    return {
      resultado: c.status === 'dono_fora' ? 'dono_fora' : 'sem_acesso',
      mensagem: c.status === 'dono_fora' ? 'O número do dono não está no grupo. Adicione o dono e teste de novo.' : 'O número do Tá no Caixa não está mais no grupo, ou o grupo foi apagado.',
      config: await configDoRestaurante(rid, papel),
    }
  }

  const [membro, rest] = await Promise.all([db.doc(`restaurants/${rid}/membros/${req.auth!.uid}`).get(), db.doc(`restaurants/${rid}`).get()])
  const quem = (membro.get('nome') as string | undefined) || 'alguém da equipe'
  const loja = (rest.get('nome') as string | undefined) ?? 'sua loja'
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' }).format(new Date())
  const r = await enviar(textoTeste(loja, quem, hora), undefined, cfg.grupoId)
  await registrarEnvio(rid, { tipo: 'teste', grupoId: cfg.grupoId, porUid: req.auth!.uid, porNome: quem }, r)
  await anotarResultado(rid, cfg, r)
  return {
    resultado: r.ok ? 'enviada' : 'falhou',
    mensagem: r.ok ? 'Mensagem enviada. Confira o grupo: a entrega aparece no histórico em instantes.' : `O envio falhou: ${r.erro ?? 'erro desconhecido'}`,
    config: await configDoRestaurante(rid, papel),
  }
})
