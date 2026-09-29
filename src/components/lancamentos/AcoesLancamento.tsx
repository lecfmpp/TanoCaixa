import { useEffect, useRef, useState } from 'react'
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useUI } from '@/ui/UIProvider'
import { useAuth } from '@/auth/AuthContext'
import {
  useDuplicarDespesa,
  useDuplicarNota,
  useRemoverDespesa,
  useRemoverNota,
  useRestaurarDespesa,
  useRestaurarNota,
} from '@/data/hooks'
import { CONTA } from '@/data/planoContas'
import { brl } from '@/lib/format'
import { mensagemDeErro } from '@/lib/erros'
import { cn } from '@/lib/cn'
import type { Nota } from '@/data/compras'
import type { DespesaDoc } from '@/data/types'

/**
 * O que a linha da tabela está mostrando. Conta da casa é um documento só;
 * compra de mercadoria é a nota inteira — corrigir ou apagar meia nota deixa
 * mercadoria no estoque sem ninguém ter pagado por ela.
 */
export type AlvoLancamento =
  | { tipo: 'conta'; despesa: DespesaDoc }
  | { tipo: 'nota'; nota: Nota }

const dataBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

/**
 * Editar, duplicar e apagar um lançamento — sempre com modal de confirmação
 * antes de mexer no que já está gravado.
 *
 * As três ações passam pelas mutations que cuidam do sistema inteiro: a conta
 * da casa mexe só no financeiro; a nota fiscal leva junto as entradas de
 * estoque e o custo dos produtos.
 */
export function AcoesLancamento({ alvo, className }: { alvo: AlvoLancamento; className?: string }) {
  const { confirmar, abrirGaveta, adicionarToast } = useUI()
  const { permissoes } = useAuth()
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  const duplicarDespesa = useDuplicarDespesa()
  const duplicarNota = useDuplicarNota()
  const removerDespesa = useRemoverDespesa()
  const removerNota = useRemoverNota()
  const restaurarDespesa = useRestaurarDespesa()
  const restaurarNota = useRestaurarNota()

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])

  // Quem não pode lançar também não corrige nem apaga o lançamento de ninguém.
  if (!permissoes?.lancaDespesa) return null

  const ehNota = alvo.tipo === 'nota'
  const nome = ehNota ? alvo.nota.fornecedor : alvo.despesa.fornecedor
  const valor = ehNota ? alvo.nota.valorTotal : alvo.despesa.valorTotal
  const data = ehNota ? alvo.nota.data : alvo.despesa.dataCompetencia

  /** As mesmas linhas nos três modais: o dono confere o que está mexendo. */
  function resumo(): { rot: string; val: string }[] {
    if (alvo.tipo === 'nota') {
      const n = alvo.nota
      return [
        { rot: 'Fornecedor', val: n.fornecedor || '—' },
        { rot: 'Data da nota', val: dataBR(n.data) },
        { rot: 'Itens', val: `${n.itens.length}` },
        { rot: 'Lançamentos no DRE', val: `${n.lancamentos.length}` },
        { rot: 'Total da nota', val: brl(n.valorTotal) },
      ]
    }
    const d = alvo.despesa
    return [
      { rot: 'Fornecedor', val: d.fornecedor || '—' },
      { rot: 'Conta do DRE', val: CONTA[d.categoria]?.nome ?? d.categoria },
      { rot: 'Competência', val: dataBR(d.dataCompetencia) },
      { rot: 'Valor', val: brl(d.valorTotal) },
    ]
  }

  function avisarErro(e: unknown, padrao: string) {
    console.error('lançamento:', e)
    adicionarToast({ tipo: 'erro', titulo: 'Não deu pra fazer isso', texto: mensagemDeErro(e, padrao) })
  }

  /** Corrigir abre a gaveta preenchida; a confirmação é na hora de gravar. */
  function editar() {
    setAberto(false)
    if (alvo.tipo === 'nota') abrirGaveta('compra', { alvo: 'nota', nota: alvo.nota })
    else abrirGaveta('despesa', { alvo: 'despesa', despesa: alvo.despesa })
  }

  function duplicar() {
    setAberto(false)
    confirmar({
      gravidade: 'neutro',
      titulo: ehNota ? 'Duplicar esta nota?' : 'Duplicar este lançamento?',
      texto: ehNota
        ? 'Vira uma nota nova, com a mesma data e os mesmos itens. A mercadoria entra no estoque de novo e o valor soma no caixa e no CMV — use quando a compra realmente se repetiu.'
        : 'Vira um lançamento novo, com os mesmos valores e a mesma data. Soma no caixa e no DRE — depois é só corrigir o que mudou.',
      rotuloConfirmar: 'Duplicar',
      resumo: resumo(),
      onConfirmar: () => {
        void (async () => {
          try {
            if (alvo.tipo === 'nota') {
              const n = alvo.nota
              const copia = await duplicarNota.mutateAsync({
                fornecedor: n.fornecedor,
                data: n.data,
                formaPagamento: n.formaPagamento,
                status: n.status,
                observacao: n.lancamentos[0]?.observacao,
                itens: n.itens.map((i) => ({
                  produtoId: i.produtoId,
                  quantidade: i.quantidade,
                  precoUnitario: i.precoUnitario,
                })),
              })
              adicionarToast({
                tipo: 'sucesso',
                titulo: 'Nota duplicada',
                texto: `${brl(copia.valorTotal)} em ${copia.itens} ${copia.itens === 1 ? 'item' : 'itens'} — estoque e CMV atualizados.`,
                rotuloAcao: 'Desfazer',
                onAcao: () => {
                  removerNota.mutate({ notaId: copia.notaId, fornecedor: n.fornecedor })
                  adicionarToast({ tipo: 'sistema', titulo: 'Desfeito', texto: 'A cópia da nota foi apagada.' })
                },
              })
              return
            }
            const copia = await duplicarDespesa.mutateAsync({ origem: alvo.despesa })
            adicionarToast({
              tipo: 'sucesso',
              titulo: 'Lançamento duplicado',
              texto: `${brl(copia.valorTotal)} em ${CONTA[copia.categoria]?.nome ?? copia.categoria}.`,
              rotuloAcao: 'Desfazer',
              onAcao: () => {
                removerDespesa.mutate(copia)
                adicionarToast({ tipo: 'sistema', titulo: 'Desfeito', texto: 'A cópia foi apagada.' })
              },
            })
          } catch (e) {
            avisarErro(e, 'A cópia não entrou no banco. Tente de novo.')
          }
        })()
      },
    })
  }

  function excluir() {
    setAberto(false)
    confirmar({
      gravidade: 'destrutivo',
      titulo: ehNota ? 'Apagar esta nota?' : 'Apagar este lançamento?',
      texto: ehNota
        ? 'Some tudo que a nota gerou: os lançamentos no DRE, a entrada de estoque de cada item e o custo dos produtos volta a sair da compra anterior. Dá pra desfazer no aviso que aparece em seguida.'
        : 'O valor sai do caixa, do DRE e do Plano do mês. Dá pra desfazer no aviso que aparece em seguida.',
      rotuloConfirmar: 'Apagar',
      resumo: resumo(),
      onConfirmar: () => {
        void (async () => {
          try {
            if (alvo.tipo === 'nota') {
              const n = alvo.nota
              await removerNota.mutateAsync({ notaId: n.id, fornecedor: n.fornecedor })
              adicionarToast({
                tipo: 'sucesso',
                titulo: 'Nota apagada',
                texto: `${brl(n.valorTotal)} de ${n.fornecedor} saíram do caixa, do estoque e do CMV.`,
                rotuloAcao: 'Desfazer',
                onAcao: () => {
                  restaurarNota.mutate(n)
                  adicionarToast({ tipo: 'sistema', titulo: 'Desfeito', texto: 'A nota voltou, com estoque e custos.' })
                },
              })
              return
            }
            const d = alvo.despesa
            await removerDespesa.mutateAsync(d)
            adicionarToast({
              tipo: 'sucesso',
              titulo: 'Lançamento apagado',
              texto: `${brl(d.valorTotal)} de ${d.fornecedor} saíram do caixa e do DRE.`,
              rotuloAcao: 'Desfazer',
              onAcao: () => {
                restaurarDespesa.mutate(d)
                adicionarToast({ tipo: 'sistema', titulo: 'Desfeito', texto: 'O lançamento voltou.' })
              },
            })
          } catch (e) {
            avisarErro(e, 'O lançamento continua no banco. Tente de novo.')
          }
        })()
      },
    })
  }

  return (
    <div ref={caixa} className={cn('relative', className)}>
      <button
        onClick={() => setAberto((a) => !a)}
        aria-label={`Ações de ${nome} · ${brl(valor)} · ${dataBR(data)}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        className={cn(
          'grid h-8 w-8 place-items-center rounded-botao text-tinta-4 transition hover:bg-preenchimento hover:text-tinta',
          aberto && 'bg-preenchimento text-tinta',
        )}
      >
        <MoreHorizontal size={16} />
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-30 w-52 overflow-hidden rounded-cartao border border-divisoria bg-superficie py-1 shadow-modal"
        >
          <Item icone={<Pencil size={15} />} rotulo={ehNota ? 'Corrigir a nota' : 'Corrigir lançamento'} aoClicar={editar} />
          <Item icone={<Copy size={15} />} rotulo={ehNota ? 'Duplicar a nota' : 'Duplicar lançamento'} aoClicar={duplicar} />
          <div className="my-1 h-px bg-divisoria" />
          <Item icone={<Trash2 size={15} />} rotulo={ehNota ? 'Apagar a nota' : 'Apagar lançamento'} aoClicar={excluir} perigo />
        </div>
      )}
    </div>
  )
}

function Item({
  icone,
  rotulo,
  aoClicar,
  perigo,
}: {
  icone: React.ReactNode
  rotulo: string
  aoClicar: () => void
  perigo?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={aoClicar}
      className={cn(
        'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-semibold transition',
        perigo ? 'text-telha-alerta hover:bg-telha-alerta/10' : 'text-tinta-2 hover:bg-preenchimento',
      )}
    >
      {icone}
      {rotulo}
    </button>
  )
}
