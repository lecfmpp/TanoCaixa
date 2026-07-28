import { useRef, useState } from 'react'
import { Download, Upload, FileSpreadsheet, Check } from 'lucide-react'
import { CONFIGS_IMPORT, modeloCSV, type TipoImport } from '@/data/importar'
import { gerarCSV, baixarCSV, lerArquivo, parseCSVObjetos } from '@/lib/csv'
import { useImportar } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import { cn } from '@/lib/cn'

interface Props {
  tipo: TipoImport
  aoConcluir?: (count: number) => void
}

export function ImportarCSV({ tipo, aoConcluir }: Props) {
  const cfg = CONFIGS_IMPORT[tipo]
  const importar = useImportar()
  const { adicionarToast } = useUI()
  const inputRef = useRef<HTMLInputElement>(null)
  const [registros, setRegistros] = useState<Record<string, string>[]>([])
  const [nomeArquivo, setNomeArquivo] = useState('')

  function baixarModelo() {
    const { cabecalho, linhas } = modeloCSV(tipo)
    baixarCSV(cfg.nomeModelo, gerarCSV(cabecalho, linhas))
  }

  async function aoEscolher(file: File | undefined) {
    if (!file) return
    const texto = await lerArquivo(file)
    setRegistros(parseCSVObjetos(texto))
    setNomeArquivo(file.name)
  }

  async function confirmarImport() {
    const { count } = await importar.mutateAsync({ tipo, registros })
    adicionarToast({
      tipo: 'sucesso',
      titulo: 'Planilha importada',
      texto: `${count} ${cfg.titulo.toLowerCase()} entraram no sistema.`,
      rotuloAcao: 'Ver',
    })
    setRegistros([])
    setNomeArquivo('')
    aoConcluir?.(count)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-[15px] font-bold text-tinta">Importar {cfg.titulo.toLowerCase()} por planilha</h3>
        <p className="pretty mt-1 text-sm text-tinta-3">{cfg.descricao}</p>
      </div>

      {/* Passo 1: baixar o modelo */}
      <div className="flex items-center justify-between gap-3 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-3.5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-botao bg-mata/12 text-mata">
            <FileSpreadsheet size={18} />
          </span>
          <div>
            <div className="text-sm font-bold text-tinta">1. Baixe o modelo</div>
            <div className="text-xs text-tinta-4">Já vem com exemplos e as colunas certas</div>
          </div>
        </div>
        <button
          onClick={baixarModelo}
          className="flex shrink-0 items-center gap-1.5 rounded-botao bg-preenchimento px-3.5 py-2 text-sm font-bold text-tinta-2 transition hover:brightness-95"
        >
          <Download size={15} /> Baixar modelo
        </button>
      </div>

      {/* Passo 2: enviar o arquivo preenchido */}
      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => aoEscolher(e.target.files?.[0])}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-cartao border border-dashed border-mar/40 bg-mar/5 px-4 py-7 text-center transition hover:bg-mar/10"
        >
          <Upload size={22} className="text-mar" />
          <span className="text-sm font-bold text-mar">2. Escolher arquivo CSV preenchido</span>
          <span className="text-xs text-tinta-4">
            {nomeArquivo || 'Clique para selecionar a planilha do seu computador'}
          </span>
        </button>
      </div>

      {/* Preview + confirmar */}
      {registros.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-tinta-2">
            <Check size={16} className="text-mata" strokeWidth={3} />
            <span>
              <strong className="font-bold text-tinta">{registros.length}</strong> linhas lidas de{' '}
              <span className="font-semibold">{nomeArquivo}</span>. Confira antes de importar:
            </span>
          </div>
          <div className="overflow-x-auto rounded-cartao border border-divisoria">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                  {cfg.colunas.map((c) => (
                    <th key={c.chave} className="rotulo whitespace-nowrap px-3 py-2 text-tinta-4">
                      {c.rotulo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registros.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-divisoria last:border-0">
                    {cfg.colunas.map((c) => (
                      <td key={c.chave} className="whitespace-nowrap px-3 py-2 text-tinta-2">
                        {r[c.chave] || <span className="text-tinta-5">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {registros.length > 5 && (
            <p className="text-xs text-tinta-4">…e mais {registros.length - 5} linhas.</p>
          )}
          <button
            onClick={confirmarImport}
            disabled={importar.isPending}
            className={cn(
              'self-start rounded-botao bg-mar px-5 py-2.5 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50',
            )}
          >
            {importar.isPending ? 'Importando…' : `Importar ${registros.length} ${cfg.titulo.toLowerCase()}`}
          </button>
        </div>
      )}
    </div>
  )
}
