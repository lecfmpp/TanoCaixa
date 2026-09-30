import { useEffect, useMemo, useState } from 'react'
import { X, Camera, Sparkles, Plus, Trash2 } from 'lucide-react'
import { useUI, type TipoGaveta } from '@/ui/UIProvider'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Switch } from '@/components/ui/Switch'
import { SeletorProduto } from '@/components/ui/SeletorProduto'
import { Campo } from '@/components/ui/Campo'
import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'
import { usePlanoContas, useCriarDespesa, useAtualizarDespesa, useCriarProduto, useEditarProduto, useCriarFechamento, useCriarMovimento, useCriarNota, useAtualizarNota, useDesfazer, useProdutos, useReceitaDia, useRestaurante, VENDA_APP_DEMO } from '@/data/hooks'
import { pagaFranqueadora } from '@/types'
import { ImportarCSV } from '@/components/importar/ImportarCSV'
import { ALTA_RELEVANTE } from '@/data/compras'
import { mensagemDeErro } from '@/lib/erros'
import { diaDeHoje } from '@/data/derive'
import { CapturaFoto } from '@/components/camera/CapturaFoto'
import type { TipoImport } from '@/data/importar'
import {
  CONTA,
  GRUPOS,
  CATEGORIAS_PRODUTO,
  UNIDADES_PRODUTO,
  contasParaLancar,
  normalizarCategoria,
  normalizarCategoriaProduto,
  normalizarUnidade,
  type CategoriaDespesa,
  type GrupoDRE,
} from '@/data/planoContas'
import type { DadosExtraidosFoto } from '@/lib/gemini'
import type { DespesaDoc } from '@/data/types'

/** Gavetas que aceitam importação por planilha e para qual entidade. */
const TIPO_IMPORT: Partial<Record<TipoGaveta, TipoImport>> = {
  despesa: 'despesas',
  produto: 'produtos',
  estoque: 'estoque',
}

const TITULOS: Record<TipoGaveta, { titulo: string; sub: string; etapas: string[] }> = {
  despesa: { titulo: 'Lançar despesa', sub: 'Conta da casa', etapas: ['Dados', 'Confere', 'Pronto'] },
  compra: { titulo: 'Nota fiscal', sub: 'Compra de mercadoria', etapas: ['Itens', 'Confere', 'Pronto'] },
  produto: { titulo: 'Novo produto', sub: 'Item do estoque', etapas: ['Dados', 'Confere', 'Pronto'] },
  estoque: { titulo: 'Perda ou transferência', sub: 'Saída de estoque que não é venda', etapas: ['Dados', 'Confere', 'Pronto'] },
  fechamento: { titulo: 'Lançar vendas', sub: 'Vendas do dia', etapas: ['Dados', 'Confere', 'Pronto'] },
}

const PAGAMENTOS = ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência', 'Ainda vou pagar']

/** Chip da tela → forma de pagamento do banco. 'Cartão'.toLowerCase() virava
 * 'cartão' com acento e não batia com nada do plano de contas. */
const FORMA_DO_CHIP: Record<string, DespesaDoc['formaPagamento']> = {
  Pix: 'pix',
  Dinheiro: 'dinheiro',
  'Cartão': 'cartao',
  Boleto: 'boleto',
  'Transferência': 'transferencia',
  'Ainda vou pagar': 'boleto',
}

/** O caminho de volta, pra gaveta de correção abrir no chip certo. */
function chipDoPagamento(forma: DespesaDoc['formaPagamento'], status: DespesaDoc['status']): string {
  if (status !== 'pago') return 'Ainda vou pagar'
  const rotulo = Object.entries(FORMA_DO_CHIP).find(([r, f]) => f === forma && r !== 'Ainda vou pagar')
  return rotulo?.[0] ?? 'Pix'
}

/**
 * Chip escolhido → como isso é gravado (forma + situação andam juntas).
 *
 * Numa correção, o chip que não foi mexido devolve a forma ORIGINAL: sem isso
 * o lançamento que o iFood mandou como 'automatico' virava 'pix' só por passar
 * pela gaveta, porque a tela não tem chip pra 'automatico'.
 */
function pagamentoParaDoc(chip: string, original?: { formaPagamento: DespesaDoc['formaPagamento']; status: DespesaDoc['status'] }) {
  if (original && chipDoPagamento(original.formaPagamento, original.status) === chip) {
    return { formaPagamento: original.formaPagamento, status: original.status }
  }
  return {
    formaPagamento: FORMA_DO_CHIP[chip] ?? 'pix',
    status: (chip === 'Ainda vou pagar' ? 'a_pagar' : 'pago') as DespesaDoc['status'],
  }
}

/** Custo do cadastro no formato do campo ('9,80'). */
const custoFormatado = (v: number | undefined) =>
  v && v > 0 ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''

/** ISO 'YYYY-MM-DD' no formato que o dono lê. */
const dataBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

/** Valor gravado de volta no formato do campo — o caminho de volta do `soNum`. */
const valorFormatado = (v: number | undefined) =>
  v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''

const soNum = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0)

/** Ação principal da gaveta: fica no topo, sólida, antes de qualquer campo. */
function BotaoFoto({ rotulo, apoio, aoClicar }: { rotulo: string; apoio: string; aoClicar: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Button variante="lancar" bloco onClick={aoClicar}>
        <Camera size={18} />
        {rotulo}
      </Button>
      <p className="text-center text-xs text-tinta-4">{apoio}</p>
    </div>
  )
}

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
/**
 * Data de hoje no campo. Sai da data de referência do painel, não de
 * `new Date().toISOString()`: na demonstração o painel vive em julho, e o
 * toISOString convertia pra UTC — de madrugada o lançamento caía no dia anterior.
 */
const hojeISO = diaDeHoje

/**
 * Movimento que não mexe em dinheiro. Entrada de mercadoria tem nota; contagem
 * tem a própria aba no Estoque.
 */
const MOVIMENTOS = ['Perda ou quebra', 'Transferência'] as const

interface ItemForm { produtoId: string; quantidade: string; preco: string }
const ITEM_VAZIO: ItemForm = { produtoId: '', quantidade: '', preco: '' }

const NOTA_VAZIA = {
  fornecedor: '',
  data: hojeISO(),
  pagamento: 'Pix',
  vencimento: '',
  obs: '',
  itens: [ITEM_VAZIO],
}

const DESPESA_VAZIA = {
  fornecedor: '',
  valor: '',
  grupo: 'ocupacao' as GrupoDRE,
  conta: 'aluguel' as CategoriaDespesa,
  data: hojeISO(),
  pagamento: 'Pix',
  vencimento: '',
  obs: '',
  repete: false,
}

export function GavetaHost() {
  const { gaveta, gavetaEdicao, abrirGaveta, fecharGaveta, adicionarToast, confirmar } = useUI()
  const { sessao } = useAuth()
  // A gaveta vive fora do AppShell: assina o plano de contas por conta própria
  // pra que uma conta criada agora já apareça nos chips.
  usePlanoContas()
  const criarDespesa = useCriarDespesa()
  const criarProduto = useCriarProduto()
  const editarProduto = useEditarProduto()
  const criarFechamento = useCriarFechamento()
  const criarMovimento = useCriarMovimento()
  const criarNota = useCriarNota()
  const atualizarDespesa = useAtualizarDespesa()
  const atualizarNota = useAtualizarNota()
  const produtos = useProdutos().data ?? []
  const receitaPdvHoje = (useReceitaDia().data ?? []).find((r) => r.id === `pdv-${hojeISO()}`)
  const desfazer = useDesfazer()
  const cfg = useRestaurante().data
  // Quem não é franqueado não tem royalties nem fundo — o grupo some da lista
  // pra ninguém lançar despesa numa linha que o DRE dele nem mostra.
  // O CMV sai da lista: compra de mercadoria entra pela nota fiscal, item a
  // item, senão o estoque fica sem a entrada e o produto sem custo novo.
  // Exceção: lançamento que JÁ está no CMV (compra antiga, sem itens) precisa
  // do grupo na lista pra poder ser corrigido sem trocar de linha do DRE.
  const cmvNaLista = gavetaEdicao?.alvo === 'despesa' && CONTA[normalizarCategoria(gavetaEdicao.despesa.categoria)]?.grupo === 'cmv'
  const gruposDisponiveis = GRUPOS.filter(
    (g) => (g.id !== 'cmv' || cmvNaLista) && (g.id !== 'franqueadora' || pagaFranqueadora(cfg?.tipoNegocio)),
  )
  const [etapa, setEtapa] = useState(0)
  const [modo, setModo] = useState<'form' | 'importar'>('form')
  const [cameraAberta, setCameraAberta] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Estado dos formulários
  const [despesa, setDespesa] = useState(DESPESA_VAZIA)
  const [nota, setNota] = useState(NOTA_VAZIA)
  const [produto, setProduto] = useState({ nome: '', categoria: 'Hortifrúti', unidade: 'kg', custo: '', minimo: '', fornecedor: '', cmv: true })
  const [fecha, setFecha] = useState({ pix: '', cartao: '', dinheiro: '', delivery: '', outras: '' })
  const [estoque, setEstoque] = useState({ tipo: MOVIMENTOS[0] as string, produtoId: '', quantidade: '', obs: '' })
  /** Campos que vieram da leitura da foto — ficam destacados pra conferência. */
  const [iaPreencheu, setIaPreencheu] = useState<string[]>([])
  const daIA = (campo: string) => iaPreencheu.includes(campo)

  /** Trocar de grupo leva a conta pra primeira do grupo novo. */
  function trocarGrupo(g: GrupoDRE) {
    setDespesa((d) => ({ ...d, grupo: g, conta: contasParaLancar(g)[0]?.id ?? 'variavel_outros' }))
  }

  /**
   * Abrir a gaveta zera os formulários. Quando ela abriu para corrigir um
   * lançamento, o formulário já nasce com o que está gravado — é o mesmo
   * caminho de sempre, só que a confirmação grava por cima.
   */
  useEffect(() => {
    setEtapa(0)
    setModo('form')
    setIaPreencheu([])
    setProduto(
      gavetaEdicao?.alvo === 'produto'
        ? {
            nome: gavetaEdicao.produto.nome,
            categoria: gavetaEdicao.produto.categoria,
            unidade: gavetaEdicao.produto.unidade,
            custo: custoFormatado(gavetaEdicao.produto.custoAtual),
            minimo: gavetaEdicao.produto.estoqueMinimo ? String(gavetaEdicao.produto.estoqueMinimo) : '',
            fornecedor: gavetaEdicao.produto.fornecedor,
            cmv: gavetaEdicao.produto.entraNoCmv,
          }
        : { nome: '', categoria: 'Hortifrúti', unidade: 'kg', custo: '', minimo: '', fornecedor: '', cmv: true },
    )
    setEstoque({ tipo: MOVIMENTOS[0], produtoId: '', quantidade: '', obs: '' })

    if (gavetaEdicao?.alvo === 'despesa') {
      const d = gavetaEdicao.despesa
      const conta = normalizarCategoria(d.categoria)
      setDespesa({
        fornecedor: d.fornecedor,
        valor: valorFormatado(d.valorTotal),
        grupo: CONTA[conta]?.grupo ?? 'ocupacao',
        conta,
        data: d.dataCompetencia.slice(0, 10),
        pagamento: chipDoPagamento(d.formaPagamento, d.status),
        vencimento: d.dataVencimento?.slice(0, 10) ?? '',
        obs: d.observacao ?? '',
        repete: d.recorrente,
      })
      setNota({ ...NOTA_VAZIA, data: hojeISO(), itens: [ITEM_VAZIO] })
      return
    }

    if (gavetaEdicao?.alvo === 'nota') {
      const n = gavetaEdicao.nota
      setNota({
        fornecedor: n.fornecedor,
        data: n.data.slice(0, 10),
        pagamento: chipDoPagamento(n.formaPagamento, n.status),
        vencimento: n.vencimento?.slice(0, 10) ?? '',
        obs: n.lancamentos[0]?.observacao ?? '',
        itens: n.itens.length
          ? n.itens.map((i) => ({
              produtoId: i.produtoId,
              quantidade: String(i.quantidade).replace('.', ','),
              preco: valorFormatado(i.precoUnitario),
            }))
          : [ITEM_VAZIO],
      })
      setDespesa({ ...DESPESA_VAZIA, data: hojeISO() })
      return
    }

    setDespesa({ ...DESPESA_VAZIA, data: hojeISO() })
    setNota({ ...NOTA_VAZIA, data: hojeISO(), itens: [ITEM_VAZIO] })
  }, [gaveta, gavetaEdicao])

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
  /** Corrigindo? A gaveta é a mesma, o rótulo é que não pode mentir. */
  const corrigindo =
    (gaveta === 'despesa' && gavetaEdicao?.alvo === 'despesa') ||
    (gaveta === 'compra' && gavetaEdicao?.alvo === 'nota') ||
    (gaveta === 'produto' && gavetaEdicao?.alvo === 'produto')
  const base = TITULOS[gaveta]
  const meta = corrigindo
    ? {
        ...base,
        titulo: gaveta === 'compra' ? 'Corrigir nota fiscal' : gaveta === 'produto' ? 'Editar produto' : 'Corrigir despesa',
        sub: gaveta === 'compra' ? 'A nota inteira é regravada' : gaveta === 'produto' ? 'Cadastro do estoque' : 'Conta da casa já lançada',
        etapas: [base.etapas[0], 'Confere', 'Pronto'],
      }
    : base

  const porId = new Map(produtos.map((p) => [p.id, p]))
  /** Linhas da nota que já dá pra salvar: produto escolhido e quantidade. */
  const itensValidos = nota.itens
    .map((i) => ({ ...i, produto: porId.get(i.produtoId) }))
    .filter((i) => i.produto && soNum(i.quantidade) > 0)
  const totalNota = itensValidos.reduce((s2, i) => s2 + soNum(i.quantidade) * soNum(i.preco), 0)

  /** Trava o "Continuar": nota sem item e movimento sem produto não existem. */
  const podeAvancar =
    gaveta === 'compra' ? itensValidos.length > 0 && totalNota > 0 && (nota.pagamento !== 'Ainda vou pagar' || !!nota.vencimento)
    : gaveta === 'despesa' ? despesa.pagamento !== 'Ainda vou pagar' || !!despesa.vencimento
    : gaveta === 'produto' ? produto.nome.trim().length > 0
    : gaveta === 'estoque' ? !!estoque.produtoId && soNum(estoque.quantidade) > 0
    : true

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
        ...(despesa.pagamento === 'Ainda vou pagar' ? [{ rot: 'Vencimento', val: despesa.vencimento.split('-').reverse().join('/') }] : []),
      ]
    if (gaveta === 'compra')
      return [
        { rot: 'Fornecedor', val: nota.fornecedor || '—' },
        { rot: 'Itens', val: `${itensValidos.length}` },
        { rot: 'Data', val: nota.data.split('-').reverse().join('/') },
        { rot: 'Pagamento', val: nota.pagamento },
        ...(nota.pagamento === 'Ainda vou pagar' ? [{ rot: 'Vencimento', val: nota.vencimento.split('-').reverse().join('/') }] : []),
        { rot: 'Total da nota', val: brl(totalNota) },
      ]
    if (gaveta === 'produto')
      return [
        { rot: 'Produto', val: produto.nome || '—' },
        { rot: 'Categoria', val: produto.categoria },
        { rot: 'Custo', val: brl(soNum(produto.custo)) + ' / ' + produto.unidade },
      ]
    if (gaveta === 'fechamento') {
      const apps = VENDA_APP_DEMO.ifood.bruto
      const loja = soNum(fecha.pix) + soNum(fecha.cartao) + soNum(fecha.dinheiro)
      return [
        { rot: 'Vendas delivery', val: brl(apps) },
        { rot: 'Vendas loja própria', val: brl(loja) },
        { rot: 'Venda delivery próprio', val: brl(soNum(fecha.delivery)) },
        { rot: 'Outras receitas', val: brl(soNum(fecha.outras)) },
        { rot: 'Total do dia', val: brl(apps + loja + soNum(fecha.delivery) + soNum(fecha.outras)) },
      ]
    }
    const doEstoque = porId.get(estoque.produtoId)
    return [
      { rot: 'Movimento', val: estoque.tipo },
      { rot: 'Produto', val: doEstoque?.nome ?? '—' },
      { rot: 'Quantidade', val: `${estoque.quantidade || '0'} ${doEstoque?.unidade ?? ''}`.trim() },
      { rot: 'Valor no estoque', val: brl(soNum(estoque.quantidade) * (doEstoque?.custoAtual ?? 0)) },
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
    } else if (gaveta === 'compra') {
      if (dados.fornecedor) { setNota((n) => ({ ...n, fornecedor: dados.fornecedor! })); vindos.push('fornecedor') }
      if (dados.obs) { setNota((n) => ({ ...n, obs: dados.obs! })); vindos.push('obs') }
    } else if (gaveta === 'produto') {
      if (dados.produto) { setProduto((p) => ({ ...p, nome: dados.produto! })); vindos.push('nome') }
      // Normaliza: a IA pode devolver "hortifruti" ou "quilo" e o chip não casaria.
      if (dados.categoria) { setProduto((p) => ({ ...p, categoria: normalizarCategoriaProduto(dados.categoria) })); vindos.push('categoria') }
      if (dados.unidade) { setProduto((p) => ({ ...p, unidade: normalizarUnidade(dados.unidade) })); vindos.push('unidade') }
      if (dados.custo) { setProduto((p) => ({ ...p, custo: (dados.custo! / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) })); vindos.push('custo') }
      if (dados.fornecedor) { setProduto((p) => ({ ...p, fornecedor: dados.fornecedor! })); vindos.push('fornecedorProduto') }
      if (typeof dados.entraNoCmv === 'boolean') { setProduto((p) => ({ ...p, cmv: dados.entraNoCmv! })); vindos.push('cmv') }
    } else if (gaveta === 'estoque') {
      // A IA devolve o nome lido; só vale se casar com um produto cadastrado.
      if (dados.produto) {
        const achado = produtos.find((p) => p.nome.toLowerCase().trim() === dados.produto!.toLowerCase().trim())
        if (achado) { setEstoque((e) => ({ ...e, produtoId: achado.id })); vindos.push('produto') }
      }
      if (dados.quantidade) { setEstoque((e) => ({ ...e, quantidade: String(dados.quantidade) })); vindos.push('quantidade') }
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

  /**
   * Correção nunca grava direto: o modal mostra o que muda antes de o valor
   * antigo deixar de existir. Lançamento novo continua sendo só "Confirmar" —
   * a etapa "Confere" já é a conferência dele.
   */
  function pedirConfirmacao() {
    if (!corrigindo) return salvar()
    confirmar({
      gravidade: 'atencao',
      titulo: gaveta === 'compra' ? 'Salvar a nota corrigida?' : 'Salvar a correção?',
      texto:
        gaveta === 'produto'
          ? 'O cadastro do produto é atualizado. O histórico de notas e entradas no estoque continua como está.'
        : gaveta === 'compra'
          ? 'A nota é regravada inteira: as entradas de estoque desta nota são refeitas e o custo dos produtos volta a sair da compra mais recente. O caixa e o DRE passam a ler os valores novos.'
          : 'O lançamento antigo deixa de existir com os valores de antes. O caixa, o DRE e o Plano do mês passam a ler os valores novos.',
      resumo: resumoDaCorrecao(),
      rotuloCancelar: 'Voltar e revisar',
      rotuloConfirmar: 'Salvar alterações',
      onConfirmar: () => void salvar(),
    })
  }

  /** O que muda: valor de antes → valor de agora, só nas linhas que mudaram. */
  function resumoDaCorrecao(): { rot: string; val: string }[] {
    if (gavetaEdicao?.alvo === 'despesa') {
      const d = gavetaEdicao.despesa
      const linhas: { rot: string; val: string }[] = []
      if (d.fornecedor !== despesa.fornecedor) linhas.push({ rot: 'Fornecedor', val: `${d.fornecedor} → ${despesa.fornecedor || '—'}` })
      if (d.valorTotal !== soNum(despesa.valor)) linhas.push({ rot: 'Valor', val: `${brl(d.valorTotal)} → ${brl(soNum(despesa.valor))}` })
      if (normalizarCategoria(d.categoria) !== despesa.conta)
        linhas.push({ rot: 'Conta', val: `${CONTA[normalizarCategoria(d.categoria)]?.nome} → ${CONTA[despesa.conta]?.nome}` })
      if (d.dataCompetencia.slice(0, 10) !== despesa.data)
        linhas.push({ rot: 'Competência', val: `${dataBR(d.dataCompetencia)} → ${dataBR(despesa.data)}` })
      const pg = chipDoPagamento(d.formaPagamento, d.status)
      if (pg !== despesa.pagamento) linhas.push({ rot: 'Pagamento', val: `${pg} → ${despesa.pagamento}` })
      return linhas.length ? linhas : [{ rot: 'Nada mudou', val: brl(d.valorTotal) }]
    }
    if (gavetaEdicao?.alvo === 'nota') {
      const n = gavetaEdicao.nota
      return [
        { rot: 'Fornecedor', val: n.fornecedor === nota.fornecedor ? nota.fornecedor || '—' : `${n.fornecedor} → ${nota.fornecedor || '—'}` },
        { rot: 'Itens', val: n.itens.length === itensValidos.length ? `${itensValidos.length}` : `${n.itens.length} → ${itensValidos.length}` },
        { rot: 'Total da nota', val: n.valorTotal === totalNota ? brl(totalNota) : `${brl(n.valorTotal)} → ${brl(totalNota)}` },
      ]
    }
    return resumo
  }

  async function salvar() {
    if (salvando) return
    setSalvando(true)
    try {
      await gravar()
      setEtapa(2)
    } catch (e) {
      // Sem isso o erro morria numa promise não tratada: a gaveta ficava parada
      // no "Confirmar" e o lançamento simplesmente não existia.
      console.error('lançamento:', e)
      adicionarToast({
        tipo: 'erro',
        titulo: 'Não deu pra salvar',
        texto: mensagemDeErro(e, 'O lançamento não entrou no banco. Tente de novo.'),
      })
    } finally {
      setSalvando(false)
    }
  }

  async function gravar() {
    if (gaveta === 'despesa') {
      const campos = {
        fornecedor: despesa.fornecedor || 'Fornecedor',
        valorTotal: soNum(despesa.valor),
        categoria: despesa.conta,
        dataCompetencia: despesa.data,
        ...pagamentoParaDoc(despesa.pagamento, gavetaEdicao?.alvo === 'despesa' ? gavetaEdicao.despesa : undefined),
        observacao: despesa.obs,
        recorrente: despesa.repete,
        dataVencimento: despesa.pagamento === 'Ainda vou pagar' ? despesa.vencimento : '',
        // Corrigir não muda a natureza do lançamento: uma compra antiga sem
        // itens continua sendo compra, senão ela pulava de aba sozinha.
        tipoLancamento:
          gavetaEdicao?.alvo === 'despesa'
            ? gavetaEdicao.despesa.tipoLancamento ?? (CONTA[despesa.conta]?.grupo === 'cmv' ? 'compra' : 'conta')
            : ('conta' as const),
      }
      if (gavetaEdicao?.alvo === 'despesa') {
        await atualizarDespesa.mutateAsync({ id: gavetaEdicao.despesa.id, dados: campos })
        adicionarToast({
          tipo: 'sucesso',
          titulo: 'Lançamento corrigido',
          texto: `${brl(campos.valorTotal)} em ${CONTA[despesa.conta]?.nome}. Caixa e DRE já leem o valor novo.`,
        })
        return
      }
      const d = await criarDespesa.mutateAsync(campos)
      toastComDesfazer('Tá no caixa!', `${brl(soNum(despesa.valor))} entraram em ${CONTA[despesa.conta]?.nome}.`, [{ colecao: 'despesas', id: d.id }])
    } else if (gaveta === 'compra') {
      const entrada = {
        fornecedor: nota.fornecedor,
        data: nota.data,
        ...pagamentoParaDoc(nota.pagamento, gavetaEdicao?.alvo === 'nota' ? gavetaEdicao.nota : undefined),
        vencimento: nota.pagamento === 'Ainda vou pagar' ? nota.vencimento : undefined,
        observacao: nota.obs,
        itens: itensValidos.map((i) => ({
          produtoId: i.produtoId,
          quantidade: soNum(i.quantidade),
          precoUnitario: soNum(i.preco),
        })),
      }
      if (gavetaEdicao?.alvo === 'nota') {
        const n = await atualizarNota.mutateAsync({ notaId: gavetaEdicao.nota.id, entrada })
        adicionarToast({
          tipo: 'sucesso',
          titulo: 'Nota corrigida',
          texto: `${brl(n.valorTotal)} em ${n.itens} ${n.itens === 1 ? 'item' : 'itens'} — estoque, custo dos produtos e CMV refeitos.`,
        })
        return
      }
      const n = await criarNota.mutateAsync(entrada)
      toastComDesfazer(
        'Nota lançada',
        `${brl(n.valorTotal)} em ${n.itens} ${n.itens === 1 ? 'item' : 'itens'} — estoque e CMV atualizados.`,
        n.criados,
      )
    } else if (gaveta === 'produto') {
      const campos = {
        nome: produto.nome || 'Produto',
        categoria: produto.categoria,
        unidade: produto.unidade,
        custoAtual: soNum(produto.custo),
        estoqueMinimo: soNum(produto.minimo),
        fornecedor: produto.fornecedor,
        entraNoCmv: produto.cmv,
      }
      if (gavetaEdicao?.alvo === 'produto') {
        await editarProduto.mutateAsync({ id: gavetaEdicao.produto.id, dados: campos })
        adicionarToast({ tipo: 'sucesso', titulo: 'Produto atualizado', texto: `${campos.nome} · cadastro salvo.` })
        return
      }
      const p = await criarProduto.mutateAsync(campos)
      toastComDesfazer('Produto cadastrado', `${produto.nome || 'Produto'} entrou no estoque.`, [{ colecao: 'produtos', id: p.id }])
    } else if (gaveta === 'fechamento') {
      const f = await criarFechamento.mutateAsync({
        pix: soNum(fecha.pix),
        cartao: soNum(fecha.cartao),
        dinheiro: soNum(fecha.dinheiro),
        delivery: soNum(fecha.delivery),
        outras: soNum(fecha.outras),
      })
      toastComDesfazer('Vendas lançadas', `${brl(f.totalDia)} lançados no caixa de hoje.`, [{ colecao: 'receita_dia', id: f.id }])
    } else {
      const m = await criarMovimento.mutateAsync({
        tipo: estoque.tipo,
        produtoId: estoque.produtoId,
        quantidade: soNum(estoque.quantidade),
        observacao: estoque.obs,
      })
      toastComDesfazer(
        'Estoque atualizado',
        `${m.produto} · ${estoque.quantidade} ${porId.get(estoque.produtoId)?.unidade ?? ''}`.trim(),
        [{ colecao: 'movimentos_estoque', id: m.movimentoId }],
      )
    }
  }

  return (
    <>
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
          {etapa === 0 && TIPO_IMPORT[gaveta] && !corrigindo && (
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
              <BotaoFoto
                rotulo={iaPreencheu.length ? 'Ler outra foto' : 'Tirar foto da nota'}
                apoio="A IA lê a nota e preenche os campos abaixo. Você só confere."
                aoClicar={() => setCameraAberta(true)}
              />
              <AvisoIA campos={iaPreencheu} />
              <Campo rotulo="Fornecedor" destaque={daIA('fornecedor')} placeholder="Ex: Hortifrúti Zona Sul" value={despesa.fornecedor} onChange={(e) => setDespesa({ ...despesa, fornecedor: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Quanto foi" destaque={daIA('valor')} placeholder="R$ 0,00" inputMode="decimal" value={despesa.valor} onChange={(e) => setDespesa({ ...despesa, valor: e.target.value })} />
                <Campo rotulo="Data da despesa" type="date" value={despesa.data} onChange={(e) => setDespesa({ ...despesa, data: e.target.value })} />
              </div>
              <div className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">
                Aqui entra conta da casa: aluguel, luz, folha, marketing.{' '}
                <strong className="font-bold text-tinta">Comprou mercadoria?</strong> Lance pela{' '}
                <button onClick={() => abrirGaveta('compra')} className="font-bold text-mar underline underline-offset-2">
                  nota fiscal
                </button>{' '}
                — assim o item entra no estoque e o custo do produto fica em dia.
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
                  {contasParaLancar(despesa.grupo).map((c) => (
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
              {despesa.pagamento === 'Ainda vou pagar' && (
                <Campo rotulo="Vencimento" type="date" value={despesa.vencimento} onChange={(e) => setDespesa({ ...despesa, vencimento: e.target.value })} />
              )}
              <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
                <span><span className="block text-sm font-bold text-tinta">Isso se repete todo mês</span><span className="block text-xs text-tinta-4">aluguel, contador, internet…</span></span>
                <Switch ligado={despesa.repete} aoTrocar={(v) => setDespesa({ ...despesa, repete: v })} />
              </label>
              <Campo rotulo="Observação · opcional" destaque={daIA('obs')} placeholder="Ex: compra de reposição do fim de semana" value={despesa.obs} onChange={(e) => setDespesa({ ...despesa, obs: e.target.value })} />
            </div>
          )}

          {etapa === 0 && modo === 'form' && gaveta === 'compra' && (
            <div className="flex flex-col gap-4">
              <BotaoFoto
                rotulo={iaPreencheu.length ? 'Ler outra foto' : 'Tirar foto da nota'}
                apoio="A IA lê o cabeçalho da nota. Os itens você confirma pelo cadastro."
                aoClicar={() => setCameraAberta(true)}
              />
              <AvisoIA campos={iaPreencheu} />
              <Campo rotulo="Fornecedor" destaque={daIA('fornecedor')} placeholder="Ex: Hortifrúti Zona Sul" value={nota.fornecedor} onChange={(e) => setNota({ ...nota, fornecedor: e.target.value })} />
              <Campo rotulo="Data da nota" type="date" value={nota.data} onChange={(e) => setNota({ ...nota, data: e.target.value })} />

              {produtos.length === 0 ? (
                <div className="rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-4">
                  <p className="text-sm text-insight-texto">
                    <strong className="font-bold">Nenhum produto cadastrado ainda.</strong> A nota é lançada item a
                    item, e cada item precisa ser um produto seu — é isso que liga a compra ao estoque e ao CMV.
                  </p>
                  <Button variante="secundario" onClick={() => abrirGaveta('produto')} className="mt-3">
                    Cadastrar o primeiro produto
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <span className="rotulo text-tinta-4">Itens da nota</span>
                  {nota.itens.map((item, i) => {
                    const p = porId.get(item.produtoId)
                    const anterior = p?.custoAtual ?? 0
                    const agora = soNum(item.preco)
                    const variacao = anterior > 0 && agora > 0 ? ((agora - anterior) / anterior) * 100 : null
                    return (
                      <div key={i} className="flex flex-col gap-3 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-3.5">
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <SeletorProduto
                              rotulo={`Item ${i + 1}`}
                              produtos={produtos}
                              valor={item.produtoId}
                              aoTrocar={(id) =>
                                setNota((n) => ({
                                  ...n,
                                  // Traz o último custo do cadastro: na maioria das
                                  // compras o preço repete, e o que muda a gente destaca.
                                  itens: n.itens.map((x, j) =>
                                    j === i
                                      ? { ...x, produtoId: id, preco: x.preco || custoFormatado(porId.get(id)?.custoAtual) }
                                      : x,
                                  ),
                                }))
                              }
                            />
                          </div>
                          {nota.itens.length > 1 && (
                            <button
                              onClick={() => setNota((n) => ({ ...n, itens: n.itens.filter((_, j) => j !== i) }))}
                              className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-botao text-tinta-4 transition hover:bg-preenchimento hover:text-telha-alerta"
                              aria-label={`Tirar item ${i + 1}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Campo
                            rotulo={`Quantidade${p ? ` · ${p.unidade}` : ''}`}
                            inputMode="decimal"
                            placeholder="0"
                            value={item.quantidade}
                            onChange={(e) => setNota((n) => ({ ...n, itens: n.itens.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)) }))}
                          />
                          <Campo
                            rotulo="Preço unitário"
                            inputMode="decimal"
                            placeholder="R$ 0,00"
                            value={item.preco}
                            onChange={(e) => setNota((n) => ({ ...n, itens: n.itens.map((x, j) => (j === i ? { ...x, preco: e.target.value } : x)) }))}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn('font-semibold', (variacao ?? 0) >= ALTA_RELEVANTE ? 'text-telha-alerta' : 'text-tinta-4')}>
                            {variacao === null || Math.abs(variacao) < 0.5
                              ? p ? `último custo ${brl(anterior)}` : 'escolha o produto'
                              : `${variacao > 0 ? 'subiu' : 'caiu'} ${Math.abs(variacao).toFixed(0)}% vs. ${brl(anterior)}`}
                          </span>
                          <span className="mono font-bold text-tinta">{brl(soNum(item.quantidade) * agora)}</span>
                        </div>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => setNota((n) => ({ ...n, itens: [...n.itens, ITEM_VAZIO] }))}
                    className="flex items-center justify-center gap-1.5 rounded-campo border border-dashed border-[rgba(46,95,115,0.3)] py-2.5 text-sm font-bold text-mar transition hover:bg-preenchimento"
                  >
                    <Plus size={16} /> Adicionar item
                  </button>
                  <div className="flex items-center justify-between rounded-cartao bg-preenchimento/60 px-4 py-3">
                    <span className="text-sm font-bold text-tinta">Total da nota</span>
                    <span className="mono text-[17px] font-bold text-tinta">{brl(totalNota)}</span>
                  </div>
                </div>
              )}

              <div>
                <span className="rotulo mb-1.5 block text-tinta-4">Como pagou</span>
                <div className="flex flex-wrap gap-2">
                  {PAGAMENTOS.map((p) => <Chip key={p} rotulo={p} selecionado={nota.pagamento === p} aoClicar={() => setNota({ ...nota, pagamento: p })} />)}
                </div>
              </div>
              {nota.pagamento === 'Ainda vou pagar' && (
                <div className="flex flex-col gap-1.5">
                  <Campo rotulo="Vencimento do boleto" type="date" value={nota.vencimento} onChange={(e) => setNota({ ...nota, vencimento: e.target.value })} />
                  <p className="text-xs text-tinta-4">É com essa data que o Início avisa “vence hoje” ou “vencido há X dias”.</p>
                </div>
              )}
              <Campo rotulo="Observação · opcional" destaque={daIA('obs')} placeholder="Ex: entrega da semana" value={nota.obs} onChange={(e) => setNota({ ...nota, obs: e.target.value })} />
              <p className="text-xs text-tinta-4">
                A nota dá entrada no estoque, atualiza o custo de cada produto e entra no CMV do DRE — tudo de uma vez.
              </p>
            </div>
          )}

          {etapa === 0 && modo === 'form' && gaveta === 'produto' && (
            <div className="flex flex-col gap-4">
              {gavetaEdicao?.alvo !== 'produto' && (
                <>
                  <BotaoFoto
                    rotulo={iaPreencheu.length ? 'Ler outra foto' : 'Tirar foto do produto'}
                    apoio="A IA lê o rótulo e preenche os campos abaixo. Você só confere."
                    aoClicar={() => setCameraAberta(true)}
                  />
                  <AvisoIA campos={iaPreencheu} />
                </>
              )}
              <Campo rotulo="Nome do produto" destaque={daIA('nome')} placeholder="Grão de bico seco" value={produto.nome} onChange={(e) => setProduto({ ...produto, nome: e.target.value })} />
              <div className={cn(daIA('categoria') && 'rounded-campo border border-telhado/40 bg-insight-fundo/40 p-3')}>
                <span className="rotulo mb-1.5 block text-tinta-4">Categoria</span>
                <div className="flex flex-wrap gap-2">{CATEGORIAS_PRODUTO.map((c) => <Chip key={c} rotulo={c} selecionado={produto.categoria === c} aoClicar={() => setProduto({ ...produto, categoria: c })} />)}</div>
              </div>
              <div className={cn(daIA('unidade') && 'rounded-campo border border-telhado/40 bg-insight-fundo/40 p-3')}>
                <span className="rotulo mb-1.5 block text-tinta-4">Unidade de medida</span>
                <div className="flex flex-wrap gap-2">{UNIDADES_PRODUTO.map((u) => <Chip key={u} rotulo={u} selecionado={produto.unidade === u} aoClicar={() => setProduto({ ...produto, unidade: u })} />)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Custo de hoje" destaque={daIA('custo')} placeholder="R$ 9,80" inputMode="decimal" value={produto.custo} onChange={(e) => setProduto({ ...produto, custo: e.target.value })} />
                <Campo rotulo="Estoque mínimo" placeholder="15 kg" value={produto.minimo} onChange={(e) => setProduto({ ...produto, minimo: e.target.value })} />
              </div>
              <Campo rotulo="Fornecedor padrão" destaque={daIA('fornecedorProduto')} placeholder="Casa Líbano" value={produto.fornecedor} onChange={(e) => setProduto({ ...produto, fornecedor: e.target.value })} />
              <label className={cn('flex items-center justify-between rounded-campo border bg-superficie px-4 py-3', daIA('cmv') ? 'border-telhado/40 bg-insight-fundo/40' : 'border-[rgba(46,95,115,0.14)]')}>
                <span className="block text-sm font-bold text-tinta">Entra no CMV</span>
                <Switch ligado={produto.cmv} aoTrocar={(v) => setProduto({ ...produto, cmv: v })} />
              </label>
            </div>
          )}

          {etapa === 0 && modo === 'form' && gaveta === 'fechamento' && (
            <div className="flex flex-col gap-4">
              {receitaPdvHoje && (
                <div className="rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-3.5 text-sm text-insight-texto">
                  <strong className="font-bold">O PDV já fechou as vendas de hoje ({brl(receitaPdvHoje.totalDia)}).</strong> Se lançar aqui também, a mesma venda entra duas vezes no DRE — use só pra o que o PDV não registra.
                </div>
              )}
              <div className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-4">
                <span className="rotulo text-tinta-4">Vendas delivery · já veio do iFood</span>
                <div className="mt-2 flex items-center justify-between text-sm"><span className="text-tinta-2">iFood · {VENDA_APP_DEMO.ifood.pedidos} pedidos · taxa {brl(VENDA_APP_DEMO.ifood.taxa)}</span><span className="mono font-bold">{brl(VENDA_APP_DEMO.ifood.bruto)}</span></div>
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
              <BotaoFoto
                rotulo={iaPreencheu.length ? 'Ler outra foto' : 'Tirar foto da mercadoria'}
                apoio="A IA lê a mercadoria e acha o produto no seu cadastro."
                aoClicar={() => setCameraAberta(true)}
              />
              <AvisoIA campos={iaPreencheu} />

              {produtos.length === 0 ? (
                <div className="rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-4">
                  <p className="text-sm text-insight-texto">
                    <strong className="font-bold">Cadastre um produto primeiro.</strong> Todo movimento de estoque é
                    sobre um produto seu — sem isso o mesmo item vira dois nomes diferentes e a contagem não bate.
                  </p>
                  <Button variante="secundario" onClick={() => abrirGaveta('produto')} className="mt-3">
                    Cadastrar o primeiro produto
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <span className="rotulo mb-1.5 block text-tinta-4">O que aconteceu</span>
                    <div className="flex flex-wrap gap-2">{MOVIMENTOS.map((o) => <Chip key={o} rotulo={o} selecionado={estoque.tipo === o} aoClicar={() => setEstoque({ ...estoque, tipo: o })} />)}</div>
                  </div>
                  <SeletorProduto
                    rotulo="Produto"
                    produtos={produtos}
                    valor={estoque.produtoId}
                    destaque={daIA('produto')}
                    aoTrocar={(id) => setEstoque({ ...estoque, produtoId: id })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Campo
                      rotulo={`Quantidade${porId.get(estoque.produtoId) ? ` · ${porId.get(estoque.produtoId)!.unidade}` : ''}`}
                      destaque={daIA('quantidade')}
                      inputMode="decimal"
                      placeholder="0"
                      value={estoque.quantidade}
                      onChange={(e) => setEstoque({ ...estoque, quantidade: e.target.value })}
                    />
                    <div className="flex flex-col gap-1.5">
                      <span className="rotulo text-tinta-4">Custo do cadastro</span>
                      <span className="flex items-center rounded-campo border border-[rgba(46,95,115,0.14)] bg-preenchimento/50 px-3.5 py-2.5 text-[15px] text-tinta-3">
                        {porId.get(estoque.produtoId) ? brl(porId.get(estoque.produtoId)!.custoAtual) : '—'}
                      </span>
                    </div>
                  </div>
                  <Campo rotulo="Observação · opcional" placeholder="Ex: caixa quebrou na entrega" value={estoque.obs} onChange={(e) => setEstoque({ ...estoque, obs: e.target.value })} />
                  <div className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">
                    Isso não mexe no caixa. <strong className="font-bold text-tinta">Entrou mercadoria?</strong> Lance
                    pela{' '}
                    <button onClick={() => abrirGaveta('compra')} className="font-bold text-mar underline underline-offset-2">
                      nota fiscal
                    </button>{' '}
                    — é ela que tem fornecedor, preço e vira despesa.
                  </div>
                </>
              )}
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
                {corrigindo ? (
                  <>
                    A correção fica registrada como{' '}
                    <strong className="font-semibold text-tinta-2">{nome}</strong>, hoje às {hora}. Quem lançou
                    continua sendo{' '}
                    <strong className="font-semibold text-tinta-2">
                      {gavetaEdicao?.alvo === 'despesa' ? gavetaEdicao.despesa.criadoPorNome : gavetaEdicao?.alvo === 'nota' ? gavetaEdicao.nota.quem : ''}
                    </strong>
                    .
                  </>
                ) : (
                  <>
                    Vai ficar registrado como <strong className="font-semibold text-tinta-2">{nome}</strong>, hoje às {hora}, pelo computador da loja.
                  </>
                )}
              </p>
              {gaveta === 'despesa' && (
                <div className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">
                  No DRE isso entra em <strong className="font-bold text-tinta">{GRUPOS.find((g) => g.id === despesa.grupo)?.nome}</strong>, na conta <strong className="font-bold text-tinta">{CONTA[despesa.conta]?.nome}</strong>.
                </div>
              )}
              {gaveta === 'compra' && (
                <div className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">
                  Cada item entra no estoque e atualiza o custo do produto. No DRE o valor cai no{' '}
                  <strong className="font-bold text-tinta">CMV</strong>, na conta de cada produto — e aparece em
                  Compras, separado das contas da casa.
                </div>
              )}
            </div>
          )}

          {etapa === 2 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-mata/15 text-mata">✓</div>
              <h3 className="text-tinta" style={{ fontSize: 18, fontWeight: 800 }}>Pronto!</h3>
              <p className="max-w-xs text-sm text-tinta-3">
                {corrigindo
                  ? 'A correção já valeu no painel inteiro e ficou registrada no “Quem mexeu no quê”.'
                  : 'O lançamento já entrou no painel e aparece no “Quem mexeu no quê”.'}
              </p>
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
                <Button
                  variante="primario"
                  disabled={(etapa === 0 && !podeAvancar) || salvando}
                  onClick={() => (etapa === 0 ? setEtapa(1) : pedirConfirmacao())}
                >
                  {etapa === 0 ? 'Continuar' : salvando ? 'Salvando…' : corrigindo ? 'Salvar alterações' : 'Confirmar'}
                </Button>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      {/* Modal de câmera — FORA do backdrop da gaveta de propósito. Dentro
       * dele, qualquer clique aqui borbulhava até o onClick={fecharGaveta} e
       * derrubava a gaveta inteira no meio da escolha da foto. */}
      {cameraAberta && gaveta && (
        <CapturaFoto
          tipo={gaveta === 'despesa' || gaveta === 'compra' ? 'despesa' : gaveta === 'produto' ? 'produto' : 'estoque'}
          onExtrair={preencherComDadosDaFoto}
          onCancelar={() => setCameraAberta(false)}
        />
      )}
    </>
  )
}
