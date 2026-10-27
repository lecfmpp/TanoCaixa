# Teste E2E do login (emuladores)

Roda criar conta, verificação de e-mail, onboarding, sair, entrar de novo,
"esqueci a senha" e o botão do Google contra os **emuladores locais**.
Nunca use credenciais reais: o script só aceita projeto `demo-*`.

1. `.env.local` com valores fictícios:

   ```
   VITE_FIREBASE_API_KEY=demo-key
   VITE_FIREBASE_AUTH_DOMAIN=demo-tanocaixa.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=demo-tanocaixa
   VITE_FIREBASE_STORAGE_BUCKET=demo-tanocaixa.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
   VITE_FIREBASE_APP_ID=1:000000000000:web:demo
   VITE_USE_FIREBASE_EMULATORS=true
   ```

2. Emuladores (de dentro de `e2e/`; esta config desliga a UI e fixa 127.0.0.1):

   ```
   cd e2e && npx firebase-tools emulators:start --config firebase.e2e.json \
     --only auth,firestore,storage --project demo-tanocaixa
   ```

   Firestore e Storage baixam um `.jar` de `storage.googleapis.com` na primeira
   vez. Sem eles, rode `--only auth`: os passos que precisam do restaurante
   (onboarding, painel) saem como "não testado".

3. App: `npx vite --host 127.0.0.1 --port 5173`

4. Teste: `node e2e/auth.mjs` (precisa do pacote `playwright`; use
   `PLAYWRIGHT_MODULE=/caminho/playwright` se estiver instalado fora do projeto).

Variáveis opcionais: `APP_URL`, `AUTH_EMULATOR`, `SHOTS_DIR` (prints, padrão
`e2e/prints`), `CHROMIUM_PATH`, `TIMEOUT_SESSAO`. Os links de e-mail são lidos
em `/emulator/v1/projects/demo-tanocaixa/oobCodes`. O login com Google só passa
se o navegador alcançar `apis.google.com`.
