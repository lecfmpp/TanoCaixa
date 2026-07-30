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
  /** Unidade de compra do produto (kg, un, pacote…). */
  unidade?: string
  /** Se o item vira prato/bebida vendida — desliga em limpeza e descartável. */
  entraNoCmv?: boolean
}

const analisar = httpsCallable<
  { imagemBase64: string; mimeType: string; tipo: string },
  DadosExtraidosFoto
>(functions, 'analisarFoto')

/** Lado maior da imagem enviada. Nota fiscal fica legível de sobra nisso. */
const LADO_MAX = 1600

/**
 * Reduz e recomprime a foto antes de subir. Câmera de celular gera 4–12 MB,
 * o que em base64 estoura o limite da função e ainda deixa o upload lento.
 * Se algo falhar (canvas bloqueado, formato exótico), devolve o original.
 */
export function prepararFoto(arquivo: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    let respondido = false

    const entregar = (r: { base64: string; mimeType: string }) => {
      if (respondido) return
      respondido = true
      clearTimeout(prazo)
      resolve(r)
    }

    /** Sem redimensionar: manda o arquivo como veio. */
    const semRedimensionar = () => {
      URL.revokeObjectURL(url)
      const reader = new FileReader()
      reader.onload = (e) =>
        entregar({
          base64: String(e.target?.result ?? '').split(',')[1] ?? '',
          mimeType: arquivo.type || 'image/jpeg',
        })
      reader.onerror = () => entregar({ base64: '', mimeType: arquivo.type || 'image/jpeg' })
      reader.readAsDataURL(arquivo)
    }

    // Rede de segurança: em foto grande (HEIC de iPhone, principalmente) o
    // decode pode não disparar onload NEM onerror, e aí a tela ficava parada
    // pra sempre. Passados 8s, manda o arquivo original e segue.
    const prazo = setTimeout(semRedimensionar, 8000)

    img.onload = () => {
      try {
        const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        const ctx = canvas.getContext('2d')
        if (!ctx) return semRedimensionar()
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
        entregar({ base64: dataUrl.split(',')[1] ?? '', mimeType: 'image/jpeg' })
      } catch {
        semRedimensionar()
      }
    }
    img.onerror = semRedimensionar
    img.src = url
  })
}

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
      throw new Error(
        'A leitura por foto ainda não está liberada nesta sessão. Crie sua conta (é rápido) e ela funciona na hora.',
      )
    }
    if (err.code === 'functions/resource-exhausted') {
      throw new Error(err.message)
    }
    throw new Error(err.message || 'Não conseguimos ler a foto. Tente outra imagem.')
  }
}
