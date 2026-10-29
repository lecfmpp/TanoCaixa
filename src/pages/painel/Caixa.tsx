import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { useUI } from '@/ui/UIProvider'
import { brl, dataCurta, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useDesfazerRecebimento, useReceitaDia, useRemoverReceitaDia, useRestaurarReceitaDia, useRestaurante } from '@/data/hooks'
import { agora } from '@/data/derive'
import { SeletorJanela, ddmm, diaDaSemana, nomeDaJanela, useJanela } from '@/components/ui/SeletorJanela'
import { aReceber as pendentes, partesNaJanela, somarPartes, type BaseReceita, type ParteRecebida } from '@/data/recebimentos'
import { ModalRecebimento, type ContaAReceber } from '@/components/pagamento/ModalRecebimento'
import { useAuth } from '@/auth/AuthContext'
import { mensagemDeErro } from '@/lib/erros'
import { CANAIS_APPS, LINHAS_RECEITA, type CanalVenda } from '@/data/planoContas'
import type { LancamentoDeVendas, ReceitaDiaDoc } from '@/data/types'

const CORES = ['#2E5F73', '#C05437', '#2F6B4A', '#7B6A8C', '#EFAB5C']

/** Cor estável por pessoa: a mesma pessoa tem sempre o mesmo avatar. */
function corNome(nome: string): string {
  let h = 0
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % CORES.length
  return CORES[h]
}

/**
 * Trilha de quem lançou as vendas do dia. Dia antigo, de antes da trilha
 * existir, cai na autoria do documento.
 */
function lancamentosDe(r: ReceitaDiaDoc): LancamentoDeVendas[] {
  if (r.historico?.length) return r.historico
  return [{ em: r.criadoEm, porId: r.criadoPorId, porNome: r.criadoPorNome, total: r.totalDia }]
}

/** Página da Receita: lançar as vendas do dia e ver quando o dinheiro cai. Sem DRE, gastos ou lucro. */
export function Caixa() {
  const { confirmar, adicionarToast } = useUI()
  const { permissoes } = useAuth()
  const cfg = useRestaurante().data
  const [aberto, setAberto] = useState<string | null>(null)
  // Dia | Semana | Mês, igual ao Fluxo de caixa e às Despesas.
  const estado = useJanela('mes')
  const { de, ate, hoje } = estado
  const nomeJanela = nomeDaJanela(estado)
  // Venda = o dia em que vendeu (é o que o DRE conta). Recebimento = o dia em que o dinheiro cai.
  const [base, setBase] = useState<BaseReceita>('venda')
  const remover = useRemoverReceitaDia()
  const restaurar = useRestaurarReceitaDia()
  const desfazerRecebimento = useDesfazerRecebimento()
  const [recebendo, setRecebendo] = useState<ContaAReceber | null>(null)
  const dados = useReceitaDia().data
  const todas = useMemo(() => [...(dados ?? [])].sort((a, b) => (a.data < b.data ? 1 : -1)), [dados])
  const podeApagar = permissoes?.lancaDespesa ?? false

  const partes = useMemo(() => partesNaJanela(todas, base, de, ate), [todas, base, de, ate])
  const total = somarPartes(partes)
  const diaPorId = useMemo(() => new Map(todas.map((r) => [r.id, r])), [todas])
  // "A receber" é o que paga depois (apps) e ninguém confirmou que caiu.
  const aReceber = somarPartes(pendentes(partes))
  const recebido = total - aReceber

  /** Cartões: um por dia da base escolhida, do mais novo pro mais antigo. */
  const porDia = useMemo(() => {
    const m = new Map<string, typeof partes>()
    for (const p of partes) {
      const dia = base === 'recebimento' ? p.recebimento : p.venda
      m.set(dia, [...(m.get(dia) ?? []), p])
    }
    return [...m.entries()].sort((x, y) => (x[0] < y[0] ? 1 : -1))
  }, [partes, base])

  const apps = (r: ReceitaDiaDoc) =>
    r.canais.filter((c) => CANAIS_APPS.includes(c.canal)).reduce((s, c) => s + c.valorBruto, 0)
  const loja = (r: ReceitaDiaDoc) => r.recebimentos.reduce((s, x) => s + x.valor, 0)
  const appsJanela = partes.filter((p) => CANAIS_APPS.includes(p.canal as CanalVenda)).reduce((s, p) => s + p.valor, 0)
  const diasLancados = new Set(partes.map((p) => p.diaId)).size

  /** Abre o "Confirmar recebimento", ou pergunta se quer voltar pra "a receber". */
  function alternarRecebido(p: ParteRecebida) {
    const r = diaPorId.get(p.diaId)
    if (!r) return
    const canal = p.canal as CanalVenda
    const nome = nomeDoCanal(canal)
    if (!p.recebido) return setRecebendo({ r, canal, nome, valor: p.valor, previsto: p.recebimento })
    confirmar({
      gravidade: 'atencao',
      titulo: 'Desmarcar o recebimento?',
      texto: `${nome} da venda de ${ddmm(p.venda)} volta pra “a receber”.`,
      resumo: [{ rot: 'Valor', val: brl(p.valor) }],
      rotuloConfirmar: 'Voltar pra a receber',
      onConfirmar: async () => {
        try {
          await desfazerRecebimento.mutateAsync({ r, canal })
        } catch (e) {
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra desmarcar', texto: mensagemDeErro(e, 'Tente de novo.') })
        }
      },
    })
  }

  /** Apagar o lançamento de um dia: confirma, mostra o que some e deixa o "Desfazer". */
  function pedirExclusao(r: ReceitaDiaDoc) {
    const dia = dataCurta(new Date(r.data + 'T12:00:00'))
    confirmar({
      gravidade: 'destrutivo',
      titulo: 'Apagar este lançamento de vendas?',
      texto: 'O dia deixa de contar no caixa, no Dashboard e no DRE. Dá pra desfazer no aviso que aparece em seguida.',
      resumo: [
        { rot: 'Dia', val: dia },
        { rot: 'Apps de delivery', val: brl(apps(r)) },
        { rot: 'Na loja', val: brl(loja(r)) },
        { rot: 'Total', val: brl(r.totalDia) },
      ],
      rotuloConfirmar: 'Apagar lançamento',
      onConfirmar: async () => {
        try {
          await remover.mutateAsync(r)
          adicionarToast({
            tipo: 'sucesso',
            titulo: 'Lançamento apagado',
            texto: `${dia} · ${brl(r.totalDia)} saíram do caixa.`,
            rotuloAcao: 'Desfazer',
            onAcao: () => {
              restaurar.mutate(r)
              adicionarToast({ tipo: 'sistema', titulo: 'Desfeito', texto: 'O lançamento de vendas voltou.' })
            },
          })
        } catch (e) {
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra apagar', texto: mensagemDeErro(e, 'O lançamento continua no banco. Tente de novo.') })
        }
      },
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Receita"
        subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · lançamento de vendas` : ''}
        semMes
      />

      <SeletorJanela estado={estado} />

      {/* Venda | Recebimento: o DRE sempre conta pela venda */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex shrink-0 items-center gap-1 rounded-botao bg-preenchimento p-1" role="group" aria-label="Filtrar a receita pela data">
          <span className="px-2 text-xs font-semibold text-tinta-4">Data:</span>
          {(['venda', 'recebimento'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBase(b)}
              aria-pressed={base === b}
              className={cn('rounded-[10px] px-3 py-1.5 text-sm font-bold capitalize transition', base === b ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta')}
            >
              {b}
            </button>
          ))}
        </div>
        <span className="text-xs text-tinta-4">O DRE conta a receita no dia da venda, qualquer que seja o filtro.</span>
      </div>

      {/* Resumo da janela */}
      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <CaixaCard rotulo={base === 'venda' ? `Vendido ${nomeJanela}` : `Recebe ${nomeJanela}`} valor={total} />
        {base === 'venda' ? (
          <>
            <CaixaCard rotulo="Apps de delivery" valor={appsJanela} apoio="total lançado no período" />
            <CaixaCard rotulo="Na loja e outros" valor={total - appsJanela} apoio="Pix, cartão, dinheiro" />
          </>
        ) : (
          <>
            <CaixaCard rotulo="Já recebido" valor={recebido} apoio="até hoje" />
            <CaixaCard rotulo="A receber" valor={aReceber} apoio={aReceber > 0 ? 'ainda vai cair' : 'nada pendente'} />
          </>
        )}
        <CaixaCard rotulo="Dias lançados" valor={diasLancados} apoio="no período escolhido" contagem />
      </div>

      {porDia.length === 0 ? (
        <Cartao>
          <p className="py-6 text-center text-sm text-tinta-4">
            {todas.length === 0 ? 'Nenhuma venda lançada ainda. Comece por “Lançar” → “Lançar vendas”.' : `Nenhuma ${base === 'venda' ? 'venda' : 'receita a receber'} ${estado.janela === 'dia' ? 'nesse dia' : estado.janela === 'semana' ? 'nessa semana' : 'nesse mês'}.`}
          </p>
        </Cartao>
      ) : (
        porDia.map(([dia, lista]) => {
          const totalDia = somarPartes(lista)
          // Dias de venda que aparecem neste cartão (pra mostrar quem lançou e conferir).
          const ids = [...new Set(lista.map((p) => p.diaId))]
          return (
            <Cartao key={dia} className="p-0">
              <div className="flex items-center justify-between border-b border-divisoria bg-preenchimento/40 px-4 py-2.5">
                <span className="text-sm font-bold capitalize text-tinta">
                  {dia === hoje ? 'Hoje' : diaDaSemana(dia)} · {ddmm(dia)}
                </span>
                <span className="mono text-sm font-bold text-tinta">{brl(totalDia)}</span>
              </div>
              {lista.map((p) => {
                // Só o que paga depois da venda (apps, delivery) tem o que marcar.
                const marcavel = p.recebimento > p.venda
                const pendente = !p.recebido
                return (
                  <div key={`${p.diaId}-${p.canal}`} className={cn('flex items-center gap-3 border-b border-divisoria px-4 py-3 last:border-0', marcavel && p.recebido && 'bg-mata/[0.04]')}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-tinta">{nomeDoCanal(p.canal as CanalVenda)}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-4">
                        {!marcavel ? (
                          <span>recebido no dia</span>
                        ) : pendente ? (
                          <span className={cn('font-bold', p.recebimento < hoje ? 'text-telha-alerta' : 'text-tinta-4')}>
                            {p.recebimento < hoje ? `atrasado · previsto ${ddmm(p.recebimento)}` : `a receber ${p.recebimento === hoje ? 'hoje' : `em ${ddmm(p.recebimento)}`}`}
                          </span>
                        ) : (
                          <span className="font-semibold text-mata">recebido{p.recebidoEm ? ` ${ddmm(p.recebidoEm)}` : ''}</span>
                        )}
                        {base === 'recebimento' && <span>venda de {ddmm(p.venda)}</span>}
                        {marcavel && (
                          <button onClick={() => alternarRecebido(p)} className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-mar hover:underline">
                            {pendente ? <><CheckCircle2 size={12} /> Marcar como recebido</> : 'Desmarcar recebimento'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className={cn('mono font-bold', marcavel && p.recebido ? 'text-tinta-3' : 'text-tinta')} style={{ fontSize: 16 }}>{brl(p.valor)}</div>
                  </div>
                )
              })}
              {base === 'venda' &&
                ids.map((id) => {
                  const r = diaPorId.get(id)
                  if (!r) return null
                  const conferido = Math.abs(apps(r) + loja(r) - r.totalDia) < 0.01
                  const lancs = lancamentosDe(r)
                  const ultimo = lancs[lancs.length - 1]
                  const expandido = aberto === r.id
                  return (
                    <div key={id} className="border-t border-divisoria bg-preenchimento/30 px-4 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => lancs.length > 1 && setAberto(expandido ? null : r.id)}
                          className={cn('flex items-center gap-2 text-left', lancs.length > 1 ? 'cursor-pointer' : 'cursor-default')}
                        >
                          <Avatar inicial={(ultimo.porNome || '?')[0]} cor={corNome(ultimo.porNome)} tamanho={22} />
                          <span className="text-[11px] text-tinta-4">
                            lançado por <span className="font-semibold text-tinta">{ultimo.porNome}</span> · {quando(new Date(ultimo.em), agora())}
                          </span>
                          {lancs.length > 1 && (
                            <span className="flex items-center gap-0.5 text-[11px] font-bold text-mar">
                              {lancs.length}× {expandido ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </span>
                          )}
                        </button>
                        <span className="flex items-center gap-2">
                          <span className={cn('rounded-chip px-2 py-0.5 text-xs font-bold', conferido ? 'bg-mata/12 text-mata' : 'bg-sol/20 text-insight-rotulo')}>
                            {conferido ? 'conferido' : 'revisar'}
                          </span>
                          {podeApagar && (
                            <button
                              onClick={() => pedirExclusao(r)}
                              aria-label={`Apagar lançamento de vendas de ${dataCurta(new Date(r.data + 'T12:00:00'))}`}
                              title="Apagar lançamento"
                              className="grid h-8 w-8 place-items-center rounded-botao text-tinta-4 transition hover:bg-telha-alerta/10 hover:text-telha-alerta"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </span>
                      </div>
                      {expandido &&
                        lancs.map((l, i) => (
                          <div key={`${r.id}-${i}`} className="mt-1 flex items-center justify-between text-[11px] text-tinta-3">
                            <span>{i === 0 ? 'lançou' : 'relançou'} · {l.porNome} · {quando(new Date(l.em), agora())}</span>
                            <span className="mono font-semibold text-tinta">{brl(l.total)}</span>
                          </div>
                        ))}
                    </div>
                  )
                })}
            </Cartao>
          )
        })
      )}

      {recebendo && <ModalRecebimento conta={recebendo} aoFechar={() => setRecebendo(null)} />}
    </div>
  )
}

function CaixaCard({ rotulo, valor, apoio, contagem }: { rotulo: string; valor: number; apoio?: string; contagem?: boolean }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span className="mono text-tinta" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
        {contagem ? valor : brl(valor)}
      </span>
      {apoio && <span className="text-xs text-tinta-4">{apoio}</span>}
    </Cartao>
  )
}

/** Nome do canal como aparece no DRE (apps, ifood e rappi viram "Vendas delivery"). */
function nomeDoCanal(canal: CanalVenda): string {
  return LINHAS_RECEITA.find((l) => l.canais.includes(canal))?.nome ?? canal
}
