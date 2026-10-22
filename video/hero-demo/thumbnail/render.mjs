// Renderiza thumb.html em 1280x720 (PNG e JPG < 2 MB, limite do YouTube).
//   npm i playwright-core   (numa pasta temporária; ajuste o executablePath)
//   node render.mjs
import { chromium } from 'playwright-core'
import path from 'path'
import { fileURLToPath } from 'url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? process.env.HOME + '/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
await page.goto('file://' + path.join(dir, 'thumb.html'))
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(dir, 'yt-thumbnail-hero.png') })
await page.screenshot({ path: path.join(dir, 'yt-thumbnail-hero.jpg'), type: 'jpeg', quality: 92 })
await browser.close()
console.log('ok')
