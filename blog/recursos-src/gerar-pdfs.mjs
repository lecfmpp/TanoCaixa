// Gera os 3 PDFs das iscas digitais em public/downloads/.
// Uso: node blog/recursos-src/gerar-pdfs.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.PLAYWRIGHT_CORE ?? '/Users/clawdio/openclaw-app/node_modules/')
const { chromium } = require('playwright-core')
const chrome = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const saida = path.join(process.cwd(), 'public', 'downloads')
fs.mkdirSync(saida, { recursive: true })
const simbolo = fs.readFileSync(path.join(process.cwd(), 'public/logo/tnc-simbolo-principal.svg'), 'utf8')

const CSS = `
@page{size:A4;margin:16mm 15mm}
*{box-sizing:border-box}body{margin:0;font:11pt/1.45 Archivo,Arial,sans-serif;color:#1c2a2e}
h1{font-size:25pt;line-height:1.05;margin:0 0 6px;letter-spacing:-.02em;color:#2e5f73}h2{font-size:14pt;margin:18px 0 6px;color:#2e5f73}
.top{display:flex;align-items:center;gap:10px;font-weight:800;font-size:13pt;margin-bottom:14px}.top svg{width:28px;height:28px}
.et{font:700 8.5pt 'JetBrains Mono',monospace;letter-spacing:.1em;color:#c05437;margin-bottom:6px}
.lead{font-size:12pt;color:#45585d;margin:0 0 10px}
table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #cdccb8;padding:6px 8px;text-align:left;vertical-align:top}th{background:#2e5f73;color:#fff;font-size:10pt}
.sol{background:#efab5c;color:#16303a;font-weight:700}
.box{border:1.5px solid #cdccb8;border-radius:8px;padding:10px 12px;margin:10px 0;background:#fbfaf2}
.q{display:flex;gap:10px;margin:7px 0;align-items:flex-start}.cb{flex:none;width:14px;height:14px;border:1.6px solid #2e5f73;border-radius:3px;margin-top:3px}
.line{border-bottom:1px solid #8a9698;height:22px}.pg{page-break-before:always}
.rod{margin-top:16px;font-size:9pt;color:#6a7a7e;border-top:1px solid #cdccb8;padding-top:6px}
.nota{font-size:9.5pt;color:#45585d}
`
const pag = (corpo) => `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=JetBrains+Mono:wght@700&display=swap"><style>${CSS}</style></head><body>${corpo}</body></html>`
const topo = (et) => `<div class="top">${simbolo}<span>Tá no Caixa</span></div><div class="et">${et}</div>`
const rod = '<div class="rod">Material gratuito do Tá no Caixa · tanocaixa.com · Teste 14 dias grátis, sem cartão. Os números são exemplos ilustrativos; não é orientação contábil. Fale com seu contador.</div>'
const brl = (v) => 'R$ ' + v.toFixed(2).replace('.', ',')

/* ---------- 1) Guia do iFood ---------- */
const CUSTO = 20 // insumo + embalagem (exemplo)
const IMPOSTO = 0.06 // exemplo ilustrativo
const planos = [['Plano Básico', 0.12 + 0.032], ['Plano Entrega', 0.23 + 0.032]]
const margens = [0.05, 0.1, 0.15, 0.2]
const tabela = margens.map((m) => `<tr><td><b>${m * 100}%</b></td>${planos.map(([, t]) => `<td>${brl(CUSTO / (1 - t - IMPOSTO - m))}</td>`).join('')}</tr>`).join('')
const guia = pag(`
${topo('GUIA · DELIVERY')}
<h1>Quanto sobra de cada pedido do iFood</h1>
<p class="lead">A conta completa, para você saber o preço mínimo que paga a conta em cada plano.</p>
<h2>1. O que sai do valor do prato</h2>
<p>Do valor que o cliente paga no app, saem: comissão do plano, taxa de pagamento online, imposto sobre a venda, o custo dos insumos, a embalagem e, se houver, cupom bancado por você e entrega.</p>
<table><tr><th>Item</th><th>Plano Básico</th><th>Plano Entrega</th></tr>
<tr><td>Comissão</td><td>12%</td><td>23%</td></tr><tr><td>Pagamento online</td><td>3,2%</td><td>3,2%</td></tr><tr class="sol"><td>Total de taxas do app</td><td>15,2%</td><td>26,2%</td></tr></table>
<p class="nota">Percentuais da página oficial do iFood para parceiros, conferidos em 21/10/2026 (parceiros.ifood.com.br/restaurante/planos-ifood). Podem mudar; confira antes de decidir.</p>
<h2>2. De cada R$ 100 que o cliente paga</h2>
<p>No Plano Básico, R$ 84,80 chegam à sua conta depois das taxas do app. No Plano Entrega, R$ 73,80. Ainda falta tirar insumo, embalagem, imposto e as suas contas fixas.</p>
<div class="pg"></div>
${topo('GUIA · DELIVERY')}
<h2>3. A fórmula do preço mínimo</h2>
<div class="box"><b>Preço mínimo = (custo dos insumos + embalagem) ÷ (1 − taxas do app − imposto − margem que você quer)</b></div>
<p>Exemplo ilustrativo: prato com R$ 20,00 de custo (insumos + embalagem), imposto de 6% (valor de exemplo: pergunte ao seu contador) e as taxas dos dois planos.</p>
<h2>4. Tabela de preços mínimos (exemplo)</h2>
<table><tr><th>Margem líquida que você quer</th><th>Plano Básico (15,2%)</th><th>Plano Entrega (26,2%)</th></tr>${tabela}</table>
<p class="nota">Cálculo: custo de ${brl(CUSTO)} ÷ (1 − taxas − 6% − margem). Troque pelo seu custo e imposto na folha da próxima página.</p>
<h2>5. Três erros comuns</h2>
<p>• Usar o mesmo preço do balcão no app. • Esquecer a embalagem no custo. • Dar cupom sem refazer a conta: cupom bancado por você sai da margem.</p>
<div class="pg"></div>
${topo('FOLHA EM BRANCO')}
<h1>Refaça a conta com os seus números</h1>
<table>
<tr><th style="width:60%">Item</th><th>Valor</th></tr>
<tr><td>Custo dos insumos do prato (R$)</td><td></td></tr><tr><td>Embalagem (R$)</td><td></td></tr><tr><td><b>Custo total (A)</b></td><td></td></tr>
<tr><td>Comissão do plano (%)</td><td></td></tr><tr><td>Pagamento online (%)</td><td></td></tr><tr><td>Imposto sobre a venda (%) — confirme com o contador</td><td></td></tr><tr><td>Margem líquida que você quer (%)</td><td></td></tr>
<tr><td><b>Soma dos percentuais (B)</b></td><td></td></tr>
<tr class="sol"><td>Preço mínimo = A ÷ (1 − B)</td><td></td></tr>
<tr><td>Preço que você cobra hoje no app (R$)</td><td></td></tr><tr><td>Sobra por pedido hoje (R$)</td><td></td></tr></table>
<h2>Depois do pedido: quanto sobrou no mês?</h2>
<p>O Tá no Caixa mostra entrou, saiu e sobrou do mês, com as vendas por canal (incluindo apps de delivery) lançadas por você. A integração automática com apps está em breve. Teste 14 dias grátis, sem cartão: tanocaixa.com</p>
${rod}`)

/* ---------- 2) Checklist de fechamento ---------- */
const itens = (l) => l.map((t) => `<div class="q"><div class="cb"></div><div>${t}</div></div>`).join('')
const fechamento = pag(`
${topo('CHECKLIST · FECHAMENTO')}
<h1>Fechamento de caixa do dia</h1>
<p class="lead">10 minutos no fim do serviço para saber quanto entrou, quanto saiu e quanto sobrou.</p>
<h2>1. Vendas do dia, por canal</h2>
${itens(['Balcão / salão: total do dia (R$ ______)', 'Delivery próprio e WhatsApp (R$ ______)', 'Apps de delivery (iFood, 99Food, Keeta…): valor vendido (R$ ______)', 'Pix, cartão e dinheiro: conferi a soma por forma de pagamento'])}
<h2>2. Conferência</h2>
${itens(['Dinheiro na gaveta bate com o relatório (diferença: R$ ______)', 'Maquininha: total do dia bate com as vendas em cartão', 'Pix recebido bate com o extrato do dia', 'Sangrias e suprimentos anotados (quem, quanto, motivo)'])}
<h2>3. Saídas e notas do dia</h2>
${itens(['Notas fiscais de compra do dia guardadas ou fotografadas', 'Despesas pagas hoje anotadas (R$ ______)', 'Boletos e contas que vencem amanhã (R$ ______)'])}
<h2>4. O número do dia</h2>
<table><tr><th>Entrou (R$)</th><th>Saiu (R$)</th><th class="sol">Sobrou (R$)</th></tr><tr><td style="height:34px"></td><td></td><td></td></tr></table>
<h2>5. Para amanhã</h2>
${itens(['Troco e fundo de caixa separados', 'Algo a comprar ou repor antes de abrir', 'Quem fechou e a hora: ______________'])}
${rod}`)

/* ---------- 3) 12 perguntas ---------- */
const perguntas = ['Qual é o preço depois da promoção ou do período de teste?', 'Existe taxa por pedido, por pagamento online ou por transação além da mensalidade?', 'Tem adesão, taxa de implantação ou treinamento cobrado à parte?', 'O que está incluso no plano e o que é módulo extra (nota fiscal, delivery, KDS, integrações)?', 'Tem fidelidade ou multa de cancelamento? Como cancelo?', 'O preço muda se eu tiver mais de uma loja, mais pedidos ou mais usuários?', 'O que acontece com os meus dados se eu cancelar? Consigo exportar?', 'Quem dá suporte, em que horário e por qual canal (inclusive fim de semana)?', 'Funciona sem internet? E no celular?', 'Quanto tempo leva para implantar e quem faz a migração?', 'O que ele NÃO faz? (PDV, cardápio, financeiro, fiscal)', 'Posso testar com os meus dados antes de pagar?']
const lista = perguntas.map((p, i) => `<div class="q"><div class="cb"></div><div><b>${i + 1}.</b> ${p}</div></div>`).join('')
const quadro = perguntas.map((p, i) => `<tr><td style="width:44%">${i + 1}. ${p.split('?')[0].slice(0, 46)}${p.length > 46 ? '…' : ''}</td><td></td><td></td><td></td></tr>`).join('')
const escolher = pag(`
${topo('CHECKLIST · ESCOLHER SISTEMA')}
<h1>12 perguntas antes de assinar um sistema</h1>
<p class="lead">Para PDV, cardápio digital ou sistema financeiro. Faça em qualquer demonstração.</p>
${lista}
<h2>Sinais de alerta</h2>
<p>• Preço só aparece depois de uma conversa de vendas. • Pressa para fechar "só hoje". • Contrato longo sem período de teste. • Ninguém sabe dizer o que acontece com seus dados ao cancelar.</p>
<h2>Como testar na prática</h2>
<p>Use o período grátis com o movimento de verdade: lance as vendas de 3 dias, tire um relatório e veja se o número final bate com o seu caixa. Se não bater, pergunte por quê.</p>
<div class="pg"></div>
${topo('QUADRO COMPARATIVO')}
<h1>Anote a resposta de cada fornecedor</h1>
<table><tr><th>Pergunta</th><th>Fornecedor 1</th><th>Fornecedor 2</th><th>Fornecedor 3</th></tr>${quadro}</table>
<p class="nota">Lembrete: o Tá no Caixa não é PDV nem cardápio digital. Ele mostra quanto sobrou (entrou, saiu, ponto de equilíbrio) e complementa o sistema de pedidos. R$ 149 por loja/mês, 14 dias grátis sem cartão. PDV e integração automática com apps estão em breve.</p>
${rod}`)

const browser = await chromium.launch({ executablePath: chrome })
const page = await browser.newPage()
for (const [nome, html] of [['guia-lucro-por-pedido-ifood-tanocaixa', guia], ['checklist-fechamento-de-caixa-tanocaixa', fechamento], ['checklist-escolher-sistema-restaurante-tanocaixa', escolher]]) {
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.pdf({ path: path.join(saida, `${nome}.pdf`), format: 'A4', printBackground: true, preferCSSPageSize: true })
  console.log('pdf', nome)
}
await browser.close()
