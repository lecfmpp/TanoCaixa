# Captura das telas reais (hero da landing)

`master.mjs` abre o app em **modo demonstração**, percorre o fluxo (nota fiscal, despesa,
vendas, dashboard) e salva cada estado em `../assets/shots/*.jpg` (1440x900 @3x) + as
coordenadas dos cliques em `targets.json`. Os estados "depois de salvar" são a tela real
com o DOM editado — **nada é gravado no Firestore** (`lib.mjs` aborta qualquer escrita).

```
npm i playwright-core          # numa pasta temporária; ajuste o executablePath em lib.mjs
npm run dev                    # na raiz do repo, com .env.local (só leitura!)
node master.mjs                # gera shots/ e targets.json
cp shots/*.jpg ../assets/shots/
```

Depois: `cd .. && npx hyperframes check && npx hyperframes render -o renders/hero-demo.mp4 --fps 30 --crf 20`
e a versão web (`public/landing/hero-demo.mp4`, 1280x800, CRF 25):
`ffmpeg -i renders/hero-demo.mp4 -vf scale=1280:800 -c:v libx264 -preset slow -crf 25 -pix_fmt yuv420p -movflags +faststart -an hero-demo.mp4`

## Abertura e fechamento (marca nova)

Seguem o guia do pacote de marketing (`SOCIAL.md` §6–7): símbolo montado na ordem quadrado → barra do T →
haste → sorriso → nome entrando da esquerda; transição sol (círculo sol cresce do centro, mar cobre, o app
abre em íris); curva `cubic-bezier(.2,.8,.2,1)` (≈ `power4.out`), sem quicar. O símbolo é desenhado em SVG
inline (paths do `BRAND.md`), na versão "sol" sobre mar. O `viewBox` oficial da assinatura (420) corta o "a"
final com a Archivo 800, então aqui é 480. `INTRO`/`tOut` em `index.html` marcam onde o vídeo começa e onde
o fechamento entra (34,875 s = 18 compassos da trilha).

## Thumbnail do YouTube

`../thumbnail/thumb.html` segue o modelo **YT-A** do pacote (Guia de Marca §11), com a tela real do dashboard no
celular (print do app em modo demo, 390×960 @3x, com os valores finais do vídeo). Título com tracking mais aberto
que o modelo (−0,01em + espaço entre palavras): em Archivo 900 o −0,04em deixa as letras se encostando.
`node render.mjs` gera `yt-thumbnail-hero.png/.jpg` (1280×720, < 2 MB).

## Trilha

`../music/gen_saas.py` gera a trilha original ("light corporate" de SaaS: piano elétrico, marimba, palmas,
kick macio; ~124 BPM, 31,000 s, loop sem emenda, arranjo que acompanha o vídeo):
`python3 gen_saas.py hero-saas.wav && python3 analyze.py hero-saas.wav 16`.
Encode: `ffmpeg -i hero-saas.wav -c:a aac -b:a 160k hero-saas.m4a`.
Mux no vídeo: `ffmpeg -i hero-demo.mp4 -i hero-saas.m4a -map 0:v -map 1:a -c copy -shortest out.mp4`.
