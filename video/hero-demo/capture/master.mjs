import {open} from './lib.mjs'
import fs from 'fs'
const {browser,page}=await open()
const T={}
const bb=async(n,loc)=>{const b=await loc.first().boundingBox(); if(!b) throw new Error('sem bbox '+n); T[n]={x:b.x,y:b.y,w:b.width,h:b.height}}
const shot=async n=>{await page.evaluate(()=>document.fonts.ready); await page.waitForTimeout(350); await page.screenshot({path:`shots/${n}.jpg`,type:'jpeg',quality:88})}
const go=async p=>{await page.goto('http://localhost:5174'+p); await page.waitForTimeout(2200)}
const I=()=>page.locator('input:visible')
const replaceTexts=(map,rootSel)=>page.evaluate(([map,rootSel])=>{
  const root=document.querySelector(rootSel)||document.body
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const ns=[]; while(w.nextNode()) ns.push(w.currentNode)
  for(const n of ns){ for(const [a,b] of map){ if(n.nodeValue.includes(a)) n.nodeValue=n.nodeValue.replace(a,b) } }
},[map,rootSel])

// ===== A: nota fiscal =====
await go('/painel/compras')
await shot('a0-compras')
await bb('btnNota',page.getByRole('button',{name:'Lançar nota fiscal'}))
await page.getByRole('button',{name:'Lançar nota fiscal'}).click(); await page.waitForTimeout(900)
await shot('a1-gaveta')
await bb('notaForn',I().nth(0)); await bb('notaNum',I().nth(1)); await bb('notaSel',page.locator('select:visible').last())
await bb('notaQtd',I().nth(3)); await bb('notaPreco',I().nth(4))
await I().nth(0).click()
for(const [k,t] of [['t1','Hor'],['t2','Hortif'],['t3','Hortifrúti'],['t4','Hortifrúti Zona Sul']]){ await I().nth(0).fill(t); await shot('a2-forn-'+k) }
await I().nth(1).click(); await I().nth(1).fill('0048'); await shot('a3-num1'); await I().nth(1).fill('004871'); await shot('a3-num2')
await page.locator('select:visible').last().selectOption({label:'Tomate italiano · kg'}); await shot('a3-prod')
await I().nth(3).fill('40'); await shot('a3-qtd')
await I().nth(4).fill('6'); await page.locator('h2,h3').first().click({force:true}).catch(()=>{})
await shot('a4-itens')
await bb('btnContinuar',page.getByRole('button',{name:'Continuar'}))
await page.getByRole('button',{name:'Continuar'}).click(); await page.waitForTimeout(900)
await bb('btnConfirmar',page.getByRole('button',{name:'Confirmar'}))
await shot('a5-confere')
// depois de salvar: DOM-edit na lista real
await go('/painel/compras')
const novaNota = await page.evaluate(()=>{
  const findRow=(el)=>{let e=el; while(e.parentElement && e.parentElement.children.length<6) e=e.parentElement; return e}
  const el=[...document.querySelectorAll('*')].filter(e=>e.children.length>0 && /Frigorífico Salomão/.test(e.textContent)&&/28\/07/.test(e.textContent)&&/1\.284,00/.test(e.textContent))
  const row=findRow(el[el.length-1]); const c=row.cloneNode(true); row.parentNode.insertBefore(c,row); c.dataset.nova='1'
  const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT); while(w.nextNode()){const n=w.currentNode
    n.nodeValue=n.nodeValue.replace('Frigorífico Salomão','Hortifrúti Zona Sul').replace('Jamile','Halim').replace('1.284,00','240,00')}
  return true})
await replaceTexts([['14.640','14.880'],['8 notas','9 notas']])
await bb('novaNota',page.locator('[data-nova="1"]'))
await shot('a6-compras-depois')

// ===== B: despesa =====
await go('/painel/despesas')
await shot('b0-despesas')
await bb('btnLancar',page.getByRole('button',{name:'Lançar',exact:true}))
await page.getByRole('button',{name:'Lançar',exact:true}).first().click(); await page.waitForTimeout(600)
await bb('menuDespesa',page.getByText('Lançar despesa'))
await shot('b1-menu')
await page.getByText('Lançar despesa').click(); await page.waitForTimeout(900)
await shot('b2-gaveta')
const inp=()=>page.locator('input:visible')
await bb('despForn',inp().nth(1)); await bb('despValor',inp().nth(2))
for(const [k,t] of [['t1','Gá'],['t2','Gás Bo'],['t3','Gás Botafogo']]){ await inp().nth(1).fill(t); await shot('b2-forn-'+k) }
await inp().nth(2).fill('38'); await shot('b2-val1'); await inp().nth(2).fill('380'); await shot('b2-val2')
await bb('despGas',page.getByRole('button',{name:'Gás',exact:true}))
await page.getByRole('button',{name:'Gás',exact:true}).click()
await shot('b3-preenchida')
await bb('despContinuar',page.getByRole('button',{name:'Continuar'}))
await page.getByRole('button',{name:'Continuar'}).click(); await page.waitForTimeout(900)
await bb('despConfirmar',page.getByRole('button',{name:/Confirmar|Salvar/}))
await shot('b4-confere')
await go('/painel/despesas')
await page.evaluate(()=>{
  const findRow=(el)=>{let e=el; while(e.parentElement && e.parentElement.children.length<6) e=e.parentElement; return e}
  const el=[...document.querySelectorAll('*')].filter(e=>e.children.length>0 && /Cupons iFood/.test(e.textContent)&&/640,00/.test(e.textContent)&&!/Tarifas/.test(e.textContent))
  const row=findRow(el[el.length-1]); const c=row.cloneNode(true); row.parentNode.insertBefore(c,row); c.dataset.nova='1'
  ;[...c.querySelectorAll('*')].filter(e=>/corrigido por/.test(e.textContent)&&![...e.children].some(k=>/corrigido por/.test(k.textContent))).forEach(e=>{e.style.display='none'})
  const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT); while(w.nextNode()){const n=w.currentNode
    n.nodeValue=n.nodeValue.replace('Cupons iFood (Marketing)','Gás').replace('Cupons iFood','Gás Botafogo').replace('Promoção do fim de semana','Botijão P45').replace('Despesas Variáveis','Ocupação').replace('27/07','28/07').replace('ontem, 08:00','hoje, 14:14').replace('640,00','380,00').replace(/corrigido por/,'').replace(/^Halim$/,'Halim')}
})
await replaceTexts([['34.079','34.459'],['27 lançamentos','28 lançamentos']])
await bb('novaDespesa',page.locator('[data-nova="1"]'))
await shot('b5-despesas-depois')

// ===== C: vendas =====
await go('/painel')
await shot('c0-inicio')
await bb('btnVendas',page.getByRole('button',{name:'Lançar vendas'}))
await page.getByRole('button',{name:'Lançar vendas'}).first().click(); await page.waitForTimeout(900)
await shot('c1-gaveta')
await bb('vPix',inp().nth(0)); await bb('vCartao',inp().nth(1)); await bb('vDin',inp().nth(2))
await inp().nth(0).fill('1150'); await shot('c2-pix'); await inp().nth(1).fill('1480'); await shot('c2-cartao'); await inp().nth(2).fill('420')
await shot('c2-preenchida')
await bb('vContinuar',page.getByRole('button',{name:'Continuar'}))
await page.getByRole('button',{name:'Continuar'}).click(); await page.waitForTimeout(900)
await bb('vConfirmar',page.getByRole('button',{name:/Confirmar|Salvar/}))
await shot('c3-confere')

// ===== D: dashboard =====
await go('/painel/numeros')
await shot('d0-dash')
const info=await page.evaluate(()=>{
  const out={}
  const pick=(k,re)=>{const els=[...document.querySelectorAll('*')].filter(e=>e.children.length===0&&re.test(e.textContent.trim()))
    const e=els[0]; if(!e) return; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e)
    out[k]={x:r.x,y:r.y,w:r.width,h:r.height,fs:cs.fontSize,fw:cs.fontWeight,ff:cs.fontFamily,color:cs.color,ls:cs.letterSpacing,lh:cs.lineHeight,text:e.textContent.trim()}
    e.dataset.ov=k; e.style.color='transparent'}
  pick('pct',/^106%$/); pick('sobrou',/^R\$\s*5\.006$/); pick('entrou',/^R\$\s*53\.120$/); pick('saiu',/^R\$\s*48\.719$/); {const els=[...document.querySelectorAll('*')].filter(e=>/^margem de\s*9,4%$/.test(e.textContent.trim())&&![...e.children].some(k=>/^margem de/.test(k.textContent.trim())))
    const e=els[0]; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e)
    out.margem={x:r.x,y:r.y,w:r.width,h:r.height,fs:cs.fontSize,fw:cs.fontWeight,ff:cs.fontFamily,color:cs.color,ls:cs.letterSpacing,lh:cs.lineHeight,text:e.textContent.trim(),html:e.innerHTML}
    e.style.color='transparent'; e.querySelectorAll('*').forEach(k=>k.style.color='transparent')}
  return out})
Object.assign(T,{dash:info})
await shot('d1-dash-oculta')
fs.writeFileSync('targets.json',JSON.stringify(T,null,1))
await browser.close(); console.log('ok')
