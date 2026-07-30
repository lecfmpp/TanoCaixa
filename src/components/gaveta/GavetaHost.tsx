import { useEffect, useMemo, useState } from 'react'
import { X, Camera, Sparkles } from 'lucide-react'
import { useUI, type TipoGaveta } from '@/ui/UIProvider'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Switch } from '@/components/ui/Switch'
import { Campo } from '@/components/ui/Campo'
import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useCriarDespesa, useCriarProduto, useCriarFechamento, useCriarMovimento, useDesfazer, useRestaurante, VENDA_APP_DEMO } from '@/data/hooks'
import { pagaFranqueadora } from '@/types'
import { ImportarCSV } from '@/components/importar/ImportarCSV'
import { CapturaFoto } from '@/components/camera/CapturaFoto'
import type { TipoImport } from '@/data/importar'
import { CONTA, GRUPOS, contasDoGrupo, normalizarCategoria, type CategoriaDespesa, type GrupoDRE } from '@/data/planoContas'
import type { DadosExtraidosFoto } from '@/lib/gemini'

/** Gavetas que aceitam importação por planilha e para qual entidade. */
const TIPO_IMPORT: Partial<Record<TipoGaveta, TipoImport>> = {
  despesa: 'despesas',
  produto: 'produtos',
  estoque: 'estoque',
}

const TITULOS: Record<TipoGaveta, { titulo: string; sub: string; etapas: string[] }> = {
  despesa: { titulo: 'Lançar despesa', sub: 'Nota, conta ou boleto', etapas: ['Dados', 'Confere', 'Pronto'] },
  produto: { titulo: 'Novo produto', sub: 'Item do estoque', etapas: ['Dados', 'Confere', 'Pronto'] },
  estoque: { titulo: 'Movimento de estoque', sub: 'Entrada, perda, contagem', etapas: ['Dados', 'Confere', 'Pronto'] },
  fechamento: { titulo: 'Fechar o dia', sub: 'Vendas do dia', etapas: ['Dados', 'Confere', 'Pronto'] },
}

const PAGAMENTOS = ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Ainda vou pagar']
const CAT_PRODUTO = ['Hortifrúti', 'Carnes', 'Secos', 'Bebidas', 'Embalagens', 'Limpeza']
const UNIDADES = ['kg', 'g', 'L', 'un', 'pacote', 'caixa']

const soNum = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0)

/** Faixa que aparece depois da leitura por foto, apontando o que conferir. */
function AvisoIA({ campos }: { campos: string[] }) {
  if (!campos.length) return null
  return (
    <div className="flex items-start gap-2.5 rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-3.5">
      <Sparkles size={16} className="mt-0.5 shrink-0 text-telhado" />
      <p className="text-sm text-insight-texto">
        A IA leu a foto e preencheu <strong className="font-bold">{campos.length}</strong>{' '}
        {campos.length === 1 ? 'campo' : 'campos'}, destacados abaixo.{' '}
        <strong className="font-bold">Confira antes de continuar</strong> — nada é salvo sem você confirmar.
      </p>
    </div>
  )
}
const hojeISO = () => new Date().toISOString().slice(0, 10)

const DESPESA_VAZIA = {
  fornecedor: '',
  valor: '',
  grupo: 'cmv' as GrupoDRE,
  conta: 'cmv_alimentos' as CategoriaDespesa,
  data: hojeISO(),
  pagamento: 'Pix',
  obs: '',
  repete: false,
}

export function GavetaHost() {
  const { gaveta, fecharGaveta, adicionarToast } = useUI()
  const { sessao } = useAuth()
  const criarDespesa = useCriarDespesa()
  const criarProduto = useCriarProduto()
  const criarFechamento = useCriarFechamento()
  const criarMovimento = useCriarMovimento()
  const desfazer = useDesfazer()
  const cfg = useRestaurante().data
  // Quem não é franqueado não tem royalties nem fundo — o grupo some da lista
  // pra ninguém lançar despesa numa linha que o DRE dele nem mostra.
  const gruposDisponiveis = GRUPOS.filter(
    (g) => g.id !== 'franqueadora' || pagaFranqueadora(cfg?.tipoNegocio),
  )
  const [etapa, setEtapa] = useState(0)
  const [modo, setModo] = useState<'form' | 'importar'>('form')
  const [cameraAberta, setCameraAberta] = useState(false)

  // Estado dos formulários
  const [despesa, setDespesa] = useState(DESPESA_VAZIA)
  const [produto, setProduto] = useState({ nome: '', categoria: 'Hortifrúti', unidade: 'kg', custo: '', minimo: '', fornecedor: '', cmv: true })
  const [fecha, setFecha] = useState({ pix: '', cartao: '', dinheiro: '', delivery: '', outras: '' })
  const [estoque, setEstoque] = useState({ tipo: 'Entrou mercadoria', produto: '', quantidade: '', custo: '', geraDespesa: true })
  /** Campos que vieram da leitura da foto — ficam destacados pra conferência. */
  const [iaPreencheu, setIaPreencheu] = useState<string[]>([])
  const daIA = (campo: string) => iaPreencheu.includes(campo)

  /** Trocar de grupo leva a conta pra primeira do grupo novo. */
  function trocarGrupo(g: GrupoDRE) {
    setDespesa((d) => ({ ...d, grupo: g, conta: contasDoGrupo(g)[0].id }))
  }

  useEffect(() => {
    setEtapa(0)
    setModo('form')
    setIaPreencheu([])
    setDespesa({ ...DESPESA_VAZIA, data: hojeISO() })
    setProduto({ nome: '', categoria: 'Hortifrúti', unidade: 'kg', custo: '', minimo: '', fornecedor: '', cmv: true })
    setEstoque({ tipo: 'Entrou mercadoria', produto: 'Grão de bico seco', quantidade: '25', custo: '9,80', geraDespesa: true })
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
        { rot: 'Linha do DRE', val: GRUPOS.find((g) => g.id === despesa.grupo)?.nome ?? '' },
        { rot: 'Conta', val: CONTA[despesa.conta]?.nome ?? '' },
        { rot: 'Competência', val: despesa.data.split('-').reverse().join('/') },
        { rot: 'Pagamento', val: despesa.pagamento },
      ]
    if (gaveta === 'produto')
      return [
        { rot: 'Produto', val: produto.nome || '—' },
        { rot: 'Categoria', val: produto.categoria },
        { rot: 'Custo', val: brl(soNum(produto.custo)) + ' / ' + produto.unidade },
      ]
    if (gaveta === 'fechamento') {
      const apps = VENDA_APP_DEMO.ifood.bruto + VENDA_APP_DEMO.rappi.bruto
      const loja = soNum(fecha.pix) + soNum(fecha.cartao) + soNum(fecha.dinheiro)
      return [
        { rot: 'Vendas delivery (apps)', val: brl(apps) },
        { rot: 'Vendas loja própria', val: brl(loja) },
        { rot: 'Venda delivery próprio', val: brl(soNum(fecha.delivery)) },
        { rot: 'Outras receitas', val: brl(soNum(fecha.outras)) },
        { rot: 'Total do dia', val: brl(apps + loja + soNum(fecha.delivery) + soNum(fecha.outras)) },
      ]
    }
    return [
      { rot: 'Movimento', val: estoque.tipo },
      { rot: 'Produto', val: estoque.produto || '—' },
      { rot: 'Quantidade', val: estoque.quantidade || '0' },
      { rot: 'Valor', val: brl(soNum(estoque.quantidade) * soNum(estoque.custo)) },
    ]
  }

  /** Processa dados extraídos pela câmera. */
  function preencherComDadosDaFoto(dados: DadosExtraidosFoto) {
    // Guarda o que veio da IA pra destacar na tela: o usuário precisa saber
    // exatamente quais números conferir antes de salvar.
    const vindos: string[] = []
    if (gaveta === 'despesa') {
      if (dados.fornecedor) { setDespesa((d) => ({ ...d, fornecedor: dados.fornecedor! })); vindos.push('fornecedor') }
      if (dados.valor) { setDespesa((d) => ({ ...d, valor: (dados.valor! / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) })); vindos.push('valor') }
      if (dados.categoria) {
        const conta = normalizarCategoria(dados.categoria)
        setDespesa((d) => ({ ...d, conta, grupo: CONTA[conta].grupo }))
        vindos.push('conta')
      }
      if (dados.obs) { setDespesa((d) => ({ ...d, obs: dados.obs! })); vindos.push('obs') }
    } else if (gaveta === 'produto') {
      if (dados.produto) { setProduto((p) => ({ ...p, nome: dados.produto! })); vindos.push('nome') }
      if (dados.categoria) { setProduto((p) => ({ ...p, categoria: dados.categoria! })); vindos.push('categoria') }
      if (dados.custo) { setProduto((p) => ({ ...p, custo: (dados.custo! / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) })); vindos.push('custo') }
    } else if (gaveta === 'estoque') {
      if (dados.produto) { setEstoque((e) => ({ ...e, produto: dados.produto! })); vindos.push('produto') }
      if (dados.quantidade) { setEstoque((e) => ({ ...e, quantidade: String(dados.quantidade) })); vindos.push('quantidade') }
      if (dados.custo) { setEstoque((e) => ({ ...e, custo: (dados.custo! / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) })); vindos.push('custo') }
    }
    setIaPreencheu(vindos)
    setCameraAberta(false)
    adicionarToast({
      tipo: 'sistema',
      titulo: vindos.length ? 'A IA leu a foto' : 'Não deu pra ler',
      texto: vindos.length
        ? 'Confira os campos destacados e confirme.'
        : 'Não achamos os dados nessa imagem. Preencha à mão ou tente outra foto.',
    })
  }

  /** Toast de sucesso com "Desfazer" que apaga os docs criados. */
  function toastComDesfazer(titulo: string, texto: string, itens: { colecao: string; id: string }[]) {
    adicionarToast({
      tipo: 'sucesso',
      titulo,
      texto,
      rotuloAcao: 'Desfazer',
      onAcao: () => {
        desfazer.mutate(itens)
        adicionarToast({ tipo: 'sistema', titulo: 'Desfeito', texto: 'O lançamento foi removido.' })
      },
    })
  }

  async function salvar() {
    if (gaveta === 'despesa') {
      const st = despesa.pagamento === 'Ainda vou pagar' ? 'a_pagar' : 'pago'
      const d = await criarDespesa.mutateAsync({
        fornecedor: despesa.fornecedor || 'Fornecedor',
        valorTotal: soNum(despesa.valor),
        categoria: despesa.conta,
        dataCompetencia: despesa.data,
        formaPagamento: (despesa.pagamento === 'Ainda vou pagar' ? 'boleto' : despesa.pagamento.toLowerCase()) as never,
        status: st as never,
        observacao: despesa.obs,
        recorrente: despesa.repete,
      })
      toastComDesfazer('Tá no caixa!', `${brl(soNum(despesa.valor))} entraram em ${CONTA[despesa.conta]?.nome}.`, [{ colecao: 'despesas', id: d.id }])
    } else if (gaveta === 'produto') {
      const p = await criarProduto.mutateAsync({
        nome: produto.nome || 'Produto',
        categoria: produto.categoria,
        unidade: produto.unidade,
        custoAtual: soNum(produto.custo),
        estoqueMinimo: soNum(produto.minimo),
        fornecedor: produto.fornecedor,
        entraNoCmv: produto.cmv,
      })
      toastComDesfazer('Produto cadastrado', `${produto.nome || 'Produto'} entrou no estoque.`, [{ colecao: 'produtos', id: p.id }])
    } else if (gaveta === 'fechamento') {
      const f = await criarFechamento.mutateAsync({
        pix: soNum(fecha.pix),
        cartao: soNum(fecha.cartao),
        dinheiro: soNum(fecha.dinheiro),
        delivery: soNum(fecha.delivery),
        outras: soNum(fecha.outras),
      })
      toastComDesfazer('Dia fechado', `${brl(f.totalDia)} confirmados no caixa de hoje.`, [{ colecao: 'receita_dia', id: f.id }])
    } else {
      const m = await criarMovimento.mutateAsync({
        tipo: estoque.tipo,
        produto: estoque.produto,
        quantidade: soNum(estoque.quantidade),
        custo: soNum(estoque.custo),
        geraDespesa: estoque.geraDespesa,
      })
      const itens = [{ colecao: 'movimentos_estoque', id: m.movimentoId }]
      if (m.despesaId) itens.push({ colecao: 'despesas', id: m.despesaId })
      toastComDesfazer('Estoque atualizado', `${estoque.produto} · ${estoque.quantidade} un.`, itens)
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
          {etapa === 0 && TIPO_IMPORT[gaveta] && (
            <div className="mb-4 flex rounded-botao bg-preenchimento p-1">
              <button
                onClick={() => setModo('form')}
                className={cn('flex-1 rounded-[10px] py-1.5 text-sm font-bold transition', modo === 'form' ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3')}
              >
                Lançar um
              </button>
              <button
                onClick={() => setModo('importar')}
                className={cn('flex-1 rounded-[10px] py-1.5 text-sm font-bold transition', modo === 'importar' ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3')}
              >
                Importar planilha
              </button>
            </div>
          )}

          {etapa === 0 && modo === 'importar' && TIPO_IMPORT[gaveta] && (
            <ImportarCSV tipo={TIPO_IMPORT[gaveta]!} aoConcluir={fecharGaveta} />
          )}

          {etapa === 0 && modo === 'form' && gaveta === 'despesa' && (
            <div className="flex flex-col gap-4">
              <AvisoIA campos={iaPreencheu} />
              <Campo rotulo="Fornecedor" destaque={daIA('fornecedor')} placeholder="Ex: Hortifrúti Zona Sul" value={despesa.fornecedor} onChange={(e) => setDespesa({ ...despesa, fornecedor: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Quanto foi" destaque={daIA('valor')} placeholder="R$ 0,00" inputMode="decimal" value={despesa.valor} onChange={(e) => setDespesa({ ...despesa, valor: e.target.value })} />
                <Campo rotulo="Data da despesa" type="date" value={despesa.data} onChange={(e) => setDespesa({ ...despesa, data: e.target.value })} />
              </div>
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">Onde entra no DRE</span>
                <div className="flex flex-wrap gap-2">
                  {gruposDisponiveis.map((g) => <Chip key={g.id} rotulo={g.simples} selecionado={despesa.grupo === g.id} aoClicar={() => trocarGrupo(g.id)} />)}
                </div>
              </div>
              <div className={cn(daIA('conta') && 'rounded-campo border border-telhado/40 bg-insight-fundo/40 p-3')}>
                <span className="rotulo mb-1.5 block text-tinta-4">Qual conta</span>
                <div className="flex flex-wrap gap-2">
                  {contasDoGrupo(despesa.grupo).map((c) => (
                    <Chip key={c.id} rotulo={c.nome} selecionado={despesa.conta === c.id} aoClicar={() => setDespesa({ ...despesa, conta: c.id })} />
                  ))}
                </div>
                {CONTA[despesa.conta]?.ajuda && (
                  <p className="mt-1.5 text-xs text-tinta-4">{CONTA[despesa.conta].ajuda}</p>
                )}
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
              <Campo rotulo="Observação · opcional" destaque={daIA('obs')} placeholder="Ex: compra de reposição do fim de semana" value={despesa.obs} onChange={(e) => setDespesa({ ...despesa, obs: e.target.value })} />
              <button
                onClick={() => setCameraAberta(true)}
                className="flex items-center justify-center gap-2 rounded-botao bg-telhado/20 px-4 py-3 text-sm font-bold text-telhado transition hover:bg-telhado/30"
              >
                <Camera size={18} />
                {iaPreencheu.length ? 'Ler outra foto' : 'Tirar foto da nota'}
              </button>
              {/* Convite só faz sentido antes da leitura — depois vira contradição. */}
              {!iaPreencheu.length && (
                <div className="rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-4 text-sm text-insight-texto">
                  Tem a nota na mão? <strong className="font-bold">Tira uma foto</strong> que a gente preenche tudo isso sozinho em 5 segundos.
                </div>
              )}
            </div>
          )}

          {etapa === 0 && modo === 'form' && gaveta === 'produto' && (
            <div className="flex flex-col gap-4">
              <AvisoIA campos={iaPreencheu} />
              <Campo rotulo="Nome do produto" destaque={daIA('nome')} placeholder="Grão de bico seco" value={produto.nome} onChange={(e) => setProduto({ ...produto, nome: e.target.value })} />
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">Categoria</span>
                <div className="flex flex-wrap gap-2">{CAT_PRODUTO.map((c) => <Chip key={c} rotulo={c} selecionado={produto.categoria === c} aoClicar={() => setProduto({ ...produto, categoria: c })} />)}</div>
              </div>
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">Unidade de medida</span>
                <div className="flex flex-wrap gap-2">{UNIDADES.map((u) => <Chip key={u} rotulo={u} selecionado={produto.unidade === u} aoClicar={() => setProduto({ ...produto, unidade: u })} />)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Custo de hoje" destaque={daIA('custo')} placeholder="R$ 9,80" inputMode="decimal" value={produto.custo} onChange={(e) => setProduto({ ...produto, custo: e.target.value })} />
                <Campo rotulo="Estoque mínimo" placeholder="15 kg" value={produto.minimo} onChange={(e) => setProduto({ ...produto, minimo: e.target.value })} />
              </div>
              <Campo rotulo="Fornecedor padrão" placeholder="Casa Líbano" value={produto.fornecedor} onChange={(e) => setProduto({ ...produto, fornecedor: e.target.value })} />
              <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
                <span><span className="block text-sm font-bold text-tinta">Entra no CMV</span><span className="block text-xs text-tinta-4">desliga pra material de limpeza e descartável</span></span>
                <Switch ligado={produto.cmv} aoTrocar={(v) => setProduto({ ...produto, cmv: v })} />
              </label>
              <button
                onClick={() => setCameraAberta(true)}
                className="flex items-center justify-center gap-2 rounded-botao bg-telhado/20 px-4 py-3 text-sm font-bold text-telhado transition hover:bg-telhado/30"
              >
                <Camera size={18} />
                Tirar foto do produto
              </button>
            </div>
          )}

          {etapa === 0 && modo === 'form' && gaveta === 'fechamento' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-4">
                <span className="rotulo text-tinta-4">Vendas delivery (apps) · já veio das plataformas</span>
                <div className="mt-2 flex items-center justify-between text-sm"><span className="text-tinta-2">iFood · {VENDA_APP_DEMO.ifood.pedidos} pedidos · taxa {brl(VENDA_APP_DEMO.ifood.taxa)}</span><span className="mono font-bold">{brl(VENDA_APP_DEMO.ifood.bruto)}</span></div>
                <div className="mt-1 flex items-center justify-between text-sm"><span className="text-tinta-2">Rappi · {VENDA_APP_DEMO.rappi.pedidos} pedidos · taxa {brl(VENDA_APP_DEMO.rappi.taxa)}</span><span className="mono font-bold">{brl(VENDA_APP_DEMO.rappi.bruto)}</span></div>
              </div>
              <span className="rotulo text-tinta-4">Vendas loja própria · o que você recebeu no balcão</span>
              <div className="grid grid-cols-3 gap-3">
                <Campo rotulo="Pix" inputMode="decimal" value={fecha.pix} onChange={(e) => setFecha({ ...fecha, pix: e.target.value })} />
                <Campo rotulo="Cartão" inputMode="decimal" value={fecha.cartao} onChange={(e) => setFecha({ ...fecha, cartao: e.target.value })} />
                <Campo rotulo="Dinheiro" inputMode="decimal" value={fecha.dinheiro} onChange={(e) => setFecha({ ...fecha, dinheiro: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Delivery próprio" placeholder="WhatsApp, telefone" inputMode="decimal" value={fecha.delivery} onChange={(e) => setFecha({ ...fecha, delivery: e.target.value })} />
                <Campo rotulo="Outras receitas" placeholder="evento, buffet" inputMode="decimal" value={fecha.outras} onChange={(e) => setFecha({ ...fecha, outras: e.target.value })} />
              </div>
              <p className="text-xs text-tinta-4">
                Cada campo aqui é uma linha da receita bruta do DRE. As taxas dos apps entram sozinhas como dedução sobre venda.
              </p>
            </div>
          )}

          {etapa === 0 && modo === 'form' && gaveta === 'estoque' && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">O que aconteceu</span>
                <div className="flex flex-wrap gap-2">{['Entrou mercadoria', 'Contagem do mês', 'Perda ou quebra', 'Transferência'].map((o) => <Chip key={o} rotulo={o} selecionado={estoque.tipo === o} aoClicar={() => setEstoque({ ...estoque, tipo: o })} />)}</div>
              </div>
              <AvisoIA campos={iaPreencheu} />
              <Campo rotulo="Produto" destaque={daIA('produto')} value={estoque.produto} onChange={(e) => setEstoque({ ...estoque, produto: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Quantidade" destaque={daIA('quantidade')} value={estoque.quantidade} onChange={(e) => setEstoque({ ...estoque, quantidade: e.target.value })} inputMode="numeric" />
                <Campo rotulo="Custo unitário" destaque={daIA('custo')} placeholder="R$ 9,80" value={estoque.custo} onChange={(e) => setEstoque({ ...estoque, custo: e.target.value })} inputMode="decimal" />
              </div>
              <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
                <span><span className="block text-sm font-bold text-tinta">Gerar a despesa junto</span><span className="block text-xs text-tinta-4">cria o lançamento de {brl(soNum(estoque.quantidade) * soNum(estoque.custo))} no CMV, na conta do produto</span></span>
                <Switch ligado={estoque.geraDespesa} aoTrocar={(v) => setEstoque({ ...estoque, geraDespesa: v })} />
              </label>
              <button
                onClick={() => setCameraAberta(true)}
                className="flex items-center justify-center gap-2 rounded-botao bg-telhado/20 px-4 py-3 text-sm font-bold text-telhado transition hover:bg-telhado/30"
              >
                <Camera size={18} />
                Tirar foto da mercadoria
              </button>
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
              {gaveta === 'despesa' && (
                <div className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">
                  No DRE isso entra em <strong className="font-bold text-tinta">{GRUPOS.find((g) => g.id === despesa.grupo)?.nome}</strong>, na conta <strong className="font-bold text-tinta">{CONTA[despesa.conta]?.nome}</strong>.
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
              {!(etapa === 0 && modo === 'importar') && (
                <Button variante="primario" onClick={() => (etapa === 0 ? setEtapa(1) : salvar())}>
                  {etapa === 0 ? 'Continuar' : 'Confirmar'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de câmera */}
      {cameraAberta && gaveta && (
        <CapturaFoto
          tipo={gaveta === 'despesa' ? 'despesa' : gaveta === 'produto' ? 'produto' : 'estoque'}
          onExtrair={preencherComDadosDaFoto}
          onCancelar={() => setCameraAberta(false)}
        />
      )}
    </div>
  )
}
