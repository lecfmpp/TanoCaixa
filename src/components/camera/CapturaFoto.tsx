import { useRef, useState } from 'react'
import { extrairDadosDeFoto, type DadosExtraidosFoto } from '@/lib/gemini'

interface SeletorFotoProps {
  tipo: 'despesa' | 'produto' | 'estoque'
  onExtrair: (dados: DadosExtraidosFoto) => void
  onCancelar: () => void
}

export function CapturaFoto({ tipo, onExtrair, onCancelar }: SeletorFotoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return

    setCarregando(true)
    setErro('')

    const reader = new FileReader()

    reader.onload = async (evt) => {
      try {
        const base64 = (evt.target?.result as string).split(',')[1]
        const dados = await extrairDadosDeFoto(base64, tipo, arquivo.type || 'image/jpeg')
        onExtrair(dados)
      } catch (err) {
        setErro((err as Error).message || 'Erro ao analisar a foto. Tente novamente.')
        setCarregando(false)
      }
    }

    reader.onerror = () => {
      setErro('Não conseguimos abrir esse arquivo. Tente outra foto.')
      setCarregando(false)
    }

    reader.readAsDataURL(arquivo)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-cartao bg-superficie shadow-lg overflow-hidden">
        <div className="flex flex-col gap-4 p-6">
          {!carregando ? (
            <>
              <h2 className="text-lg font-bold text-tinta">Analisar documento</h2>
              <p className="text-sm text-tinta-3">
                Tire uma foto clara ou selecione da galeria.
              </p>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-botao bg-telhado px-4 py-3 text-sm font-bold text-creme transition hover:brightness-95"
              >
                📸 Tirar foto ou selecionar
              </button>

              {erro && <div className="rounded-botao bg-telha-alerta/10 p-3 text-sm text-telha-alerta">{erro}</div>}

              <button
                onClick={onCancelar}
                className="text-sm font-semibold text-tinta-3 hover:text-tinta"
              >
                ← Voltar
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleArquivoSelecionado}
                className="hidden"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <div className="animate-spin text-4xl">📸</div>
              <h2 className="text-lg font-bold text-tinta">Analisando...</h2>
              <p className="text-sm text-tinta-3">Pode levar alguns segundos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
