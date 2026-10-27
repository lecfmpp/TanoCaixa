import { useState, type ReactNode } from 'react'
import { Plus, X } from 'lucide-react'
import { Grafico } from './graficos'
import { formatarBRL, formatarNumero, formatarPct, lerNumero } from './formatar'
import type { IdWidget } from './tipos'

/* ------------------------------------------------------------------ *
 * Calculadoras dos posts. Todas rodam no navegador (sem enviar dados).
 * Os valores iniciais são EXEMPLOS ilustrativos, sempre avisados na tela.
 * ------------------------------------------------------------------ */

function Casca({ rotulo, titulo, subtitulo, children, aviso }: { rotulo: string; titulo: string; subtitulo: string; children: ReactNode; aviso?: string }) {
  return (
    <section className="my-10 overflow-hidden rounded-cartao-g border border-[rgba(46,95,115,0.18)] bg-superficie shadow-cartao" aria-label={titulo}>
      <header className="bg-mar px-5 py-4 text-creme tab:px-7">
        <div className="mono text-[11px] font-bold uppercase tracking-[0.08em] text-sol">{rotulo}</div>
        <h3 className="mt-1 text-[21px] font-extrabold leading-tight tracking-tight">{titulo}</h3>
        <p className="mt-1 text-sm text-creme/80">{subtitulo}</p>
      </header>
      <div className="px-5 py-5 tab:px-7">{children}</div>
      {aviso && <p className="border-t border-divisoria bg-preenchimento/50 px-5 py-3 text-xs leading-relaxed text-tinta-3 tab:px-7">{aviso}</p>}
    </section>
  )
}

function Campo({ rotulo, valor, onChange, prefixo, sufixo, dica }: { rotulo: string; valor: string; onChange: (v: string) => void; prefixo?: string; sufixo?: string; dica?: string }) {
  return (
    <label className="block">
      <span className="text-[13px] font-bold text-tinta-2">{rotulo}</span>
      <span className="mt-1 flex items-center rounded-campo border border-[rgba(46,95,115,0.22)] bg-white px-3 focus-within:border-mar focus-within:ring-2 focus-within:ring-mar/20">
        {prefixo && <span className="mono pr-2 text-sm text-tinta-4">{prefixo}</span>}
        <input
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className="mono w-full min-w-0 bg-transparent py-2.5 text-[15px] font-bold text-tinta outline-none"
        />
        {sufixo && <span className="mono pl-2 text-sm text-tinta-4">{sufixo}</span>}
      </span>
      {dica && <span className="mt-1 block text-xs text-tinta-4">{dica}</span>}
    </label>
  )
}

function Linha({ rotulo, valor, tom, forte }: { rotulo: string; valor: string; tom?: 'neg' | 'pos'; forte?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 border-b border-creme/15 py-2 ${forte ? 'text-base' : 'text-sm'}`}>
      <span className={forte ? 'font-bold' : 'text-creme/85'}>{rotulo}</span>
      <span className={`mono font-bold ${tom === 'neg' ? 'text-sol' : tom === 'pos' ? 'text-white' : ''}`}>{valor}</span>
    </div>
  )
}

function Resultado({ children, destaque }: { children: ReactNode; destaque?: ReactNode }) {
  return (
    <div className="mt-5 rounded-cartao bg-noite p-5 text-creme">
      {destaque}
      <div className="mt-1">{children}</div>
    </div>
  )
}

/* ------------------------------ iFood ------------------------------ */

function CalculadoraIfood() {
  const [preco, setPreco] = useState('60')
  const [comissao, setComissao] = useState('12')
  const [pagamento, setPagamento] = useState('3,2')
  const [cupom, setCupom] = useState('0')
  const [entrega, setEntrega] = useState('0')
  const [custo, setCusto] = useState('18')
  const [embalagem, setEmbalagem] = useState('1,5')
  const [imposto, setImposto] = useState('6')
  const [margemAlvo, setMargemAlvo] = useState('12')

  const p = lerNumero(preco)
  const com = lerNumero(comissao) / 100
  const pag = lerNumero(pagamento) / 100
  const imp = lerNumero(imposto) / 100
  const cup = lerNumero(cupom)
  const ent = lerNumero(entrega)
  const cus = lerNumero(custo)
  const emb = lerNumero(embalagem)

  const vComissao = p * com
  const vPagamento = p * pag
  const vImposto = p * imp
  const sobra = p - vComissao - vPagamento - vImposto - cup - ent - cus - emb
  const sobraPct = p > 0 ? (sobra / p) * 100 : 0

  const alvo = lerNumero(margemAlvo) / 100
  const denominador = 1 - com - pag - imp - alvo
  const precoMinimo = denominador > 0 ? (cup + ent + cus + emb) / denominador : NaN

  const pct = (v: number) => (p > 0 ? Math.max(0, (v / p) * 100) : 0)
  const partes = [
    { rotulo: 'Comissão do app', valor: pct(vComissao), tom: 'telha' as const },
    { rotulo: 'Pagamento online', valor: pct(vPagamento), tom: 'sol' as const },
    { rotulo: 'Imposto', valor: pct(vImposto), tom: 'areia' as const },
    { rotulo: 'Insumos do prato', valor: pct(cus), tom: 'mar' as const },
    { rotulo: 'Embalagem, entrega e cupom', valor: pct(emb + ent + cup), tom: 'cinza' as const },
    { rotulo: 'Sobra', valor: Math.max(0, pct(sobra)), tom: 'mata' as const },
  ].filter((x) => x.valor > 0)

  return (
    <Casca
      rotulo="Calculadora"
      titulo="Quanto sobra de um pedido de app"
      subtitulo="Troque pelos números do seu contrato e do seu prato."
      aviso="Cálculo simplificado, com exemplos ilustrativos: as taxas do iFood e de outros apps variam por plano, cidade e contrato. Confira os percentuais no painel do seu app e fale com seu contador sobre os impostos."
    >
      <div className="grid gap-4 cel:grid-cols-2 tab:grid-cols-3">
        <Campo rotulo="Preço do prato no app" valor={preco} onChange={setPreco} prefixo="R$" />
        <Campo rotulo="Comissão do app" valor={comissao} onChange={setComissao} sufixo="%" />
        <Campo rotulo="Taxa de pagamento online" valor={pagamento} onChange={setPagamento} sufixo="%" />
        <Campo rotulo="Custo dos insumos do prato" valor={custo} onChange={setCusto} prefixo="R$" dica="Soma dos ingredientes do prato" />
        <Campo rotulo="Embalagem" valor={embalagem} onChange={setEmbalagem} prefixo="R$" />
        <Campo rotulo="Imposto sobre a venda" valor={imposto} onChange={setImposto} sufixo="%" dica="Ex.: alíquota do seu regime" />
        <Campo rotulo="Cupom que você banca" valor={cupom} onChange={setCupom} prefixo="R$" />
        <Campo rotulo="Entrega paga por você" valor={entrega} onChange={setEntrega} prefixo="R$" />
        <Campo rotulo="Margem que você quer ter" valor={margemAlvo} onChange={setMargemAlvo} sufixo="%" />
      </div>

      <Resultado
        destaque={
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-creme/70">Sobra por pedido</div>
              <div className={`mono text-[40px] font-bold leading-none ${sobra < 0 ? 'text-sol' : 'text-white'}`}>{formatarBRL(sobra)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-creme/70">Margem</div>
              <div className={`mono text-2xl font-bold ${sobra < 0 ? 'text-sol' : 'text-white'}`}>{formatarPct(sobraPct)}</div>
            </div>
          </div>
        }
      >
        <Linha rotulo="Comissão do app" valor={`− ${formatarBRL(vComissao)}`} />
        <Linha rotulo="Pagamento online" valor={`− ${formatarBRL(vPagamento)}`} />
        <Linha rotulo="Imposto" valor={`− ${formatarBRL(vImposto)}`} />
        <Linha rotulo="Insumos do prato" valor={`− ${formatarBRL(cus)}`} />
        <Linha rotulo="Embalagem, entrega e cupom" valor={`− ${formatarBRL(emb + ent + cup)}`} />
        <Linha rotulo={`Preço mínimo para ${formatarPct(lerNumero(margemAlvo))} de margem`} valor={Number.isFinite(precoMinimo) ? formatarBRL(precoMinimo) : 'impossível com essas taxas'} tom={Number.isFinite(precoMinimo) ? 'pos' : 'neg'} forte />
        {sobra < 0 && <p className="mt-3 text-sm text-sol">Com esses números, cada pedido deste prato dá prejuízo. Veja abaixo onde está o peso.</p>}
      </Resultado>

      {partes.length > 0 && (
        <Grafico bloco={{ t: 'grafico', tipo: 'empilhada', titulo: 'Para onde vai cada R$ 100 do pedido', subtitulo: 'Em % do preço do prato no app', partes, formato: 'pct' }} />
      )}
    </Casca>
  )
}

/* ------------------------------- CMV -------------------------------- */

function CalculadoraCmv() {
  const [inicial, setInicial] = useState('8000')
  const [compras, setCompras] = useState('24000')
  const [final, setFinal] = useState('7000')
  const [faturamento, setFaturamento] = useState('80000')

  const ei = lerNumero(inicial)
  const co = lerNumero(compras)
  const ef = lerNumero(final)
  const fat = lerNumero(faturamento)
  const cmv = ei + co - ef
  const cmvPct = fat > 0 ? (cmv / fat) * 100 : 0
  const bruto = fat - cmv
  const leitura =
    fat <= 0
      ? 'Informe o faturamento do período.'
      : cmvPct < 28
        ? 'Abaixo da faixa que muita gente usa como referência (28% a 35%). Bom sinal, mas confira se todas as compras do mês foram lançadas.'
        : cmvPct <= 35
          ? 'Dentro da faixa que muita gente usa como referência (28% a 35%). O ideal varia com o tipo de cozinha e com o seu preço.'
          : 'Acima da faixa que muita gente usa como referência (28% a 35%). Olhe preço de compra, tamanho da porção, perda e desperdício.'

  return (
    <Casca
      rotulo="Calculadora"
      titulo="Calcule o CMV do seu mês"
      subtitulo="CMV = estoque inicial + compras − estoque final."
      aviso="Os valores iniciais são um exemplo. Use o estoque contado no primeiro e no último dia do período e as compras de mercadoria (não inclua aluguel, folha nem energia). Vale por mês, por semana ou por cardápio."
    >
      <div className="grid gap-4 cel:grid-cols-2">
        <Campo rotulo="Estoque no início do período" valor={inicial} onChange={setInicial} prefixo="R$" />
        <Campo rotulo="Compras de mercadoria no período" valor={compras} onChange={setCompras} prefixo="R$" />
        <Campo rotulo="Estoque no fim do período" valor={final} onChange={setFinal} prefixo="R$" />
        <Campo rotulo="Faturamento do período" valor={faturamento} onChange={setFaturamento} prefixo="R$" />
      </div>
      <Resultado
        destaque={
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-creme/70">CMV do período</div>
              <div className="mono text-[40px] font-bold leading-none text-white">{formatarBRL(cmv)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-creme/70">CMV em % do faturamento</div>
              <div className="mono text-2xl font-bold text-white">{formatarPct(cmvPct)}</div>
            </div>
          </div>
        }
      >
        <Linha rotulo="Sobra depois do custo da mercadoria" valor={`${formatarBRL(bruto)} (${formatarPct(fat > 0 ? (bruto / fat) * 100 : 0)})`} forte />
        <p className="mt-3 text-sm text-creme/85">{leitura}</p>
      </Resultado>
    </Casca>
  )
}

/* ------------------------- Ponto de equilíbrio ---------------------- */

function CalculadoraEquilibrio() {
  const [fixos, setFixos] = useState('28000')
  const [variaveis, setVariaveis] = useState('38')
  const [ticket, setTicket] = useState('70')
  const [dias, setDias] = useState('26')

  const f = lerNumero(fixos)
  const v = lerNumero(variaveis) / 100
  const t = lerNumero(ticket)
  const d = Math.max(1, lerNumero(dias))
  const mc = 1 - v
  const pe = mc > 0 ? f / mc : NaN
  const porDia = Number.isFinite(pe) ? pe / d : NaN
  const pedidos = Number.isFinite(porDia) && t > 0 ? porDia / t : NaN

  const topo = Number.isFinite(pe) ? pe * 2 : f * 2 || 1000
  const x = [0, 0.4, 0.8, 1.2, 1.6, 2].map((k) => Math.round(topo * (k / 2)))

  return (
    <Casca
      rotulo="Calculadora"
      titulo="Ponto de equilíbrio do seu restaurante"
      subtitulo="O faturamento mínimo para o mês empatar: nem lucro, nem prejuízo."
      aviso="Exemplo ilustrativo. Em custos variáveis, some o que cresce com a venda: custo da mercadoria, comissão de apps, taxas de cartão e imposto sobre a venda, em % do faturamento. Em custos fixos, o que você paga vendendo ou não: aluguel, folha, energia, sistema, contador."
    >
      <div className="grid gap-4 cel:grid-cols-2">
        <Campo rotulo="Custos fixos por mês" valor={fixos} onChange={setFixos} prefixo="R$" />
        <Campo rotulo="Custos variáveis (em % do faturamento)" valor={variaveis} onChange={setVariaveis} sufixo="%" />
        <Campo rotulo="Ticket médio" valor={ticket} onChange={setTicket} prefixo="R$" />
        <Campo rotulo="Dias abertos no mês" valor={dias} onChange={setDias} />
      </div>
      <Resultado
        destaque={
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-creme/70">Faturamento mínimo no mês</div>
              <div className="mono text-[40px] font-bold leading-none text-white">{Number.isFinite(pe) ? formatarBRL(pe, true) : '—'}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-creme/70">Por dia aberto</div>
              <div className="mono text-2xl font-bold text-white">{Number.isFinite(porDia) ? formatarBRL(porDia, true) : '—'}</div>
            </div>
          </div>
        }
      >
        <Linha rotulo="Margem de contribuição" valor={formatarPct(mc * 100)} />
        <Linha rotulo="Pedidos por dia para empatar" valor={Number.isFinite(pedidos) ? `${formatarNumero(Math.ceil(pedidos))}` : '—'} forte />
        {!(mc > 0) && <p className="mt-3 text-sm text-sol">Os custos variáveis consomem toda a venda: nenhum faturamento paga a conta.</p>}
      </Resultado>
      {Number.isFinite(pe) && (
        <Grafico
          bloco={{
            t: 'grafico',
            tipo: 'linhas',
            titulo: 'Onde a receita cruza o custo',
            subtitulo: 'Faturamento do mês (eixo horizontal) contra receita e custo total',
            x,
            series: [
              { rotulo: 'Receita', tom: 'mar', y: x },
              { rotulo: 'Custo total (fixo + variável)', tom: 'telha', y: x.map((k) => f + v * k) },
            ],
            formatoX: 'brl',
            formatoY: 'brl',
            marcaX: { x: Math.round(pe), rotulo: `equilíbrio ${formatarBRL(pe, true)}` },
          }}
        />
      )}
    </Casca>
  )
}

/* --------------------------- Custo do prato ------------------------- */

interface Ingrediente {
  nome: string
  custo: string
  perda: string
}
interface PresetPrato {
  titulo: string
  prato: string
  preco: string
  alvo: string
  embalagem: string
  ingredientes: Ingrediente[]
}

const PRESETS_PRATO: Record<string, PresetPrato> = {
  pizza: {
    titulo: 'Custo da pizza grande',
    prato: 'Pizza grande (8 fatias) de calabresa',
    preco: '59,90',
    alvo: '30',
    embalagem: '2,5',
    ingredientes: [
      { nome: 'Massa (farinha, fermento, óleo)', custo: '3,2', perda: '0' },
      { nome: 'Molho de tomate', custo: '1,6', perda: '0' },
      { nome: 'Mussarela (300 g)', custo: '11,4', perda: '3' },
      { nome: 'Calabresa (80 g)', custo: '2,8', perda: '5' },
      { nome: 'Cebola, azeitona e orégano', custo: '1,2', perda: '10' },
    ],
  },
  hamburguer: {
    titulo: 'Custo do hambúrguer artesanal',
    prato: 'Hambúrguer artesanal com batata',
    preco: '54,90',
    alvo: '32',
    embalagem: '1,9',
    ingredientes: [
      { nome: 'Pão brioche', custo: '2,1', perda: '2' },
      { nome: 'Blend de carne (160 g)', custo: '6,4', perda: '0' },
      { nome: 'Queijo cheddar (2 fatias)', custo: '1,8', perda: '0' },
      { nome: 'Bacon (30 g)', custo: '1,5', perda: '5' },
      { nome: 'Molho da casa', custo: '0,9', perda: '0' },
      { nome: 'Alface e tomate', custo: '0,7', perda: '15' },
      { nome: 'Batata frita (porção)', custo: '2,6', perda: '10' },
    ],
  },
  sushi: {
    titulo: 'Custo do combinado de sushi',
    prato: 'Combinado de 20 peças',
    preco: '69,90',
    alvo: '40',
    embalagem: '3,5',
    ingredientes: [
      { nome: 'Arroz temperado', custo: '2,4', perda: '0' },
      { nome: 'Salmão (140 g úteis, R$ 90/kg bruto)', custo: '12,6', perda: '30' },
      { nome: 'Nori', custo: '1,6', perda: '0' },
      { nome: 'Cream cheese', custo: '2,2', perda: '2' },
      { nome: 'Pepino e cebolinha', custo: '0,9', perda: '15' },
      { nome: 'Shoyu, gengibre e wasabi', custo: '1,1', perda: '0' },
    ],
  },
  esfiha: {
    titulo: 'Custo da porção de esfihas',
    prato: 'Porção com 6 esfihas abertas de carne',
    preco: '47,60',
    alvo: '35',
    embalagem: '1,2',
    ingredientes: [
      { nome: 'Massa (6 unidades)', custo: '3,6', perda: '2' },
      { nome: 'Carne moída (240 g)', custo: '8,4', perda: '0' },
      { nome: 'Tomate, cebola e temperos', custo: '1,8', perda: '8' },
      { nome: 'Gás e energia do forno (rateio)', custo: '0,9', perda: '0' },
    ],
  },
}

function CalculadoraCustoPrato({ preset = 'pizza' }: { preset?: string }) {
  const base = PRESETS_PRATO[preset] ?? PRESETS_PRATO.pizza
  const [itens, setItens] = useState<Ingrediente[]>(base.ingredientes)
  const [preco, setPreco] = useState(base.preco)
  const [alvo, setAlvo] = useState(base.alvo)
  const [embalagem, setEmbalagem] = useState(base.embalagem)

  const custoIngredientes = itens.reduce((s, i) => {
    const perda = Math.min(0.95, Math.max(0, lerNumero(i.perda) / 100))
    return s + lerNumero(i.custo) / (1 - perda)
  }, 0)
  const total = custoIngredientes + lerNumero(embalagem)
  const p = lerNumero(preco)
  const cmv = p > 0 ? (total / p) * 100 : 0
  const a = lerNumero(alvo) / 100
  const sugerido = a > 0 ? total / a : NaN
  const margem = p - total

  const mudar = (idx: number, campo: keyof Ingrediente, valor: string) => setItens((l) => l.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)))

  return (
    <Casca
      rotulo="Calculadora"
      titulo={base.titulo}
      subtitulo={`${base.prato}. Coloque o custo de cada item no prato e a perda (aparas, rendimento).`}
      aviso="Valores de exemplo, ilustrativos: troque pelos seus custos de compra. A perda transforma o custo bruto em custo útil (ex.: 25% de perda em um peixe faz R$ 15 virarem R$ 20 de custo real)."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[11px] font-bold uppercase tracking-[0.08em] text-tinta-4">
              <th className="pb-2 pr-2">Ingrediente</th>
              <th className="w-28 pb-2 pr-2">Custo no prato</th>
              <th className="w-24 pb-2 pr-2">Perda</th>
              <th className="w-8 pb-2" />
            </tr>
          </thead>
          <tbody>
            {itens.map((it, i) => (
              <tr key={i} className="border-t border-divisoria">
                <td className="py-1.5 pr-2">
                  <input
                    value={it.nome}
                    onChange={(e) => mudar(i, 'nome', e.target.value)}
                    aria-label={`Ingrediente ${i + 1}`}
                    className="w-full rounded-campo border border-transparent bg-transparent px-2 py-2 text-sm text-tinta outline-none focus:border-mar focus:bg-white"
                  />
                </td>
                <td className="py-1.5 pr-2">
                  <span className="flex items-center rounded-campo border border-[rgba(46,95,115,0.22)] bg-white px-2">
                    <span className="mono pr-1 text-xs text-tinta-4">R$</span>
                    <input value={it.custo} onChange={(e) => mudar(i, 'custo', e.target.value)} inputMode="decimal" aria-label={`Custo de ${it.nome}`} className="mono w-full min-w-0 bg-transparent py-2 text-sm font-bold outline-none" />
                  </span>
                </td>
                <td className="py-1.5 pr-2">
                  <span className="flex items-center rounded-campo border border-[rgba(46,95,115,0.22)] bg-white px-2">
                    <input value={it.perda} onChange={(e) => mudar(i, 'perda', e.target.value)} inputMode="decimal" aria-label={`Perda de ${it.nome}`} className="mono w-full min-w-0 bg-transparent py-2 text-sm font-bold outline-none" />
                    <span className="mono pl-1 text-xs text-tinta-4">%</span>
                  </span>
                </td>
                <td className="py-1.5 text-right">
                  <button type="button" onClick={() => setItens((l) => l.filter((_, k) => k !== i))} aria-label={`Remover ${it.nome}`} className="rounded-full p-1.5 text-tinta-4 hover:bg-preenchimento hover:text-telhado">
                    <X size={15} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setItens((l) => [...l, { nome: 'Novo ingrediente', custo: '0', perda: '0' }])} className="mt-2 inline-flex items-center gap-1.5 rounded-botao border border-dashed border-[rgba(46,95,115,0.35)] px-3.5 py-2 text-sm font-bold text-mar hover:bg-preenchimento">
        <Plus size={15} aria-hidden /> Adicionar ingrediente
      </button>

      <div className="mt-5 grid gap-4 cel:grid-cols-3">
        <Campo rotulo="Embalagem" valor={embalagem} onChange={setEmbalagem} prefixo="R$" />
        <Campo rotulo="Preço de venda atual" valor={preco} onChange={setPreco} prefixo="R$" />
        <Campo rotulo="CMV que você quer" valor={alvo} onChange={setAlvo} sufixo="%" />
      </div>

      <Resultado
        destaque={
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-creme/70">Custo do prato</div>
              <div className="mono text-[40px] font-bold leading-none text-white">{formatarBRL(total)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold uppercase tracking-[0.08em] text-creme/70">CMV com o preço atual</div>
              <div className="mono text-2xl font-bold text-white">{formatarPct(cmv)}</div>
            </div>
          </div>
        }
      >
        <Linha rotulo="Sobra por prato, antes das outras despesas" valor={formatarBRL(margem)} tom={margem < 0 ? 'neg' : undefined} />
        <Linha rotulo={`Preço para chegar a ${formatarPct(lerNumero(alvo))} de CMV`} valor={Number.isFinite(sugerido) ? formatarBRL(sugerido) : '—'} forte />
      </Resultado>
    </Casca>
  )
}

/* ------------------------------ roteador ---------------------------- */

export function Widget({ id, preset }: { id: IdWidget; preset?: string }) {
  switch (id) {
    case 'taxa-ifood':
      return <CalculadoraIfood />
    case 'cmv':
      return <CalculadoraCmv />
    case 'equilibrio':
      return <CalculadoraEquilibrio />
    case 'custo-prato':
      return <CalculadoraCustoPrato preset={preset} />
  }
}
