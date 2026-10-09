import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { TagVencimento } from '@/components/ui/TagVencimento'
import { brl, brlInteiro, dataCurta, dataDoDia } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useUI } from '@/ui/UIProvider'
import { useDespesas, useMarcarPago, useRestaurante } from '@/data/hooks'
import { MES_REF, diaDeHoje, noPeriodo } from '@/data/derive'
import { usePeriodo } from '@/ui/periodo'
import { nomeDoMes } from '@/data/planoMes'
import { agruparEmNotas, precosPorItem, resumoPorFornecedor, altasDePreco, ALTA_RELEVANTE, ehCompra, type Nota } from '@/data/compras'
import { diasAte, lembretes } from '@/data/vencimentos'
import { mensagemDeErro } from '@/lib/erros'
import { gerarCSV, baixarCSV, arquivoDe } from '@/lib/csv'
import { AcoesLancamento } from '@/components/lancamentos/AcoesLancamento'

type Aba = 'notas' | 'precos' | 'fornecedores'

/**
 * Compras & Fornecedores. O gestor não pensa em nota fiscal como "despesa":
 * ele pensa em quanto pagou pelo quilo do tomate, quem está subindo preço e
 * quanto cada fornecedor levou no mês. O dinheiro dessas notas continua no
 * caixa e no DRE — aqui é a leitura de compras.
 */
export function Compras() {
  const despesas = useDespesas()
  const cfg = useRestaurante().data
  const { abrirGaveta, confirmar, adicionarToast } = useUI()
  const marcarPago = useMarcarPago()
  const [periodo, setPeriodo] = usePeriodo()
  const [aba, setAba] = useState<Aba>('notas')
  const [aberta, setAberta] = useState<string | null>(null)

  const todas = useMemo(() => despesas.data ?? [], [despesas.data])
  // Histórico de preço olha TODAS as compras (é o que dá a comparação com a
  // compra anterior); os números do mês olham só o mês corrente.
  const doMes = useMemo(() => todas.filter((d) => noPeriodo(d.dataCompetencia, periodo)), [todas, periodo])

  const notasDoMes = useMemo(() => agruparEmNotas(doMes), [doMes])
  const precos = useMemo(() => precosPorItem(todas), [todas])
  const altas = useMemo(() => altasDePreco(todas), [todas])
  const fornecedores = useMemo(() => resumoPorFornecedor(doMes), [doMes])

  const hoje = diaDeHoje()
  // Aviso de boleto olha TODAS as notas: a que venceu mês passado continua devendo.
  const avisos = useMemo(() => lembretes(todas.filter(ehCompra), hoje), [todas, hoje])
  const vencidas = avisos.filter((v) => v.situacao === 'vencido')

  /** Marca a nota inteira como paga, com confirmação e "Desfazer". */
  function pedirPagamento(n: Nota) {
    const ids = n.lancamentos.map((l) => l.id)
    confirmar({
      gravidade: 'neutro',
      titulo: 'Marcar a nota como paga?',
      texto: `A nota de ${n.fornecedor} sai de “a pagar” e fica registrada como paga por você, agora.`,
      resumo: [
        { rot: 'Fornecedor', val: n.fornecedor },
        { rot: 'Valor', val: brl(n.valorTotal) },
        ...(n.vencimento ? [{ rot: 'Vencimento', val: n.vencimento.split('-').reverse().join('/') }] : []),
      ],
      rotuloConfirmar: 'Marcar como paga',
      onConfirmar: async () => {
        try {
          await marcarPago.mutateAsync({ ids, pago: true, fornecedor: n.fornecedor, valor: n.valorTotal })
          adicionarToast({
            tipo: 'sucesso',
            titulo: 'Nota paga',
            texto: `${n.fornecedor} · ${brl(n.valorTotal)}`,
            rotuloAcao: 'Desfazer',
            onAcao: () => marcarPago.mutate({ ids, pago: false, fornecedor: n.fornecedor, valor: n.valorTotal }),
          })
        } catch (e) {
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra marcar como paga', texto: mensagemDeErro(e, 'Tente de novo.') })
        }
      },
    })
  }

  const compradoNoMes = notasDoMes.reduce((s, n) => s + n.valorTotal, 0)
  const aPagar = notasDoMes.filter((n) => n.status !== 'pago').reduce((s, n) => s + n.valorTotal, 0)

  function exportar() {
    const linhas = notasDoMes.flatMap((n) =>
      n.itens.length
        ? n.itens.map((i) => [
            n.data.slice(0, 10).split('-').reverse().join('/'),
            n.fornecedor,
            i.produto,
            String(i.quantidade),
            i.unidade ?? '',
            i.precoUnitario.toFixed(2).replace('.', ','),
            (i.quantidade * i.precoUnitario).toFixed(2).replace('.', ','),
            n.status,
          ])
        : [[n.data.slice(0, 10).split('-').reverse().join('/'), n.fornecedor, '—', '', '', '', n.valorTotal.toFixed(2).replace('.', ','), n.status]],
    )
    baixarCSV(
      `compras-${periodo === 'semana' ? 'semana' : MES_REF}-${arquivoDe(cfg?.nome)}`,
      gerarCSV(['Data', 'Fornecedor', 'Produto', 'Quantidade', 'Unidade', 'Preço unitário (R$)', 'Total (R$)', 'Situação'], linhas),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Compras"
        subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${nomeDoMes(MES_REF)}` : ''}
        periodo={periodo}
        aoTrocarPeriodo={setPeriodo}
        aoExportar={notasDoMes.length ? exportar : undefined}
      />

      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <Mini rotulo={periodo === 'semana' ? 'Comprado na semana' : 'Comprado no mês'} valor={brlInteiro(compradoNoMes)} apoio={`${notasDoMes.length} ${notasDoMes.length === 1 ? 'nota' : 'notas'}`} />
        <Mini rotulo="Ainda a pagar" valor={brlInteiro(aPagar)} apoio={aPagar > 0 ? 'boletos em aberto' : 'tudo pago'} tom={aPagar > 0 ? 'telha' : undefined} />
        <Mini rotulo="Fornecedores" valor={String(fornecedores.length)} apoio={fornecedores[0] ? `maior: ${fornecedores[0].fornecedor}` : '—'} />
        <Mini
          rotulo="Itens que subiram"
          valor={String(altas.length)}
          apoio={altas[0] ? `${altas[0].produto} +${altas[0].variacao!.toFixed(0)}%` : 'nenhuma alta'}
          tom={altas.length ? 'telha' : undefined}
        />
      </div>

      {avisos.length > 0 && (
        <div
          className={cn(
            'flex flex-col gap-1 rounded-cartao border px-5 py-4',
            vencidas.length ? 'border-telha-alerta/40 bg-telha-alerta/8' : 'border-[rgba(192,84,55,0.3)] bg-insight-fundo',
          )}
        >
          <p className={cn('text-[15px] font-bold', vencidas.length ? 'text-telha-alerta' : 'text-insight-texto')}>
            {vencidas.length
              ? `${vencidas.length} ${vencidas.length === 1 ? 'nota vencida' : 'notas vencidas'}`
              : `${avisos.length} ${avisos.length === 1 ? 'nota vence' : 'notas vencem'} nos próximos dias`}
          </p>
          <p className="text-sm text-tinta-2">
            {avisos.slice(0, 3).map((v) => `${v.fornecedor} (${brl(v.valor)})`).join(' · ')}
            {avisos.length > 3 ? ` e mais ${avisos.length - 3}` : ''}. Marque como paga aqui embaixo quando quitar.
          </p>
        </div>
      )}

      {/* Alerta de preço — o que o dono precisa ver antes de comprar de novo */}
      {altas.length > 0 && (
        <Cartao>
          <h2 className="mb-3 text-[15px] font-bold text-tinta">O que subiu de preço</h2>
          <div className="flex flex-col gap-2">
            {altas.slice(0, 5).map((p) => (
              <div key={p.produtoId} className="flex items-center justify-between border-b border-divisoria pb-2 last:border-0 last:pb-0 text-sm">
                <span className="text-tinta-2">
                  <strong className="font-bold text-tinta">{p.produto}</strong>
                  <span className="text-tinta-4"> · {p.fornecedor}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="mono text-xs text-tinta-4">{brl(p.anterior ?? 0)} → {brl(p.atual)}</span>
                  <span className="mono flex items-center gap-1 font-bold text-telha-alerta">
                    <TrendingUp size={14} /> {p.variacao!.toFixed(0)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Chip rotulo={periodo === 'semana' ? 'Notas da semana' : 'Notas do mês'} selecionado={aba === 'notas'} aoClicar={() => setAba('notas')} />
          <Chip rotulo="Preço por item" selecionado={aba === 'precos'} aoClicar={() => setAba('precos')} />
          <Chip rotulo="Fornecedores" selecionado={aba === 'fornecedores'} aoClicar={() => setAba('fornecedores')} />
        </div>
        <Button variante="lancar" onClick={() => abrirGaveta('compra')}>Lançar nota fiscal</Button>
      </div>

      {aba === 'notas' && (
        <Cartao className="overflow-hidden p-0">
          {notasDoMes.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-tinta-4">
              Nenhuma compra no período. Lance a nota do fornecedor: cada item vira entrada de estoque e atualiza o
              custo do produto.
            </p>
          ) : (
            notasDoMes.map((n) => {
              const aberto = aberta === n.id
              const pago = n.status === 'pago'
              const dias = n.vencimento ? diasAte(n.vencimento, hoje) : null
              return (
                <div key={n.id} className="border-b border-divisoria last:border-0">
                  <div className="flex items-center pr-2 transition hover:bg-preenchimento/30">
                  <button
                    onClick={() => setAberta(aberto ? null : n.id)}
                    className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
                  >
                    {n.itens.length > 0
                      ? (aberto ? <ChevronDown size={16} className="shrink-0 text-tinta-4" /> : <ChevronRight size={16} className="shrink-0 text-tinta-4" />)
                      : <span className="w-4 shrink-0" />}
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-tinta">{n.fornecedor}</span>
                      <span className="block text-xs text-tinta-4">
                        {n.numeroNota ? `NF ${n.numeroNota} · ` : ''}{dataCurta(dataDoDia(n.data))} · {n.itens.length ? `${n.itens.length} ${n.itens.length === 1 ? 'item' : 'itens'}` : 'sem itens detalhados'} · {n.quem}
                      </span>
                    </span>
                    {pago ? (
                      <span className="text-xs font-bold text-mata">pago{n.pagoPorNome ? ` · ${n.pagoPorNome}` : ''}</span>
                    ) : dias !== null ? (
                      <TagVencimento dias={dias} />
                    ) : (
                      <span className="text-xs font-bold text-telha-alerta">a pagar · sem vencimento</span>
                    )}
                    <span className="mono w-28 text-right font-bold text-tinta">{brl(n.valorTotal)}</span>
                  </button>
                  {/* Corrigir/duplicar/apagar a nota inteira: os lançamentos do
                   * DRE, as entradas de estoque e o custo dos produtos andam
                   * juntos. Compra antiga sem itens não tem estoque atrás — ela
                   * é corrigida como lançamento avulso, na gaveta de despesa. */}
                  {!pago && (
                    <button
                      onClick={() => pedirPagamento(n)}
                      className="mr-1 inline-flex shrink-0 items-center gap-1.5 rounded-botao bg-mar px-3 py-1.5 text-xs font-bold text-creme transition hover:bg-mar-escuro"
                    >
                      <CheckCircle2 size={14} /> <span className="hidden cel:inline">Marcar como paga</span><span className="cel:hidden">Pagar</span>
                    </button>
                  )}
                  <AcoesLancamento
                    alvo={
                      n.itens.length || n.lancamentos.length > 1
                        ? { tipo: 'nota', nota: n }
                        : { tipo: 'conta', despesa: n.lancamentos[0] }
                    }
                  />
                  </div>
                  {aberto && n.itens.length > 0 && (
                    <div className="bg-preenchimento/30 px-4 pb-3 pl-11">
                      {n.itens.map((i, idx) => (
                        <div key={`${i.produtoId}-${idx}`} className="flex items-center justify-between border-b border-divisoria py-2 last:border-0 text-sm">
                          <span className="text-tinta-2">
                            {i.produto}
                            <span className="text-tinta-4"> · {i.quantidade} {i.unidade ?? ''} × {brl(i.precoUnitario)}</span>
                          </span>
                          <span className="mono font-bold text-tinta">{brl(i.quantidade * i.precoUnitario)}</span>
                        </div>
                      ))}
                      {(n.desconto > 0 || n.acrescimo > 0) && (
                        <div className="mono flex flex-col items-end gap-0.5 pt-2 text-xs text-tinta-3">
                          {n.desconto > 0 && <span>descontos − {brl(n.desconto)}</span>}
                          {n.acrescimo > 0 && <span>acréscimos + {brl(n.acrescimo)}</span>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </Cartao>
      )}

      {aba === 'precos' && (
        <Cartao className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                  <Th>Produto</Th><Th>Última compra</Th><Th>Fornecedor</Th><Th className="text-right">Preço anterior</Th><Th className="text-right">Preço de hoje</Th><Th className="text-right">Variação</Th>
                </tr>
              </thead>
              <tbody>
                {precos.map((p) => (
                  <tr key={p.produtoId} className="border-b border-divisoria last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-tinta">{p.produto}</span>
                      <span className="block text-xs text-tinta-4">{p.compras} {p.compras === 1 ? 'compra' : 'compras'} · por {p.unidade ?? 'un'}</span>
                    </td>
                    <td className="mono px-4 py-3 text-tinta-2">{dataCurta(dataDoDia(p.ultimaCompra))}</td>
                    <td className="px-4 py-3 text-tinta-2">{p.fornecedor}</td>
                    <td className="mono px-4 py-3 text-right text-tinta-3">{p.anterior === null ? '—' : brl(p.anterior)}</td>
                    <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(p.atual)}</td>
                    <td className="px-4 py-3 text-right"><Variacao valor={p.variacao} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {precos.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-tinta-4">
              O histórico de preço aparece a partir da segunda compra de cada item.
            </p>
          )}
        </Cartao>
      )}

      {aba === 'fornecedores' && (
        <Cartao className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                  <Th>Fornecedor</Th><Th className="text-right">Notas</Th><Th className="text-right">Itens</Th><Th>Última compra</Th><Th className="text-right">Preço médio</Th><Th className="text-right">Total no mês</Th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((f) => (
                  <tr key={f.fornecedor} className="border-b border-divisoria last:border-0">
                    <td className="px-4 py-3 font-semibold text-tinta">{f.fornecedor}</td>
                    <td className="mono px-4 py-3 text-right text-tinta-2">{f.notas}</td>
                    <td className="mono px-4 py-3 text-right text-tinta-2">{f.itens}</td>
                    <td className="mono px-4 py-3 text-tinta-2">{dataCurta(dataDoDia(f.ultimaCompra))}</td>
                    <td className="px-4 py-3 text-right"><Variacao valor={f.variacaoMedia} /></td>
                    <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(f.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {fornecedores.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-tinta-4">Nenhuma compra neste mês.</p>
          )}
        </Cartao>
      )}
    </div>
  )
}

/** Variação de preço: vermelho quando subiu de verdade, verde quando caiu. */
function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-xs text-tinta-4">primeira compra</span>
  if (Math.abs(valor) < 0.5) return <span className="text-xs text-tinta-4">estável</span>
  const subiu = valor > 0
  const Icone = subiu ? TrendingUp : TrendingDown
  return (
    <span className={cn('mono inline-flex items-center gap-1 text-xs font-bold', subiu ? (valor >= ALTA_RELEVANTE ? 'text-telha-alerta' : 'text-tinta-2') : 'text-mata')}>
      <Icone size={13} />
      {subiu ? '+' : ''}{valor.toFixed(0)}%
    </span>
  )
}

function Mini({ rotulo, valor, apoio, tom }: { rotulo: string; valor: string; apoio: string; tom?: 'telha' }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span className={cn('mono', tom === 'telha' ? 'text-telha-alerta' : 'text-tinta')} style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{valor}</span>
      <span className="text-xs text-tinta-4">{apoio}</span>
    </Cartao>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 rotulo text-tinta-4', className)}>{children}</th>
}
