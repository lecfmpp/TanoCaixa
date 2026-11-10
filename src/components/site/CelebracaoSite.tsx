import { useEffect, useRef, useState } from 'react'
import { Check, Copy, ExternalLink, PartyPopper, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/* ------------------------------------------------------------------ *
 * Celebração da 1ª publicação do site: confete + "tchatim" de caixa
 * registradora. O som é sintetizado (Web Audio), sem arquivo para baixar.
 * ------------------------------------------------------------------ */

/** "Tcha-tim": estalo da gaveta + duas moedas/sino. Silencioso se o navegador bloquear. */
export function tocarTchatim() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    const ac = new AC()
    void ac.resume()
    const t0 = ac.currentTime + 0.02
    const saida = ac.createGain()
    saida.gain.value = 0.35
    saida.connect(ac.destination)

    // "Tcha": ruído curto e agudo (a gaveta abrindo).
    const n = Math.floor(ac.sampleRate * 0.09)
    const buf = ac.createBuffer(1, n, ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3)
    const ruido = ac.createBufferSource()
    ruido.buffer = buf
    const passaAlta = ac.createBiquadFilter()
    passaAlta.type = 'highpass'
    passaAlta.frequency.value = 2500
    ruido.connect(passaAlta).connect(saida)
    ruido.start(t0)

    // "Tim, tim": duas moedas, cada uma com parciais de sino que somem devagar.
    const moeda = (inicio: number, base: number) => {
      for (const [mult, vol] of [[1, 0.5], [2.76, 0.22], [5.4, 0.1]] as const) {
        const o = ac.createOscillator()
        const g = ac.createGain()
        o.type = 'sine'
        o.frequency.value = base * mult
        g.gain.setValueAtTime(0, inicio)
        g.gain.linearRampToValueAtTime(vol, inicio + 0.005)
        g.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.9)
        o.connect(g).connect(saida)
        o.start(inicio)
        o.stop(inicio + 1)
      }
    }
    moeda(t0 + 0.07, 1568) // sol
    moeda(t0 + 0.19, 2093) // dó, mais agudo
    setTimeout(() => void ac.close(), 1600)
  } catch {
    /* sem áudio: segue só o confete */
  }
}

const CORES = ['#F2B33D', '#2E5F73', '#B4462F', '#1F7A44', '#F5EBDD', '#7FD39B']

/** Confete em canvas por cima da tela, ~3 s. */
function Confete() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const ajustar = () => {
      cv.width = window.innerWidth * dpr
      cv.height = window.innerHeight * dpr
    }
    ajustar()
    window.addEventListener('resize', ajustar)
    const W = () => cv.width
    const H = () => cv.height
    const total = reduzir ? 40 : 180
    // Dois canhões, nos cantos de baixo, atirando para o centro.
    const pecas = Array.from({ length: total }, (_, i) => {
      const esquerda = i % 2 === 0
      const ang = (esquerda ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7
      const vel = (9 + Math.random() * 9) * dpr
      return {
        x: esquerda ? W() * 0.05 : W() * 0.95,
        y: H() * 0.95,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel * 1.4,
        giro: Math.random() * Math.PI,
        vgiro: (Math.random() - 0.5) * 0.3,
        w: (6 + Math.random() * 6) * dpr,
        h: (8 + Math.random() * 8) * dpr,
        cor: CORES[i % CORES.length],
        redondo: Math.random() < 0.25,
      }
    })
    const inicio = performance.now()
    let raf = 0
    const passo = (agora: number) => {
      const t = agora - inicio
      ctx.clearRect(0, 0, W(), H())
      ctx.globalAlpha = t > 2600 ? Math.max(0, 1 - (t - 2600) / 900) : 1
      for (const p of pecas) {
        p.vy += 0.32 * dpr
        p.vx *= 0.985
        p.vy *= 0.985
        p.x += p.vx
        p.y += p.vy
        p.giro += p.vgiro
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.giro)
        ctx.fillStyle = p.cor
        if (p.redondo) {
          ctx.beginPath()
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.scale(1, Math.cos(p.giro * 2)) // "vira" no ar
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      }
      if (t < 3500) raf = requestAnimationFrame(passo)
      else ctx.clearRect(0, 0, W(), H())
    }
    raf = requestAnimationFrame(passo)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', ajustar)
    }
  }, [])
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-[96] h-full w-full" aria-hidden />
}

export function CelebracaoSite({ url, emitindo, aoFechar }: { url: string; emitindo: boolean; aoFechar: () => void }) {
  const [copiado, setCopiado] = useState(false)
  const endereco = url.replace(/^https:\/\//, '')

  // Toca uma vez, ao abrir (mesmo que a tela de trás renderize de novo).
  useEffect(() => tocarTchatim(), [])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aoFechar])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      /* sem permissão de área de transferência */
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-noite/50 p-4" onClick={aoFechar}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebra-titulo"
          className="relative w-full max-w-[420px] overflow-clip rounded-cartao-g bg-superficie text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="absolute right-3 top-3 rounded-full p-1.5 text-creme/80 hover:bg-white/10">
            <X size={18} />
          </button>
          <div className="relative overflow-clip bg-mar px-6 pb-7 pt-8 text-creme">
            <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-sol" aria-hidden />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sol text-mar shadow-lg">
              <PartyPopper size={30} />
            </div>
            <h2 id="celebra-titulo" className="relative mt-4 text-xl font-extrabold tracking-tight sm:text-2xl">
              Seu site está no ar!
            </h2>
            <p className="relative mt-1 text-sm text-creme/80">Agora seus clientes encontram cardápio, horários e onde pedir num link só.</p>
          </div>
          <div className="flex flex-col gap-4 px-6 py-6">
            <div className="flex items-center gap-2 rounded-campo border border-[rgba(46,95,115,0.14)] bg-fundo px-3 py-2.5 text-left text-sm">
              <span className="line-clamp-2 min-w-0 flex-1 text-[clamp(10px,3.1vw,14px)] font-bold leading-snug text-mar [overflow-wrap:anywhere]">{endereco}</span>
              <button type="button" onClick={copiar} className="inline-flex shrink-0 items-center gap-1 rounded-botao px-2 py-1 text-xs font-bold text-mar hover:bg-mar/10">
                {copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            {emitindo && (
              <p className="text-xs text-tinta-3">Na primeira vez o endereço leva de 5 a 30 minutos para abrir. Se não abrir ainda, espera um pouquinho.</p>
            )}
            <p className="text-xs text-tinta-3">Dica: coloque esse link na bio do Instagram e no WhatsApp da loja.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={url}
                target="_blank"
                rel="noopener"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-botao bg-mar px-4 py-3 text-sm font-bold text-creme hover:bg-mar-escuro"
              >
                Ver meu site <ExternalLink size={14} />
              </a>
              <Button variante="secundario" onClick={aoFechar} className="flex-1">
                Continuar editando
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Confete />
    </>
  )
}
