import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { SeletorProduto } from '@/components/ui/SeletorProduto'
import { useUI } from '@/ui/UIProvider'
import { brl, brlInteiro, dataCurta, dataDoDia, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import {
  useContagens,
  useMovimentos,
  useProdutos,
  useRegistrarContagem,
  useRemoverContagem,
  useRestaurante,
  useTenant,
} from '@/data/hooks'
import { HOJE, MES_REF, diaDeHoje } from '@/data/derive'
import { nomeDoMes } from '@/data/planoMes'
import {
  TIPO_ENTRADA,
  contextoParaIA,
  diaDaContagem,
  diaDoMovimento,
  saidasPorProduto,
  totalAdicionado,
  ultimaContagemPorProduto,
} from '@/data/estoque'
import { perguntarSobreEstoque } from '@/lib/gemini'
import { mensagemDeErro } from '@/lib/erros'
import type { ContagemDoc, MovimentoDoc, ProdutoDoc } from '@/data/types'

type Aba = 'estoque' | 'contagem'

/** '2026-07-28' → '28/07/2026' */
const dataBR = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

/** Número digitado no celular ('12,5', '1.500') → número. Vazio → null. */
function lerNumero(v: string): number | null {
  const limpo = v.trim()
  if (!limpo) return null
  const n = Number(limpo.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

const qtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export function Estoque() {
  const restaurante = useRestaurante()
  const produtos = useProdutos()
  const movimentos = useMovimentos()
  const contagens = useContagens()
  const [aba, setAba] = useState<Aba>('estoque')

  const cfg = restaurante.data
  const listaProdutos = useMemo(() => produtos.data ?? [], [produtos.data])
  const listaMovimentos = useMemo(() => movimentos.data ?? [], [movimentos.data])
  const listaContagens = useMemo(() => contagens.data ?? [], [contagens.data])

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Estoque" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${nomeDoMes(MES_REF)}` : ''} />

      <div className="flex rounded-botao bg-preenchimento p-1 self-start">
        <AbaBotao ativa={aba === 'estoque'} aoClicar={() => setAba('estoque')}>Adicionados ao estoque</AbaBotao>
        <AbaBotao ativa={aba === 'contagem'} aoClicar={() => setAba('contagem')}>Contagem</AbaBotao>
      </div>

      {aba === 'estoque' ? (
        <VisaoAdicionados produtos={listaProdutos} movimentos={listaMovimentos} contagens={listaContagens} aoContar={() => setAba('contagem')} />
      ) : (
        <AbaContagem produtos={listaProdutos} contagens={listaContagens} />
      )}
    </div>
  )
}

function AbaBotao({ ativa, aoClicar, children }: { ativa: boolean; aoClicar: () => void; children: ReactNode }) {
  return (
    <button
      onClick={aoClicar}
      className={cn(
        'rounded-[10px] px-4 py-2 text-sm font-bold transition',
        ativa ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta',
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ *
 * Visão principal: total de produtos adicionados ao estoque
 * ------------------------------------------------------------------ */

function VisaoAdicionados({
  produtos,
  movimentos,
  contagens,
  aoContar,
}: {
  produtos: ProdutoDoc[]
  movimentos: MovimentoDoc[]
  contagens: ContagemDoc[]
  aoContar: () => void
}) {
  const { abrirGaveta } = useUI()
  const [periodo, setPeriodo] = useState<'mes' | 'tudo'>('mes')
  const total = useMemo(
    () => totalAdicionado(produtos, movimentos, periodo === 'mes' ? MES_REF : undefined),
    [produtos, movimentos, periodo],
  )
  const ultimaContagem = useMemo(() => ultimaContagemPorProduto(contagens), [contagens])
  const mesNome = nomeDoMes(MES_REF).split(' de ')[0]

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Chip rotulo={`Em ${mesNome}`} selecionado={periodo === 'mes'} aoClicar={() => setPeriodo('mes')} />
        <Chip rotulo="Desde o começo" selecionado={periodo === 'tudo'} aoClicar={() => setPeriodo('tudo')} />
      </div>

      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <Mini rotulo="Produtos adicionados" valor={String(total.produtos)} apoio={`de ${produtos.length} cadastrados`} />
        <Mini rotulo="Entradas por nota" valor={String(total.entradas)} apoio={total.entradas === 1 ? 'entrada registrada' : 'entradas registradas'} />
        <Mini rotulo="Valor adicionado" valor={brlInteiro(total.valor)} apoio="soma das notas" />
        <Mini
          rotulo="Última entrada"
          valor={total.ultima ? dataCurta(dataDoDia(total.ultima.dia)) : '—'}
          apoio={total.ultima?.produto ?? 'nenhuma ainda'}
        />
      </div>

      <InsightsIA produtos={produtos} contagens={contagens} movimentos={movimentos} aoContar={aoContar} />

      {/* Total por produto */}
      <Cartao className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-tinta">Total de produtos adicionados ao estoque</h2>
          <span className="text-xs text-tinta-4">{total.linhas.length} {total.linhas.length === 1 ? 'produto' : 'produtos'}</span>
        </div>

        {total.linhas.length === 0 ? (
          <p className="border-t border-divisoria px-5 py-10 text-center text-sm text-tinta-4">
            {periodo === 'mes'
              ? `Nenhuma mercadoria entrou em ${mesNome}. Lance a nota do fornecedor e cada item aparece aqui.`
              : 'Nada entrou no estoque ainda. Lance uma nota fiscal e cada item aparece aqui.'}
          </p>
        ) : (
          <>
            {/* Celular: cartões */}
            <ul className="flex flex-col border-t border-divisoria tab:hidden">
              {total.linhas.map((l) => {
                const cont = ultimaContagem.get(l.produtoId)
                return (
                  <li key={l.produtoId} className="flex items-start justify-between gap-3 border-b border-divisoria px-5 py-3 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate font-bold text-tinta">{l.produto}</div>
                      <div className="text-xs text-tinta-4">
                        {l.entradas} {l.entradas === 1 ? 'entrada' : 'entradas'} · última {dataCurta(dataDoDia(l.ultimaEntrada))}
                        {cont ? ` · contado ${qtd(cont.quantidade)} em ${dataCurta(dataDoDia(cont.dia))}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="mono font-bold text-mata">+{qtd(l.quantidade)} {l.unidade}</div>
                      <div className="mono text-[11px] text-tinta-4">{brl(l.valor)}</div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="hidden overflow-x-auto border-t border-divisoria tab:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                    <Th>Produto</Th>
                    <Th className="text-right">Entrou</Th>
                    <Th className="text-right">Valor</Th>
                    <Th className="text-right">Entradas</Th>
                    <Th>Última entrada</Th>
                    <Th>Última contagem</Th>
                  </tr>
                </thead>
                <tbody>
                  {total.linhas.map((l) => {
                    const cont = ultimaContagem.get(l.produtoId)
                    return (
                      <tr key={l.produtoId} className="border-b border-divisoria last:border-0 hover:bg-preenchimento/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-tinta">{l.produto}</div>
                          <div className="text-xs text-tinta-4">{l.categoria}{l.fornecedor ? ` · ${l.fornecedor}` : ''}</div>
                        </td>
                        <td className="mono px-4 py-3 text-right font-bold text-mata">+{qtd(l.quantidade)} {l.unidade}</td>
                        <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(l.valor)}</td>
                        <td className="mono px-4 py-3 text-right text-tinta-2">{l.entradas}</td>
                        <td className="mono px-4 py-3 text-tinta-2">{dataCurta(dataDoDia(l.ultimaEntrada))}</td>
                        <td className="px-4 py-3 text-tinta-2">
                          {cont ? (
                            <span className="mono">{qtd(cont.quantidade)} {l.unidade} <span className="text-xs text-tinta-4">em {dataCurta(dataDoDia(cont.dia))}</span></span>
                          ) : (
                            <span className="text-xs text-tinta-4">ainda não contado</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Cartao>

      <LogDeEntradas movimentos={movimentos} aoRegistrarSaida={() => abrirGaveta('estoque')} />
    </>
  )
}

/* ------------------------------ Log de entradas ------------------------- */

function LogDeEntradas({ movimentos, aoRegistrarSaida }: { movimentos: MovimentoDoc[]; aoRegistrarSaida: () => void }) {
  const [filtro, setFiltro] = useState<'entradas' | 'outros'>('entradas')
  const [limite, setLimite] = useState(15)

  const lista = useMemo(
    () =>
      movimentos
        .filter((m) => (filtro === 'entradas' ? m.tipo === TIPO_ENTRADA : m.tipo !== TIPO_ENTRADA))
        .sort((a, b) => {
          const da = diaDoMovimento(a)
          const db = diaDoMovimento(b)
          if (da !== db) return da < db ? 1 : -1
          return (a.criadoEm ?? '') < (b.criadoEm ?? '') ? 1 : -1
        }),
    [movimentos, filtro],
  )

  return (
    <Cartao className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 px-5 py-3.5 cel:flex-row cel:items-center cel:justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-tinta">Log do estoque</h2>
          <p className="text-xs text-tinta-4">Quando cada produto entrou, quem lançou e de qual fornecedor.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip rotulo="Entradas" selecionado={filtro === 'entradas'} aoClicar={() => { setFiltro('entradas'); setLimite(15) }} />
          <Chip rotulo="Perdas e transferências" selecionado={filtro === 'outros'} aoClicar={() => { setFiltro('outros'); setLimite(15) }} />
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="border-t border-divisoria px-5 py-8 text-center text-sm text-tinta-4">
          {filtro === 'entradas'
            ? 'Nenhuma entrada registrada. Cada item de nota fiscal lançada vira uma linha aqui.'
            : 'Nenhuma perda ou transferência registrada.'}
        </p>
      ) : (
        <ul className="flex flex-col border-t border-divisoria">
          {lista.slice(0, limite).map((m) => {
            const entrada = m.tipo === TIPO_ENTRADA
            return (
              <li key={m.id} className="flex items-start justify-between gap-3 border-b border-divisoria px-5 py-3 last:border-0">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-tinta">{m.produto}</div>
                  <div className="text-xs text-tinta-4">
                    {entrada ? 'Entrou' : m.tipo}
                    {m.fornecedor ? ` · ${m.fornecedor}` : ''}
                    {m.observacao ? ` · ${m.observacao}` : ''}
                  </div>
                  <div className="text-[11px] text-tinta-4">
                    {dataBR(diaDoMovimento(m))} · lançado por {m.criadoPorNome}
                    {m.criadoEm ? `, ${quando(new Date(m.criadoEm), HOJE)}` : ''}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={cn('mono font-bold', entrada ? 'text-mata' : 'text-telha-alerta')}>
                    {entrada ? '+' : '−'}{qtd(m.quantidade)}
                  </div>
                  <div className="mono text-[11px] text-tinta-4">{brl(m.valor)}</div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-divisoria bg-preenchimento/40 px-5 py-3 text-sm">
        {lista.length > limite ? (
          <button onClick={() => setLimite((l) => l + 15)} className="font-bold text-mar hover:underline">
            Ver mais ({lista.length - limite})
          </button>
        ) : (
          <span className="text-tinta-3">{lista.length} {lista.length === 1 ? 'registro' : 'registros'}</span>
        )}
        <button onClick={aoRegistrarSaida} className="font-bold text-mar hover:underline">
          Registrar perda ou transferência
        </button>
      </div>
    </Cartao>
  )
}

/* ------------------------------------------------------------------ *
 * IA: insights e relatório do que saiu
 * ------------------------------------------------------------------ */

const SUGESTOES: { rotulo: string; pergunta: string }[] = [
  { rotulo: 'Relatório do que saiu', pergunta: 'Gere um relatório do que saiu do estoque entre as contagens: o que mais saiu em quantidade e em valor, e o que mudou de uma contagem pra outra.' },
  { rotulo: 'O que mais saiu?', pergunta: 'Quais são os produtos que mais saíram do estoque, em quantidade e em valor?' },
  { rotulo: 'Onde estou perdendo dinheiro?', pergunta: 'Onde estou perdendo dinheiro no estoque? Considere perdas registradas e diferenças suspeitas entre contagens.' },
  { rotulo: 'Contagens estranhas', pergunta: 'Quais produtos têm contagem suspeita (saída negativa, sobra sem entrada, ou variação muito fora do normal) e precisam ser conferidos?' },
  { rotulo: 'O que comprar essa semana?', pergunta: 'Com base no ritmo de saída, quais produtos eu devo comprar essa semana e em que quantidade aproximada?' },
]

function InsightsIA({
  produtos,
  contagens,
  movimentos,
  aoContar,
}: {
  produtos: ProdutoDoc[]
  contagens: ContagemDoc[]
  movimentos: MovimentoDoc[]
  aoContar: () => void
}) {
  const ctx = useMemo(() => contextoParaIA(produtos, contagens, movimentos), [produtos, contagens, movimentos])
  const saidas = useMemo(() => saidasPorProduto(produtos, contagens, movimentos), [produtos, contagens, movimentos])
  const [texto, setTexto] = useState('')
  const [feita, setFeita] = useState('')
  const [resposta, setResposta] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function perguntar(pergunta: string, rotulo?: string) {
    const p = pergunta.trim()
    if (!p || carregando) return
    setCarregando(true)
    setErro('')
    setResposta('')
    setFeita(rotulo ?? p)
    try {
      setResposta(await perguntarSobreEstoque(p, ctx.texto))
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não consegui analisar o estoque agora. Tente de novo.'))
    } finally {
      setCarregando(false)
    }
  }

  const poucaContagem = ctx.contagens < 2

  return (
    <div className="flex flex-col gap-4 rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-5">
      <div className="flex items-start gap-2.5">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-telhado" />
        <div>
          <h2 className="text-[15px] font-bold text-insight-texto">Pergunte pra IA sobre o estoque</h2>
          <p className="text-sm text-insight-texto/80">
            Ela lê {ctx.contagens} {ctx.contagens === 1 ? 'contagem' : 'contagens'} e {ctx.entradas}{' '}
            {ctx.entradas === 1 ? 'entrada' : 'entradas'} e explica o que saiu.
          </p>
        </div>
      </div>

      {poucaContagem && (
        <p className="rounded-campo border border-[rgba(192,84,55,0.18)] bg-superficie/70 px-4 py-3 text-sm text-insight-texto/85">
          Pra saber o que saiu a IA precisa de pelo menos <strong>duas contagens em dias diferentes</strong>.{' '}
          <button onClick={aoContar} className="font-bold text-mar underline underline-offset-2">Fazer uma contagem</button>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {SUGESTOES.map((s) => (
          <button
            key={s.rotulo}
            type="button"
            disabled={carregando}
            onClick={() => perguntar(s.pergunta, s.rotulo)}
            className="rounded-chip border border-[rgba(192,84,55,0.3)] bg-superficie px-3.5 py-2 text-sm font-semibold text-insight-texto transition hover:border-telhado disabled:opacity-50"
          >
            {s.rotulo}
          </button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          perguntar(texto)
          setTexto('')
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          placeholder="Ou pergunte do seu jeito: quanto de frango saiu em julho?"
          className="min-w-0 flex-1 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5 text-[15px] text-tinta outline-none placeholder:text-tinta-5 focus:border-mar focus:ring-2 focus:ring-mar/15"
        />
        <Button type="submit" disabled={carregando || !texto.trim()}>Perguntar</Button>
      </form>

      {(carregando || resposta || erro) && (
        <div className="rounded-campo border border-[rgba(192,84,55,0.18)] bg-superficie px-4 py-3.5">
          <p className="mb-2 text-xs font-bold text-tinta-4">{feita}</p>
          {carregando && (
            <p className="flex items-center gap-2 text-sm text-tinta-3">
              <Loader2 size={15} className="animate-spin" /> Analisando as contagens…
            </p>
          )}
          {erro && <p className="text-sm text-telha-alerta">{erro}</p>}
          {resposta && <RespostaIA texto={resposta} />}
        </div>
      )}

      {saidas.length > 0 && (
        <div className="rounded-campo border border-[rgba(192,84,55,0.18)] bg-superficie px-4 py-3.5">
          <p className="mb-2 text-xs font-bold text-tinta-4">O que saiu entre as contagens (maiores valores)</p>
          <ul className="flex flex-col">
            {saidas.slice(0, 5).map((s) => (
              <li key={s.produtoId} className="flex items-center justify-between gap-3 border-t border-divisoria py-2 text-sm first:border-0 first:pt-0 last:pb-0">
                <span className="min-w-0 truncate text-tinta-2">{s.produto}</span>
                <span className="shrink-0 text-right">
                  {s.saiu < 0 ? (
                    <>
                      <span className="text-xs font-bold text-telha-alerta">sobrou {qtd(-s.saiu)} {s.unidade} a mais · conferir</span>
                    </>
                  ) : (
                    <>
                      <span className="mono font-bold text-tinta">saiu {qtd(s.saiu)} {s.unidade}</span>
                      <span className="mono ml-2 text-xs text-tinta-4">{brl(s.valorSaiu)}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Resposta da IA: parágrafos, listas com "- " e **negrito** — o que o prompt pede. */
function RespostaIA({ texto }: { texto: string }) {
  const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean)
  const negrito = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
      parte.startsWith('**') && parte.endsWith('**') ? <strong key={i} className="font-bold text-tinta">{parte.slice(2, -2)}</strong> : parte,
    )
  return (
    <div className="flex flex-col gap-2 text-sm leading-relaxed text-tinta-2">
      {linhas.map((l, i) =>
        /^[-*•]\s+/.test(l) ? (
          <p key={i} className="flex gap-2 pl-1"><span className="text-telhado">•</span><span>{negrito(l.replace(/^[-*•]\s+/, ''))}</span></p>
        ) : (
          <p key={i}>{negrito(l.replace(/^#+\s*/, ''))}</p>
        ),
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Contagem manual — pensada pro celular, andando pela prateleira
 * ------------------------------------------------------------------ */

interface LinhaContagem {
  produtoId: string
  /** Texto digitado. Vazio = ainda não contou. */
  quantidade: string
}

interface Rascunho {
  dia: string
  linhas: LinhaContagem[]
}

function AbaContagem({ produtos, contagens }: { produtos: ProdutoDoc[]; contagens: ContagemDoc[] }) {
  const tenant = useTenant()
  const { confirmar, adicionarToast } = useUI()
  const registrar = useRegistrarContagem()
  const remover = useRemoverContagem()
  const hoje = diaDeHoje()

  const chaveRascunho = `tanocaixa:contagem:${tenant}`
  // Rascunho no aparelho: contar leva tempo e a tela do celular recarrega fácil.
  const [dia, setDia] = useState(hoje)
  const [linhas, setLinhas] = useState<LinhaContagem[]>([])
  const [foco, setFoco] = useState<string | null>(null)

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(chaveRascunho)
      if (!salvo) return
      const r = JSON.parse(salvo) as Rascunho
      if (r.dia) setDia(r.dia)
      if (Array.isArray(r.linhas)) setLinhas(r.linhas)
    } catch {
      /* sem rascunho — segue vazio */
    }
  }, [chaveRascunho])

  useEffect(() => {
    try {
      if (linhas.length === 0) localStorage.removeItem(chaveRascunho)
      else localStorage.setItem(chaveRascunho, JSON.stringify({ dia, linhas } satisfies Rascunho))
    } catch {
      /* armazenamento bloqueado — o rascunho só não persiste */
    }
  }, [dia, linhas, chaveRascunho])

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])
  const ultima = useMemo(() => ultimaContagemPorProduto(contagens), [contagens])
  // Só produtos que ainda existem no cadastro; excluído no meio da contagem sai da lista.
  const visiveis = linhas.filter((l) => porId.has(l.produtoId))
  const naLista = new Set(visiveis.map((l) => l.produtoId))
  const disponiveis = produtos.filter((p) => !naLista.has(p.id))

  const contadas = visiveis.filter((l) => lerNumero(l.quantidade) !== null)
  const valorContado = contadas.reduce((s, l) => s + (lerNumero(l.quantidade) ?? 0) * (porId.get(l.produtoId)?.custoAtual ?? 0), 0)

  function adicionar(produtoId: string) {
    if (!produtoId || naLista.has(produtoId)) return
    setLinhas((ls) => [{ produtoId, quantidade: '' }, ...ls])
    setFoco(produtoId)
  }

  function trazerTodos() {
    setLinhas((ls) => [...ls, ...disponiveis.map((p) => ({ produtoId: p.id, quantidade: '' }))])
  }

  const setQuantidade = (produtoId: string, quantidade: string) =>
    setLinhas((ls) => ls.map((l) => (l.produtoId === produtoId ? { ...l, quantidade } : l)))

  function pedirSalvar() {
    const semNumero = visiveis.length - contadas.length
    confirmar({
      gravidade: 'neutro',
      titulo: `Salvar a contagem de ${dataBR(dia)}?`,
      texto:
        'Esse é o estoque que a IA e o CMV do DRE passam a considerar. Produto que você não contou continua valendo pela última contagem dele.',
      resumo: [
        { rot: 'Dia da contagem', val: dataBR(dia) },
        { rot: 'Produtos contados', val: String(contadas.length) },
        ...(semNumero > 0 ? [{ rot: 'Sem quantidade (ficam de fora)', val: String(semNumero) }] : []),
        { rot: 'Valor do que foi contado', val: brl(valorContado) },
      ],
      rotuloCancelar: 'Continuar contando',
      rotuloConfirmar: 'Salvar contagem',
      onConfirmar: async () => {
        try {
          const c = await registrar.mutateAsync({
            data: dia,
            itens: contadas.map((l) => ({ produtoId: l.produtoId, quantidade: lerNumero(l.quantidade) ?? 0 })),
          })
          setLinhas([])
          setDia(hoje)
          adicionarToast({
            tipo: 'sucesso',
            titulo: 'Contagem salva',
            texto: `${contadas.length} ${contadas.length === 1 ? 'produto' : 'produtos'} · estoque em ${brl(c.valorEstoque ?? valorContado)}.`,
          })
        } catch (e) {
          console.error('contagem:', e)
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra salvar', texto: mensagemDeErro(e, 'A contagem não foi salva. Ela continua aqui na tela.') })
        }
      },
    })
  }

  const historico = useMemo(
    () => [...contagens].filter((c) => c.status === 'fechada').sort((a, b) => (diaDaContagem(a) < diaDaContagem(b) ? 1 : -1)),
    [contagens],
  )

  return (
    <div className="flex flex-col gap-4">
      <Cartao className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-tinta">Nova contagem</h2>
          <p className="text-sm text-tinta-3">Escolha o dia, selecione cada produto e marque quanto tem na prateleira.</p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="rotulo text-tinta-4">Dia da contagem</span>
          <input
            type="date"
            value={dia}
            max={hoje}
            onChange={(e) => e.target.value && setDia(e.target.value)}
            className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-3 text-[16px] text-tinta outline-none focus:border-mar focus:ring-2 focus:ring-mar/15 cel:max-w-[240px]"
          />
        </label>

        {produtos.length === 0 ? (
          <p className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">
            Cadastre seus produtos primeiro (menu Produtos). A contagem é sempre sobre um produto seu.
          </p>
        ) : (
          <>
            <SeletorProduto
              rotulo="Adicionar produto à contagem"
              produtos={disponiveis}
              valor=""
              aoTrocar={adicionar}
            />
            {disponiveis.length > 0 && (
              <button
                onClick={trazerTodos}
                className="self-start text-sm font-bold text-mar underline underline-offset-2 hover:text-mar-escuro"
              >
                Trazer todos os produtos ({disponiveis.length})
              </button>
            )}
          </>
        )}

        {visiveis.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {visiveis.map((l) => {
              const p = porId.get(l.produtoId)!
              const anterior = ultima.get(l.produtoId)
              return (
                <li
                  key={l.produtoId}
                  className="flex items-center gap-3 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-tinta">{p.nome}</div>
                    <div className="text-xs text-tinta-4">
                      {anterior ? `última: ${qtd(anterior.quantidade)} ${p.unidade} em ${dataCurta(dataDoDia(anterior.dia))}` : 'nunca contado'}
                    </div>
                  </div>
                  <label className="flex shrink-0 items-center gap-1.5">
                    <input
                      autoFocus={foco === l.produtoId}
                      inputMode="decimal"
                      enterKeyHint="next"
                      placeholder="0"
                      aria-label={`Quantidade de ${p.nome}`}
                      value={l.quantidade}
                      onChange={(e) => setQuantidade(l.produtoId, e.target.value)}
                      className="mono h-12 w-24 rounded-campo border border-[rgba(46,95,115,0.2)] bg-fundo-app px-3 text-right text-[18px] font-bold text-tinta outline-none focus:border-mar focus:ring-2 focus:ring-mar/15"
                    />
                    <span className="w-9 text-xs text-tinta-4">{p.unidade}</span>
                  </label>
                  <button
                    onClick={() => setLinhas((ls) => ls.filter((x) => x.produtoId !== l.produtoId))}
                    aria-label={`Tirar ${p.nome} da contagem`}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-botao text-tinta-4 transition hover:bg-preenchimento hover:text-telha-alerta"
                  >
                    <X size={18} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {/* Fica colado no rodapé da tela: no celular o botão nunca some no meio da lista. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-3 rounded-b-cartao border-t border-divisoria bg-superficie px-5 py-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-tinta">
              {contadas.length} {contadas.length === 1 ? 'produto contado' : 'produtos contados'}
            </div>
            <div className="mono text-xs text-tinta-4">{brl(valorContado)}</div>
          </div>
          <Button variante="lancar" disabled={contadas.length === 0 || registrar.isPending} onClick={pedirSalvar} className="h-12 px-6">
            {registrar.isPending ? 'Salvando…' : 'Salvar contagem'}
          </Button>
        </div>
      </Cartao>

      <HistoricoDeContagens
        contagens={historico}
        aoApagar={(c) =>
          confirmar({
            gravidade: 'destrutivo',
            titulo: `Apagar a contagem de ${dataBR(diaDaContagem(c))}?`,
            texto: 'Ela deixa de valer pro CMV do DRE e pra IA. Dá pra refazer a contagem depois.',
            resumo: [
              { rot: 'Dia', val: dataBR(diaDaContagem(c)) },
              { rot: 'Produtos', val: String(c.itens.length) },
              { rot: 'Contada por', val: c.criadoPorNome },
            ],
            rotuloCancelar: 'Manter contagem',
            rotuloConfirmar: 'Apagar contagem',
            onConfirmar: async () => {
              try {
                await remover.mutateAsync(c)
                adicionarToast({ tipo: 'sucesso', titulo: 'Contagem apagada', texto: dataBR(diaDaContagem(c)) })
              } catch (e) {
                adicionarToast({ tipo: 'erro', titulo: 'Não deu pra apagar', texto: mensagemDeErro(e, 'A contagem continua salva.') })
              }
            },
          })
        }
      />
    </div>
  )
}

function HistoricoDeContagens({ contagens, aoApagar }: { contagens: ContagemDoc[]; aoApagar: (c: ContagemDoc) => void }) {
  const [aberta, setAberta] = useState<string | null>(null)
  return (
    <Cartao className="overflow-hidden p-0">
      <div className="px-5 py-3.5">
        <h2 className="text-[15px] font-bold text-tinta">Contagens feitas</h2>
        <p className="text-xs text-tinta-4">Quem contou, quando e quanto valia o estoque.</p>
      </div>
      {contagens.length === 0 ? (
        <p className="border-t border-divisoria px-5 py-8 text-center text-sm text-tinta-4">Nenhuma contagem feita ainda.</p>
      ) : (
        <ul className="flex flex-col border-t border-divisoria">
          {contagens.map((c) => {
            const expandida = aberta === c.id
            const valor = c.valorEstoque ?? c.itens.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0)
            const antiga = !c.data
            return (
              <li key={c.id} className="border-b border-divisoria last:border-0">
                <div className="flex items-center gap-3 px-5 py-3">
                  <button onClick={() => setAberta(expandida ? null : c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    {expandida ? <ChevronDown size={16} className="shrink-0 text-tinta-4" /> : <ChevronRight size={16} className="shrink-0 text-tinta-4" />}
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-tinta">
                        {antiga ? `Contagem de ${nomeDoMes(c.mesReferencia).split(' de ')[0]}` : dataBR(c.data!)}
                        {antiga && <span className="ml-2 text-xs font-semibold text-tinta-4">contagem mensal antiga</span>}
                      </span>
                      <span className="block text-xs text-tinta-4">
                        {c.itens.length} {c.itens.length === 1 ? 'produto' : 'produtos'} · {c.criadoPorNome}
                        {c.criadoEm ? `, ${quando(new Date(c.criadoEm), HOJE)}` : ''}
                      </span>
                    </span>
                  </button>
                  <span className="mono shrink-0 text-sm font-bold text-tinta">{brlInteiro(valor)}</span>
                  <button
                    onClick={() => aoApagar(c)}
                    aria-label="Apagar contagem"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-botao text-tinta-4 transition hover:bg-preenchimento hover:text-telha-alerta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {expandida && (
                  <div className="bg-preenchimento/30 px-5 pb-3 pl-12">
                    {c.itens.map((i) => (
                      <div key={i.produtoId} className="flex items-center justify-between border-b border-divisoria py-2 text-sm last:border-0">
                        <span className="text-tinta-2">{i.nome}</span>
                        <span className="mono font-bold text-tinta">{qtd(i.quantidade)} {i.unidade}</span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Cartao>
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

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 rotulo text-tinta-4', className)}>{children}</th>
}
