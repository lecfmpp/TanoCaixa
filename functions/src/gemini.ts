/* ------------------------------------------------------------------ *
 * Gemini Vision — extrai dados de fotos de notas, produtos e mercadorias.
 *
 * A chave FICA NO SERVIDOR (secret). O frontend manda a foto em base64 e
 * recebe de volta só os campos já extraídos — a chave nunca vai pro navegador.
 *
 * PRÉ-REQUISITO:
 *   firebase functions:secrets:set GEMINI_API_KEY
 * ------------------------------------------------------------------ */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

/** Limite do payload: fotos de celular passam fácil de 1 MB em base64. */
const MAX_BASE64 = 8 * 1024 * 1024

type TipoFoto = 'despesa' | 'produto' | 'estoque'

const PROMPTS: Record<TipoFoto, string> = {
  despesa: `Analise esta nota fiscal, cupom ou boleto e extraia os dados.
Responda com um JSON contendo:
- fornecedor: string — nome da empresa/loja emissora
- valor: number — total da nota em CENTAVOS, inteiro (ex: 5900 para R$ 59,00)
- categoria: string — a conta do plano de contas do DRE. Exatamente um destes códigos:
  Taxas e impostos sobre venda: "comissao_marketplace" (iFood/Rappi), "taxa_cartao" (maquininha),
    "antecipacao", "tarifa_bancaria", "imposto_vendas" (Simples Nacional/DAS/ISS)
  CMV: "cmv_alimentos" (hortifrúti, carnes, secos), "cmv_bebidas", "cmv_descartaveis" (embalagem, marmita)
  Ocupação: "aluguel", "condominio", "agua", "luz", "gas", "iptu", "seguro"
  Pessoal: "folha", "encargos" (FGTS/INSS), "vale_transporte", "vale_alimentacao", "bonus",
    "prolabore", "rescisoes", "pessoal_outros"
  Administrativas: "sistemas" (software, internet, PDV), "contador"
  Operacionais: "limpeza", "detetizacao", "coleta_lixo"
  Variáveis: "cupons_app", "marketing", "variavel_outros"
  Franqueadora: "fundo_promocao", "royalties"
  Fora da operação: "retiradas", "multas" (juros e atraso)
- obs: string — descrição curta do que foi comprado

Omita qualquer campo que você não conseguir ler com confiança. Se estiver em dúvida
entre duas contas, omita a categoria em vez de chutar.`,

  produto: `Analise esta embalagem, etiqueta ou rótulo de produto e extraia:
- produto: string — nome do item
- categoria: string — exatamente um de: "Hortifrúti", "Carnes", "Secos", "Bebidas", "Embalagens", "Limpeza"
- custo: number — preço unitário em CENTAVOS, inteiro (ex: 980 para R$ 9,80)

Omita qualquer campo que você não conseguir ler com confiança.`,

  estoque: `Analise esta foto de mercadoria, caixa ou lote e extraia:
- produto: string — nome do item
- quantidade: number — número de unidades
- custo: number — preço unitário em CENTAVOS, inteiro

Omita qualquer campo que você não conseguir ler com confiança.`,
}

export interface DadosExtraidosFoto {
  fornecedor?: string
  valor?: number
  categoria?: string
  obs?: string
  produto?: string
  quantidade?: number
  custo?: number
}

/** Remove cercas markdown (```json ... ```) que o modelo às vezes devolve. */
function limparJson(texto: string): string {
  return texto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

export const analisarFoto = onCall(
  { secrets: [GEMINI_API_KEY], memory: '512MiB', timeoutSeconds: 120 },
  async (req): Promise<DadosExtraidosFoto> => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'Faça login para usar a análise por foto.')
    }

    const { imagemBase64, mimeType, tipo } = (req.data ?? {}) as {
      imagemBase64?: string
      mimeType?: string
      tipo?: TipoFoto
    }

    if (!imagemBase64 || !tipo) {
      throw new HttpsError('invalid-argument', 'imagemBase64 e tipo são obrigatórios.')
    }
    if (!PROMPTS[tipo]) {
      throw new HttpsError('invalid-argument', `tipo inválido: ${tipo}`)
    }
    if (imagemBase64.length > MAX_BASE64) {
      throw new HttpsError('invalid-argument', 'Foto muito grande. Tire uma foto menor.')
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value())
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    let texto: string
    try {
      const r = await model.generateContent([
        { inlineData: { mimeType: mimeType || 'image/jpeg', data: imagemBase64 } },
        { text: PROMPTS[tipo] },
      ])
      texto = r.response.text()
    } catch (e) {
      console.error('Gemini falhou', e)
      throw new HttpsError('internal', 'Não conseguimos ler a foto. Tente outra imagem.')
    }

    try {
      return JSON.parse(limparJson(texto)) as DadosExtraidosFoto
    } catch {
      console.error('Resposta não-JSON do Gemini:', texto.slice(0, 500))
      throw new HttpsError('internal', 'A foto não estava legível. Tente uma foto mais nítida.')
    }
  },
)
