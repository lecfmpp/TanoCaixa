/* ------------------------------------------------------------------ *
 * Logo da loja — fica no Storage em restaurants/{id}/logo/logo e o link
 * em restaurants/{id}.logoUrl (+ logoFormato). Aparece no header de todas as
 * páginas da loja aberta, numa caixa quadrada (1:1) ou horizontal (5:2),
 * conforme a proporção da imagem, sempre "contida": nunca estica nem corta.
 * ------------------------------------------------------------------ */
import { deleteField, doc, setDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

/** Dois formatos de logo: a caixa do header se ajusta a cada um. */
export type FormatoLogo = 'quadrado' | 'horizontal'

/** O que o campo de envio sugere pra logo encaixar no header sem distorção. */
export const LOGO = {
  formatos: {
    quadrado: { largura: 400, altura: 400, proporcao: '1:1', nome: 'Quadrada' },
    horizontal: { largura: 400, altura: 160, proporcao: '5:2', nome: 'Horizontal' },
  },
  maxBytes: 2 * 1024 * 1024,
  tipos: ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'],
  arquivo: 'PNG com fundo transparente (ou SVG)',
} as const

/** Larga (a partir de 1,6 : 1) vai na caixa horizontal; o resto, na quadrada. */
export function formatoDaProporcao(largura: number, altura: number): FormatoLogo {
  return altura > 0 && largura / altura >= 1.6 ? 'horizontal' : 'quadrado'
}

/** Mede a imagem antes de enviar. Sem conseguir medir (SVG sem tamanho), assume horizontal. */
function medir(arquivo: File): Promise<FormatoLogo> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img.naturalWidth && img.naturalHeight ? formatoDaProporcao(img.naturalWidth, img.naturalHeight) : 'horizontal')
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve('horizontal')
    }
    img.src = url
  })
}

/** Mensagem pronta quando o arquivo não serve; `null` quando está ok. */
export function problemaDoArquivo(f: File): string | null {
  if (!(LOGO.tipos as readonly string[]).includes(f.type)) return 'Use PNG, SVG, WebP ou JPG.'
  if (f.size > LOGO.maxBytes) return 'A logo precisa ter até 2 MB.'
  return null
}

function caminho(restauranteId: string) {
  return ref(storage, `restaurants/${restauranteId}/logo/logo`)
}

/** Envia (ou troca) a logo da loja e grava o link no restaurante. */
export async function enviarLogo(restauranteId: string, arquivo: File): Promise<string> {
  const problema = problemaDoArquivo(arquivo)
  if (problema) throw new Error(problema)
  const formato = await medir(arquivo)
  const r = caminho(restauranteId)
  await uploadBytes(r, arquivo, { contentType: arquivo.type, cacheControl: 'public, max-age=3600' })
  // O caminho é sempre o mesmo: o `t=` força o navegador a buscar a versão nova.
  const url = `${await getDownloadURL(r)}&t=${Date.now()}`
  await setDoc(doc(db, 'restaurants', restauranteId), { logoUrl: url, logoFormato: formato }, { merge: true })
  return url
}

export async function removerLogo(restauranteId: string): Promise<void> {
  await setDoc(doc(db, 'restaurants', restauranteId), { logoUrl: deleteField(), logoFormato: deleteField() }, { merge: true })
  await deleteObject(caminho(restauranteId)).catch(() => {
    /* arquivo já não existia — o que importa é o link ter saído */
  })
}
