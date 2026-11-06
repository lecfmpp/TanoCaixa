/**
 * Reduz a imagem no navegador antes de subir: lado maior até `maxLado` px, em
 * WebP. Foto de celular (4–8 MB) vira ~150–300 KB, o que segura o LCP do site
 * do cliente. Se o navegador não conseguir, devolve o arquivo original.
 */
export async function reduzirImagem(arquivo: File, maxLado: number, qualidade = 0.82): Promise<Blob> {
  if (arquivo.type === 'image/svg+xml' || arquivo.type === 'image/gif') return arquivo
  try {
    const bmp = await createImageBitmap(arquivo)
    const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * escala)
    const h = Math.round(bmp.height * escala)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', qualidade))
    return blob && blob.size < arquivo.size ? blob : arquivo
  } catch {
    return arquivo
  }
}
