/* ------------------------------------------------------------------ *
 * Resumo opcional por IA (Gemini, o mesmo provedor do resto do Tá no Caixa).
 * Sem GEMINI_API_KEY, não roda — a heurística de analise.mjs basta.
 * O texto passa por limpar() antes: sem e-mail, telefone, CPF/CNPJ.
 * ------------------------------------------------------------------ */
import { limpar, dataCurta } from './analise.mjs'

const MODELO_PADRAO = 'gemini-3.5-flash' // igual a functions/src/gemini.ts

export async function resumirComIA(msgs, { eu, socio, env = process.env } = {}) {
  const chave = env.GEMINI_API_KEY
  if (!chave) return null
  const modelo = env.GEMINI_MODEL || MODELO_PADRAO
  const transcricao = msgs.slice(-200).map((m) => `[${dataCurta(m.quando)}] ${m.autor}: ${limpar(m.texto)}`).join('\n')
  const prompt = `Você ajuda dois sócios (${eu} e ${socio}) a não perderem o fio do projeto Tá no Caixa.
Leia a conversa e responda em português, curto, em Markdown, com exatamente estas seções:
**Onde paramos** (1–2 frases), **Pendências** (lista "Quem — o quê — prazo, se houver"), **Combinados** (o que os dois decidiram), **Próximo passo sugerido** (1 por sócio).
Não invente nada que não esteja na conversa.

Conversa:
${transcricao}`
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    signal: AbortSignal.timeout(60000),
  })
  if (!r.ok) throw new Error(`Gemini -> HTTP ${r.status}`)
  const j = await r.json()
  return j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || null
}
