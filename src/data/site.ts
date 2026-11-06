/* ------------------------------------------------------------------ *
 * Site do cliente — dados do app (tela Meu site).
 *
 * Rascunho em restaurants/{t}/site/config (só membros, como o resto do
 * restaurante). Publicar chama a Cloud Function publicarSite, que copia o
 * rascunho + cardápio para sites/{sub} (público) e garante endereço único.
 * ------------------------------------------------------------------ */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { httpsCallable } from 'firebase/functions'
import { db, functions, storage } from '@/lib/firebase'
import { reduzirImagem } from '@/lib/imagem'
import { normalizarConfig, type SiteConfig } from '@site/modelo'
import { useRestaurante, useTenant } from './hooks'

export interface SiteRascunho {
  config: SiteConfig
  /** O que está no ar agora (null = nunca publicou). */
  publicado: { subdominio: string; config: SiteConfig; itensIds: string[]; ativo: boolean } | null
}

const docSite = (t: string) => doc(db, 'restaurants', t, 'site', 'config')

export function useSite() {
  const t = useTenant()
  const rest = useRestaurante().data
  return useQuery({
    queryKey: [t, 'site'],
    enabled: !!rest,
    queryFn: async (): Promise<SiteRascunho> => {
      const snap = await getDoc(docSite(t))
      const d = snap.data() as { config?: Partial<SiteConfig>; publicado?: Partial<NonNullable<SiteRascunho['publicado']>> } | undefined
      return {
        config: normalizarConfig(d?.config, rest?.nome ?? '', rest?.bairro ?? ''),
        publicado: d?.publicado?.config
          ? {
              subdominio: d.publicado.subdominio ?? '',
              itensIds: d.publicado.itensIds ?? [],
              // Sites publicados antes do botão de tirar do ar não têm o campo.
              ativo: d.publicado.ativo !== false,
              config: normalizarConfig(d.publicado.config, rest?.nome ?? ''),
            }
          : null,
      }
    },
  })
}

/** Grava o rascunho inteiro (mergeFields troca o campo `config` por completo). */
export function useSalvarSite() {
  const t = useTenant()
  return useMutation({
    mutationFn: (config: SiteConfig) => setDoc(docSite(t), { config }, { mergeFields: ['config'] }),
  })
}

export function usePublicarSite() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const fn = httpsCallable<{ restauranteId: string }, { ok: boolean; subdominio: string; url: string; dominio: 'ativo' | 'emitindo' | 'erro' }>(functions, 'publicarSite')
      return (await fn({ restauranteId: t })).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'site'] }),
  })
}

/** Tira o site do ar (o endereço continua reservado para a loja). */
export function useDespublicarSite() {
  const t = useTenant()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const fn = httpsCallable<{ restauranteId: string }, { ok: boolean; subdominio: string }>(functions, 'despublicarSite')
      return (await fn({ restauranteId: t })).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [t, 'site'] }),
  })
}

/** O endereço está livre (ou já é deste restaurante)? */
export async function subdominioLivre(sub: string, tenant: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'sites', sub))
  return !snap.exists() || snap.get('tenantId') === tenant
}

/** Reduz (WebP) e envia uma imagem do site. Devolve a URL pública. */
export async function enviarImagemDoSite(tenant: string, arquivo: File, nome: string, maxLado: number): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha uma imagem (JPG, PNG, WebP).')
  const blob = await reduzirImagem(arquivo, maxLado)
  if (blob.size > 5 * 1024 * 1024) throw new Error('Imagem grande demais (máx. 5 MB).')
  const ext = blob.type === 'image/webp' ? 'webp' : (arquivo.name.split('.').pop() ?? 'jpg')
  const caminho = ref(storage, `sites/${tenant}/${nome}-${Date.now().toString(36)}.${ext}`)
  await uploadBytes(caminho, blob, { contentType: blob.type || arquivo.type, cacheControl: 'public, max-age=31536000, immutable' })
  return getDownloadURL(caminho)
}

/** Comparação estável (o Firestore não guarda a ordem das chaves). */
export function mesmoConteudo(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(norm)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, norm((v as Record<string, unknown>)[k])]))
        : v
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b))
}
