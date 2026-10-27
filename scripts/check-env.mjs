// Falha o build quando faltam as variáveis do Firebase. Sem elas o app sai
// com TELA BRANCA em produção (Firebase: auth/invalid-api-key) e o build
// "passa" do mesmo jeito. Roda sozinho antes de `npm run build` (prebuild).
// Para pular de propósito (ex.: build de teste): VITE_SKIP_ENV_CHECK=1.
import { loadEnv } from 'vite'

if (process.env.VITE_SKIP_ENV_CHECK === '1') process.exit(0)

const env = { ...loadEnv('production', process.cwd(), 'VITE_'), ...process.env }
const obrigatorias = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]
const faltando = obrigatorias.filter((k) => !String(env[k] ?? '').trim())
if (faltando.length) {
  console.error(
    `\nBuild bloqueado: faltam variáveis do Firebase (${faltando.join(', ')}).\n` +
      'Crie o arquivo .env.local (veja .env.example) ou defina as variáveis no ambiente.\n' +
      'Publicar assim deixaria o site com tela branca.\n',
  )
  process.exit(1)
}
