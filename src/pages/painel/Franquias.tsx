import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus, Send, Store, X } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useUI } from '@/ui/UIProvider'
import { useRede, useContextosDaRede, useCriarSolicitacao, useSolicitacoesDaRede, type LojaComContexto } from '@/data/hooks'
import { dreDoMes, mesAnterior, type DRE } from '@/data/derive'
import { OPCOES_SOLICITACAO, type TipoSolicitacao, type SolicitacaoDoc } from '@/data/solicitacoes'

const MES = '2026-07'

interface LojaMedida {
  loja: LojaComContexto['loja']
  dre: DRE
  anterior: DRE
  margem: number
  /** Variação do lucro líquido contra o mês passado, em %. */
  variacao: number | null
  pedidosAbertos: number
}

export function Franquias() {
  const rede = useRede()
  const { lojas, carregando } = useContextosDaRede()
  const pedidos = useSolicitacoesDaRede(rede.data?.lojas ?? [])
  const [pedindoPara, setPedindoPara] = useState<LojaMedida | null>(null)

  const medidas = useMemo<LojaMedida[]>(
    () =>
      lojas
        .map(({ loja, ctx }) => {
          const dre = dreDoMes(ctx, MES)
          const anterior = dreDoMes(ctx, mesAnterior(MES))
          const base = Math.abs(anterior.lucroLiquido)
          return {
            loja,
            dre,
            anterior,
            margem: dre.receitaBruta ? (dre.lucroLiquido / dre.receitaBruta) * 100 : 0,
            // Sem base no mês passado, "cresceu X%" não significa nada.
            variacao: anterior.receitaBruta && base > 0 ? ((dre.lucroLiquido - anterior.lucroLiquido) / base) * 100 : null,
            pedidosAbertos: (pedidos[loja.restauranteId] ?? []).filter((p) => p.status === 'aberta').length,
          }
        })
        .sort((a, b) => b.dre.receitaBruta - a.dre.receitaBruta),
    [lojas, pedidos],
  )

  if (rede.isLoading) return <p className="text-sm text-tinta-4">Carregando a rede…</p>
  if (!rede.data) {
    return (
      <div className="flex flex-col gap-4">
        <SectionHeader titulo="Franquias" subtitulo="Acompanhe as lojas da sua rede" />
        <Cartao>
          <p className="text-sm text-tinta-3">
            Você ainda não tem uma rede. Crie a sua em <strong className="font-bold text-tinta">Rede</strong> e as lojas
            aparecem aqui.
          </p>
        </Cartao>
      </div>
    )
  }

  const totalPedidos = medidas.reduce((s, m) => s + m.pedidosAbertos, 0)

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Franquias"
        subtitulo={`${rede.data.nome} · ${medidas.length} loja${medidas.length === 1 ? '' : 's'} · julho de 2026`}
      />
      <p className="-mt-2 text-sm text-tinta-4">
        Cada cartão é uma loja da rede, com o número do mês e a variação contra junho.
        {totalPedidos > 0 && ` ${totalPedidos} pedido${totalPedidos === 1 ? '' : 's'} aguardando resposta.`}
      </p>

      {carregando && <p className="text-sm text-tinta-4">Somando as lojas…</p>}

      <div className="grid grid-cols-1 gap-3.5 cel:grid-cols-2 tab:grid-cols-3">
        {medidas.map((m) => (
          <CartaoLoja key={m.loja.restauranteId} medida={m} aoPedir={() => setPedindoPara(m)} />
        ))}
      </div>

      {pedindoPara && <ModalPedido medida={pedindoPara} aoFechar={() => setPedindoPara(null)} />}
    </div>
  )
}

/* ------------------------------ Cartão ------------------------------- */

function CartaoLoja({ medida, aoPedir }: { medida: LojaMedida; aoPedir: () => void }) {
  const { loja, dre, margem, variacao, pedidosAbertos } = medida
  const p = (v: number) => (dre.receitaBruta ? (v / dre.receitaBruta) * 100 : 0)
  const positivo = dre.lucroLiquido >= 0

  return (
    <Cartao className="flex flex-col gap-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Store size={16} className="shrink-0 text-tinta-4" />
          <div className="min-w-0">
            <div className="truncate font-bold text-tinta">{loja.nome}</div>
            <div className="text-xs text-tinta-4">{loja.bairro}{loja.propria ? ' · própria' : ''}</div>
          </div>
        </div>
        {pedidosAbertos > 0 && (
          <span className="shrink-0 rounded-chip bg-telhado/15 px-2 py-0.5 text-[11px] font-bold text-telhado">
            {pedidosAbertos} pedido{pedidosAbertos === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div>
        <span className="rotulo text-tinta-4">Lucro líquido</span>
        <div className="flex flex-wrap items-baseline gap-2">
          <span
            className={cn('mono', positivo ? 'text-tinta' : 'text-telha-alerta')}
            style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {brlInteiro(dre.lucroLiquido)}
          </span>
          <Variacao valor={variacao} />
        </div>
        <span className="text-xs text-tinta-4">{margem.toFixed(1)}% de margem</span>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-divisoria pt-3">
        <Linha rotulo="Receita" valor={brl(dre.receitaBruta)} />
        <Linha rotulo="Despesas" valor={brl(dre.receitaBruta - dre.lucroLiquido)} />
        <Linha rotulo="CMV" valor={`${p(dre.cmv.total).toFixed(1)}%`} alerta={p(dre.cmv.total) > 32} />
        <Linha
          rotulo="Equipe"
          valor={`${p(dre.grupos.find((g) => g.grupo === 'pessoal')?.total ?? 0).toFixed(1)}%`}
          alerta={p(dre.grupos.find((g) => g.grupo === 'pessoal')?.total ?? 0) > 28}
        />
      </div>

      <Button variante="secundario" bloco onClick={aoPedir}>
        <Send size={15} />
        Pedir informação
      </Button>
    </Cartao>
  )
}

function Linha({ rotulo, valor, alerta }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-tinta-3">{rotulo}</span>
      <span className={cn('mono font-semibold', alerta ? 'text-telha-alerta' : 'text-tinta')}>{valor}</span>
    </div>
  )
}

function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) {
    return <span className="text-xs text-tinta-4">sem base em junho</span>
  }
  const subiu = valor >= 0
  const Icone = Math.abs(valor) < 0.5 ? Minus : subiu ? ArrowUpRight : ArrowDownRight
  return (
    <span className={cn('flex items-center gap-0.5 text-sm font-bold', subiu ? 'text-mata' : 'text-telha-alerta')}>
      <Icone size={15} strokeWidth={2.5} />
      {subiu ? '+' : ''}
      {valor.toFixed(1)}%
    </span>
  )
}

/* ------------------------------- Modal -------------------------------- */

function ModalPedido({ medida, aoFechar }: { medida: LojaMedida; aoFechar: () => void }) {
  const criar = useCriarSolicitacao()
  const { adicionarToast } = useUI()
  const [tipo, setTipo] = useState<TipoSolicitacao>('dre_mes')
  const [detalhe, setDetalhe] = useState('')

  const opcao = OPCOES_SOLICITACAO.find((o) => o.id === tipo)!

  async function enviar() {
    await criar.mutateAsync({ lojaId: medida.loja.restauranteId, tipo, detalhe })
    adicionarToast({
      tipo: 'sucesso',
      titulo: 'Pedido enviado',
      texto: `${medida.loja.nome} vai ver isso no painel dela.`,
    })
    aoFechar()
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-cartao bg-superficie p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-tinta">Pedir informação</h2>
            <p className="text-sm text-tinta-3">
              Para <strong className="font-bold text-tinta">{medida.loja.nome}</strong>. Chega no painel do dono da loja.
            </p>
          </div>
          <button onClick={aoFechar} className="grid h-8 w-8 shrink-0 place-items-center rounded-botao text-tinta-3 hover:bg-preenchimento">
            <X size={18} />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-tinta-4">O que você precisa</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoSolicitacao)}
            className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-fundo-app px-3.5 py-2.5 text-[15px] text-tinta outline-none focus:border-mar"
          >
            {OPCOES_SOLICITACAO.map((o) => (
              <option key={o.id} value={o.id}>{o.titulo}</option>
            ))}
          </select>
          {opcao.descricao && <span className="text-xs text-tinta-4">{opcao.descricao}</span>}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-tinta-4">Recado · opcional</span>
          <textarea
            rows={3}
            value={detalhe}
            onChange={(e) => setDetalhe(e.target.value)}
            placeholder={tipo === 'outro' ? 'Escreva o que você precisa da loja' : 'Algo a acrescentar ao pedido'}
            className="resize-none rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5 text-[15px] text-tinta outline-none placeholder:text-tinta-5 focus:border-mar"
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <button onClick={aoFechar} className="text-sm font-semibold text-tinta-3 hover:text-tinta">
            Cancelar
          </button>
          <Button
            variante="primario"
            onClick={enviar}
            disabled={criar.isPending || (tipo === 'outro' && !detalhe.trim())}
          >
            {criar.isPending ? 'Enviando…' : 'Enviar pedido'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export type { SolicitacaoDoc }
