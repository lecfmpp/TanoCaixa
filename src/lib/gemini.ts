import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || ''
if (!apiKey) {
  console.error('❌ VITE_GOOGLE_API_KEY não configurada. Adicione a chave em .env.local para usar a câmera com IA.')
  console.error('   Obtenha em: https://aistudio.google.com/app/apikey')
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null

export interface DadosExtraidosFoto {
  fornecedor?: string
  valor?: number
  categoria?: 'mercadoria' | 'pessoal' | 'ocupacao' | 'taxas_app'
  obs?: string
  produto?: string
  quantidade?: number
  custo?: number
}

/** Extrai dados de uma nota fiscal/recibo usando Gemini Vision. */
export async function extrairDadosDeFoto(
  base64: string,
  tipo: 'despesa' | 'produto' | 'estoque',
): Promise<DadosExtraidosFoto> {
  if (!genAI) throw new Error('Gemini API não configurada')

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const prompt =
    tipo === 'despesa'
      ? `Analise esta nota fiscal/recibo e extraia os dados. Retorne um JSON com os campos:
       - fornecedor (nome da empresa/loja)
       - valor (total da nota, em centavos sem decimais, ex: 5900 = R$ 59.00)
       - categoria (escolha uma: 'mercadoria', 'pessoal', 'ocupacao', 'taxas_app')
       - obs (observação/descrição do que foi comprado)

       Retorne APENAS JSON válido, sem markdown.`
      : tipo === 'produto'
        ? `Analise esta embalagem/etiqueta de produto e extraia:
       - produto (nome do item)
       - categoria (Hortifrúti, Carnes, Secos, Bebidas, Embalagens, Limpeza)
       - custo (preço unitário em centavos, ex: 980 = R$ 9.80)

       Retorne APENAS JSON válido, sem markdown.`
        : `Analise esta foto de mercadoria/documento e extraia:
       - produto (nome do item)
       - quantidade (número de unidades)
       - custo (preço unitário em centavos)

       Retorne APENAS JSON válido, sem markdown.`

  const resultado = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64,
      },
    },
    { text: prompt },
  ])

  const texto = resultado.response.text()
  const json = JSON.parse(texto)

  return json as DadosExtraidosFoto
}
