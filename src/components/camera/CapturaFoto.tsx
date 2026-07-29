import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { extrairDadosDeFoto, type DadosExtraidosFoto } from '@/lib/gemini'

interface CapturaFotoProps {
  tipo: 'despesa' | 'produto' | 'estoque'
  onExtrair: (dados: DadosExtraidosFoto) => void
  onCancelar: () => void
}

export function CapturaFoto({ tipo, onExtrair, onCancelar }: CapturaFotoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [etapa, setEtapa] = useState<'menu' | 'camera' | 'preview' | 'extraindo'>('menu')
  const [fotoCapturada, setFotoCapturada] = useState<string>('')
  const [erro, setErro] = useState('')

  async function iniciarCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setEtapa('camera')
        setErro('')
      }
    } catch (e) {
      setErro('Câmera não disponível. Tente selecionar uma foto do galeria.')
      console.error(e)
    }
  }

  function tirarFoto() {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        ctx.drawImage(videoRef.current, 0, 0)
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.95)
        setFotoCapturada(base64)
        pararCamera()
        setEtapa('preview')
      }
    }
  }

  function pararCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop())
    }
  }

  function selecionarDoGaleria() {
    fileInputRef.current?.click()
  }

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const base64 = evt.target?.result as string
      setFotoCapturada(base64)
      setEtapa('preview')
      setErro('')
    }
    reader.readAsDataURL(arquivo)
  }

  async function enviarParaGemini() {
    setEtapa('extraindo')
    try {
      const base64String = fotoCapturada.split(',')[1]
      const dados = await extrairDadosDeFoto(base64String, tipo)
      onExtrair(dados)
      setEtapa('menu')
    } catch (e) {
      setErro(`Erro ao analisar foto: ${(e as Error).message}`)
      setEtapa('preview')
    }
  }

  function voltarDoPreview() {
    setFotoCapturada('')
    setErro('')
    iniciarCamera()
  }

  function cancelarTudo() {
    pararCamera()
    setFotoCapturada('')
    setErro('')
    setEtapa('menu')
    onCancelar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-cartao bg-superficie shadow-lg overflow-hidden">
        {/* Menu inicial */}
        {etapa === 'menu' && (
          <div className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold text-tinta">Tirar foto do documento</h2>
            <p className="text-sm text-tinta-3">A gente usa IA para preencher os dados automaticamente.</p>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={iniciarCamera}
                className="flex items-center justify-center gap-2 rounded-botao bg-telhado px-4 py-3 text-sm font-bold text-creme transition hover:brightness-95"
              >
                <Camera size={18} />
                Tirar foto com câmera
              </button>
              <button
                onClick={selecionarDoGaleria}
                className="flex items-center justify-center gap-2 rounded-botao bg-preenchimento px-4 py-3 text-sm font-bold text-tinta transition hover:bg-preenchimento/80"
              >
                📁 Selecionar da galeria
              </button>
            </div>

            {erro && <div className="rounded-botao bg-telha-alerta/10 p-3 text-sm text-telha-alerta">{erro}</div>}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleArquivoSelecionado}
              className="hidden"
            />

            <button
              onClick={cancelarTudo}
              className="text-sm font-semibold text-tinta-3 hover:text-tinta"
            >
              ← Voltar
            </button>
          </div>
        )}

        {/* Câmera ao vivo */}
        {etapa === 'camera' && (
          <div className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold text-tinta">Posicione o documento</h2>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-botao bg-preto"
              style={{ maxHeight: '60vh' }}
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  pararCamera()
                  setEtapa('menu')
                }}
                className="flex-1 rounded-botao border border-tinta-4 px-4 py-2.5 text-sm font-bold text-tinta transition hover:bg-preenchimento"
              >
                Cancelar
              </button>
              <button
                onClick={tirarFoto}
                className="flex-1 rounded-botao bg-telhado px-4 py-2.5 text-sm font-bold text-creme transition hover:brightness-95"
              >
                📸 Tirar foto
              </button>
            </div>
          </div>
        )}

        {/* Preview da foto */}
        {etapa === 'preview' && (
          <div className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold text-tinta">Confira a foto</h2>
            <img src={fotoCapturada} alt="Foto capturada" className="w-full rounded-botao bg-preenchimento" />

            <div className="flex gap-3">
              <button
                onClick={voltarDoPreview}
                className="flex-1 rounded-botao border border-tinta-4 px-4 py-2.5 text-sm font-bold text-tinta transition hover:bg-preenchimento"
              >
                ← Tentar novamente
              </button>
              <button
                onClick={enviarParaGemini}
                className="flex-1 rounded-botao bg-telhado px-4 py-2.5 text-sm font-bold text-creme transition hover:brightness-95"
              >
                ✓ Usar esta foto
              </button>
            </div>
          </div>
        )}

        {/* Extraindo dados */}
        {etapa === 'extraindo' && (
          <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
            <div className="animate-spin">
              <Camera size={32} className="text-telhado" />
            </div>
            <h2 className="text-lg font-bold text-tinta">Analisando documento...</h2>
            <p className="text-sm text-tinta-3">Usando IA para extrair os dados</p>
          </div>
        )}

        {erro && etapa !== 'menu' && (
          <div className="border-t border-divisoria bg-telha-alerta/10 px-6 py-3">
            <p className="text-sm text-telha-alerta">{erro}</p>
            <button
              onClick={() => {
                setErro('')
                setEtapa('preview')
              }}
              className="mt-2 text-xs font-semibold text-telha-alerta hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
