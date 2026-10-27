import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { TagVencimento } from '@/components/ui/TagVencimento'
import { ModalPagamento } from '@/components/pagamento/ModalPagamento'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { mensagemDeErro } from '@/lib/erros'
import { useContexto, useDesfazerPagamento, useRestaurante } from '@/data/hooks'
import { diaDeHoje } from '@/data/derive'
import { CONTA } from '@/data/planoContas'
import { diasAte } from '@/data/vencimentos'
import { contasDoFluxo, limitesDaJanela, moverJanela, type ContaDoFluxo, type Janela } from '@/data/fluxo'
import { useUI } from '@/ui/UIProvider'

const JANELAS: { id: Janela; rotulo: string }[] = [
  { id: 'dia', rotulo: 'Dia' },
  { id: 'semana', rotulo: 'Semana' },
  { id: 'mes', rotulo: 'Mês' },
]

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const diaDaSemana = (iso: string) => SEMANA[new Date(iso + 'T12:00:00').getDay()]

/**
 * Fluxo de caixa: o que tem pra pagar no dia, na semana, no mês. É AQUI que
 * a conta é marcada como paga — um check, um modal que pergunta se teve juros,
 * e o resto do painel (DRE, Despesas, Dashboard) já enxerga.
 */
export function FluxoCaixa() {
  const { ctx } = useContexto()
  const cfg = useRestaurante().data
  const { confirmar, adicionarToast } = useUI()
  const desfazer = useDesfazerPagamento()
  const hoje = diaDeHoje()
  const [janela, setJanela] = useState<Janela>('dia')
  const [ref, setRef] = useState(hoje)
  const [pagando, setPagando] = useState<ContaDoFluxo | null>(null)

  const { de, ate } = limitesDaJanela(janela, ref)
  const contas = useMemo(() => contasDoFluxo(ctx.despesas), [ctx.despesas])

  const daJanela = useMemo(
    () => contas.filter((c) => c.dia >= de && c.dia <= ate).sort((a, b) => (a.dia === b.dia ? Number(a.pago) - Number(b.pago) : a.dia < b.dia ? -1 : 1)),
    [contas, de, ate],
  )
  // Atrasada é atrasada em qualquer janela: aparece em cima até ser paga.
  const atrasadas = useMemo(
    () => contas.filter((c) => !c.pago && c.dia < hoje && c.dia < de).sort((a, b) => (a.dia < b.dia ? -1 : 1)),
    [contas, hoje, de],
  )

  const aPagar = daJanela.filter((c) => !c.pago).reduce((s, c) => s + c.valor, 0)
  const pago = daJanela.filter((c) => c.pago).reduce((s, c) => s + c.valor + c.juros, 0)
  const juros = daJanela.reduce((s, c) => s + c.juros, 0)
  const totalAtrasado = [...atrasadas, ...daJanela.filter((c) => !c.pago && c.dia < hoje)].reduce((s, c) => s + c.valor, 0)

  const porDia = useMemo(() => {
    const m = new Map<string, ContaDoFluxo[]>()
    for (const c of daJanela) m.set(c.dia, [...(m.get(c.dia) ?? []), c])
    return [...m.entries()]
  }, [daJanela])

  function aoMarcar(c: ContaDoFluxo) {
    if (!c.pago) return setPagando(c)
    confirmar({
      gravidade: 'atencao',
      titulo: 'Desmarcar o pagamento?',
      texto: `${c.fornecedor} volta pra “a pagar”.${c.juros > 0 ? ' O lançamento de juros some do DRE junto.' : ''}`,
      resumo: [
        { rot: 'Valor', val: brl(c.valor) },
        ...(c.juros > 0 ? [{ rot: 'Juros/multa', val: brl(c.juros) }] : []),
      ],
      rotuloConfirmar: 'Voltar pra a pagar',
      onConfirmar: async () => {
        try {
          await desfazer.mutateAsync({ lancamentos: c.lancamentos })
        } catch (e) {
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra desmarcar', texto: mensagemDeErro(e, 'Tente de novo.') })
        }
      },
    })
  }

  const titulo =
    janela === 'dia'
      ? ref === hoje ? `Hoje · ${diaDaSemana(ref)} ${ddmm(ref)}` : `${diaDaSemana(ref)} ${ddmm(ref)}`
      : janela === 'semana'
        ? `${ddmm(de)} – ${ddmm(ate)}`
        : `${MESES[Number(ref.slice(5, 7)) - 1]} de ${ref.slice(0, 4)}`
  const noAgora = hoje >= de && hoje <= ate
  const nomeJanela = janela === 'dia' ? (ref === hoje ? 'hoje' : 'no dia') : janela === 'semana' ? 'na semana' : 'no mês'

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Fluxo de caixa" subtitulo={cfg ? `${cfg.nome} · o que tem pra pagar` : ''} semMes />

      {/* Dia | Semana | Mês + navegação */}
      <div className="flex flex-col gap-3 cel:flex-row cel:items-center cel:justify-between">
        <div className="flex w-fit rounded-botao bg-preenchimento p-1">
          {JANELAS.map((j) => (
            <button
              key={j.id}
              onClick={() => setJanela(j.id)}
              className={cn('rounded-[10px] px-4 py-2 text-sm font-bold transition', janela === j.id ? 'bg-superficie text-tinta shadow-sm' : 'text-tinta-3 hover:text-tinta')}
            >
              {j.rotulo}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setRef(moverJanela(janela, ref, -1))} aria-label="Anterior" className="rounded-botao border border-[rgba(46,95,115,0.14)] bg-superficie p-2 text-tinta-2 hover:border-mar/50">
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[150px] text-center text-[15px] font-bold capitalize text-tinta">{titulo}</span>
          <button onClick={() => setRef(moverJanela(janela, ref, 1))} aria-label="Próximo" className="rounded-botao border border-[rgba(46,95,115,0.14)] bg-superficie p-2 text-tinta-2 hover:border-mar/50">
            <ChevronRight size={18} />
          </button>
          {!noAgora && (
            <button onClick={() => setRef(hoje)} className="rounded-botao px-3 py-2 text-sm font-bold text-mar hover:bg-preenchimento">
              Hoje
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <Mini rotulo={`A pagar ${nomeJanela}`} valor={aPagar} apoio={`${daJanela.filter((c) => !c.pago).length} em aberto`} destaque />
        <Mini rotulo={`Pago ${nomeJanela}`} valor={pago} apoio={`${daJanela.filter((c) => c.pago).length} contas`} tom="mata" />
        <Mini rotulo="Atrasado" valor={totalAtrasado} apoio={totalAtrasado > 0 ? 'vencido e não pago' : 'nada atrasado'} tom={totalAtrasado > 0 ? 'telha' : undefined} />
        <Mini rotulo={`Juros pagos ${nomeJanela}`} valor={juros} apoio={juros > 0 ? 'multas e atrasos' : 'nenhum'} tom={juros > 0 ? 'telha' : undefined} />
      </div>

      {atrasadas.length > 0 && (
        <Cartao className="border border-telha-alerta/30 p-0">
          <div className="flex items-center justify-between border-b border-divisoria px-4 py-3">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-telha-alerta">
              <AlertTriangle size={16} /> Atrasadas
            </h2>
            <span className="mono text-sm font-bold text-telha-alerta">{brl(atrasadas.reduce((s, c) => s + c.valor, 0))}</span>
          </div>
          {atrasadas.map((c) => <Linha key={c.id} conta={c} hoje={hoje} aoMarcar={aoMarcar} mostrarData />)}
        </Cartao>
      )}

      {porDia.length === 0 ? (
        <Cartao>
          <p className="py-6 text-center text-sm text-tinta-4">Nenhuma conta {janela === 'dia' ? 'pra esse dia' : janela === 'semana' ? 'nessa semana' : 'nesse mês'}. 🎉</p>
        </Cartao>
      ) : (
        porDia.map(([dia, lista]) => {
          const aberto = lista.filter((c) => !c.pago).reduce((s, c) => s + c.valor, 0)
          return (
            <Cartao key={dia} className="p-0">
              <div className="flex items-center justify-between border-b border-divisoria bg-preenchimento/40 px-4 py-2.5">
                <span className="text-sm font-bold capitalize text-tinta">
                  {dia === hoje ? 'Hoje' : diaDaSemana(dia)} · {ddmm(dia)}
                </span>
                <span className="text-xs text-tinta-4">
                  {aberto > 0 ? <>a pagar <span className="mono font-bold text-tinta">{brl(aberto)}</span></> : <span className="font-bold text-mata">tudo pago ✓</span>}
                </span>
              </div>
              {lista.map((c) => <Linha key={c.id} conta={c} hoje={hoje} aoMarcar={aoMarcar} />)}
            </Cartao>
          )
        })
      )}

      {pagando && <ModalPagamento conta={pagando} aoFechar={() => setPagando(null)} />}
    </div>
  )
}

function Linha({ conta: c, hoje, aoMarcar, mostrarData }: { conta: ContaDoFluxo; hoje: string; aoMarcar: (c: ContaDoFluxo) => void; mostrarData?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3 border-b border-divisoria px-4 py-3 last:border-0', c.pago && 'bg-mata/[0.04]')}>
      <button
        onClick={() => aoMarcar(c)}
        aria-label={c.pago ? `Desmarcar pagamento de ${c.fornecedor}` : `Marcar ${c.fornecedor} como pago`}
        title={c.pago ? 'Pago — clique pra desmarcar' : 'Marcar como pago'}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition',
          c.pago ? 'border-mata bg-mata text-creme' : 'border-[rgba(46,95,115,0.3)] text-transparent hover:border-mata hover:text-mata/60',
        )}
      >
        <Check size={20} strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <div className={cn('truncate font-semibold', c.pago ? 'text-tinta-3' : 'text-tinta')}>{c.fornecedor}</div>
        <div className="truncate text-xs text-tinta-4">
          {[c.descricao, CONTA[c.categoria]?.nome, c.natureza === 'nota' ? 'nota fiscal' : null].filter(Boolean).join(' · ')}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {c.pago ? (
            <span className="text-[11px] font-semibold text-mata">
              pago{c.pagoEm ? ` ${ddmm(c.pagoEm.slice(0, 10))}` : ''}{c.pagoPorNome ? ` por ${c.pagoPorNome}` : ''}
            </span>
          ) : c.temVencimento ? (
            <TagVencimento dias={diasAte(c.dia, hoje)} />
          ) : (
            <span className="text-[11px] text-tinta-4">sem vencimento · lançada {ddmm(c.dia)}</span>
          )}
          {mostrarData && !c.pago && <span className="text-[11px] text-tinta-4">venceu {ddmm(c.dia)}</span>}
        </div>
      </div>
      <div className="text-right">
        <div className={cn('mono font-bold', c.pago ? 'text-tinta-3' : 'text-tinta')} style={{ fontSize: 16 }}>{brl(c.valor)}</div>
        {c.juros > 0 && <div className="mono text-[11px] font-bold text-telha-alerta">+ {brl(c.juros)} juros</div>}
      </div>
    </div>
  )
}

function Mini({ rotulo, valor, apoio, tom, destaque }: { rotulo: string; valor: number; apoio: string; tom?: 'mata' | 'telha'; destaque?: boolean }) {
  return (
    <Cartao className={cn('flex flex-col gap-1', destaque && 'ring-2 ring-mar/20')}>
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span className={cn('mono', tom === 'telha' ? 'text-telha-alerta' : tom === 'mata' ? 'text-mata' : 'text-tinta')} style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
        {brlInteiro(valor)}
      </span>
      <span className="text-xs text-tinta-4">{apoio}</span>
    </Cartao>
  )
}
