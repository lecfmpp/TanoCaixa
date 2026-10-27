// Teste de ponta a ponta do login do TanoCaixa contra os emuladores locais.
// Fluxo: criar conta → verificação de e-mail → onboarding → sair → entrar de
// novo → esqueci a senha (troca e entra com a nova) → botão do Google.
// Uso e pré-requisitos: ver e2e/README.md. NUNCA aponte para o Firebase real.
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import net from 'node:net'

const require = createRequire(import.meta.url)
function carregarPlaywright() {
  // Usa o playwright do projeto se houver; senão o instalado globalmente.
  const caminhos = [undefined, process.env.PLAYWRIGHT_MODULE, '/opt/npm-tools/node_modules/playwright'].filter(
    (c, i) => i === 0 || c,
  )
  for (const c of caminhos) {
    try {
      return c ? require(c) : require('playwright')
    } catch {
      /* tenta o próximo */
    }
  }
  throw new Error('playwright não encontrado: npm i -D playwright ou defina PLAYWRIGHT_MODULE')
}
const { chromium } = carregarPlaywright()

const APP = process.env.APP_URL || 'http://127.0.0.1:5173'
const AUTH = process.env.AUTH_EMULATOR || 'http://127.0.0.1:9099'
const PROJETO = process.env.FIREBASE_PROJECT || 'demo-tanocaixa'
const PRINTS = process.env.SHOTS_DIR || 'e2e/prints'
const CHROMIUM = process.env.CHROMIUM_PATH || undefined
const TIMEOUT_SESSAO = Number(process.env.TIMEOUT_SESSAO || 20000)

if (!PROJETO.startsWith('demo-')) throw new Error('Use só projeto demo-* (emulador).')

mkdirSync(PRINTS, { recursive: true })

const sufixo = Date.now().toString(36)
const EMAIL = `e2e-${sufixo}@exemplo.com`
const SENHA = 'Caixa#2026a'
const SENHA_NOVA = 'Caixa#2026b'
const NOME = 'Dona Teste'

const resultados = []
function registrar(passo, status, detalhe = '') {
  resultados.push({ passo, status, detalhe })
  const marca = { passou: 'OK  ', falhou: 'FALHA', 'não testado': 'N/T ' }[status] ?? status
  console.log(`[${marca}] ${passo}${detalhe ? ' — ' + detalhe : ''}`)
}
async function passo(nome, fn) {
  try {
    const r = await fn()
    if (r && r.status) registrar(nome, r.status, r.detalhe)
    else registrar(nome, 'passou', r?.detalhe ?? '')
  } catch (e) {
    registrar(nome, 'falhou', String(e?.message ?? e).split('\n')[0])
  }
}

function portaAberta(porta, host = '127.0.0.1') {
  return new Promise((ok) => {
    const s = net.connect(porta, host)
    s.once('connect', () => (s.destroy(), ok(true)))
    s.once('error', () => ok(false))
    s.setTimeout(1500, () => (s.destroy(), ok(false)))
  })
}

// ---- API REST do emulador de Auth ----
async function rest(caminho, corpo) {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/${caminho}?key=demo-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  const j = await r.json()
  if (!r.ok) throw new Error(`${caminho}: ${j?.error?.message ?? r.status}`)
  return j
}
async function oobCodes(email, tipo) {
  const r = await fetch(`${AUTH}/emulator/v1/projects/${PROJETO}/oobCodes`)
  const j = await r.json()
  return (j.oobCodes ?? []).filter((c) => c.email === email && (!tipo || c.requestType === tipo))
}
async function contaPorSenha(email, senha) {
  const login = await rest('accounts:signInWithPassword', { email, password: senha, returnSecureToken: true })
  const { users } = await rest('accounts:lookup', { idToken: login.idToken })
  return users[0]
}
async function esperar(fn, ms = 10000, passoMs = 300) {
  const fim = Date.now() + ms
  for (;;) {
    const v = await fn()
    if (v) return v
    if (Date.now() > fim) return null
    await new Promise((r) => setTimeout(r, passoMs))
  }
}

const temFirestore = await portaAberta(8080)
console.log(`App ${APP} | Auth ${AUTH} | Firestore emulador: ${temFirestore ? 'sim' : 'NÃO (passos de sessão ficam bloqueados)'}`)
console.log(`Conta de teste: ${EMAIL}`)

const browser = await chromium.launch({ executablePath: CHROMIUM, headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pt-BR' })
const page = await ctx.newPage()
const consoleErros = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') consoleErros.push(`${m.type()}: ${m.text()}`)
})
const print = (nome) => page.screenshot({ path: `${PRINTS}/${nome}.png`, fullPage: true })
const alertaSessao = () => page.getByRole('alert').filter({ hasText: 'não deu pra abrir o seu restaurante' })

/** Depois de um login/cadastro: espera a URL de destino ou o aviso de sessão. */
async function esperarDestino(destinos) {
  const t0 = Date.now()
  const alvo = await Promise.race([
    page.waitForURL((u) => destinos.some((d) => u.pathname.startsWith(d)), { timeout: TIMEOUT_SESSAO }).then(() => 'url'),
    alertaSessao().waitFor({ timeout: TIMEOUT_SESSAO }).then(() => 'erroSessao'),
  ]).catch(() => 'timeout')
  return { alvo, ms: Date.now() - t0, url: new URL(page.url()).pathname }
}

async function preencherCadastro({ senha = SENHA, whatsapp = '21987654321' } = {}) {
  await page.goto(`${APP}/criar`)
  await page.locator('input[name=nome]').fill(NOME)
  await page.locator('input[name=restaurante]').fill('Boteco E2E')
  await page.locator('input[name=bairro]').fill('Botafogo')
  await page.locator('input[name=whatsapp]').fill(whatsapp)
  await page.locator('input[name=email]').fill(EMAIL)
  await page.locator('input[name=senha]').fill(senha)
  await page.locator('input[type=checkbox]').check()
}

// 1. Validações do cadastro
await passo('Cadastro: recusa senha com menos de 8', async () => {
  await preencherCadastro({ senha: 'Abc#123' })
  await page.getByRole('button', { name: 'Criar conta e começar' }).click()
  await page.getByText('A senha precisa ter pelo menos 8 caracteres.').waitFor({ timeout: 3000 })
})
await passo('Cadastro: recusa celular incompleto', async () => {
  await preencherCadastro({ whatsapp: '2198' })
  await page.getByRole('button', { name: 'Criar conta e começar' }).click()
  await page.getByText('Confira o celular').waitFor({ timeout: 3000 })
})

// 2. Cadastro de verdade
let cadastro = { alvo: 'timeout' }
await passo('Cadastro: cria conta (e-mail e senha)', async () => {
  await preencherCadastro()
  await print('01-cadastro')
  await page.getByRole('button', { name: 'Criar conta e começar' }).click()
  // displayName é gravado logo depois do createUser — espera ele chegar.
  let u = null
  await esperar(async () => {
    try {
      u = await contaPorSenha(EMAIL, SENHA)
      return u.displayName === NOME
    } catch {
      return false
    }
  }, 10000)
  if (!u) throw new Error('conta não apareceu no emulador de Auth')
  if (u.displayName !== NOME) throw new Error(`displayName "${u.displayName}" (esperado "${NOME}")`)
  cadastro = await esperarDestino(['/onboarding'])
  await print('02-depois-do-cadastro')
  if (cadastro.alvo === 'url') return { detalhe: `foi pro /onboarding em ${cadastro.ms} ms` }
  if (!temFirestore && cadastro.alvo === 'erroSessao')
    return { detalhe: `conta criada no Auth; sessão falhou sem Firestore (aviso em ${cadastro.ms} ms)` }
  throw new Error(`não foi pro onboarding (${cadastro.alvo}, url ${cadastro.url}, ${cadastro.ms} ms)`)
})

await passo('Cadastro: e-mail duplicado mostra mensagem clara', async () => {
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const p2 = await ctx2.newPage()
  await p2.goto(`${APP}/criar`)
  await p2.locator('input[name=nome]').fill(NOME)
  await p2.locator('input[name=restaurante]').fill('X')
  await p2.locator('input[name=bairro]').fill('Y')
  await p2.locator('input[name=whatsapp]').fill('21987654321')
  await p2.locator('input[name=email]').fill(EMAIL)
  await p2.locator('input[name=senha]').fill(SENHA)
  await p2.locator('input[type=checkbox]').check()
  await p2.getByRole('button', { name: 'Criar conta e começar' }).click()
  await p2.getByText('Esse e-mail já tem conta').waitFor({ timeout: 5000 })
  await ctx2.close()
})

// 3. Verificação de e-mail (link pego no emulador)
await passo('Verificação de e-mail: link enviado e confirmado', async () => {
  const [c] = (await esperar(async () => {
    const l = await oobCodes(EMAIL, 'VERIFY_EMAIL')
    return l.length ? l : null
  }, 8000)) ?? []
  if (!c) throw new Error('nenhum e-mail de verificação no emulador')
  const cont = new URL(c.oobLink).searchParams.get('continueUrl')
  if (!cont?.endsWith('/entrar')) throw new Error(`continueUrl inesperado: ${cont}`)
  await rest('accounts:update', { oobCode: c.oobCode })
  const u = await contaPorSenha(EMAIL, SENHA)
  if (!u.emailVerified) throw new Error('emailVerified continua false')
  return { detalhe: 'continueUrl /entrar; emailVerified=true' }
})

// 4. Onboarding
await passo('Onboarding: 8 passos até o painel', async () => {
  if (cadastro.alvo !== 'url') return { status: 'não testado', detalhe: 'sem sessão (Firestore indisponível)' }
  await page.getByText('passo 1 de 8').waitFor()
  const nome = await page.locator('input').first().inputValue()
  if (nome !== 'Boteco E2E') throw new Error(`nome do restaurante não veio do cadastro ("${nome}")`)
  await print('03-onboarding')
  for (let i = 1; i < 8; i++) {
    await page.getByRole('button', { name: 'Continuar' }).click()
    await page.getByText(`passo ${i + 1} de 8`).waitFor()
  }
  await page.getByRole('button', { name: 'Ver meu painel' }).click()
  await page.waitForURL('**/painel', { timeout: 15000 })
  await page.waitForTimeout(1500)
  await print('04-painel')
})

// 5. Sair
await passo('Sair', async () => {
  if (cadastro.alvo === 'url') {
    let botao = page.getByRole('button', { name: 'Sair da conta' })
    if (!(await botao.isVisible())) {
      // celular: abre o menu lateral
      await page.getByRole('button', { name: /menu/i }).first().click()
      botao = page.getByRole('button', { name: 'Sair da conta' })
    }
    await botao.click()
  } else if (await alertaSessao().isVisible()) {
    await alertaSessao().getByRole('button', { name: 'Sair' }).click()
  } else {
    return { status: 'não testado', detalhe: 'nem painel nem aviso de sessão na tela' }
  }
  await page.waitForTimeout(800)
  await page.goto(`${APP}/painel`)
  await page.waitForURL('**/entrar', { timeout: 10000 })
  return { detalhe: '/painel manda pro /entrar depois de sair' }
})

// O emulador devolve auth/wrong-password ("Senha incorreta."); o Firebase real
// com proteção contra enumeração devolve auth/invalid-credential.
const SENHA_ERRADA = /E-mail ou senha incorretos\.|Senha incorreta\./

async function entrar(email, senha) {
  await page.goto(`${APP}/entrar`)
  await page.locator('input[name=email]').fill(email)
  await page.locator('input[name=senha]').fill(senha)
  await page.getByRole('button', { name: 'Entrar no painel' }).click()
}

// 6. Entrar de novo
await passo('Entrar: senha errada mostra erro', async () => {
  await entrar(EMAIL, 'senhaErrada123')
  await page.getByText(SENHA_ERRADA).waitFor({ timeout: 8000 })
})
await passo('Entrar de novo com e-mail e senha', async () => {
  await entrar(EMAIL, SENHA)
  const r = await esperarDestino(['/painel', '/onboarding'])
  await page.waitForTimeout(1000)
  await print('05-depois-de-entrar')
  if (r.alvo === 'url') {
    if (cadastro.alvo === 'url' && r.url !== '/painel') throw new Error(`após onboarding foi pra ${r.url}`)
    return { detalhe: `${r.url} em ${r.ms} ms` }
  }
  if (!temFirestore && r.alvo === 'erroSessao') return { detalhe: `Auth ok; sessão falhou sem Firestore (aviso em ${r.ms} ms)` }
  throw new Error(`${r.alvo} em ${r.url}`)
})
// Volta ao estado deslogado pros próximos passos.
await page.evaluate(() => indexedDB.deleteDatabase('firebaseLocalStorageDb')).catch(() => {})
await ctx.clearCookies()
await page.goto(`${APP}/entrar`)
await page.evaluate(() => sessionStorage.clear())

// 7. Esqueci a senha
await passo('Esqueci a senha: link pelo "Esqueci a senha"', async () => {
  await page.goto(`${APP}/entrar`)
  await page.getByRole('link', { name: 'Esqueci a senha' }).click()
  await page.waitForURL('**/esqueci')
  await page.locator('input[name=email]').fill(EMAIL)
  await print('06-esqueci-a-senha')
  await page.getByRole('button', { name: 'Me manda o link' }).click()
  await page.getByRole('status').waitFor({ timeout: 8000 })
  await print('07-esqueci-enviado')
  const [c] = (await esperar(async () => {
    const l = await oobCodes(EMAIL, 'PASSWORD_RESET')
    return l.length ? l : null
  }, 8000)) ?? []
  if (!c) throw new Error('nenhum e-mail de nova senha no emulador')
  const cont = new URL(c.oobLink).searchParams.get('continueUrl')
  if (!cont?.endsWith('/entrar')) throw new Error(`continueUrl inesperado: ${cont}`)
  await rest('accounts:resetPassword', { oobCode: c.oobCode, newPassword: SENHA_NOVA })
  return { detalhe: 'link no emulador, senha trocada via oobCode' }
})
await passo('Esqueci a senha: e-mail inexistente dá a mesma mensagem neutra', async () => {
  await page.goto(`${APP}/esqueci`)
  await page.locator('input[name=email]').fill(`ninguem-${sufixo}@exemplo.com`)
  await page.getByRole('button', { name: 'Me manda o link' }).click()
  await page.getByRole('status').waitFor({ timeout: 8000 })
})
await passo('Entrar com a senha nova (e a antiga não entra mais)', async () => {
  await entrar(EMAIL, SENHA)
  await page.getByText(SENHA_ERRADA).waitFor({ timeout: 8000 })
  await entrar(EMAIL, SENHA_NOVA)
  const r = await esperarDestino(['/painel', '/onboarding'])
  await page.waitForTimeout(1000)
  await print('08-entrar-senha-nova')
  if (r.alvo === 'url') return { detalhe: `${r.url} em ${r.ms} ms` }
  if (!temFirestore && r.alvo === 'erroSessao') return { detalhe: `Auth ok; sessão falhou sem Firestore (aviso em ${r.ms} ms)` }
  throw new Error(`${r.alvo} em ${r.url}`)
})
await page.evaluate(() => indexedDB.deleteDatabase('firebaseLocalStorageDb')).catch(() => {})

// 8. Google
await passo('Google: botão existe', async () => {
  await page.goto(`${APP}/entrar`)
  await page.getByRole('button', { name: 'Continuar com Google' }).waitFor({ timeout: 5000 })
})
await passo('Google: popup do emulador', async () => {
  const popupP = page.waitForEvent('popup', { timeout: 8000 })
  await page.getByRole('button', { name: 'Continuar com Google' }).click()
  const popup = await popupP.catch(() => null)
  if (!popup) {
    const erro = await page.locator('p.text-telha-alerta').textContent().catch(() => '')
    return { status: 'não testado', detalhe: `popup não abriu${erro ? ': ' + erro.trim() : ''}` }
  }
  await popup.waitForLoadState()
  const add = popup.getByText(/Add new account/i)
  if (!(await add.isVisible({ timeout: 8000 }).catch(() => false)))
    return { status: 'não testado', detalhe: 'tela do emulador não carregou no popup' }
  await add.click()
  await popup.getByText(/Auto-generate user information/i).click()
  await popup.getByRole('button', { name: /Sign in with Google/i }).click()
  const r = await esperarDestino(['/painel', '/onboarding'])
  await print('09-google')
  if (r.alvo === 'url') return { detalhe: `${r.url} em ${r.ms} ms` }
  if (!temFirestore && r.alvo === 'erroSessao') return { detalhe: `Auth ok pelo popup do emulador; sessão falhou sem Firestore` }
  throw new Error(`${r.alvo} em ${r.url}`)
})

await browser.close()

writeFileSync(`${PRINTS}/resultado.json`, JSON.stringify({ email: EMAIL, temFirestore, resultados, consoleErros }, null, 2))
const falhas = resultados.filter((r) => r.status === 'falhou').length
console.log(`\n${resultados.length} passos, ${falhas} falha(s). Detalhes em ${PRINTS}/resultado.json`)
process.exit(falhas ? 1 : 0)
