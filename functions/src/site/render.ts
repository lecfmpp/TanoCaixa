/* ------------------------------------------------------------------ *
 * Render do site do cliente: HTML puro + CSS + um JS pequeno (sem framework).
 *
 * O MESMO código gera a página servida em {sub}.tanocaixa.com.br (Cloud
 * Function) e a prévia da tela Meu site (iframe srcdoc no app). Funciona sem
 * JS: todo o conteúdo vem no HTML; o script só filtra categorias, abre o
 * painel de pedido, troca de loja e atualiza o "aberto agora".
 * ------------------------------------------------------------------ */
import {
  APPS,
  PALETAS,
  PROMO_TITULO_MAX,
  RAIOS,
  agoraSP,
  horaTexto,
  precoTexto,
  promoAtiva,
  textoDias,
  textosStatus,
  urlSegura,
  type DadosSite,
  type ItemSite,
  type LojaSite,
  type SecaoId,
  type SiteConfig,
} from './modelo'
import { ICONE_PATH } from './icones'

export interface OpcoesRender {
  /** Domínio público do site, sem protocolo: faustoburger.tanocaixa.com.br */
  dominio: string
  /** Base dos links internos ('' no domínio próprio, '/faustoburger' no modo caminho). */
  base?: string
  /** Hora "de agora" (testes e prévia). */
  agora?: Date
  /** Prévia do app: sem indexação e sem salvar a loja escolhida. */
  previa?: boolean
}

/* ------------------------------- Utilidades ------------------------------ */

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c])
}
const ext = 'target="_blank" rel="noopener"'
const wa = (l: LojaSite) => (l.whatsapp ? 'https://wa.me/' + l.whatsapp : '')
const rota = (l: LojaSite) => 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(l.endereco)
const appsDaLoja = (l: LojaSite) =>
  APPS.filter((a) => urlSegura(l.apps[a.k])).map((a) => ({ ...a, url: urlSegura(l.apps[a.k]) }))
/** Logo do app num selo quadrado arredondado (cor da marca). */
function selo(k: 'ifood' | 'uber' | 'n99' | 'whatsapp', px: number): string {
  const r = Math.round(px * 0.24)
  const caixa = (bg: string, miolo: string) =>
    `<span class="selo-app" style="width:${px}px;height:${px}px;border-radius:${r}px;background:${bg}" aria-hidden="true">${miolo}</span>`
  if (k === 'n99')
    return caixa('#FFC800', `<svg viewBox="0 0 24 24" width="${px * 0.78}" height="${px * 0.78}"><text x="12" y="17" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="14" fill="#111" letter-spacing="-1">99</text></svg>`)
  const bg = k === 'ifood' ? '#EA1D2C' : k === 'uber' ? '#06C167' : '#25D366'
  return caixa(bg, `<svg viewBox="0 0 24 24" width="${px * 0.62}" height="${px * 0.62}" fill="#fff"><path d="${ICONE_PATH[k]}"/></svg>`)
}

/** Selo "Site feito com Tá no Caixa" (símbolo oficial versão Sol + nome), com link e UTM. */
function seloTnc(sub: string): string {
  const url = 'https://tanocaixa.com/?utm_source=site-cliente&utm_medium=rodape&utm_campaign=' + encodeURIComponent(sub)
  return `<a class="tnc" href="${esc(url)}" ${ext} aria-label="Site feito com Tá no Caixa"><svg viewBox="0 0 100 100" width="36" height="36" aria-hidden="true"><rect width="100" height="100" rx="30" fill="#EFAB5C"/><g fill="none" stroke="#1E4354" stroke-width="13" stroke-linecap="round"><path d="M27 24 H73"/><path d="M50 24 V52"/><path d="M33 68 Q50 82 67 68"/></g></svg><span><small>Site feito com</small><strong>Tá no Caixa</strong></span></a>`
}

/** Selo de status (Aberto/Fechado), bem visível em qualquer paleta. O JS do site atualiza a cor e o texto. */
function stt(aberta: boolean, chave: string, stKey: string, texto: string, tam: '' | ' grande' | ' peq' = ''): string {
  return `<span class="stt ${aberta ? 'ab' : 'fe'}${tam}" data-stt="${chave}"><span class="pt"></span><span data-st="${stKey}">${esc(texto)}</span></span>`
}

/** Atributos que tornam um item clicável (abre a aba de detalhes). */
const clk = (i: ItemSite) => `data-item="${esc(i.id)}" role="button" tabindex="0" aria-label="Ver detalhes de ${esc(i.nome)}"`

/** Ícones de traço (24×24) para os rótulos dos cartões de loja. */
const ICONES: Record<string, string> = {
  pin: '<path d="M12 21s-7-6.1-7-11a7 7 0 1 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  dias: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  hora: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  entrega: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  taxa: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.5 0-2.6-.6-3.1-1.7M12 6.5v11"/>',
  rota: '<path d="M3 11l18-8-8 18-2-8z"/>',
}
const ic = (k: string, px = 18) =>
  `<svg viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[k]}</svg>`
const info = (k: string, rotulo: string, valor: string) =>
  `<div class="info">${ic(k)}<span><small>${rotulo}</small><b>${esc(valor)}</b></span></div>`

const igUrl = (h: string) => 'https://www.instagram.com/' + h.replace(/^@/, '') + '/'
const igHandle = (h: string) => (h ? '@' + h.replace(/^@/, '') : '')

/** Escapa e prende o "R$" ao valor (nunca quebra linha entre os dois). */
const textoPreco = (t: string) => esc(t).replace(/R\$\s*/g, () => 'R$&nbsp;')

function img(url: string | undefined, alt: string, attrs = ''): string {
  const u = urlSegura(url)
  return u ? `<img src="${esc(u)}" alt="${esc(alt)}" ${attrs}>` : ''
}

function logo(c: SiteConfig, cls: string): string {
  const u = urlSegura(c.logoUrl)
  return `<div class="logo ${cls}">${u ? `<img src="${esc(u)}" alt="${esc(c.nome)}">` : esc(c.sigla)}</div>`
}

/** " · entrega 30–45 min · taxa R$ 4,99", só com o que estiver preenchido. */
function entregaTaxa(l: LojaSite): string {
  return [l.tempoEntrega.trim() && 'entrega ' + l.tempoEntrega.trim(), l.taxa.trim() && 'taxa ' + l.taxa.trim()]
    .filter(Boolean)
    .map((x) => ' · ' + esc(x))
    .join('')
}

function taxaMin(lojas: LojaSite[]): string {
  const num = (t: string) => Number(t.replace(/[^\d,]/g, '').replace(',', '.')) || Infinity
  return [...lojas].sort((a, b) => num(a.taxa) - num(b.taxa))[0]?.taxa ?? ''
}

function categorias(itens: ItemSite[]): string[] {
  const vistas: string[] = []
  for (const i of itens) if (!vistas.includes(i.categoria)) vistas.push(i.categoria)
  return vistas
}

/* --------------------------------- CSS ----------------------------------- */

function css(c: SiteConfig): string {
  const t = PALETAS[c.paleta] ?? PALETAS.mar
  const r = RAIOS[c.cantos] ?? RAIOS.redondo
  return `:root{--bg:${t.bg};--sup:${t.sup};--ink:${t.ink};--sub:${t.sub};--pri:${t.pri};--onPri:${t.onPri};--acc:${t.acc};--onAcc:${t.onAcc};--soft:${t.soft};--foot:${t.foot};--line:${t.line};--rc:${r.card};--rb:${r.btn};--rs:${r.btnSq};--rch:${r.chip};--ri:${r.img};--rl:${r.logo};--tit:'Bricolage Grotesque',system-ui,sans-serif}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:80px}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 'Archivo',system-ui,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column}
a{color:inherit;text-decoration:none}a:hover{text-decoration:underline}
button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}
img{display:block;max-width:100%}
:focus-visible{outline:2px solid var(--pri);outline-offset:2px}
.pt{display:inline-block;border-radius:50%;flex:none}
.stt{display:inline-flex;align-items:center;gap:7px;max-width:100%;padding:6px 12px 6px 10px;border-radius:999px;font-size:13px;font-weight:700;line-height:1.2;white-space:nowrap;color:#fff;flex:none}
.stt>span:last-child{overflow:hidden;text-overflow:ellipsis}
.stt .pt{width:8px;height:8px;background:#fff}
.stt.ab{background:#1F7A44}.stt.fe{background:#B4462F}
.stt.ab .pt{animation:pulso 2s ease-in-out infinite}
.stt.grande{font-size:14px;padding:8px 14px 8px 12px}.stt.peq{font-size:12px;padding:4px 10px 4px 8px}
@keyframes pulso{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.75)}60%{box-shadow:0 0 0 6px rgba(255,255,255,0)}}
.selo-app{display:inline-flex;align-items:center;justify-content:center;flex:none;box-shadow:0 0 0 1px rgba(0,0,0,.06)}
.tit{font-family:var(--tit);font-weight:800;letter-spacing:-.02em;margin:0;line-height:1.05}
.h2{font-size:24px;white-space:nowrap}.h3{font-size:19px;letter-spacing:-.01em}
.subt{font-size:14px;color:var(--sub)}
.um{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.logo{border-radius:var(--rl);background:var(--pri);color:var(--onPri);display:flex;align-items:center;justify-content:center;font-family:var(--tit);font-weight:800;overflow:hidden;flex:none}
.logo img{width:100%;height:100%;object-fit:cover}
.foto{background:var(--soft);overflow:hidden}.foto img{width:100%;height:100%;object-fit:cover}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:0 20px;border-radius:var(--rb);font-weight:700;white-space:nowrap;min-height:44px}
.btn:hover{text-decoration:none;filter:brightness(.97)}
.pri{background:var(--pri);color:var(--onPri)}
.acc{background:var(--acc);color:var(--onAcc)}
.ctn{border:1.5px solid var(--ink)}
.seta{width:44px;height:44px;border-radius:var(--rb);border:1px solid var(--line);background:var(--sup);display:inline-flex;align-items:center;justify-content:center;font-size:18px}
.chip{flex:none;padding:10px 16px;border-radius:var(--rch);border:1px solid var(--line);font-weight:600;font-size:14px;white-space:nowrap;min-height:44px}
.chip.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.trilho{display:grid;grid-auto-flow:column;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:0 20px 4px;scroll-padding:0 20px;scrollbar-width:none}
.trilho::-webkit-scrollbar{display:none}.trilho>*{scroll-snap-align:start;min-width:0}
.cab{display:flex;align-items:center;justify-content:space-between;gap:12px}
.setas{display:flex;gap:8px}
.so-pc{display:none!important}
/* topo celular: mesma cor do rodapé, marca o começo da página */
.topo-cel{position:sticky;top:0;z-index:45;background:var(--foot);color:#fff;display:flex;align-items:center;gap:12px;padding:10px 20px;padding-top:max(10px,env(safe-area-inset-top));min-height:56px;box-shadow:0 6px 20px rgba(0,0,0,.18)}
.topo-cel .logo{width:32px;height:32px;font-size:12px;box-shadow:0 0 0 2px rgba(255,255,255,.15)}
.topo-cel b{font-family:var(--tit);font-weight:800;font-size:17px;letter-spacing:-.01em;flex:1;min-width:0}
/* capa celular */
.capa .foto{height:250px}
.capa-txt{padding:0 20px 8px;display:flex;flex-direction:column;gap:14px}
.capa .logo{margin-top:-34px;position:relative;width:68px;height:68px;border:4px solid var(--bg);font-size:22px}
.capa h1{font-size:32px;line-height:1.02}
.slogan{font-size:16px;color:var(--sub);margin:6px 0 0;text-wrap:pretty}
.st{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;white-space:nowrap}
.faixa{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:var(--rc);background:var(--sup)}
.faixa>div{padding:14px 12px;display:flex;flex-direction:column;gap:2px}.faixa>div+div{border-left:1px solid var(--line)}
.faixa b{font-size:17px}.faixa span{font-size:12px;color:var(--sub)}
/* conteúdo */
main{width:100%;max-width:1200px;margin:0 auto;padding:24px 20px 32px;display:flex;flex-direction:column;gap:36px}
section{display:flex;flex-direction:column;gap:14px}
/* promo */
.promo{position:relative;isolation:isolate;overflow:hidden;min-height:260px;padding:20px;border-radius:var(--rc);background:#1A1410;color:#fff;display:flex;flex-direction:row;flex-wrap:wrap;align-items:flex-end;gap:16px 28px}
.promo>.f{position:absolute;inset:0;z-index:-3}.promo>.f img{width:100%;height:100%;object-fit:cover}
.promo>.m{position:absolute;inset:0;z-index:-2;background:var(--pri);mix-blend-mode:multiply;opacity:.55}
.promo>.g{position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,rgba(15,10,8,.92) 0%,rgba(15,10,8,.6) 55%,rgba(15,10,8,.15) 100%)}
.promo .c{flex:1 1 260px;display:flex;flex-direction:column;gap:6px;max-width:560px;min-width:0}
.selo{align-self:flex-start;max-width:100%;padding:5px 10px;border-radius:var(--rch);background:var(--acc);color:var(--onAcc);font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.promo .tx{font-family:var(--tit);font-weight:800;font-size:26px;line-height:1.08;letter-spacing:-.01em;text-shadow:0 2px 12px rgba(0,0,0,.35);text-wrap:pretty}
.promo .rg{font-size:14px;font-weight:600;color:rgba(255,255,255,.92)}
.promo .btn{padding:0 22px;background:var(--acc);color:var(--onAcc)}
/* destaques */
#dest{grid-auto-columns:62%}
.tile{display:flex;flex-direction:column;gap:10px}
.tile .foto{aspect-ratio:1/1;border-radius:var(--rc);display:flex;align-items:center;justify-content:center;font-family:var(--tit);font-weight:800;font-size:40px;color:var(--sub)}
.tile b{font-size:16px}.preco-p{font-weight:700;color:var(--pri)}
/* cardápio */
.cats{display:flex;gap:8px;overflow-x:auto;margin:0 -20px;padding:0 20px;scrollbar-width:none}.cats::-webkit-scrollbar{display:none}
.cat-nome{display:none}
html:not(.js) .cats{display:none}html:not(.js) .cat-nome{display:block;margin:8px 0 0}
.js .cat:not([data-on]){display:none}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:16px}
.card{border-radius:var(--rc);background:var(--sup);border:1px solid var(--line);overflow:hidden;display:flex;flex-direction:column}
.card .foto{aspect-ratio:4/3}
.card .cp{padding:14px 16px 16px;display:flex;flex-direction:column;gap:6px;flex:1}
.nm{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.nm b{font-size:17px}
.mp{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:3px 8px;border-radius:var(--rch);background:var(--acc);color:var(--onAcc);white-space:nowrap}
.desc{font-size:14px;color:var(--sub);text-wrap:pretty;margin:0}
.card .desc{flex:1}.preco{font-weight:800;font-size:17px}
.lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,460px),1fr));column-gap:40px;border-top:1px solid var(--line)}
.lin{display:flex;gap:14px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}
.lin .cp{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.lin .nm b{font-size:16px}.lin .preco{font-size:16px}
.lin .foto{flex:none;width:84px;height:84px;border-radius:var(--ri)}
/* item clicável + aba de detalhes */
.clk{cursor:pointer}.card.clk:hover{border-color:var(--sub)}
.preco-l{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-top:4px}
.vm{font-size:13px;font-weight:700;color:var(--pri);white-space:nowrap}html:not(.js) .vm{display:none}
html.trava,html.trava body{overflow:hidden}
.folha{position:fixed;inset:0;z-index:60}.folha[hidden]{display:none}
.folha .fundo{position:absolute;inset:0;background:rgba(0,0,0,.55);opacity:0;transition:opacity .22s}.folha.ab .fundo{opacity:1}
.painel-f{position:absolute;left:0;right:0;bottom:0;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--ink);border-radius:22px 22px 0 0;transform:translateY(100%);transition:transform .26s cubic-bezier(.2,.8,.2,1);box-shadow:0 -20px 50px rgba(0,0,0,.3)}
.folha.ab .painel-f{transform:none}
.alca{position:absolute;top:8px;left:0;right:0;z-index:3;display:flex;justify-content:center;pointer-events:none}.alca:before{content:'';width:44px;height:5px;border-radius:9px;background:rgba(255,255,255,.85);box-shadow:0 1px 4px rgba(0,0,0,.3)}
.f-x{position:absolute;top:12px;right:14px;z-index:3;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:24px;line-height:1;display:flex;align-items:center;justify-content:center}
#f-corpo{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.f-foto{aspect-ratio:4/3;background:var(--soft)}.f-foto img{width:100%;height:100%;object-fit:cover}
.f-cp{padding:22px 20px 12px;display:flex;flex-direction:column;gap:10px}.sem-foto .f-cp{padding-top:64px}
.f-nome{font-size:24px}.f-cat{font-size:12px;color:var(--sub);font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.f-desc{font-size:15px}.f-preco{font-size:22px;font-weight:800;color:var(--pri)}
.f-av-cab{display:flex;flex-direction:column;gap:3px;margin-top:12px;padding-top:18px;border-top:1px solid var(--line)}
.f-av-cab b{font-size:17px}.f-media{font-size:14px;color:var(--sub)}
.f-est{color:#F2B01E;letter-spacing:1px}
.f-av{display:flex;flex-direction:column;gap:10px;margin-top:4px}
.f-rev{padding:14px 16px;border-radius:var(--rs);background:var(--sup);border:1px solid var(--line);display:flex;flex-direction:column;gap:6px}
.f-rev p{margin:0;font-size:14px;line-height:1.45}.f-quem{font-size:13px;color:var(--sub);font-weight:600}
.f-cta{flex:none;padding:12px 20px;padding-bottom:max(16px,env(safe-area-inset-bottom));background:var(--bg);border-top:1px solid var(--line)}
.f-cta .btn{width:100%;min-height:52px;font-size:16px}
/* lojas */
.lojas{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:start}
.lojas-l{display:flex;flex-direction:column;gap:12px}
.loja{padding:18px;border-radius:var(--rc);background:var(--sup);border:1px solid var(--line);display:flex;flex-direction:column;gap:12px;text-align:left;width:100%;cursor:pointer}
.loja.on{border:2px solid var(--pri);padding:17px}
.loja .cab b{font-size:17px;font-weight:800}
.loja .st{font-size:13px}
.apps{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;font-weight:600}
.apps span{display:flex;align-items:center;gap:6px;white-space:nowrap}
.end{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:var(--sub)}.end svg{flex:none;margin-top:2px;color:var(--pri)}
.infos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:2px}
.info{display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;border-radius:var(--rs);background:var(--soft)}
.info svg{flex:none;color:var(--pri)}.info span{display:flex;flex-direction:column;min-width:0}
.info small,.apps-l small{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sub)}
.info b{font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.apps-l{display:flex;flex-direction:column;gap:6px}
.lks{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}
.lk{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 14px;border-radius:var(--rb);border:1px solid var(--line);background:var(--bg);font-size:14px;font-weight:700;color:var(--ink)}
.lk:hover{text-decoration:none;border-color:var(--ink)}.lk svg{color:var(--pri)}
.mapa{position:relative;height:220px;border-radius:var(--rc);overflow:hidden;border:1px solid var(--line);background:var(--soft);display:flex;align-items:center;justify-content:center}
.mapa iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.mapa .btn{padding:0 20px;background:var(--sup);border:1px solid var(--line)}
/* instagram */
#ig{grid-auto-columns:64%;gap:12px}
.post{display:flex;flex-direction:column;gap:8px}.post .foto{aspect-ratio:4/5;border-radius:var(--rc)}
.post a{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:600}
.post a span:last-child{flex:none;color:var(--pri)}
.pgs{display:flex;flex-wrap:wrap;gap:8px}.pgs span{padding:8px 14px;border-radius:var(--rch);background:var(--soft);font-size:14px;font-weight:600}
/* rodapé */
footer{margin-top:auto;background:var(--foot);padding:24px 20px 28px}
footer .in{max-width:1120px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;font-size:13px;color:rgba(255,255,255,.75)}
footer b{color:#fff}
/* selo "Feito com Tá no Caixa": fundo próprio, funciona sobre qualquer paleta */
.tnc{display:inline-flex;align-items:center;gap:10px;padding:8px 14px 8px 8px;border-radius:14px;background:#16303A;color:#F7F5EA;box-shadow:0 0 0 1px rgba(255,255,255,.12);white-space:nowrap}
.tnc:hover{text-decoration:none;filter:brightness(1.12)}
.tnc small{display:block;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:rgba(247,245,234,.7);line-height:1.1}
.tnc strong{display:block;font-family:'Archivo',system-ui,sans-serif;font-weight:800;font-size:17px;letter-spacing:-.02em;line-height:1.15}
/* pedido */
.pedir{display:flex;flex-direction:column;gap:12px}
.pedir .cab b{font-size:17px}
.fechar{width:44px;height:44px;font-size:24px;color:var(--sub);display:flex;align-items:center;justify-content:center}
.pedir .chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}
.pedir .chip{padding:10px 14px}
.app{display:flex;align-items:center;gap:12px;min-height:54px;padding:0 18px;border-radius:var(--rs);background:var(--sup);border:1px solid var(--line);font-weight:700;font-size:16px}
.app:hover{text-decoration:none;border-color:var(--ink)}
.app .x{flex:1}.app .ab{font-weight:500;font-size:14px;color:var(--sub)}
.js [data-da-loja]:not([data-on]){display:none!important}
.barra{position:sticky;bottom:0;z-index:40;background:var(--bg);border-top:1px solid var(--line);box-shadow:0 -10px 30px rgba(0,0,0,.08)}
.barra .pedir{padding:20px 20px 4px}
.barra .pedir[hidden]{display:none}
.barra-b{padding:12px 20px;padding-bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:12px}
.barra-b .ctn{padding:0 20px;min-height:52px;font-size:15px}
.barra-b .pri{flex:1;min-height:52px;font-size:16px}
.pop{position:absolute;top:calc(100% + 8px);right:max(40px,calc((100% - 1200px)/2 + 40px));width:380px;padding:20px;border-radius:var(--rc);background:var(--sup);border:1px solid var(--line);box-shadow:0 24px 48px rgba(0,0,0,.18)}
.pop{color:var(--ink)}.pop[hidden]{display:none}.pop .app{background:var(--bg);font-size:15px}
@media (min-width:768px){
 .painel-f{left:50%;top:50%;right:auto;bottom:auto;width:min(520px,92vw);max-height:86vh;border-radius:var(--rc);transform:translate(-50%,-46%);opacity:0;transition:transform .2s,opacity .2s}
 .folha.ab .painel-f{transform:translate(-50%,-50%);opacity:1}.alca{display:none}
 .so-cel{display:none!important}.so-pc{display:revert!important}.setas.so-pc{display:flex!important}
 .h2{font-size:32px}.h3{font-size:22px}
 .topo{position:sticky;top:0;z-index:40;background:var(--foot);color:#fff}
 .topo>.in{max-width:1200px;margin:0 auto;padding:16px 40px;display:flex;align-items:center;gap:28px}
 .topo .marca{display:flex;align-items:center;gap:12px}.topo .logo{width:40px;height:40px;font-size:15px}
 .topo .marca b{font-family:var(--tit);font-weight:800;font-size:20px;letter-spacing:-.01em;white-space:nowrap}
 .topo nav{display:flex;gap:24px;font-size:15px;font-weight:600;color:rgba(255,255,255,.8)}
 .topo nav a:hover{color:#fff}
 .topo .esp{flex:1}.topo .st{color:rgba(255,255,255,.8)}.topo .acc{padding:0 22px;font-size:15px}
 .topo .logo{box-shadow:0 0 0 2px rgba(255,255,255,.15)}
 .hero{max-width:1200px;width:100%;margin:0 auto;padding:48px 40px 24px;display:grid!important;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:48px;align-items:center}
 .hero .c{display:flex;flex-direction:column;gap:20px;align-items:flex-start}
 .pil{display:flex;align-items:center;gap:8px;padding:7px 14px;border-radius:var(--rch);background:var(--soft);font-size:14px;font-weight:600;white-space:nowrap}
 .hero h1{font-size:60px;line-height:1;letter-spacing:-.03em}
 .hero .slogan{font-size:20px;line-height:1.4;max-width:30ch;margin:0}
 .meta{display:flex;flex-wrap:wrap;gap:10px 22px;font-size:15px}.meta span span{color:var(--sub)}
 .hero .bts{display:flex;gap:12px;margin-top:6px}.hero .btn{min-height:54px;padding:0 28px;font-size:16px}
 .disp{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:14px;color:var(--sub)}
 .disp span{display:flex;align-items:center;gap:6px;font-weight:600;color:var(--ink);white-space:nowrap}
 .hero .foto{aspect-ratio:5/4;border-radius:var(--rc)}
 main{padding:32px 40px 56px;gap:64px}
 .promo{min-height:300px;padding:36px 40px}
 .promo>.g{background:linear-gradient(90deg,rgba(15,10,8,.92) 0%,rgba(15,10,8,.7) 45%,rgba(15,10,8,.1) 100%)}
 .selo{font-size:13px}.promo .tx{font-size:38px}
 .trilho{margin:0;padding:0 0 4px;scroll-padding:0}
 #dest{grid-auto-columns:minmax(0,1fr);overflow:visible}
 #ig{grid-auto-columns:260px}
 .cats{margin:0;padding:0;flex-wrap:wrap}
 .cards{grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr))}
 .lojas{grid-template-columns:minmax(0,1fr) minmax(0,1.2fr)}
 .mapa{position:sticky;top:90px;height:460px}
 footer{padding:22px 40px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.painel-f,.folha .fundo{transition:none}.stt .pt{animation:none}}`
}

/* -------------------------------- Partes --------------------------------- */

interface Ctx {
  c: SiteConfig
  itens: ItemSite[]
  lojas: LojaSite[]
  st: ReturnType<typeof textosStatus>
  o: OpcoesRender
  sel: number
}

function painelPedido(x: Ctx, onde: 'pop' | 'cel'): string {
  const { lojas, st } = x
  const chips =
    lojas.length > 1
      ? `<div class="chips">${lojas
          .map((l, i) => `<button class="chip${i === x.sel ? ' on' : ''}" data-escolher="${i}" aria-pressed="${i === x.sel}">${esc(l.nome)}</button>`)
          .join('')}</div>`
      : ''
  const porLoja = lojas
    .map((l, i) => {
      const apps = appsDaLoja(l)
        .map((a) => `<a class="app" href="${esc(a.url)}" ${ext} data-ev="pedido" data-app="${a.k}">${selo(a.k, 28)}<span class="x">${esc(a.nome)}</span><span class="ab">abrir ↗</span></a>`)
        .join('')
      const zap =
        onde === 'pop' && wa(l)
          ? `<a class="app" href="${esc(wa(l))}" ${ext}>${selo('whatsapp', 28)}<span class="x">WhatsApp da loja</span><span class="ab">conversar ↗</span></a>`
          : ''
      const vazio = !apps && !zap ? `<p class="subt">Essa loja ainda não informou os apps de pedido.</p>` : ''
      return `<div data-da-loja="${i}"${i === x.sel ? ' data-on' : ''} style="display:flex;flex-direction:column;gap:12px">
<div class="subt" style="font-size:${onde === 'cel' ? 13 : 14}px"><span data-st="t${i}">${esc(st.lojas[i].texto)}</span>${entregaTaxa(l)}</div>
<div style="display:flex;flex-direction:column;gap:8px">${apps}${zap}${vazio}</div></div>`
    })
    .join('')
  return `<div class="cab"><b class="um">Pedir de qual loja?</b><button class="fechar" data-fechar-pedir aria-label="Fechar">×</button></div>${chips}${porLoja}`
}

function topoPc(x: Ctx): string {
  const { c } = x
  const vis = (k: SecaoId) => c.secoes.some((s) => s.chave === k && s.visivel)
  const nav = [
    vis('cardapio') && x.itens.length ? `<a href="#cardapio">Cardápio</a>` : '',
    vis('lojas') ? `<a href="#lojas">Lojas</a>` : '',
    vis('instagram') && c.instagram.posts.length ? `<a href="#instagram">Instagram</a>` : '',
  ].join('')
  return `<header class="topo so-pc"><div class="in">
<div class="marca">${logo(c, '')}<b>${esc(c.nome)}</b></div>
<nav>${nav}</nav><div class="esp"></div>
${stt(x.st.n > 0, 'g', 'geral', x.st.geral)}
<a class="btn acc" href="#lojas" data-abrir-pedir>Pedir agora</a></div>
<div class="pop pedir" id="pop" hidden>${painelPedido(x, 'pop')}</div></header>`
}

function notaTexto(c: SiteConfig): { valor: string; rotulo: string } | null {
  if (!c.nota.valor.trim()) return null
  const rot = [c.nota.total.trim() && `${c.nota.total.trim()} avaliações`, c.nota.fonte.trim() && `no ${c.nota.fonte.trim()}`].filter(Boolean).join(' ')
  return { valor: '★ ' + c.nota.valor.trim(), rotulo: rot || 'de avaliação' }
}

function heroPc(x: Ctx): string {
  const { c, lojas } = x
  const nota = notaTexto(c)
  const l0 = lojas[x.sel]
  const todos = APPS.filter((a) => lojas.some((l) => urlSegura(l.apps[a.k])))
  return `<section class="hero so-pc"><div class="c">
${stt(x.st.n > 0, 'g', 'longo', x.st.longo, ' grande')}
<h1 class="tit">${esc(c.nome)}</h1>
${c.slogan ? `<p class="slogan">${esc(c.slogan)}</p>` : ''}
<div class="meta">${nota ? `<span><b>${esc(nota.valor)}</b> <span>${esc(nota.rotulo)}</span></span>` : ''}${l0?.tempoEntrega.trim() ? `<span><b>${esc(l0.tempoEntrega)}</b> <span>de entrega</span></span>` : ''}${taxaMin(lojas).trim() ? `<span><span>taxa a partir de</span> <b>${esc(taxaMin(lojas))}</b></span>` : ''}</div>
<div class="bts"><a class="btn pri" href="#lojas" data-abrir-pedir>Pedir agora</a>${l0 && wa(l0) ? `<a class="btn ctn" href="${esc(wa(l0))}" ${ext} data-wa>${selo('whatsapp', 22)}Pedir pelo WhatsApp</a>` : ''}</div>
${todos.length ? `<div class="disp">Disponível em ${todos.map((a) => `<span>${selo(a.k, 18)}${esc(a.nome)}</span>`).join('')}</div>` : ''}
</div><div class="foto">${img(c.capaUrl, 'Foto de ' + c.nome, 'fetchpriority="high" width="1200" height="960"')}</div></section>`
}

function capaCel(x: Ctx): string {
  const { c, lojas } = x
  const nota = notaTexto(c)
  const l0 = lojas[0]
  const topo = `<header class="topo-cel so-cel">${logo(c, '')}<b class="um">${esc(c.nome)}</b>${stt(x.st.n > 0, 'g', 'geral', x.st.geral)}</header>`
  return `${topo}<section class="capa so-cel"><div class="foto">${img(c.capaUrl, 'Foto de ' + c.nome, 'fetchpriority="high" width="780" height="500"')}</div>
<div class="capa-txt">${logo(c, '')}<div><h1 class="tit um">${esc(c.nome)}</h1>${c.slogan ? `<p class="slogan">${esc(c.slogan)}</p>` : ''}</div>
<div>${stt(x.st.n > 0, 'g', 'longo', x.st.longo, ' grande')}</div>
${(() => {
    const cels = [
      nota ? `<div><b>${esc(nota.valor)}</b><span>${esc(nota.rotulo)}</span></div>` : '',
      l0?.tempoEntrega.trim() ? `<div><b>${esc(l0.tempoEntrega)}</b><span>de entrega</span></div>` : '',
      taxaMin(lojas).trim() ? `<div><b>${esc(taxaMin(lojas))}</b><span>taxa a partir de</span></div>` : '',
    ].filter(Boolean)
    return cels.length ? `<div class="faixa" style="grid-template-columns:repeat(${cels.length},minmax(0,1fr))">${cels.join('')}</div>` : ''
  })()}
</div></section>`
}

function secPromo(x: Ctx): string {
  const { c } = x
  const titulo = c.promo.titulo.slice(0, PROMO_TITULO_MAX)
  return `<section id="promo" class="promo" aria-label="Promoção do dia">
<div class="f">${img(c.promo.imagemUrl || c.capaUrl, '', 'loading="lazy"')}</div><div class="m"></div><div class="g"></div>
<div class="c"><div class="selo">Promoção do dia${titulo ? ' · ' + esc(titulo) : ''}</div>
<div class="tx">${textoPreco(c.promo.texto)}</div>${c.promo.regra ? `<div class="rg">${esc(c.promo.regra)}</div>` : ''}</div>
<a class="btn" href="#lojas" data-abrir-pedir data-ev="promo">Quero essa</a></section>`
}

function secDestaques(x: Ctx): string {
  const d = x.itens.filter((i) => i.destaque)
  return `<section id="destaques"><div class="cab"><h2 class="tit h2">Mais pedidos</h2>
<div class="setas so-cel"><button class="seta" data-rolar="dest" data-dir="-1" aria-label="Anterior">←</button><button class="seta" data-rolar="dest" data-dir="1" aria-label="Próximo">→</button></div></div>
<div class="trilho" id="dest">${d
    .map(
      (i) => `<div class="tile clk" ${clk(i)}><div class="foto">${img(i.fotoUrl, i.nome, 'loading="lazy" width="400" height="400"') || esc(i.nome[0] ?? '')}</div>
<div><b class="um" style="display:block">${esc(i.nome)}</b><div class="preco-p">${precoTexto(i.preco)}</div></div></div>`,
    )
    .join('')}</div></section>`
}

function secCardapio(x: Ctx): string {
  const { c, itens } = x
  const cats = categorias(itens)
  const mp = (i: ItemSite) => (i.destaque ? `<span class="mp">Mais pedido</span>` : '')
  const item = (i: ItemSite) =>
    c.cardapioModo === 'lista'
      ? `<div class="lin clk" ${clk(i)}><div class="cp"><div class="nm"><b>${esc(i.nome)}</b>${mp(i)}</div>${i.descricao ? `<p class="desc">${esc(i.descricao)}</p>` : ''}<div class="preco-l"><span class="preco">${precoTexto(i.preco)}</span><span class="vm">Detalhes ›</span></div></div>${
          i.fotoUrl ? `<div class="foto">${img(i.fotoUrl, i.nome, 'loading="lazy" width="168" height="168"')}</div>` : ''
        }</div>`
      : `<div class="card clk" ${clk(i)}>${i.fotoUrl ? `<div class="foto">${img(i.fotoUrl, i.nome, 'loading="lazy" width="520" height="390"')}</div>` : ''}<div class="cp"><div class="nm"><b>${esc(i.nome)}</b>${mp(i)}</div><p class="desc">${esc(i.descricao)}</p><div class="preco-l"><span class="preco">${precoTexto(i.preco)}</span><span class="vm">Detalhes ›</span></div></div></div>`
  const grupos = cats
    .map(
      (k, j) =>
        `<div class="cat" data-cat="${j}"${j === 0 ? ' data-on' : ''}><h3 class="tit h3 cat-nome">${esc(k)}</h3><div class="${c.cardapioModo === 'lista' ? 'lista' : 'cards'}">${itens
          .filter((i) => i.categoria === k)
          .map(item)
          .join('')}</div></div>`,
    )
    .join('')
  return `<section id="cardapio"><div class="cab" style="align-items:flex-end;flex-wrap:wrap"><div><h2 class="tit h2">Cardápio</h2><div class="subt">Preços da loja. Nos apps podem variar.</div></div>
${cats.length > 1 ? `<div class="setas so-cel"><button class="seta" data-cat-dir="-1" aria-label="Categoria anterior">←</button><button class="seta" data-cat-dir="1" aria-label="Próxima categoria">→</button></div>` : ''}</div>
${cats.length > 1 ? `<div class="cats" id="cats" role="tablist">${cats.map((k, j) => `<button class="chip${j === 0 ? ' on' : ''}" data-cat-btn="${j}" role="tab" aria-selected="${j === 0}">${esc(k)}</button>`).join('')}</div>` : ''}
${grupos}</section>`
}

function secLojas(x: Ctx): string {
  const { lojas, st } = x
  const l0 = lojas[x.sel]
  const cards = lojas
    .map((l, i) => {
      const apps = appsDaLoja(l)
      return `<div class="loja${i === x.sel ? ' on' : ''}" data-escolher="${i}" role="button" tabindex="0">
<div class="cab"><b class="um">${esc(l.nome)}</b>${stt(st.lojas[i].aberta, String(i), 'c' + i, st.lojas[i].curto, ' peq')}</div>
${l.endereco ? `<div class="end">${ic('pin', 16)}<span>${esc(l.endereco)}</span></div>` : ''}
<div class="infos">${info('dias', 'Dias', textoDias(l.dias))}${info('hora', 'Horário', `${horaTexto(l.abre)} – ${horaTexto(l.fecha)}`)}${l.tempoEntrega.trim() ? info('entrega', 'Entrega', l.tempoEntrega) : ''}${l.taxa.trim() ? info('taxa', 'Taxa', l.taxa) : ''}</div>
${apps.length ? `<div class="apps-l"><small>Peça por</small><div class="apps">${apps.map((a) => `<a href="${esc(a.url)}" ${ext}><span>${selo(a.k, 20)}${esc(a.nome)}</span></a>`).join('')}</div></div>` : ''}
${l.endereco || wa(l) ? `<div class="lks">${l.endereco ? `<a class="lk" href="${esc(rota(l))}" ${ext} data-ev="rota">${ic('rota', 15)}Como chegar</a>` : ''}${wa(l) ? `<a class="lk" href="${esc(wa(l))}" ${ext}>${selo('whatsapp', 18)}WhatsApp</a>` : ''}</div>` : ''}</div>`
    })
    .join('')
  const mapa = l0?.endereco
    ? `<div class="mapa" id="mapa"><a class="btn" href="${esc(rota(l0))}" ${ext} data-mapa>Ver no mapa</a></div>`
    : ''
  return `<section id="lojas"><div class="cab" style="align-items:baseline;flex-wrap:wrap"><h2 class="tit h2">${lojas.length > 1 ? 'Nossas lojas' : 'Nossa loja'}</h2><div class="subt" data-st="resumo">${esc(st.resumo)}</div></div>
<div class="lojas"><div class="lojas-l">${cards}</div>${mapa}</div></section>`
}

function secInstagram(x: Ctx): string {
  const { c } = x
  const h = igHandle(c.instagram.handle)
  return `<section id="instagram"><div class="cab"><div><h2 class="tit h2">No Instagram</h2>${h ? `<a href="${esc(igUrl(h))}" ${ext} style="font-size:14px;font-weight:700;color:var(--pri)">${esc(h)} ↗</a>` : ''}</div>
<div class="setas so-pc"><button class="seta" data-rolar="ig" data-dir="-1" data-px="280" aria-label="Anterior">←</button><button class="seta" data-rolar="ig" data-dir="1" data-px="280" aria-label="Próximo">→</button></div></div>
<div class="trilho" id="ig">${c.instagram.posts
    .map(
      (p) => `<div class="post"><div class="foto">${img(p.imagemUrl, p.legenda, 'loading="lazy" width="400" height="500"')}</div>
<a href="${esc(urlSegura(p.url) || igUrl(h))}" ${ext} data-ev="post"><span class="um">${esc(p.legenda)}</span><span>Ver post ↗</span></a></div>`,
    )
    .join('')}</div></section>`
}

function secPagamento(x: Ctx): string {
  return `<section id="pagamento"><h2 class="tit h3">Formas de pagamento</h2><div class="pgs">${x.c.pagamentos.map((p) => `<span>${esc(p)}</span>`).join('')}</div></section>`
}

/** Seções que têm conteúdo para mostrar. Sem conteúdo, a seção não aparece. */
function temConteudo(k: SecaoId, x: Ctx, hoje: string): boolean {
  switch (k) {
    case 'promo':
      return promoAtiva(x.c, hoje)
    case 'destaques':
      return x.itens.some((i) => i.destaque)
    case 'cardapio':
      return x.itens.length > 0
    case 'lojas':
      return x.lojas.length > 0
    case 'instagram':
      return x.c.instagram.posts.length > 0
    case 'pagamento':
      return x.c.pagamentos.length > 0
  }
}

const SECAO: Record<SecaoId, (x: Ctx) => string> = {
  promo: secPromo,
  destaques: secDestaques,
  cardapio: secCardapio,
  lojas: secLojas,
  instagram: secInstagram,
  pagamento: secPagamento,
}

/* ------------------------------ Documento -------------------------------- */

const FONTES = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&display=swap">`

function dadosJs(x: Ctx): string {
  const dados = {
    sub: x.c.subdominio,
    previa: !!x.o.previa,
    lojas: x.lojas.map((l) => ({ dias: l.dias, abre: l.abre, fecha: l.fecha, wa: wa(l), q: l.endereco })),
    // Detalhes de cada item para a aba que sobe ao tocar no produto.
    itens: Object.fromEntries(
      x.itens.map((i) => [i.id, { n: i.nome, d: i.descricao, p: precoTexto(i.preco), f: urlSegura(i.fotoUrl) || undefined, c: i.categoria, m: i.destaque || undefined, a: i.avaliacoes?.length ? i.avaliacoes : undefined }]),
    ),
  }
  // `<` escapado para o JSON não fechar o <script>.
  return `<script type="application/json" id="tnc-dados">${JSON.stringify(dados).replace(/</g, '\\u003c')}</script>`
}

/** JS do site (sem framework, ~3 KB). Compartilhado entre o site e a página de links. */
function script(): string {
  return `<script>(function(){
var d=document,D=JSON.parse(d.getElementById('tnc-dados').textContent),Q=function(s){return Array.prototype.slice.call(d.querySelectorAll(s))};
var textos=${textosStatus.toString()};
var CH='tnc:loja:'+D.sub,sel=0;
if(!D.previa){try{sel=+localStorage.getItem(CH)||0}catch(e){}}
if(!(sel>=0&&sel<D.lojas.length))sel=0;
function agora(){var o={};new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).forEach(function(p){o[p.type]=p.value});return{dia:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(o.weekday),min:(+o.hour%24)*60+ +o.minute}}
function status(){if(!D.lojas.length)return;var a=agora(),s=textos(D.lojas,a.dia,a.min);
Q('[data-st]').forEach(function(el){var k=el.getAttribute('data-st'),v=k==='geral'?s.geral:k==='longo'?s.longo:k==='resumo'?s.resumo:k==='sel'?s.lojas[sel].texto:(s.lojas[+k.slice(1)]||{})[k[0]==='t'?'texto':'curto'];if(v!=null)el.textContent=v});
Q('[data-stt]').forEach(function(el){var k=el.getAttribute('data-stt'),ab=k==='g'?s.n>0:k==='sel'?s.lojas[sel].aberta:!!(s.lojas[+k]||{}).aberta;el.classList.toggle('ab',ab);el.classList.toggle('fe',!ab)})}
function escolher(i){sel=i;if(!D.previa){try{localStorage.setItem(CH,i)}catch(e){}}
Q('[data-escolher]').forEach(function(el){var on=+el.getAttribute('data-escolher')===i;el.classList.toggle('on',on);if(el.tagName==='BUTTON')el.setAttribute('aria-pressed',on)});
Q('[data-da-loja]').forEach(function(el){el.toggleAttribute('data-on',+el.getAttribute('data-da-loja')===i)});
var l=D.lojas[i];Q('[data-wa]').forEach(function(el){if(l.wa)el.href=l.wa});
var f=d.querySelector('#mapa iframe');if(f&&l.q)f.src=mapa(l.q);status()}
function mapa(q){return 'https://maps.google.com/maps?q='+encodeURIComponent(q)+'&z=15&output=embed'}
var cel=window.matchMedia('(max-width:767px)'),painel=d.getElementById('painel'),pop=d.getElementById('pop'),bp=d.getElementById('btn-pedir');
function abrir(v){if(cel.matches&&painel){painel.hidden=!v;if(bp)bp.textContent=v?'Fechar':'Pedir agora'}else if(pop){pop.hidden=!v}}
function aberto(){return cel.matches?painel&&!painel.hidden:pop&&!pop.hidden}
d.addEventListener('click',function(e){var t=e.target.closest?e.target:e.target.parentNode;
if(t.closest('[data-fechar-folha]')){fecharItem();return}
if(t.closest('[data-pedir-item]')){fecharItem();setTimeout(function(){abrir(true)},240);return}
var ci=t.closest('[data-item]');if(ci&&!t.closest('a')){abrirItem(ci.getAttribute('data-item'));return}
var a=t.closest('[data-abrir-pedir]');if(a&&(painel||pop)){e.preventDefault();abrir(a===bp?!aberto():true);return}
if(t.closest('[data-fechar-pedir]')){abrir(false);return}
var es=t.closest('[data-escolher]');if(es&&!t.closest('a')){escolher(+es.getAttribute('data-escolher'));return}
var cb=t.closest('[data-cat-btn]');if(cb){cat(+cb.getAttribute('data-cat-btn'));return}
var cd=t.closest('[data-cat-dir]');if(cd){var n=Q('[data-cat-btn]').length;cat((catAt+ +cd.getAttribute('data-cat-dir')+n)%n,1);return}
var r=t.closest('[data-rolar]');if(r){var el=d.getElementById(r.getAttribute('data-rolar'));if(el)el.scrollBy({left:(+r.getAttribute('data-dir'))*(+r.getAttribute('data-px')||el.clientWidth*.66),behavior:'smooth'});return}
var m=t.closest('[data-mapa]');if(m){var l=D.lojas[sel];if(l&&l.q){e.preventDefault();var f=d.createElement('iframe');f.title='Mapa da loja';f.loading='lazy';f.src=mapa(l.q);m.parentNode.appendChild(f);m.remove()}return}
if(pop&&!pop.hidden&&!t.closest('#pop'))pop.hidden=true});
d.addEventListener('keydown',function(e){if(e.key==='Escape'){if(folha&&!folha.hidden){fecharItem();return}abrir(false)}if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-item]')){e.preventDefault();abrirItem(e.target.getAttribute('data-item'));return}if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('div[data-escolher]')){e.preventDefault();escolher(+e.target.getAttribute('data-escolher'))}});
var folha=d.getElementById('folha'),fc=d.getElementById('f-corpo'),pf=folha&&folha.querySelector('.painel-f'),volta=null;
function h(t,c,x){var e=d.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function est(n){return '★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n)}
function abrirItem(id){var it=(D.itens||{})[id];if(!it||!folha)return;volta=d.activeElement;fc.textContent='';pf.classList.toggle('sem-foto',!it.f);fc.scrollTop=0;
if(it.f){var fo=h('div','f-foto'),im=h('img');im.src=it.f;im.alt=it.n;fo.appendChild(im);fc.appendChild(fo)}
var cp=h('div','f-cp'),nm=h('div','nm'),ti=h('h3','tit f-nome',it.n);ti.id='f-nome';nm.appendChild(ti);if(it.m)nm.appendChild(h('span','mp','Mais pedido'));
if(it.c)cp.appendChild(h('div','f-cat',it.c));cp.appendChild(nm);if(it.d)cp.appendChild(h('p','desc f-desc',it.d));cp.appendChild(h('div','f-preco',it.p));
var av=it.a||[];if(av.length){var s=0;av.forEach(function(a){s+=a.nota});var md=s/av.length,cb=h('div','f-av-cab'),mi=h('span','f-media');
cb.appendChild(h('b','','Quem pediu, aprovou'));mi.appendChild(h('span','f-est',est(Math.round(md))));mi.appendChild(d.createTextNode(' '+md.toFixed(1).replace('.',',')+' · '+av.length+(av.length===1?' avaliação':' avaliações')));cb.appendChild(mi);cp.appendChild(cb);
var ls=h('div','f-av');av.forEach(function(a){var r=h('div','f-rev');r.appendChild(h('div','f-est',est(a.nota)));r.appendChild(h('p','','“'+a.texto+'”'));if(a.nome)r.appendChild(h('div','f-quem',a.nome));ls.appendChild(r)});cp.appendChild(ls)}
fc.appendChild(cp);folha.hidden=false;d.documentElement.classList.add('trava');requestAnimationFrame(function(){requestAnimationFrame(function(){folha.classList.add('ab')})});var x=folha.querySelector('.f-x');if(x)x.focus({preventScroll:true})}
function fecharItem(){if(!folha||folha.hidden)return;folha.classList.remove('ab');d.documentElement.classList.remove('trava');setTimeout(function(){folha.hidden=true;if(pf)pf.style.transform=''},260);if(volta&&volta.focus)volta.focus({preventScroll:true})}
if(pf){var ty=null;pf.addEventListener('touchstart',function(e){ty=fc.scrollTop<=0?e.touches[0].clientY:null},{passive:true});
pf.addEventListener('touchmove',function(e){if(ty==null)return;var dy=e.touches[0].clientY-ty;if(dy>0){pf.style.transition='none';pf.style.transform='translateY('+dy+'px)'}},{passive:true});
pf.addEventListener('touchend',function(e){if(ty==null)return;var dy=e.changedTouches[0].clientY-ty;ty=null;pf.style.transition='';pf.style.transform='';if(dy>90)fecharItem()})}
var catAt=0;function cat(j,rolar){catAt=j;Q('[data-cat-btn]').forEach(function(b){var on=+b.getAttribute('data-cat-btn')===j;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
Q('[data-cat]').forEach(function(g){g.toggleAttribute('data-on',+g.getAttribute('data-cat')===j)});
if(rolar){var c=d.getElementById('cats'),ch=c&&c.children[j];if(ch)c.scrollTo({left:ch.offsetLeft-c.offsetLeft-20,behavior:'smooth'})}}
if(sel)escolher(sel);status();setInterval(status,60000)})()</script>`
}

function documento(x: Ctx, titulo: string, descricao: string, corpo: string, extraHead = ''): string {
  const { c, o } = x
  const capa = urlSegura(c.capaUrl)
  const urlCanon = 'https://' + o.dominio + '/'
  return `<!doctype html><html lang="pt-BR" data-cantos="${c.cantos}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(titulo)}</title><meta name="description" content="${esc(descricao)}">
<meta name="theme-color" content="${PALETAS[c.paleta]?.bg ?? '#ffffff'}">
${o.previa ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${esc(urlCanon)}">`}
<meta property="og:type" content="website"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(descricao)}"><meta property="og:url" content="${esc(urlCanon)}">${capa ? `<meta property="og:image" content="${esc(capa)}">` : ''}
${urlSegura(c.logoUrl) ? `<link rel="icon" href="${esc(urlSegura(c.logoUrl))}">` : ''}
<script>document.documentElement.classList.add('js')</script>${FONTES}<style>${css(c)}</style>${extraHead}</head><body>${corpo}${dadosJs(x)}${script()}</body></html>`
}

function contexto(d: DadosSite, o: OpcoesRender): Ctx {
  const a = agoraSP(o.agora)
  const lojas = d.config.lojas
  return { c: d.config, itens: d.itens, lojas, st: textosStatus(lojas, a.dia, a.min), o, sel: 0 }
}

function jsonLd(x: Ctx): string {
  const { c, lojas, itens, o } = x
  const DIAS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const menu = itens.length
    ? {
        '@type': 'Menu',
        hasMenuSection: categorias(itens).map((k) => ({
          '@type': 'MenuSection',
          name: k,
          hasMenuItem: itens
            .filter((i) => i.categoria === k)
            .map((i) => ({ '@type': 'MenuItem', name: i.nome, description: i.descricao || undefined, offers: { '@type': 'Offer', price: i.preco.toFixed(2), priceCurrency: 'BRL' } })),
        })),
      }
    : undefined
  const grafo = lojas.map((l) => ({
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: lojas.length > 1 ? `${c.nome} ${l.nome}` : c.nome,
    url: 'https://' + o.dominio + '/',
    image: urlSegura(c.capaUrl) || undefined,
    address: l.endereco || undefined,
    telephone: l.whatsapp ? '+' + l.whatsapp : undefined,
    acceptsReservations: false,
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: l.dias.map((d) => DIAS[d]), opens: l.abre, closes: l.fecha }],
    hasMenu: menu,
  }))
  return `<script type="application/ld+json">${JSON.stringify(grafo).replace(/</g, '\\u003c')}</script>`
}

/** Página principal do site do cliente. */
export function renderSite(d: DadosSite, o: OpcoesRender): string {
  const x = contexto(d, o)
  const { c } = x
  const hoje = agoraSP(o.agora).data
  const secoes = c.secoes
    .filter((s) => s.visivel && temConteudo(s.chave, x, hoje))
    .map((s) => SECAO[s.chave](x))
    .join('')
  const l0 = x.lojas[0]
  const barra = `<div class="barra so-cel"><div class="pedir" id="painel" hidden>${painelPedido(x, 'cel')}</div>
<div class="barra-b">${l0 && wa(l0) ? `<a class="btn ctn" href="${esc(wa(l0))}" ${ext} data-wa>${selo('whatsapp', 22)}WhatsApp</a>` : ''}<a class="btn pri" href="#lojas" id="btn-pedir" data-abrir-pedir>Pedir agora</a></div></div>`
  const rodape = `<footer><div class="in"><span><b>${esc(c.nome)}</b> · ${esc(o.dominio)}</span>${seloTnc(c.subdominio)}</div></footer>`
  const folha = x.itens.length
    ? `<div class="folha" id="folha" hidden><div class="fundo" data-fechar-folha></div><div class="painel-f" role="dialog" aria-modal="true" aria-labelledby="f-nome"><div class="alca" aria-hidden="true"></div><button class="f-x" data-fechar-folha aria-label="Fechar">×</button><div id="f-corpo"></div><div class="f-cta"><button class="btn pri" data-pedir-item>Pedir agora</button></div></div></div>`
    : ''
  const corpo = `${topoPc(x)}${heroPc(x)}${capaCel(x)}<main>${secoes}</main>${rodape}${barra}${folha}`
  const desc = c.slogan || `Cardápio, lojas e pedidos de ${c.nome}.`
  return documento(x, `${c.nome} · Cardápio e pedidos`, desc, corpo, o.previa ? '' : jsonLd(x))
}

/** Página de links (bio do Instagram): {sub}.tanocaixa.com.br/links */
export function renderLinks(d: DadosSite, o: OpcoesRender): string {
  const x = contexto(d, o)
  const { c, lojas, st } = x
  const base = o.base ?? ''
  const site = (ancora: string) => `${base}/${ancora}`
  const nota = notaTexto(c)
  const hoje = agoraSP(o.agora).data
  const t = PALETAS[c.paleta] ?? PALETAS.mar
  const seg =
    lojas.length > 1
      ? `<div style="width:100%;display:flex;flex-direction:column;gap:8px;align-items:center"><div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--sub)">Escolha a loja</div>
<div class="seg">${lojas.map((l, i) => `<button data-escolher="${i}" class="${i === 0 ? 'on' : ''}" aria-pressed="${i === 0}">${esc(l.nome)}</button>`).join('')}</div></div>`
      : ''
  const botoes = lojas
    .map((l, i) => {
      const apps = appsDaLoja(l)
        .map((a) => `<a class="gr pri" href="${esc(a.url)}" ${ext} data-ev="pedido" data-app="${a.k}">${selo(a.k, 34)}<span class="x">Pedir no ${esc(a.nome)}</span><span>↗</span></a>`)
        .join('')
      const zap = wa(l) ? `<a class="gr ctn" href="${esc(wa(l))}" ${ext}>${selo('whatsapp', 34)}<span class="x">Pedir pelo WhatsApp</span><span>↗</span></a>` : ''
      return `<div data-da-loja="${i}"${i === 0 ? ' data-on' : ''} style="width:100%;display:flex;flex-direction:column;gap:10px">${apps}${zap}<div class="subt" style="font-size:13px">Loja ${esc(l.nome)}${entregaTaxa(l)}</div></div>`
    })
    .join('')
  const promo = promoAtiva(c, hoje)
    ? `<div class="pr"><div style="font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase">Promoção do dia</div><div class="tit" style="font-size:21px;line-height:1.15">${textoPreco(c.promo.texto)}</div>${c.promo.regra ? `<div style="font-size:13px;font-weight:500">${esc(c.promo.regra)}</div>` : ''}</div>`
    : ''
  const links = [
    d.itens.length ? { nome: 'Cardápio completo', info: `${d.itens.length} ${d.itens.length === 1 ? 'item' : 'itens'}`, url: site('#cardapio') } : null,
    lojas.length ? { nome: lojas.length > 1 ? 'Lojas e endereços' : 'Endereço', info: `${lojas.length} ${lojas.length === 1 ? 'loja' : 'lojas'}`, url: site('#lojas') } : null,
    c.pagamentos.length ? { nome: 'Formas de pagamento', info: c.pagamentos.slice(0, 2).join(', '), url: site('#pagamento') } : null,
  ]
    .filter(Boolean)
    .map((k) => `<a class="sec" href="${esc(k!.url)}"><span class="x um">${esc(k!.nome)}</span><span class="subt um" style="font-size:13px">${esc(k!.info)}</span><span>→</span></a>`)
    .join('')
  const h = igHandle(c.instagram.handle)
  const posts = c.instagram.posts.slice(0, 3)
  const ig = posts.length
    ? `<div style="width:100%;display:flex;flex-direction:column;gap:10px;text-align:left"><div class="cab" style="align-items:baseline"><b style="font-size:16px">Últimos posts</b>${h ? `<a href="${esc(igUrl(h))}" ${ext} style="font-size:14px;font-weight:700;color:var(--pri)">${esc(h)} ↗</a>` : ''}</div>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">${posts
        .map((p) => `<div class="foto" style="position:relative;aspect-ratio:4/5;border-radius:var(--ri)">${img(p.imagemUrl, p.legenda, 'loading="lazy"')}<a href="${esc(urlSegura(p.url) || igUrl(h))}" ${ext} class="ver">Ver ↗</a></div>`)
        .join('')}</div></div>`
    : ''
  const extraCss = `<style>.wrap{width:100%;max-width:440px;margin:0 auto;flex:1;display:flex;flex-direction:column}
.lc{position:relative;height:300px}.lc .foto{height:100%}.lc:after{content:'';position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(180deg,transparent,${t.bg});pointer-events:none}
.lb{padding:0 20px 28px;margin-top:-52px;position:relative;display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center}
.lb .logo{width:84px;height:84px;border:4px solid var(--bg);font-size:28px}
.seg{display:flex;gap:6px;padding:4px;border-radius:var(--rb);background:var(--soft);width:100%}
.seg button{flex:1;min-height:44px;border-radius:var(--rb);color:var(--sub);font-weight:700;font-size:14px;white-space:nowrap}
.seg button.on{background:var(--sup);color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.12)}
.gr{display:flex;align-items:center;gap:14px;min-height:62px;padding:0 20px;border-radius:var(--rb);font-weight:700;font-size:17px;text-align:left}
.gr:hover,.sec:hover{text-decoration:none;opacity:.92}.gr .x,.sec .x{flex:1}
.pr{width:100%;padding:18px 20px;border-radius:var(--rc);background:var(--acc);color:var(--onAcc);text-align:left;display:flex;flex-direction:column;gap:2px}
.sec{display:flex;align-items:center;gap:12px;min-height:56px;padding:0 18px;border-radius:var(--rs);background:var(--sup);border:1px solid var(--line);font-weight:700;font-size:16px;text-align:left;width:100%}
.ver{position:absolute;right:6px;bottom:6px;padding:4px 8px;border-radius:var(--rch);background:rgba(0,0,0,.6);color:#fff;font-size:12px;font-weight:700}
.lf{padding:20px 20px 28px;text-align:center;font-size:12px;color:var(--sub)}</style>`
  const corpo = `<div class="wrap"><div class="lc"><div class="foto">${img(c.capaUrl, 'Foto de ' + c.nome, 'fetchpriority="high"')}</div></div>
<div class="lb">${logo(c, '')}<div style="display:flex;flex-direction:column;gap:6px;align-items:center"><h1 class="tit" style="font-size:30px">${esc(c.nome)}</h1>${c.slogan ? `<div class="subt" style="font-size:15px;max-width:30ch">${esc(c.slogan)}</div>` : ''}
${lojas.length ? `<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;font-size:14px;margin-top:4px">${stt(st.lojas[0].aberta, 'sel', 'sel', st.lojas[0].texto)}${nota ? `<span><b>${esc(nota.valor)}</b>${lojas[0].tempoEntrega.trim() ? ' · ' + esc(lojas[0].tempoEntrega) : ''}</span>` : ''}</div>` : ''}</div>
${seg}${botoes}${promo}<div style="width:100%;display:flex;flex-direction:column;gap:8px">${links}</div>${ig}</div>
<div class="lf">${seloTnc(c.subdominio)}<div style="margin-top:10px">${esc(o.dominio)}/links</div></div></div>`
  return documento(x, `${c.nome} · Links para pedir`, c.slogan || `Peça ${c.nome} no app que preferir.`, corpo, extraCss)
}

/** Página simples para subdomínio que não existe (404). */
export function renderNaoEncontrado(host: string): string {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Site não encontrado</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F0EEE2;color:#1C2A2E;font:16px/1.5 system-ui,sans-serif;padding:24px;text-align:center}a{color:#2E5F73;font-weight:700}h1{font-size:28px;margin:0 0 8px}</style></head>
<body><div><h1>Esse site ainda não existe</h1><p>Não encontramos nenhum restaurante em <b>${esc(host)}</b>.</p><p>É dono de restaurante? <a href="https://tanocaixa.com">Crie o seu site com o Tá no Caixa</a>.</p></div></body></html>`
}
