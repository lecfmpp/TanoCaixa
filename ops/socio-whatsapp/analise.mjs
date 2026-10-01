/* ------------------------------------------------------------------ *
 * Sócios no WhatsApp — LÓGICA PURA (sem rede, sem segredo, testada).
 *
 * Recebe o histórico da conversa Leandro ↔ Fernando (formato da Green-API),
 * e devolve: pendências (quem ficou de fazer o quê), o que já foi feito,
 * perguntas sem resposta e "onde paramos". Depois monta o texto do lembrete
 * de cada um.
 *
 * É heurística de propósito: funciona sem IA e sem custo. Se houver
 * GEMINI_API_KEY, `resumo-ia.mjs` refina o resultado — mas este arquivo
 * é sempre o piso.
 * ------------------------------------------------------------------ */

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

/** Texto de uma mensagem da Green-API, seja qual for o tipo. */
export function textoDaMensagem(m) {
  if (!m || typeof m !== 'object') return ''
  if (typeof m.textMessage === 'string') return m.textMessage
  if (m.extendedTextMessage && typeof m.extendedTextMessage.text === 'string') return m.extendedTextMessage.text
  if (m.extendedTextMessageData && typeof m.extendedTextMessageData.text === 'string') return m.extendedTextMessageData.text
  if (typeof m.caption === 'string') return m.caption
  return ''
}

/**
 * Normaliza o histórico cru da Green-API.
 * `quem` diz como reconhecer cada pessoa:
 *   { eu: 'Leandro', socio: 'Fernando', idsSocio: ['5521...@c.us'], idsEu: [...] }
 * Mensagem "outgoing" = enviada pelo número conectado (o do Leandro ou o do bot).
 * Mensagens enviadas pela própria rotina (sendByApi) são ignoradas: o bot não
 * pode virar pendência de ninguém.
 */
export function normalizar(historico, quem) {
  const idsSocio = new Set(quem.idsSocio || [])
  const idsEu = new Set(quem.idsEu || [])
  const out = []
  for (const m of historico || []) {
    if (m.sendByApi) continue
    const texto = textoDaMensagem(m).trim()
    if (!texto) continue
    let autor
    if (m.senderId && idsSocio.has(m.senderId)) autor = quem.socio
    else if (m.senderId && idsEu.has(m.senderId)) autor = quem.eu
    else if (m.type === 'outgoing') autor = quem.eu
    else if (m.type === 'incoming' && !m.senderId) autor = quem.socio // conversa 1:1
    else autor = m.senderName || 'outro'
    out.push({ id: m.idMessage || '', quando: new Date((m.timestamp || 0) * 1000), autor, texto })
  }
  out.sort((a, b) => a.quando - b.quando)
  return out
}

/** Tira dados pessoais antes de qualquer coisa sair da máquina (IA, log). */
export function limpar(texto) {
  return String(texto)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[e-mail]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[cnpj]')
    .replace(/(\+?\d[\d\s().-]{8,}\d)/g, '[número]')
}

const SEM_ACENTO = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// "eu vou", "fico de", "deixa comigo", "vou mandar"… (compromisso de quem escreveu)
const RE_COMPROMISSO = /\b(vou|irei|fico de|fica comigo|deixa comigo|deixa que eu|eu faco|eu mando|eu vejo|eu resolvo|me comprometo|amanha eu|hoje eu)\b/
// "você pode…", "consegue…", "fica com você", "manda pra mim" (pedido ao outro)
const RE_PEDIDO = /\b(voce pode|vc pode|pode me|consegue|fica com voce|fica contigo|fica com vc|me manda|manda pra mim|preciso que voce|preciso que vc|tem como voce|tem como vc)\b/
// "combinado", "fechado", "beleza então" (aceite)
const RE_ACEITE = /^(combinado|fechado|fechou|beleza|blz|ok|pode ser|bora|feito entao|perfeito|show|certo|ta bom|tá bom)\b/
// "feito", "pronto", "enviei", "terminei", "✅"
const RE_FEITO = /(\bfeito\b|\bpronto\b|\benviei\b|\bmandei\b|\bterminei\b|\bja fiz\b|\bja mandei\b|\bja enviei\b|\bresolvido\b|\bconcluido\b|\bentreguei\b|✅)/
const RE_PRAZO = /\b(hoje|amanha|semana que vem|proxima semana|ate (?:o )?(?:fim do dia|fim de semana|segunda|terca|quarta|quinta|sexta|sabado|domingo|dia \d{1,2}(?:\/\d{1,2})?)|(?:na |nesta |essa |esta )?(?:segunda|terca|quarta|quinta|sexta|sabado|domingo)(?:-feira)?|dia \d{1,2}(?:\/\d{1,2})?|\d{1,2}\/\d{1,2})\b/

const VAZIAS = new Set(SEM_ACENTO(
  'a o os as de da do das dos e é que eu vc você voce pra para por com sem um uma no na nos nas em ao isso isto esse essa ' +
  'vou fico ja já mas se me te lhe mais menos hoje amanha amanhã ate até ok entao então ai aí la lá aqui ta tá tb tbm também ' +
  'pode consegue manda mandar fazer faço faco feito pronto enviei mandei terminei preciso deixa comigo fica'
).split(/\s+/))

/** Palavras que identificam o assunto (para casar "vou mandar o contrato" com "mandei o contrato"). */
export function palavrasChave(texto) {
  return [...new Set(SEM_ACENTO(texto).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((p) => p.length >= 4 && !VAZIAS.has(p)))]
}

function prazoDe(texto) {
  const m = SEM_ACENTO(texto).match(RE_PRAZO)
  if (!m) return null
  const acentos = { ate: 'até', terca: 'terça', sabado: 'sábado', amanha: 'amanhã', proxima: 'próxima' }
  return m[0].replace(/\b(ate|terca|sabado|amanha|proxima)\b/g, (w) => acentos[w])
}

/**
 * Extrai pendências da conversa normalizada.
 * Regras (simples e explicáveis):
 *  - compromisso: "vou/fico de/deixa comigo…" → pendência de quem escreveu;
 *  - pedido: "você pode/consegue/me manda…" → pendência do OUTRO;
 *  - aceite ("combinado", "fechado") logo depois de uma pendência vira "combinado";
 *  - feito: a pessoa responsável escreve "feito/enviei/✅…" com pelo menos uma
 *    palavra do mesmo assunto (ou responde logo em seguida) → sai da lista;
 *  - pergunta: termina com "?" e o outro não escreveu nada depois.
 */
export function extrair(msgs, quem) {
  const outro = (autor) => (autor === quem.eu ? quem.socio : quem.eu)
  const itens = []
  const perguntas = []

  msgs.forEach((m, i) => {
    const t = SEM_ACENTO(m.texto)
    const anterior = itens[itens.length - 1]

    // aceite de um item recém-criado pelo outro
    if (anterior && !anterior.feito && anterior.autorMsg !== m.autor && RE_ACEITE.test(t) && i - anterior.indice <= 3) {
      anterior.combinado = true
    }

    // concluído?
    if (RE_FEITO.test(t)) {
      const chave = palavrasChave(m.texto)
      for (let k = itens.length - 1; k >= 0; k--) {
        const it = itens[k]
        if (it.feito || it.responsavel !== m.autor) continue
        const casou = chave.some((p) => it.chave.includes(p)) || chave.length === 0
        if (casou) { it.feito = true; it.feitoEm = m.quando; break }
      }
    }

    let responsavel = null
    if (RE_PEDIDO.test(t)) responsavel = outro(m.autor)
    else if (RE_COMPROMISSO.test(t) && !RE_FEITO.test(t)) responsavel = m.autor
    if (responsavel) {
      itens.push({
        indice: i,
        responsavel,
        autorMsg: m.autor,
        oque: m.texto.length > 160 ? m.texto.slice(0, 157) + '…' : m.texto,
        quando: m.quando,
        prazo: prazoDe(m.texto),
        combinado: false,
        feito: false,
        chave: palavrasChave(m.texto),
      })
    }

    if (/\?\s*$/.test(m.texto)) perguntas.push({ indice: i, autor: m.autor, texto: m.texto, quando: m.quando })
  })

  const semResposta = perguntas.filter((p) => !msgs.slice(p.indice + 1).some((m) => m.autor !== p.autor))
  const ultimas = msgs.slice(-5)

  return {
    pendencias: itens.filter((x) => !x.feito).map(limparItem),
    feitos: itens.filter((x) => x.feito).map(limparItem),
    perguntasSemResposta: semResposta.map(({ autor, texto, quando }) => ({ autor, texto, quando })),
    ondeParamos: ultimas.length
      ? { quando: ultimas[ultimas.length - 1].quando, ultimas: ultimas.map(({ autor, texto, quando }) => ({ autor, texto, quando })) }
      : null,
  }
}

function limparItem({ responsavel, oque, quando, prazo, combinado, feito, feitoEm }) {
  return { responsavel, oque, quando, prazo, combinado, feito, ...(feitoEm ? { feitoEm } : {}) }
}

/** "seg 29/09" no fuso de São Paulo, sem depender do TZ da máquina. */
export function dataCurta(d) {
  const sp = new Date(d.getTime() - 3 * 3600 * 1000) // Brasil sem horário de verão desde 2019
  const dd = String(sp.getUTCDate()).padStart(2, '0')
  const mm = String(sp.getUTCMonth() + 1).padStart(2, '0')
  return `${DIAS[sp.getUTCDay()].slice(0, 3)} ${dd}/${mm}`
}

function diasDesde(d, hoje) {
  return Math.floor((hoje - d) / 86400000)
}

/**
 * Texto do lembrete para UMA pessoa (vai no WhatsApp: *negrito*, sem markdown de título).
 * `nome` = quem recebe; `outroNome` = o sócio.
 */
export function montarLembrete(nome, resultado, { outroNome, hoje = new Date(), projeto = 'Tá no Caixa' } = {}) {
  const minhas = resultado.pendencias.filter((p) => p.responsavel === nome)
  const dele = resultado.pendencias.filter((p) => p.responsavel === outroNome)
  const perguntasParaMim = resultado.perguntasSemResposta.filter((p) => p.autor !== nome)
  const feitosRecentes = resultado.feitos.filter((f) => f.feitoEm && diasDesde(f.feitoEm, hoje) <= 7)

  const linhas = [`Oi, ${nome}! Lembrete do *${projeto}* 👋`, '']

  if (resultado.ondeParamos) {
    const u = resultado.ondeParamos.ultimas[resultado.ondeParamos.ultimas.length - 1]
    linhas.push(`*Onde paramos* (${dataCurta(resultado.ondeParamos.quando)}): ${u.autor} — "${resumir(u.texto, 120)}"`, '')
  }

  if (minhas.length) {
    linhas.push('*Ficou com você:*')
    for (const p of minhas) linhas.push(`• ${resumir(p.oque, 120)}${p.prazo ? ` (prazo: ${p.prazo})` : ''} — combinado em ${dataCurta(p.quando)}`)
    linhas.push('', 'Já conseguiu fazer? Se sim, responde "feito" que eu tiro da lista. Se travou, me conta o que falta.', '')
  } else {
    linhas.push('Nada pendente com você pelo que vi na conversa. ✅', '')
  }

  if (perguntasParaMim.length) {
    linhas.push(`*${outroNome} perguntou e ficou sem resposta:*`)
    for (const p of perguntasParaMim) linhas.push(`• "${resumir(p.texto, 120)}" (${dataCurta(p.quando)})`)
    linhas.push('')
  }

  if (dele.length) {
    linhas.push(`*Com o ${outroNome}:* ${dele.length} ${dele.length === 1 ? 'item' : 'itens'} em aberto.`, '')
  }

  if (feitosRecentes.length) {
    linhas.push(`*Feito nos últimos 7 dias:* ${feitosRecentes.length}`, '')
  }

  linhas.push('*Próximo passo:* qual é a próxima coisa que você vai fazer e até quando?')
  return linhas.join('\n')
}

/** Relatório completo (Markdown) para o Leandro conferir antes de qualquer envio. */
export function montarRelatorio(resultado, { eu, socio, hoje = new Date() }) {
  const l = [`# Sócios no WhatsApp — ${dataCurta(hoje)}`, '']
  l.push('## Pendências em aberto', '')
  if (!resultado.pendencias.length) l.push('_Nenhuma._')
  for (const p of resultado.pendencias) {
    l.push(`- **${p.responsavel}**: ${resumir(p.oque, 160)}${p.prazo ? ` _(prazo: ${p.prazo})_` : ''}${p.combinado ? ' · combinado' : ''} · ${dataCurta(p.quando)}`)
  }
  l.push('', '## Feitos', '')
  if (!resultado.feitos.length) l.push('_Nenhum._')
  for (const f of resultado.feitos) l.push(`- ~~${resumir(f.oque, 160)}~~ (${f.responsavel})`)
  l.push('', '## Perguntas sem resposta', '')
  if (!resultado.perguntasSemResposta.length) l.push('_Nenhuma._')
  for (const p of resultado.perguntasSemResposta) l.push(`- ${p.autor}: "${resumir(p.texto, 160)}" (${dataCurta(p.quando)})`)
  l.push('', '## Onde paramos', '')
  if (resultado.ondeParamos) for (const u of resultado.ondeParamos.ultimas) l.push(`- ${dataCurta(u.quando)} · ${u.autor}: ${resumir(u.texto, 160)}`)
  else l.push('_Conversa vazia._')
  if (resultado.resumoIA) l.push('', '## Resumo da IA', '', resultado.resumoIA)
  l.push('', '## Rascunho do lembrete — ' + socio, '', '```', montarLembrete(socio, resultado, { outroNome: eu, hoje }), '```')
  l.push('', '## Rascunho do lembrete — ' + eu, '', '```', montarLembrete(eu, resultado, { outroNome: socio, hoje }), '```')
  return l.join('\n')
}

function resumir(t, n) {
  const s = String(t).replace(/\s+/g, ' ').trim()
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/**
 * Trava de envio. Só manda de verdade se as DUAS chaves estiverem viradas:
 * a variável SOCIO_WHATSAPP_ENVIAR=sim (decisão do Leandro, guardada no GitHub)
 * E o pedido explícito da execução (--enviar / input do workflow).
 */
export function podeEnviar(env, pediuEnvio) {
  return pediuEnvio === true && String(env.SOCIO_WHATSAPP_ENVIAR || '').trim().toLowerCase() === 'sim'
}
