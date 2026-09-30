import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { Campo } from '@/components/ui/Campo'
import { Chip } from '@/components/ui/Chip'
import { useUI } from '@/ui/UIProvider'
import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'
import { mensagemDeErro } from '@/lib/erros'
import { usePratos, useProdutos } from '@/data/hooks'
import { useCaixasPdv, useCriarPedido } from '@/data/pdvHooks'
import { AbrirCaixa } from '@/components/pdv/AbrirCaixa'
import { FORMAS, TIPOS, arred, totaisDoPedido } from '@/data/pdv'
import { custoDoPrato } from '@/data/cardapio'
import type { FormaPagamentoPdv, ItemPedido, TipoPedido } from '@/data/types'

const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0)

/** Tela de venda: cardápio à esquerda, pedido à direita (no celular, o pedido abre por baixo). */
export function NovoPedido() {
  const { adicionarToast } = useUI()
  const pratosQ = usePratos()
  const produtosQ = useProdutos()
  const pratos = useMemo(() => pratosQ.data ?? [], [pratosQ.data])
  const produtos = useMemo(() => produtosQ.data ?? [], [produtosQ.data])
  const caixas = useCaixasPdv()
  const caixa = caixas.data?.find((c) => c.status === 'aberto')
  const criar = useCriarPedido()

  const [tipo, setTipo] = useState<TipoPedido>('balcao')
  const [cliente, setCliente] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState('')
  const [taxa, setTaxa] = useState('')
  const [desconto, setDesconto] = useState('')
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [pagamentos, setPagamentos] = useState<{ forma: FormaPagamentoPdv; valor: string }[]>([])
  const [recebido, setRecebido] = useState('')
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)

  const canal = tipo === 'entrega' ? 'delivery' : 'presencial'
  const vendaveis = useMemo(() => pratos.filter((p) => p.ativo && p.canais[canal]), [pratos, canal])
  const categorias = useMemo(() => [...new Set(vendaveis.map((p) => p.categoria))], [vendaveis])
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return vendaveis
      .filter((p) => (categoria === 'todas' ? true : p.categoria === categoria))
      .filter((p) => (b ? `${p.nome} ${p.codigo ?? ''}`.toLowerCase().includes(b) : true))
      .sort((a, b2) => a.nome.localeCompare(b2.nome, 'pt-BR'))
  }, [vendaveis, categoria, busca])

  const taxaN = tipo === 'entrega' ? num(taxa) : 0
  const { subtotal, desconto: descontoN, total } = totaisDoPedido(itens, num(desconto), taxaN)
  const quantidadeTotal = itens.reduce((s, i) => s + i.quantidade, 0)
  const pago = arred(pagamentos.reduce((s, p) => s + num(p.valor), 0))
  const dinheiroPago = pagamentos.filter((p) => p.forma === 'dinheiro').reduce((s, p) => s + num(p.valor), 0)
  const troco = arred(Math.max(0, pago - total))
  const falta = arred(Math.max(0, total - pago))
  const pagamentoOk = itens.length > 0 && total > 0 && pago + 0.001 >= total && (troco === 0 || troco <= dinheiroPago + 0.001)
  const entregaOk = tipo !== 'entrega' || (cliente.trim().length > 0 && endereco.trim().length > 0)
  const podeFinalizar = pagamentoOk && entregaOk && !criar.isPending

  function adicionar(pratoId: string) {
    const p = pratos.find((x) => x.id === pratoId)
    if (!p) return
    setItens((is) => {
      const i = is.findIndex((x) => x.pratoId === pratoId)
      if (i >= 0) return is.map((x, j) => (j === i ? { ...x, quantidade: x.quantidade + 1 } : x))
      return [...is, { pratoId, nome: p.nome, ...(p.codigo ? { codigo: p.codigo } : {}), quantidade: 1, precoUnitario: p.preco }]
    })
    setPagamentos([])
  }
  const mudarQtd = (pratoId: string, d: number) => {
    setItens((is) => is.map((x) => (x.pratoId === pratoId ? { ...x, quantidade: x.quantidade + d } : x)).filter((x) => x.quantidade > 0))
    setPagamentos([])
  }
  const remover = (pratoId: string) => {
    setItens((is) => is.filter((x) => x.pratoId !== pratoId))
    setPagamentos([])
  }
  const observar = (pratoId: string, obs: string) => setItens((is) => is.map((x) => (x.pratoId === pratoId ? { ...x, obs } : x)))

  /** Um toque: paga tudo naquela forma. Dinheiro pergunta quanto o cliente deu, pra calcular o troco. */
  function pagarTudo(forma: FormaPagamentoPdv) {
    setPagamentos([{ forma, valor: String(total).replace('.', ',') }])
    setRecebido('')
  }
  function receberDinheiro(v: string) {
    setRecebido(v)
    const r = num(v)
    setPagamentos([{ forma: 'dinheiro', valor: String(r > total ? r : total).replace('.', ',') }])
  }
  const dividir = () => setPagamentos((ps) => [...ps, { forma: 'pix', valor: falta > 0 ? String(falta).replace('.', ',') : '' }])

  function zerar() {
    setItens([])
    setPagamentos([])
    setRecebido('')
    setCliente('')
    setTelefone('')
    setEndereco('')
    setTaxa('')
    setDesconto('')
    setCarrinhoAberto(false)
  }

  async function finalizar() {
    if (!caixa) return
    try {
      const pedido = await criar.mutateAsync({
        caixa,
        tipo,
        cliente,
        telefone,
        endereco,
        itens,
        desconto: num(desconto),
        taxaEntrega: taxaN,
        pagamentos: pagamentos.map((p) => ({ forma: p.forma, valor: num(p.valor) })),
        pratos,
        produtos,
      })
      adicionarToast({
        tipo: 'sucesso',
        titulo: `Pedido #${pedido.numero} lançado`,
        texto: `${brl(pedido.total)}${pedido.troco > 0 ? ` · troco ${brl(pedido.troco)}` : ''} · foi pra cozinha e baixou o estoque.`,
      })
      zerar()
    } catch (e) {
      console.error('pedido:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra lançar o pedido', texto: mensagemDeErro(e, 'O pedido não foi salvo. Tente de novo.') })
    }
  }

  if (caixas.isLoading) return null
  if (!caixa) return <AbrirCaixa />

  const painel = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TIPOS.map((t) => (
          <Chip key={t.id} rotulo={t.rotulo} selecionado={tipo === t.id} aoClicar={() => { setTipo(t.id); setItens([]); setPagamentos([]); setCategoria('todas') }} />
        ))}
      </div>

      {tipo === 'entrega' ? (
        <div className="grid grid-cols-1 gap-3 cel:grid-cols-2">
          <Campo rotulo="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <Campo rotulo="Telefone · opcional" inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          <div className="cel:col-span-2"><Campo rotulo="Endereço da entrega" value={endereco} onChange={(e) => setEndereco(e.target.value)} /></div>
        </div>
      ) : (
        <Campo rotulo="Nome do cliente · opcional" placeholder="Pra chamar quando ficar pronto" value={cliente} onChange={(e) => setCliente(e.target.value)} />
      )}

      {itens.length === 0 ? (
        <p className="rounded-cartao bg-preenchimento/60 p-4 text-center text-sm text-tinta-3">Toque nos pratos pra montar o pedido.</p>
      ) : (
        <ul className="flex flex-col">
          {itens.map((i) => (
            <li key={i.pratoId} className="flex flex-col gap-2 border-b border-divisoria py-3 first:pt-0 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold leading-snug text-tinta">{i.nome}</div>
                  <div className="mono text-xs text-tinta-4">{brl(i.precoUnitario)} cada</div>
                </div>
                <div className="mono shrink-0 font-bold text-tinta">{brl(i.quantidade * i.precoUnitario)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => mudarQtd(i.pratoId, -1)} aria-label={`Menos ${i.nome}`} className="grid h-10 w-10 place-items-center rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2"><Minus size={16} /></button>
                <span className="mono w-8 text-center text-[16px] font-bold text-tinta">{i.quantidade}</span>
                <button onClick={() => mudarQtd(i.pratoId, 1)} aria-label={`Mais ${i.nome}`} className="grid h-10 w-10 place-items-center rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2"><Plus size={16} /></button>
                <input
                  value={i.obs ?? ''}
                  onChange={(e) => observar(i.pratoId, e.target.value)}
                  placeholder="Obs.: sem cebola…"
                  className="min-w-0 flex-1 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3 py-2 text-sm text-tinta outline-none placeholder:text-tinta-5 focus:border-mar"
                />
                <button onClick={() => remover(i.pratoId)} aria-label={`Tirar ${i.nome}`} className="grid h-10 w-10 place-items-center rounded-botao text-tinta-4 hover:bg-preenchimento hover:text-telha-alerta"><Trash2 size={16} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Desconto · R$" inputMode="decimal" placeholder="0,00" value={desconto} onChange={(e) => { setDesconto(e.target.value); setPagamentos([]) }} />
        {tipo === 'entrega' && <Campo rotulo="Taxa de entrega · R$" inputMode="decimal" placeholder="0,00" value={taxa} onChange={(e) => { setTaxa(e.target.value); setPagamentos([]) }} />}
      </div>

      <div className="flex flex-col gap-1 rounded-cartao bg-preenchimento/60 p-4 text-sm">
        <Linha rot="Subtotal" val={brl(subtotal)} />
        {descontoN > 0 && <Linha rot="Desconto" val={`− ${brl(descontoN)}`} />}
        {taxaN > 0 && <Linha rot="Entrega" val={brl(taxaN)} />}
        <div className="mt-1 flex items-center justify-between border-t border-divisoria pt-2">
          <span className="font-bold text-tinta">Total</span>
          <span className="mono text-[22px] font-bold text-tinta">{brl(total)}</span>
        </div>
      </div>

      {/* Pagamento */}
      <div className="flex flex-col gap-3">
        <span className="rotulo text-tinta-4">Pagamento</span>
        <div className="flex flex-wrap gap-2">
          {FORMAS.map((f) => (
            <Chip key={f.id} rotulo={f.rotulo} selecionado={pagamentos.length === 1 && pagamentos[0].forma === f.id} aoClicar={() => (total > 0 ? pagarTudo(f.id) : undefined)} />
          ))}
        </div>
        {pagamentos.length === 1 && pagamentos[0].forma === 'dinheiro' && (
          <Campo rotulo="Cliente deu · R$" inputMode="decimal" placeholder={String(total).replace('.', ',')} value={recebido} onChange={(e) => receberDinheiro(e.target.value)} />
        )}
        {pagamentos.length > 1 || (pagamentos.length === 1 && falta > 0) ? (
          <div className="flex flex-col gap-2">
            {pagamentos.map((p, i) => (
              <div key={i} className="flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="rotulo text-tinta-4">Forma</span>
                  <select value={p.forma} onChange={(e) => setPagamentos((ps) => ps.map((x, j) => (j === i ? { ...x, forma: e.target.value as FormaPagamentoPdv } : x)))} className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3 py-2.5 text-[15px] text-tinta outline-none focus:border-mar">
                    {FORMAS.map((f) => <option key={f.id} value={f.id}>{f.rotulo}</option>)}
                  </select>
                </label>
                <div className="w-32"><Campo rotulo="Valor" inputMode="decimal" value={p.valor} onChange={(e) => setPagamentos((ps) => ps.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} /></div>
                <button onClick={() => setPagamentos((ps) => ps.filter((_, j) => j !== i))} aria-label="Tirar pagamento" className="mb-1 grid h-10 w-10 place-items-center rounded-botao text-tinta-4 hover:bg-preenchimento hover:text-telha-alerta"><X size={16} /></button>
              </div>
            ))}
          </div>
        ) : null}
        <button onClick={dividir} disabled={total <= 0} className="self-start text-sm font-bold text-mar underline underline-offset-2 disabled:opacity-40">Dividir em mais de uma forma</button>
        {pagamentos.length > 0 && (
          <div className="text-sm">
            {falta > 0 ? <span className="font-bold text-telha-alerta">Falta {brl(falta)}</span> : troco > 0 ? <span className="font-bold text-mata">Troco {brl(troco)}</span> : <span className="font-bold text-mata">Pagamento fechado</span>}
            {troco > dinheiroPago + 0.001 && <span className="ml-2 font-semibold text-telha-alerta">Só dá troco em dinheiro.</span>}
          </div>
        )}
      </div>

      <Button variante="lancar" bloco disabled={!podeFinalizar} onClick={finalizar} className="h-12 text-[15px]">
        {criar.isPending ? 'Lançando…' : `Lançar pedido · ${brl(total)}`}
      </Button>
      {!entregaOk && <p className="text-xs font-semibold text-telha-alerta">Entrega precisa de cliente e endereço.</p>}
      {itens.length > 0 && (
        <button onClick={zerar} className="self-center text-sm font-semibold text-tinta-3 hover:text-telha-alerta">Limpar pedido</button>
      )}
    </div>
  )

  return (
    <div className="grid grid-cols-1 gap-4 tab:grid-cols-12">
      {/* Cardápio */}
      <div className="flex flex-col gap-3 tab:col-span-7">
        <div className="flex items-center gap-2 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5">
          <Search size={16} className="text-tinta-4" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar prato ou código…" className="w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-5" />
        </div>
        {categorias.length > 1 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <Chip rotulo="Todos" selecionado={categoria === 'todas'} aoClicar={() => setCategoria('todas')} />
            {categorias.map((c) => <Chip key={c} rotulo={c} selecionado={categoria === c} aoClicar={() => setCategoria(c)} />)}
          </div>
        )}
        {vendaveis.length === 0 ? (
          <Cartao className="py-10 text-center text-sm text-tinta-3">
            Nenhum prato ativo para {tipo === 'entrega' ? 'delivery' : 'venda presencial'}. <Link to="/painel/pdv/cardapio" className="font-bold text-mar underline">Cadastre no Cardápio</Link>.
          </Cartao>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 cel:grid-cols-3">
            {lista.map((p) => {
              const c = custoDoPrato(p, produtos, pratos)
              const qtd = itens.find((i) => i.pratoId === p.id)?.quantidade ?? 0
              return (
                <button
                  key={p.id}
                  onClick={() => adicionar(p.id)}
                  className={cn(
                    'relative flex min-h-[92px] flex-col justify-between rounded-cartao border bg-superficie p-3 text-left transition active:scale-[0.98]',
                    qtd > 0 ? 'border-mar ring-2 ring-mar/20' : 'border-[rgba(46,95,115,0.14)] hover:border-mar/50',
                  )}
                >
                  <span className="text-[14px] font-bold leading-snug text-tinta">{p.nome}</span>
                  <span className="mt-2 flex items-end justify-between">
                    <span className="mono text-[14px] font-bold text-tinta-2">{brl(p.preco)}</span>
                    {c.semFicha && <span className="rounded-chip bg-sol/25 px-1.5 py-0.5 text-[10px] font-bold text-insight-rotulo">sem ficha</span>}
                  </span>
                  {qtd > 0 && <span className="mono absolute -right-1.5 -top-1.5 grid h-6 min-w-6 place-items-center rounded-full bg-mar px-1 text-xs font-bold text-creme">{qtd}</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Pedido: coluna fixa no desktop */}
      <div className="hidden tab:col-span-5 tab:block">
        <Cartao className="sticky top-2">
          <h2 className="mb-3 text-[15px] font-bold text-tinta">Pedido</h2>
          {painel}
        </Cartao>
      </div>

      {/* Pedido: barra + folha no celular */}
      <div className="sticky bottom-0 -mx-5 border-t border-divisoria bg-superficie px-5 py-3 tab:hidden">
        <Button bloco variante={itens.length ? 'lancar' : 'secundario'} onClick={() => setCarrinhoAberto(true)} className="h-12">
          <ShoppingBag size={18} /> {itens.length ? `Ver pedido · ${quantidadeTotal} ${quantidadeTotal === 1 ? 'item' : 'itens'} · ${brl(total)}` : 'Pedido vazio'}
        </Button>
      </div>
      {carrinhoAberto && (
        <div className="fixed inset-0 z-[70] flex items-end bg-noite/45 tab:hidden" onClick={() => setCarrinhoAberto(false)}>
          <div className="scroll-fina max-h-[92dvh] w-full overflow-y-auto rounded-t-cartao-g bg-fundo-app p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-tinta">Pedido</h2>
              <button onClick={() => setCarrinhoAberto(false)} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-botao text-tinta-3 hover:bg-preenchimento"><X size={18} /></button>
            </div>
            {painel}
          </div>
        </div>
      )}
    </div>
  )
}

function Linha({ rot, val }: { rot: string; val: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-tinta-3">{rot}</span>
      <span className="mono font-semibold text-tinta">{val}</span>
    </div>
  )
}
