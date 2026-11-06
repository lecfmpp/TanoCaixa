/* ------------------------------------------------------------------ *
 * Site do cliente — Cloud Functions.
 *
 *  siteCliente (HTTP): serve {sub}.tanocaixa.com.br e {sub}.tanocaixa.com.br/links.
 *    Lê o Host, resolve o tenant em `sites/{sub}` (documento público, já
 *    publicado) e devolve HTML pronto. Fica atrás de um wildcard
 *    *.tanocaixa.com.br (ver ops/sites-wildcard/README.md). Sem o DNS ainda,
 *    funciona em modo caminho: <url-da-function>/{sub} e /{sub}/links.
 *
 *  publicarSite (callable): copia o rascunho (restaurants/{rid}/site/config)
 *    para `sites/{sub}` junto com o cardápio, garantindo que o subdomínio é
 *    único. Só dono ou gestão.
 * ------------------------------------------------------------------ */
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp, getApps } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { exigirDonoOuGestao } from '../acesso'
import {
  DOMINIO_SITES,
  erroSubdominio,
  errosParaPublicar,
  montarItens,
  normalizarConfig,
  resolverRota,
  type DadosSite,
  type PratoBase,
  type SiteConfig,
} from './modelo'
import { renderLinks, renderNaoEncontrado, renderSite } from './render'

if (getApps().length === 0) initializeApp()
const db = getFirestore()

/** Cache em memória por instância: o Firestore não é lido a cada visita. */
const CACHE_MS = 30_000
const cache = new Map<string, { em: number; dados: DadosSite | null }>()

async function carregar(sub: string): Promise<DadosSite | null> {
  const c = cache.get(sub)
  if (c && Date.now() - c.em < CACHE_MS) return c.dados
  const snap = await db.doc(`sites/${sub}`).get()
  const d = snap.exists ? (snap.data() as { config: SiteConfig; itens: DadosSite['itens'] }) : null
  const dados = d ? { config: d.config, itens: d.itens ?? [] } : null
  cache.set(sub, { em: Date.now(), dados })
  if (cache.size > 500) cache.delete(cache.keys().next().value as string)
  return dados
}

export const siteCliente = onRequest({ region: 'us-central1', memory: '256MiB', maxInstances: 20, concurrency: 80 }, async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).send('Método não permitido')
    return
  }
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? '')
  const rota = resolverRota(host, req.path)
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (!rota || erroSubdominio(rota.sub)) {
    res.status(404).set('Cache-Control', 'public, max-age=60').send(renderNaoEncontrado(host))
    return
  }

  if (rota.pagina === 'robots.txt') {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600')
    res.send(`User-agent: *\nAllow: /\nSitemap: https://${rota.dominio}/sitemap.xml\n`)
    return
  }

  const dados = await carregar(rota.sub)
  if (!dados) {
    res.status(404).set('Cache-Control', 'public, max-age=60').send(renderNaoEncontrado(rota.dominio))
    return
  }

  if (rota.pagina === 'sitemap.xml') {
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600')
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${rota.dominio}/</loc></url><url><loc>https://${rota.dominio}/links</loc></url></urlset>`,
    )
    return
  }
  if (rota.pagina !== '' && rota.pagina !== 'links') {
    res.redirect(302, rota.base + '/')
    return
  }

  const opcoes = { dominio: rota.dominio, base: rota.base }
  const html = rota.pagina === 'links' ? renderLinks(dados, opcoes) : renderSite(dados, opcoes)
  // CDN guarda 60 s: publicar no app reflete no site em até ~1 min.
  res.status(200).type('html').set('Cache-Control', 'public, max-age=30, s-maxage=60').send(html)
})

export const publicarSite = onCall({ region: 'us-central1' }, async (req) => {
  const rid = await exigirDonoOuGestao(req.auth?.uid, (req.data as { restauranteId?: string })?.restauranteId)

  const [restSnap, cfgSnap, pratosSnap] = await Promise.all([
    db.doc(`restaurants/${rid}`).get(),
    db.doc(`restaurants/${rid}/site/config`).get(),
    db.collection(`restaurants/${rid}/pratos`).get(),
  ])
  if (!cfgSnap.exists) throw new HttpsError('failed-precondition', 'Configure o site antes de publicar.')
  const rest = restSnap.data() ?? {}
  const rascunho = cfgSnap.data() as { config?: Partial<SiteConfig>; publicado?: { subdominio?: string } }
  const config = normalizarConfig(rascunho.config, String(rest.nome ?? ''), String(rest.bairro ?? ''))
  config.subdominio = config.subdominio.trim().toLowerCase()

  const erros = errosParaPublicar(config)
  if (erros.length) throw new HttpsError('invalid-argument', erros[0], { erros })

  const pratos = pratosSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as PratoBase)
  const itens = montarItens(pratos, config.itens)
  const sub = config.subdominio
  const anterior = rascunho.publicado?.subdominio

  await db.runTransaction(async (tx) => {
    const ref = db.doc(`sites/${sub}`)
    const atual = await tx.get(ref)
    if (atual.exists && atual.get('tenantId') !== rid) {
      throw new HttpsError('already-exists', `O endereço ${sub}.${DOMINIO_SITES} já está em uso. Escolha outro.`)
    }
    const refAnt = anterior && anterior !== sub ? db.doc(`sites/${anterior}`) : null
    const ant = refAnt ? await tx.get(refAnt) : null
    tx.set(ref, { tenantId: rid, config, itens, publicadoEm: FieldValue.serverTimestamp(), publicadoPor: req.auth!.uid })
    // Trocou de endereço: libera o antigo (só se ainda for deste restaurante).
    if (refAnt && ant?.exists && ant.get('tenantId') === rid) tx.delete(refAnt)
    tx.set(
      cfgSnap.ref,
      { publicado: { subdominio: sub, em: FieldValue.serverTimestamp(), config, itensIds: itens.map((i) => i.id) } },
      { merge: true },
    )
  })
  cache.delete(sub)
  if (anterior) cache.delete(anterior)
  return { ok: true, subdominio: sub, url: `https://${sub}.${DOMINIO_SITES}` }
})
