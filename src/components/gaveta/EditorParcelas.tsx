import { Plus, X, Check } from 'lucide-react'
import { Campo } from '@/components/ui/Campo'
import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'
import { MAX_PARCELAS, dividirIgual, somar } from '@/data/parcelas'
import type { DespesaDoc } from '@/data/types'

/** Parcela como o formulário guarda: valor em texto ("1.200,50"), como os outros campos. */
export interface ParcelaForm {
  vencimento: string
  valor: string
  status?: DespesaDoc['status']
  pagoEm?: string
  pagoPorNome?: string
}

/** Mesmo jeito de ler valor do resto da gaveta: "1.200,50" → 1200.5. */
export const numeroDoCampo = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0)
export const valorDoCampo = (v: number) => v.toFixed(2).replace('.', ',')

/** Soma `n` dias a um 'YYYY-MM-DD' (meio-dia local, sem sofrer com fuso). */
function somarDias(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Parcelas iniciais: o total dividido igual, vencendo de 30 em 30 dias. */
export function parcelasIniciais(total: number, n: number, base: string, primeiro?: string): ParcelaForm[] {
  const valores = dividirIgual(total, n)
  const inicio = primeiro || somarDias(base, 30)
  return valores.map((v, i) => ({ vencimento: i === 0 ? inicio : somarDias(inicio, 30 * i), valor: valorDoCampo(v) }))
}

/** Situação da soma das parcelas contra o total da nota. */
export function conferirParcelas(parcelas: ParcelaForm[], total: number) {
  const soma = somar(parcelas.map((p) => numeroDoCampo(p.valor)))
  const diferenca = Math.round((total - soma) * 100) / 100
  const completas = parcelas.length >= 2 && parcelas.every((p) => !!p.vencimento && numeroDoCampo(p.valor) > 0)
  return { soma, diferenca, ok: completas && diferenca === 0 }
}

/**
 * Boleto com vários vencimentos: cada linha é uma parcela, com a data e o
 * valor que estão no boleto. A soma tem que bater com o total da nota — o
 * editor mostra quanto falta ou sobra. Parcela já paga (correção da nota)
 * fica travada.
 */
export function EditorParcelas({
  parcelas,
  aoMudar,
  total,
  base,
}: {
  parcelas: ParcelaForm[]
  aoMudar: (p: ParcelaForm[]) => void
  total: number
  base: string
}) {
  const { soma, diferenca, ok } = conferirParcelas(parcelas, total)
  const abertas = parcelas.filter((p) => p.status !== 'pago')

  function trocar(i: number, campo: 'vencimento' | 'valor', v: string) {
    aoMudar(parcelas.map((p, j) => (j === i ? { ...p, [campo]: v } : p)))
  }

  function adicionar() {
    if (parcelas.length >= MAX_PARCELAS) return
    const ultima = parcelas[parcelas.length - 1]?.vencimento || base
    aoMudar([...parcelas, { vencimento: somarDias(ultima, 30), valor: diferenca > 0 ? valorDoCampo(diferenca) : '' }])
  }

  function remover(i: number) {
    if (parcelas.length <= 2) return
    aoMudar(parcelas.filter((_, j) => j !== i))
  }

  /** Divide o que falta pagar igualmente entre as parcelas em aberto. */
  function dividirIgualmente() {
    const pagas = somar(parcelas.filter((p) => p.status === 'pago').map((p) => numeroDoCampo(p.valor)))
    const valores = dividirIgual(Math.max(0, total - pagas), abertas.length)
    let k = 0
    aoMudar(parcelas.map((p) => (p.status === 'pago' ? p : { ...p, valor: valorDoCampo(valores[k++] ?? 0) })))
  }

  return (
    <div className="flex flex-col gap-3 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-fundo-app p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rotulo text-tinta-4">Parcelas do boleto</span>
        <button
          type="button"
          onClick={dividirIgualmente}
          disabled={!abertas.length || total <= 0}
          className="text-xs font-bold text-mar hover:underline disabled:opacity-40"
        >
          Dividir igual
        </button>
      </div>

      <ol className="flex flex-col gap-2.5">
        {parcelas.map((p, i) => {
          const paga = p.status === 'pago'
          return (
            <li key={i} className="flex items-end gap-2">
              <span className="mb-2.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mar/10 text-xs font-bold text-mar">
                {i + 1}
              </span>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <Campo
                  rotulo="Vencimento"
                  type="date"
                  value={p.vencimento}
                  disabled={paga}
                  onChange={(e) => trocar(i, 'vencimento', e.target.value)}
                />
                <Campo
                  rotulo="Valor"
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  value={p.valor}
                  disabled={paga}
                  onChange={(e) => trocar(i, 'valor', e.target.value)}
                />
              </div>
              {paga ? (
                <span className="mb-2.5 inline-flex shrink-0 items-center gap-1 rounded-chip bg-mata/12 px-2 py-0.5 text-[11px] font-bold text-mata">
                  <Check size={11} /> paga
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => remover(i)}
                  disabled={parcelas.length <= 2}
                  aria-label={`Tirar a parcela ${i + 1}`}
                  className="mb-2 grid h-8 w-8 shrink-0 place-items-center rounded-botao text-tinta-4 transition hover:bg-preenchimento hover:text-telha-alerta disabled:opacity-30"
                >
                  <X size={16} />
                </button>
              )}
            </li>
          )
        })}
      </ol>

      {parcelas.length < MAX_PARCELAS && (
        <button
          type="button"
          onClick={adicionar}
          className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-mar hover:underline"
        >
          <Plus size={15} /> Adicionar parcela
        </button>
      )}

      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 rounded-campo px-3 py-2 text-sm',
          ok ? 'bg-mata/10 text-mata' : 'bg-telha-alerta/10 text-telha-alerta',
        )}
      >
        <span>
          {parcelas.length} parcelas somam <b className="mono">{brl(soma)}</b> de <b className="mono">{brl(total)}</b>
        </span>
        {!ok && diferenca !== 0 && (
          <span className="font-bold">{diferenca > 0 ? `faltam ${brl(diferenca)}` : `sobram ${brl(-diferenca)}`}</span>
        )}
        {ok && <span className="font-bold">fecha com a nota</span>}
      </div>
    </div>
  )
}
