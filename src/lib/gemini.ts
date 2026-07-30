import { httpsCallable, type FunctionsError } from 'firebase/functions'
import { functions } from '@/lib/firebase'

/**
 * A chave do Gemini vive no servidor (secret GEMINI_API_KEY da Cloud Function
 * `analisarFoto`). Aqui só mandamos a foto e recebemos os campos extraídos —
 * nada de chave no bundle do navegador.
 */

export interface DadosExtraidosFoto {
  fornecedor?: string
  valor?: number
  categoria?: string
  obs?: string
  produto?: string
  quantidade?: number
  custo?: number
}

const analisar = httpsCallable<
  { imagemBase64: string; mimeType: string; tipo: string },
  DadosExtraidosFoto
>(functions, 'analisarFoto')

/** Manda a foto pra Cloud Function e devolve os dados que o Gemini leu. */
export async function extrairDadosDeFoto(
  base64: string,
  tipo: 'despesa' | 'produto' | 'estoque',
  mimeType = 'image/jpeg',
): Promise<DadosExtraidosFoto> {
  try {
    const { data } = await analisar({ imagemBase64: base64, mimeType, tipo })
    return data
  } catch (e) {
    const err = e as FunctionsError
    if (err.code === 'functions/unauthenticated') {
      throw new Error('Faça login novamente para usar a análise por foto.')
    }
    throw new Error(err.message || 'Não conseguimos ler a foto. Tente outra imagem.')
  }
}
