import { Fragment, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Cartao } from '@/components/ui/Cartao'
import { Chip } from '@/components/ui/Chip'
import { Campo } from '@/components/ui/Campo'
import { CancelarPedido } from '@/components/pdv/CancelarPedido'
import { brl, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { agora, diaDeHoje } from '@/data/derive'
import { diaAtras, usePedidosPdv } from '@/data/pdvHooks'
import { ROTULO_FORMA, ROTULO_STATUS, ROTULO_TIPO, ehVenda } from '@/data/pdv'
import type { PedidoPdvDoc, StatusPedido, TipoPedido } from '@/data/types'

const COR_STATUS: Record<StatusPedido, string> = {
  em_preparo: 'bg-sol/25 text-insight-rotulo',
  pronto: 'bg-mata/12 text-mata',
  em_entrega: 'bg-mar/10 text-mar',
  concluido: 'bg-preenchimento text-tinta-3',
  cancelado: 'bg-telha-alerta/12 text-telha-alerta',
}

export function Historico() {
  const [de, setDe] = useState(diaAtras(6))
  const [ate, setAte] = useState(diaDeHoje())
  const [tipo, setTipo] = useState<TipoPedido | 'todos'>('todos')
  const [status, setStatus] = useState<StatusPedido | 'todos'>('todos')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [cancelando, setCancelando] = useState<PedidoPdvDoc | null>(null)
  const pedidosQ = usePedidosPdv(de)

  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return (pedidosQ.data ?? [])
      .filter((p) => p.dia <= ate)
      .filter((p) => (tipo === 'todos' ? true : p.tipo === tipo))
      .filter((p) => (status === 'todos' ? true : p.status === status))
      .filter((p) => (b ? `#${p.numero} ${p.numero} ${p.cliente ?? ''} ${p.itens.map((i) => i.nome).join(' ')}`.toLowerCase().includes(b) : true))
  }, [pedidosQ.data, ate, tipo, status, busca])

  const vendas = lista.filter(ehVenda)
  const faturamento = vendas.reduce((s, p) => s + p.total, 0)
  const custo = vendas.reduce((s, p) => s + p.custo, 0)

  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <Mini rotulo="Pedidos" valor={String(vendas.length)} apoio={`${lista.length - vendas.length} cancelados`} />
        <Mini rotulo="Faturamento" valor={brl(faturamento)} apoio="sem cancelados" />
        <Mini rotulo="Ticket médio" valor={brl(vendas.length ? faturamento / vendas.length : 0)} apoio="por pedido" />
        <Mini rotulo="CMV" valor={faturamento > 0 && custo > 0 ? `${((custo / faturamento) * 100).toFixed(1).replace('.', ',')}%` : '—'} apoio={`custo ${brl(custo)}`} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3 cel:max-w-md">
          <Campo rotulo="De" type="date" value={de} max={ate} onChange={(e) => e.target.value && setDe(e.target.value)} />
          <Campo rotulo="Até" type="date" value={ate} min={de} max={diaDeHoje()} onChange={(e) => e.target.value && setAte(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5">
          <Search size={16} className="text-tinta-4" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por número, cliente ou prato…" className="w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-5" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip rotulo="Todos os tipos" selecionado={tipo === 'todos'} aoClicar={() => setTipo('todos')} />
          {(Object.keys(ROTULO_TIPO) as TipoPedido[]).map((t) => <Chip key={t} rotulo={ROTULO_TIPO[t]} selecionado={tipo === t} aoClicar={() => setTipo(t)} />)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip rotulo="Todos os status" selecionado={status === 'todos'} aoClicar={() => setStatus('todos')} />
          {(Object.keys(ROTULO_STATUS) as StatusPedido[]).map((s) => <Chip key={s} rotulo={ROTULO_STATUS[s]} selecionado={status === s} aoClicar={() => setStatus(s)} />)}
        </div>
      </div>

      <Cartao className="overflow-hidden p-0">
        {lista.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-tinta-4">Nenhum pedido nesse período.</p>
        ) : (
          <ul>
            {lista.map((p) => {
              const expandido = aberto === p.id
              return (
                <Fragment key={p.id}>
                  <li>
                    <button onClick={() => setAberto(expandido ? null : p.id)} className="flex w-full items-center gap-3 border-b border-divisoria px-5 py-3 text-left hover:bg-preenchimento/30">
                      <span className="mono w-12 shrink-0 font-bold text-tinta">#{p.numero}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-tinta">{p.cliente || ROTULO_TIPO[p.tipo]}</span>
                        <span className="block truncate text-xs text-tinta-4">{quando(new Date(p.criadoEm), agora())} · {p.itens.reduce((s, i) => s + i.quantidade, 0)} itens · {p.criadoPorNome}</span>
                      </span>
                      <span className={cn('hidden rounded-chip px-2 py-0.5 text-xs font-bold cel:inline', COR_STATUS[p.status])}>{ROTULO_STATUS[p.status]}</span>
                      <span className={cn('mono w-24 shrink-0 text-right font-bold', p.status === 'cancelado' ? 'text-tinta-4 line-through' : 'text-tinta')}>{brl(p.total)}</span>
                    </button>
                  </li>
                  {expandido && (
                    <li className="border-b border-divisoria bg-preenchimento/30 px-5 py-4 text-sm">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={cn('rounded-chip px-2 py-0.5 text-xs font-bold', COR_STATUS[p.status])}>{ROTULO_STATUS[p.status]}</span>
                        <span className="text-xs text-tinta-4">{ROTULO_TIPO[p.tipo]}{p.endereco ? ` · ${p.endereco}` : ''}{p.telefone ? ` · ${p.telefone}` : ''}</span>
                      </div>
                      {p.itens.map((i, idx) => (
                        <div key={idx} className="flex items-start justify-between border-b border-divisoria py-1.5 last:border-0">
                          <span className="text-tinta-2"><span className="mono font-bold text-tinta">{i.quantidade}×</span> {i.nome}{i.obs && <span className="block pl-6 text-xs font-semibold text-telha-alerta">↳ {i.obs}</span>}</span>
                          <span className="mono font-semibold text-tinta">{brl(i.quantidade * i.precoUnitario)}</span>
                        </div>
                      ))}
                      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-tinta-3 cel:max-w-sm">
                        <span>Subtotal</span><span className="mono text-right">{brl(p.subtotal)}</span>
                        {p.desconto > 0 && <><span>Desconto</span><span className="mono text-right">− {brl(p.desconto)}</span></>}
                        {p.taxaEntrega > 0 && <><span>Entrega</span><span className="mono text-right">{brl(p.taxaEntrega)}</span></>}
                        <span className="font-bold text-tinta">Total</span><span className="mono text-right font-bold text-tinta">{brl(p.total)}</span>
                        <span>Pagamento</span><span className="text-right">{p.pagamentos.map((g) => `${ROTULO_FORMA[g.forma]} ${brl(g.valor)}`).join(' + ')}</span>
                        {p.troco > 0 && <><span>Troco</span><span className="mono text-right">{brl(p.troco)}</span></>}
                        <span>Custo (ficha)</span><span className="mono text-right">{brl(p.custo)}</span>
                      </div>
                      {p.status === 'cancelado' && (
                        <p className="mt-3 text-xs font-semibold text-telha-alerta">Cancelado por {p.canceladoPorNome}{p.canceladoEm ? `, ${quando(new Date(p.canceladoEm), agora())}` : ''} — {p.motivoCancelamento}</p>
                      )}
                      {p.status !== 'cancelado' && (
                        <button onClick={() => setCancelando(p)} className="mt-3 rounded-botao border border-telha-alerta/30 px-3 py-1.5 text-xs font-bold text-telha-alerta hover:bg-telha-alerta/8">Cancelar pedido</button>
                      )}
                    </li>
                  )}
                </Fragment>
              )
            })}
          </ul>
        )}
      </Cartao>
      {cancelando && <CancelarPedido pedido={cancelando} aoFechar={() => setCancelando(null)} />}
    </>
  )
}

function Mini({ rotulo, valor, apoio }: { rotulo: string; valor: string; apoio: string }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span className="mono truncate text-tinta" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{valor}</span>
      <span className="truncate text-xs text-tinta-4">{apoio}</span>
    </Cartao>
  )
}
