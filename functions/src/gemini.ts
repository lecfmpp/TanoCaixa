/* ------------------------------------------------------------------ *
 * Gemini Vision — extrai dados de fotos de notas, produtos e mercadorias.
 *
 * A chave FICA NO SERVIDOR (secret). O frontend manda a foto em base64 e
 * recebe de volta só os campos já extraídos — a chave nunca vai pro navegador.
 *
 * PRÉ-REQUISITO:
 *   firebase functions:secrets:set GEMINI_API_KEY
 * ------------------------------------------------------------------ */
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { getFirestore } from 'firebase-admin/firestore'

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

/**
 * Modelo de visão. Fica FIXO de propósito: 'latest' muda sozinho e um dia
 * quebra o formato da resposta sem ninguém mexer no código.
 *
 * O Google aposenta modelo antigo — o gemini-2.0-flash que estava aqui saiu
 * do ar e derrubou a leitura de nota com 404. Se voltar a dar 404, veja os
 * modelos vivos e troque esta linha:
 *   curl "https://generativelanguage.googleapis.com/v1beta/models?key=SUA_CHAVE"
 */
const MODELO = 'gemini-3.5-flash'

/* Cota diária por usuário. A demonstração entra com login anônimo, então
 * sem isto qualquer visitante poderia queimar a chave do Gemini. */
const COTA_DIA = 60
const COTA_DIA_ANONIMO = 10

/** Consome uma chamada da cota do dia. Estoura → resource-exhausted. */
async function consumirCota(uid: string, anonimo: boolean): Promise<void> {
  const db = getFirestore()
  const hoje = new Date().toISOString().slice(0, 10)
  const ref = db.collection('cotas_foto').doc(`${uid}_${hoje}`)
  const limite = anonimo ? COTA_DIA_ANONIMO : COTA_DIA

  const passou = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const usados = (snap.data()?.usados as number | undefined) ?? 0
    if (usados >= limite) return false
    tx.set(ref, { usados: usados + 1, atualizadoEm: new Date().toISOString() }, { merge: true })
    return true
  })

  if (!passou) {
    throw new HttpsError(
      'resource-exhausted',
      anonimo
        ? 'A demonstração permite algumas fotos por dia. Crie sua conta pra usar sem limite.'
        : 'Você bateu o limite de fotos de hoje. Tente de novo amanhã.',
    )
  }
}

/** Limite do payload: fotos de celular passam fácil de 1 MB em base64. */
const MAX_BASE64 = 8 * 1024 * 1024

type TipoFoto = 'despesa' | 'produto' | 'estoque'

/* Vocabulários fechados. Entram no prompt E no schema de resposta, então o
 * modelo não consegue devolver valor fora da lista. */
const CONTAS_DRE = [
  'comissao_marketplace', 'taxa_cartao', 'antecipacao', 'tarifa_bancaria', 'imposto_vendas',
  'cmv_alimentos', 'cmv_bebidas', 'cmv_descartaveis',
  'aluguel', 'condominio', 'agua', 'luz', 'gas', 'iptu', 'seguro',
  'folha', 'encargos', 'vale_transporte', 'vale_alimentacao', 'bonus', 'prolabore', 'rescisoes', 'pessoal_outros',
  'sistemas', 'contador',
  'limpeza', 'detetizacao', 'coleta_lixo',
  'cupons_app', 'marketing', 'variavel_outros',
  'fundo_promocao', 'royalties',
  'retiradas', 'multas',
]
const CATEGORIAS_PRODUTO = ['Hortifrúti', 'Carnes', 'Secos', 'Bebidas', 'Embalagens', 'Limpeza']
const UNIDADES_PRODUTO = ['kg', 'g', 'L', 'un', 'pacote', 'caixa']

const S = SchemaType

/**
 * Schema da resposta, por tipo de foto. Sem isto o modelo às vezes devolve
 * um ARRAY de objetos, ou dois JSONs colados — e o JSON.parse quebrava,
 * virando "a foto não estava legível" pro usuário.
 */
const SCHEMAS: Record<TipoFoto, object> = {
  despesa: {
    type: S.OBJECT,
    properties: {
      fornecedor: { type: S.STRING },
      valor: { type: S.INTEGER },
      categoria: { type: S.STRING, enum: CONTAS_DRE, format: 'enum' },
      obs: { type: S.STRING },
    },
  },
  produto: {
    type: S.OBJECT,
    properties: {
      produto: { type: S.STRING },
      categoria: { type: S.STRING, enum: CATEGORIAS_PRODUTO, format: 'enum' },
      unidade: { type: S.STRING, enum: UNIDADES_PRODUTO, format: 'enum' },
      custo: { type: S.INTEGER },
      fornecedor: { type: S.STRING },
      entraNoCmv: { type: S.BOOLEAN },
    },
  },
  estoque: {
    type: S.OBJECT,
    properties: {
      produto: { type: S.STRING },
      quantidade: { type: S.NUMBER },
      custo: { type: S.INTEGER },
      fornecedor: { type: S.STRING },
    },
  },
}

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

  produto: `Analise esta embalagem, etiqueta de preço, rótulo ou ficha de produto de
restaurante e extraia os dados de cadastro:
- produto: string — nome do item como a cozinha chama, com o peso/volume da
  embalagem quando aparecer (ex: "Grão de bico seco 1kg", "Coca-Cola lata 350ml").
  Não invente marca que não esteja na foto.
- categoria: string — SEMPRE classifique pelo nome do item, mesmo que a foto não
  diga a categoria. É uma classificação sua, não uma leitura.
- unidade: string — como esse item é comprado
- custo: number — preço de compra de UMA unidade, em CENTAVOS, inteiro (ex: 980 para
  R$ 9,80). Preço por quilo É o preço unitário quando a unidade for "kg"; o mesmo
  vale pra litro e "L". Se a etiqueta mostrar preço de venda ao consumidor, use esse.
- fornecedor: string — qualquer marca, distribuidora, frigorífico ou mercado na foto
- entraNoCmv: boolean — SEMPRE responda: true quando o item vira prato ou bebida
  vendida ao cliente; false para material de limpeza, descartável e embalagem

Só omita um campo se ele realmente não estiver na foto nem puder ser deduzido do
nome do produto.`,

  estoque: `Analise esta foto de mercadoria, caixa, lote na prateleira ou nota de
entrada e extraia o movimento de estoque:
- produto: string — nome do item
- quantidade: number — quanto tem na foto. Conte as unidades visíveis, ou use o peso/
  volume total se estiver escrito na etiqueta. Aceita decimal (ex: 12.5 para 12,5 kg).
- custo: number — custo de UMA unidade em CENTAVOS, inteiro. Se só houver o valor
  total, divida pela quantidade.
- fornecedor: string — quem entregou, se aparecer

Conte só o item principal da foto. Omita qualquer campo que você não conseguir ler
com confiança — chutar quantidade estraga o estoque do restaurante.`,
}

export interface DadosExtraidosFoto {
  fornecedor?: string
  valor?: number
  categoria?: string
  obs?: string
  produto?: string
  quantidade?: number
  custo?: number
  /** Unidade de compra do produto (kg, un, pacote…). */
  unidade?: string
  /** Se o item vira prato/bebida vendida — desliga em limpeza e descartável. */
  entraNoCmv?: boolean
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

    const anonimo = req.auth.token.firebase?.sign_in_provider === 'anonymous'
    await consumirCota(req.auth.uid, anonimo)

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value())
    const model = genAI.getGenerativeModel({
      model: MODELO,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMAS[tipo] as never,
      },
    })

    let texto: string
    try {
      const r = await model.generateContent([
        { inlineData: { mimeType: mimeType || 'image/jpeg', data: imagemBase64 } },
        { text: PROMPTS[tipo] },
      ])
      texto = r.response.text()
    } catch (e) {
      // O nome do modelo no log é o que denuncia rápido uma aposentadoria.
      console.error(`Gemini falhou (modelo ${MODELO})`, e)
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
