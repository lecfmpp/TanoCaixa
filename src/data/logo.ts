/* ------------------------------------------------------------------ *
 * Logo da loja — fica no Storage em restaurants/{id}/logo/logo e o link
 * em restaurants/{id}.logoUrl. Aparece no header de todas as páginas da
 * loja aberta, sempre numa caixa de proporção fixa (5:2), com a imagem
 * "contida": nunca estica nem corta.
 * ------------------------------------------------------------------ */
import { deleteField, doc, setDoc } from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'

/** O que o campo de envio sugere pra logo encaixar no header sem distorção. */
export const LOGO = {
  largura: 400,
  altura: 160,
  proporcao: '5:2',
  maxBytes: 2 * 1024 * 1024,
  tipos: ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'],
  formatos: 'PNG com fundo transparente (ou SVG)',
} as const

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
  const r = caminho(restauranteId)
  await uploadBytes(r, arquivo, { contentType: arquivo.type, cacheControl: 'public, max-age=3600' })
  // O caminho é sempre o mesmo: o `t=` força o navegador a buscar a versão nova.
  const url = `${await getDownloadURL(r)}&t=${Date.now()}`
  await setDoc(doc(db, 'restaurants', restauranteId), { logoUrl: url }, { merge: true })
  return url
}

export async function removerLogo(restauranteId: string): Promise<void> {
  await setDoc(doc(db, 'restaurants', restauranteId), { logoUrl: deleteField() }, { merge: true })
  await deleteObject(caminho(restauranteId)).catch(() => {
    /* arquivo já não existia — o que importa é o link ter saído */
  })
}
