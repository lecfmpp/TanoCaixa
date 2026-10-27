import { useMemo, useState, type ReactNode } from 'react'
import { brl } from '@/lib/format'
import { mensagemDeErro } from '@/lib/erros'
import { contasDoFluxo, type ContaDoFluxo } from '@/data/fluxo'
import { useDesfazerPagamento } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import type { DespesaDoc } from '@/data/types'
import { ModalPagamento } from './ModalPagamento'

/**
 * "Marcar como pago" dentro da própria tela (Despesas, Compras): o mesmo modal do check
 * (pergunta se teve juros) e o mesmo desfazer. A conta é a nota inteira quando o lançamento
 * veio de nota fiscal — quem paga o boleto paga a nota toda.
 */
export function useMarcarComoPago(despesas: DespesaDoc[]): {
  /** A conta (nota ou lançamento avulso) a que o lançamento pertence. */
  contaDe: (lancamentoId: string) => ContaDoFluxo | undefined
  /** Abre o modal de pagamento, ou pergunta se quer voltar pra "a pagar". */
  alternar: (conta: ContaDoFluxo) => void
  /** Renderize uma vez na tela. */
  modal: ReactNode
} {
  const { confirmar, adicionarToast } = useUI()
  const desfazer = useDesfazerPagamento()
  const [pagando, setPagando] = useState<ContaDoFluxo | null>(null)
  const porLancamento = useMemo(() => {
    const m = new Map<string, ContaDoFluxo>()
    for (const c of contasDoFluxo(despesas)) for (const l of c.lancamentos) m.set(l.id, c)
    return m
  }, [despesas])

  function alternar(c: ContaDoFluxo) {
    if (!c.pago) return setPagando(c)
    confirmar({
      gravidade: 'atencao',
      titulo: 'Desmarcar o pagamento?',
      texto: `${c.fornecedor} volta pra “a pagar”.${c.juros > 0 ? ' O lançamento de juros some do DRE junto.' : ''}`,
      resumo: [
        { rot: 'Valor', val: brl(c.valor) },
        ...(c.juros > 0 ? [{ rot: 'Juros/multa', val: brl(c.juros) }] : []),
      ],
      rotuloConfirmar: 'Voltar pra a pagar',
      onConfirmar: async () => {
        try {
          await desfazer.mutateAsync({ lancamentos: c.lancamentos })
        } catch (e) {
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra desmarcar', texto: mensagemDeErro(e, 'Tente de novo.') })
        }
      },
    })
  }

  return {
    contaDe: (id) => porLancamento.get(id),
    alternar,
    modal: pagando ? <ModalPagamento conta={pagando} aoFechar={() => setPagando(null)} /> : null,
  }
}
