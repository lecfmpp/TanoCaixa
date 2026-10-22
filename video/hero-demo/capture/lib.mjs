import { chromium } from 'playwright-core'
export async function open(){
  const browser = await chromium.launch({ executablePath: process.env.HOME+'/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing' })
  const ctx = await browser.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:3 })
  // SEGURANÇA: nunca escrever no Firestore de produção
  await ctx.route(/Firestore\/(Write|Commit)|:commit|firestore\.googleapis\.com.*\/Write/, r => r.abort())
  const page = await ctx.newPage()
  await page.goto('http://localhost:5174/entrar')
  await page.getByText('Ver demonstração').click()
  await page.waitForURL('**/painel**'); await page.waitForTimeout(2500)
  return {browser,page}
}
