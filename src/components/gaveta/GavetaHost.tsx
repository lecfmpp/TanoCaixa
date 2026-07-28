import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useUI, type TipoGaveta } from '@/ui/UIProvider'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Switch } from '@/components/ui/Switch'
import { Campo } from '@/components/ui/Campo'
import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useCriarDespesa, useCriarProduto } from '@/data/hooks'
import type { CategoriaDespesa } from '@/types'

const TITULOS: Record<TipoGaveta, { titulo: string; sub: string; etapas: string[] }> = {
  despesa: { titulo: 'Lançar despesa', sub: 'Nota, conta ou boleto', etapas: ['Dados', 'Confere', 'Pronto'] },
  produto: { titulo: 'Novo produto', sub: 'Item do estoque', etapas: ['Dados', 'Confere', 'Pronto'] },
  estoque: { titulo: 'Movimento de estoque', sub: 'Entrada, perda, contagem', etapas: ['Dados', 'Confere', 'Pronto'] },
  fechamento: { titulo: 'Fechar o dia', sub: 'Vendas do dia', etapas: ['Dados', 'Confere', 'Pronto'] },
}

const CATS: { id: CategoriaDespesa; nome: string }[] = [
  { id: 'mercadoria', nome: 'Mercadoria' },
  { id: 'pessoal', nome: 'Pessoal' },
  { id: 'ocupacao', nome: 'Ocupação' },
  { id: 'taxas_app', nome: 'Taxas de app' },
]
const PAGAMENTOS = ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Ainda vou pagar']
const CAT_PRODUTO = ['Hortifrúti', 'Carnes', 'Secos', 'Bebidas', 'Embalagens', 'Limpeza']
const UNIDADES = ['kg', 'g', 'L', 'un', 'pacote', 'caixa']

const soNum = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0)

export function GavetaHost() {
  const { gaveta, fecharGaveta, adicionarToast } = useUI()
  const { sessao } = useAuth()
  const criarDespesa = useCriarDespesa()
  const criarProduto = useCriarProduto()
  const [etapa, setEtapa] = useState(0)

  // Estado dos formulários
  const [despesa, setDespesa] = useState({ fornecedor: '', valor: '', categoria: 'mercadoria' as CategoriaDespesa, pagamento: 'Pix', obs: '', repete: false })
  const [produto, setProduto] = useState({ nome: '', categoria: 'Hortifrúti', unidade: 'kg', custo: '', minimo: '', fornecedor: '', cmv: true })
  const [fecha, setFecha] = useState({ pix: '214,60', cartao: '98,50', dinheiro: '38,00' })

  useEffect(() => {
    setEtapa(0)
    setDespesa({ fornecedor: '', valor: '', categoria: 'mercadoria', pagamento: 'Pix', obs: '', repete: false })
    setProduto({ nome: '', categoria: 'Hortifrúti', unidade: 'kg', custo: '', minimo: '', fornecedor: '', cmv: true })
  }, [gaveta])

  useEffect(() => {
    if (!gaveta) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && fecharGaveta()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [gaveta, fecharGaveta])

  const nome = sessao?.usuario.nome ?? 'Halim'
  const hora = useMemo(
    () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    [gaveta, etapa],
  )

  if (!gaveta) return null
  const meta = TITULOS[gaveta]

  const resumo = montarResumo()
  function montarResumo(): { rot: string; val: string }[] {
    if (gaveta === 'despesa')
      return [
        { rot: 'Fornecedor', val: despesa.fornecedor || '—' },
        { rot: 'Valor', val: brl(soNum(despesa.valor)) },
        { rot: 'Categoria', val: CATS.find((c) => c.id === despesa.categoria)?.nome ?? '' },
        { rot: 'Pagamento', val: despesa.pagamento },
      ]
    if (gaveta === 'produto')
      return [
        { rot: 'Produto', val: produto.nome || '—' },
        { rot: 'Categoria', val: produto.categoria },
        { rot: 'Custo', val: brl(soNum(produto.custo)) + ' / ' + produto.unidade },
      ]
    if (gaveta === 'fechamento') {
      const total = 742.5 + 186.4 + soNum(fecha.pix) + soNum(fecha.cartao) + soNum(fecha.dinheiro)
      return [
        { rot: 'iFood + Rappi', val: brl(928.9) },
        { rot: 'Na loja', val: brl(soNum(fecha.pix) + soNum(fecha.cartao) + soNum(fecha.dinheiro)) },
        { rot: 'Total do dia', val: brl(total) },
      ]
    }
    return [{ rot: 'Movimento', val: 'Entrada de estoque' }]
  }

  async function salvar() {
    if (gaveta === 'despesa') {
      const st = despesa.pagamento === 'Ainda vou pagar' ? 'a_pagar' : 'pago'
      await criarDespesa.mutateAsync({
        fornecedor: despesa.fornecedor || 'Fornecedor',
        valorTotal: soNum(despesa.valor),
        categoria: despesa.categoria,
        formaPagamento: (despesa.pagamento === 'Ainda vou pagar' ? 'boleto' : despesa.pagamento.toLowerCase()) as never,
        status: st as never,
        observacao: despesa.obs,
        recorrente: despesa.repete,
      })
      adicionarToast({ tipo: 'sucesso', titulo: 'Tá no caixa!', texto: `${brl(soNum(despesa.valor))} entraram em ${CATS.find((c) => c.id === despesa.categoria)?.nome}.`, rotuloAcao: 'Desfazer' })
    } else if (gaveta === 'produto') {
      await criarProduto.mutateAsync({
        nome: produto.nome || 'Produto',
        categoria: produto.categoria,
        unidade: produto.unidade,
        custoAtual: soNum(produto.custo),
        estoqueMinimo: soNum(produto.minimo),
        fornecedor: produto.fornecedor,
        entraNoCmv: produto.cmv,
      })
      adicionarToast({ tipo: 'sucesso', titulo: 'Produto cadastrado', texto: `${produto.nome} entrou no estoque.`, rotuloAcao: 'Desfazer' })
    } else if (gaveta === 'fechamento') {
      adicionarToast({ tipo: 'sucesso', titulo: 'Dia fechado', texto: 'Caixa de hoje confirmado.', rotuloAcao: 'Desfazer' })
    } else {
      adicionarToast({ tipo: 'sucesso', titulo: 'Estoque atualizado', texto: 'Movimento registrado.', rotuloAcao: 'Desfazer' })
    }
    setEtapa(2)
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-noite/45" onClick={fecharGaveta}>
      <div
        className="flex h-full w-full max-w-[520px] flex-col bg-fundo-app shadow-gaveta"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b border-divisoria bg-superficie px-6 py-4">
          <div>
            <h2 className="text-tinta" style={{ fontSize: 19, fontWeight: 800 }}>{meta.titulo}</h2>
            <p className="text-sm text-tinta-3">{meta.sub}</p>
          </div>
          <button onClick={fecharGaveta} className="grid h-8 w-8 place-items-center rounded-botao text-tinta-3 hover:bg-preenchimento">
            <X size={18} />
          </button>
        </div>

        {/* Trilha de etapas */}
        <div className="flex gap-2 border-b border-divisoria bg-superficie px-6 pb-3">
          {meta.etapas.map((e, i) => (
            <div key={e} className="flex flex-1 flex-col gap-1">
              <div className={cn('h-1 rounded-full', i <= etapa ? 'bg-mar' : 'bg-trilho')} />
              <span className={cn('text-[11px] font-semibold', i === etapa ? 'text-tinta' : 'text-tinta-4')}>{e}</span>
            </div>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="scroll-fina flex-1 overflow-y-auto px-6 py-5">
          {etapa === 0 && gaveta === 'despesa' && (
            <div className="flex flex-col gap-4">
              <Campo rotulo="Fornecedor" placeholder="Ex: Hortifrúti Zona Sul" value={despesa.fornecedor} onChange={(e) => setDespesa({ ...despesa, fornecedor: e.target.value })} />
              <Campo rotulo="Quanto foi" placeholder="R$ 0,00" inputMode="decimal" value={despesa.valor} onChange={(e) => setDespesa({ ...despesa, valor: e.target.value })} />
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">Categoria</span>
                <div className="flex flex-wrap gap-2">
                  {CATS.map((c) => <Chip key={c.id} rotulo={c.nome} selecionado={despesa.categoria === c.id} aoClicar={() => setDespesa({ ...despesa, categoria: c.id })} />)}
                </div>
              </div>
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">Como pagou</span>
                <div className="flex flex-wrap gap-2">
                  {PAGAMENTOS.map((p) => <Chip key={p} rotulo={p} selecionado={despesa.pagamento === p} aoClicar={() => setDespesa({ ...despesa, pagamento: p })} />)}
                </div>
              </div>
              <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
                <span><span className="block text-sm font-bold text-tinta">Isso se repete todo mês</span><span className="block text-xs text-tinta-4">aluguel, contador, internet…</span></span>
                <Switch ligado={despesa.repete} aoTrocar={(v) => setDespesa({ ...despesa, repete: v })} />
              </label>
              <Campo rotulo="Observação · opcional" placeholder="Ex: compra de reposição do fim de semana" value={despesa.obs} onChange={(e) => setDespesa({ ...despesa, obs: e.target.value })} />
              <div className="rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-4 text-sm text-insight-texto">
                Tem a nota na mão? <strong className="font-bold">Tira uma foto</strong> que a gente preenche tudo isso sozinho em 5 segundos.
              </div>
            </div>
          )}

          {etapa === 0 && gaveta === 'produto' && (
            <div className="flex flex-col gap-4">
              <Campo rotulo="Nome do produto" placeholder="Grão de bico seco" value={produto.nome} onChange={(e) => setProduto({ ...produto, nome: e.target.value })} />
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">Categoria</span>
                <div className="flex flex-wrap gap-2">{CAT_PRODUTO.map((c) => <Chip key={c} rotulo={c} selecionado={produto.categoria === c} aoClicar={() => setProduto({ ...produto, categoria: c })} />)}</div>
              </div>
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">Unidade de medida</span>
                <div className="flex flex-wrap gap-2">{UNIDADES.map((u) => <Chip key={u} rotulo={u} selecionado={produto.unidade === u} aoClicar={() => setProduto({ ...produto, unidade: u })} />)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Custo de hoje" placeholder="R$ 9,80" inputMode="decimal" value={produto.custo} onChange={(e) => setProduto({ ...produto, custo: e.target.value })} />
                <Campo rotulo="Estoque mínimo" placeholder="15 kg" value={produto.minimo} onChange={(e) => setProduto({ ...produto, minimo: e.target.value })} />
              </div>
              <Campo rotulo="Fornecedor padrão" placeholder="Casa Líbano" value={produto.fornecedor} onChange={(e) => setProduto({ ...produto, fornecedor: e.target.value })} />
              <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
                <span><span className="block text-sm font-bold text-tinta">Entra no CMV</span><span className="block text-xs text-tinta-4">desliga pra material de limpeza e descartável</span></span>
                <Switch ligado={produto.cmv} aoTrocar={(v) => setProduto({ ...produto, cmv: v })} />
              </label>
            </div>
          )}

          {etapa === 0 && gaveta === 'fechamento' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-4">
                <span className="rotulo text-tinta-4">Já veio das plataformas</span>
                <div className="mt-2 flex items-center justify-between text-sm"><span className="text-tinta-2">iFood · 38 pedidos · taxa {brl(178.2)}</span><span className="mono font-bold">{brl(742.5)}</span></div>
                <div className="mt-1 flex items-center justify-between text-sm"><span className="text-tinta-2">Rappi · 9 pedidos · taxa {brl(41.3)}</span><span className="mono font-bold">{brl(186.4)}</span></div>
              </div>
              <span className="rotulo text-tinta-4">O que você recebeu na loja</span>
              <div className="grid grid-cols-3 gap-3">
                <Campo rotulo="Pix / WhatsApp" inputMode="decimal" value={fecha.pix} onChange={(e) => setFecha({ ...fecha, pix: e.target.value })} />
                <Campo rotulo="Cartão" inputMode="decimal" value={fecha.cartao} onChange={(e) => setFecha({ ...fecha, cartao: e.target.value })} />
                <Campo rotulo="Dinheiro" inputMode="decimal" value={fecha.dinheiro} onChange={(e) => setFecha({ ...fecha, dinheiro: e.target.value })} />
              </div>
            </div>
          )}

          {etapa === 0 && gaveta === 'estoque' && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">O que aconteceu</span>
                <div className="flex flex-wrap gap-2">{['Entrou mercadoria', 'Contagem do mês', 'Perda ou quebra', 'Transferência'].map((o, i) => <Chip key={o} rotulo={o} selecionado={i === 0} aoClicar={() => {}} />)}</div>
              </div>
              <Campo rotulo="Produto" defaultValue="Grão de bico seco · kg" />
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Quantidade" defaultValue="25" inputMode="numeric" />
                <Campo rotulo="Custo unitário" defaultValue="R$ 9,80" inputMode="decimal" />
              </div>
              <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
                <span><span className="block text-sm font-bold text-tinta">Gerar a despesa junto</span><span className="block text-xs text-tinta-4">cria o lançamento de R$ 245,00 em Mercadoria</span></span>
                <Switch ligado aoTrocar={() => {}} />
              </label>
            </div>
          )}

          {etapa === 1 && (
            <div className="flex flex-col gap-4">
              <h3 className="text-[15px] font-bold text-tinta">Confere antes de salvar</h3>
              <div className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-4">
                {resumo.map((r) => (
                  <div key={r.rot} className="flex items-center justify-between border-b border-divisoria py-2 last:border-0 text-sm">
                    <span className="text-tinta-3">{r.rot}</span>
                    <span className="mono font-bold text-tinta">{r.val}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-tinta-4">
                Vai ficar registrado como <strong className="font-semibold text-tinta-2">{nome}</strong>, hoje às {hora}, pelo computador da loja.
              </p>
              {gaveta === 'despesa' && despesa.categoria === 'mercadoria' && (
                <div className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">
                  Seu CMV vai de <span className="mono font-bold">29,9%</span> para <span className="mono font-bold">30,9%</span>.
                </div>
              )}
            </div>
          )}

          {etapa === 2 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-mata/15 text-mata">✓</div>
              <h3 className="text-tinta" style={{ fontSize: 18, fontWeight: 800 }}>Pronto!</h3>
              <p className="max-w-xs text-sm text-tinta-3">O lançamento já entrou no painel e aparece no “Quem mexeu no quê”.</p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between gap-3 border-t border-divisoria bg-superficie px-6 py-4">
          {etapa === 2 ? (
            <Button variante="primario" bloco onClick={fecharGaveta}>Fechar</Button>
          ) : (
            <>
              <button
                onClick={() => (etapa === 0 ? fecharGaveta() : setEtapa(etapa - 1))}
                className="text-sm font-semibold text-tinta-3 hover:text-tinta"
              >
                {etapa === 0 ? 'Cancelar' : '← Corrigir'}
              </button>
              <Button variante="primario" onClick={() => (etapa === 0 ? setEtapa(1) : salvar())}>
                {etapa === 0 ? 'Continuar' : 'Confirmar'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
