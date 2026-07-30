import { useEffect, useRef, useState } from 'react'
import { Check, Loader2, Camera, Sparkles, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/cn'
import { extrairDadosDeFoto, prepararFoto, type DadosExtraidosFoto } from '@/lib/gemini'

interface SeletorFotoProps {
  tipo: 'despesa' | 'produto' | 'estoque'
  onExtrair: (dados: DadosExtraidosFoto) => void
  onCancelar: () => void
}

/** Como o app chama o que está na foto — com e sem a preposição contraída. */
const ALVO: Record<SeletorFotoProps['tipo'], { nome: string; de: string }> = {
  despesa: { nome: 'a nota', de: 'da nota' },
  produto: { nome: 'o rótulo', de: 'do rótulo' },
  estoque: { nome: 'a mercadoria', de: 'da mercadoria' },
}

type Fase = 'escolher' | 'preparando' | 'lendo'

export function CapturaFoto({ tipo, onExtrair, onCancelar }: SeletorFotoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fase, setFase] = useState<Fase>('escolher')
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState('')
  const [segundos, setSegundos] = useState(0)

  // Cronômetro só enquanto trabalha — alimenta o aviso de "tá demorando".
  useEffect(() => {
    if (fase === 'escolher') return
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [fase])

  // Libera o object URL da miniatura ao desmontar.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    // Zera o input: sem isso, escolher a MESMA foto de novo não dispara change.
    e.target.value = ''
    if (!arquivo) return

    setPreview(URL.createObjectURL(arquivo))
    setSegundos(0)
    setErro('')
    setFase('preparando')

    try {
      const { base64, mimeType } = await prepararFoto(arquivo)
      if (!base64) throw new Error('Não conseguimos abrir esse arquivo. Tente outra foto.')
      setFase('lendo')
      onExtrair(await extrairDadosDeFoto(base64, tipo, mimeType))
    } catch (err) {
      setErro((err as Error).message || 'Erro ao analisar a foto. Tente novamente.')
      setFase('escolher')
    }
  }

  const trabalhando = fase !== 'escolher'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-cartao bg-superficie shadow-lg">
        {trabalhando ? (
          <TrabalhandoNaFoto tipo={tipo} fase={fase} preview={preview} segundos={segundos} />
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <h2 className="text-lg font-bold text-tinta">Deixa a IA preencher pra você</h2>
            <p className="text-sm text-tinta-3">
              Tire uma foto {ALVO[tipo].de} ou escolha uma da galeria. A gente lê os dados e você só confere.
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-botao bg-telhado px-4 py-3 text-sm font-bold text-creme transition hover:brightness-95"
            >
              <Camera size={18} />
              Tirar foto ou escolher arquivo
            </button>

            {erro && (
              <div className="rounded-botao bg-telha-alerta/10 p-3 text-sm text-telha-alerta">{erro}</div>
            )}

            <button onClick={onCancelar} className="text-sm font-semibold text-tinta-3 hover:text-tinta">
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
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Enquanto a IA trabalha: o usuário vê a foto que mandou, em que passo
 * está e — o mais importante — que ele ainda vai conferir antes de salvar.
 * ------------------------------------------------------------------ */

function TrabalhandoNaFoto({
  tipo,
  fase,
  preview,
  segundos,
}: {
  tipo: SeletorFotoProps['tipo']
  fase: Fase
  preview: string
  segundos: number
}) {
  const passos = [
    { id: 'preparar', rotulo: 'Preparando a imagem', apoio: 'ajustando tamanho e nitidez', icone: Loader2 },
    { id: 'ler', rotulo: `Lendo ${ALVO[tipo].nome} com IA`, apoio: 'achando fornecedor, valores e a conta do DRE', icone: Sparkles },
    { id: 'conferir', rotulo: 'Você confere e confirma', apoio: 'nada é salvo sem o seu ok', icone: ClipboardCheck },
  ] as const

  const ativo = fase === 'preparando' ? 0 : 1

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-center gap-4">
        {preview && (
          <img
            src={preview}
            alt=""
            className="h-16 w-16 shrink-0 rounded-botao object-cover ring-1 ring-[rgba(46,95,115,0.18)]"
          />
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-tinta">Lendo sua foto…</h2>
          <p className="text-sm text-tinta-3">Costuma levar uns 5 segundos.</p>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {passos.map((p, i) => {
          const feito = i < ativo
          const agora = i === ativo
          const Icone = p.icone
          return (
            <li key={p.id} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full transition',
                  feito ? 'bg-mata/15 text-mata' : agora ? 'bg-mar/15 text-mar' : 'bg-preenchimento text-tinta-4',
                )}
              >
                {feito ? <Check size={15} strokeWidth={3} /> : <Icone size={15} className={cn(agora && 'animate-spin')} />}
              </span>
              <span className="min-w-0">
                <span className={cn('block text-sm font-bold', agora || feito ? 'text-tinta' : 'text-tinta-4')}>
                  {p.rotulo}
                </span>
                <span className="block text-xs text-tinta-4">{p.apoio}</span>
              </span>
            </li>
          )
        })}
      </ol>

      <div className="h-1 w-full overflow-hidden rounded-full bg-preenchimento">
        <div className="h-full w-1/3 animate-[barra_1.4s_ease-in-out_infinite] rounded-full bg-mar" />
      </div>

      {segundos >= 12 && (
        <p className="text-xs text-tinta-4">
          Está demorando mais que o normal — foto muito grande ou internet lenta. Pode esperar mais um pouco.
        </p>
      )}
    </div>
  )
}
