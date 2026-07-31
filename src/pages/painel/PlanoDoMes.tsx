import { useState } from 'react'
import { X } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { useUI } from '@/ui/UIProvider'
import { Cartao } from '@/components/ui/Cartao'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContexto, useRestaurante, usePlanoMes, useSalvarPlanoMes } from '@/data/hooks'
import { resumoInicio, planoLinhas, MES_REF } from '@/data/derive'
import { GRUPO, GRUPOS_COM_TETO } from '@/data/planoContas'
import { mesSeguinte, nomeDoMes } from '@/data/planoMes'

type Status = 'tranquilo' | 'quase' | 'estourou'

const STATUS_CHIP: Record<Status, { txt: string; cls: string }> = {
  tranquilo: { txt: 'tranquilo', cls: 'bg-mata/12 text-mata' },
  quase: { txt: 'quase lá', cls: 'bg-sol/20 text-insight-rotulo' },
  estourou: { txt: 'estourou', cls: 'bg-telha-alerta/12 text-telha-alerta' },
}

function corReal(status: Status): string {
  if (status === 'tranquilo') return 'text-mata'
  if (status === 'quase') return 'text-insight-rotulo'
  return 'text-telha-alerta'
}

export function PlanoDoMes() {
  const { ctx } = useContexto()
  const r = resumoInicio(ctx, 'mes')
  const cfg = useRestaurante().data
  const [montando, setMontando] = useState(false)

  // Plano do mês corrente manda nos tetos; sem ele, valem os do restaurante.
  const planoDoMes = usePlanoMes(MES_REF).data
  const proximo = mesSeguinte(MES_REF)
  const planoDoProximo = usePlanoMes(proximo).data
  const linhas = planoLinhas(ctx, planoDoMes?.tetos)

  // O grupo que mais passou do teto — é ele que come a margem.
  const vazamento = [...linhas]
    .filter((l) => l.realPct > l.teto)
    .sort((a, b) => b.realPct - b.teto - (a.realPct - a.teto))[0]

  const meta = planoDoMes?.metaFaturamento ?? cfg?.metaFaturamento ?? 50000
  const feito = r.entrou
  const progresso = Math.round((feito / meta) * 100)
  const sub = cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Plano do mês" subtitulo={sub} />

      <Cartao className="flex flex-col gap-3">
        <span className="rotulo text-tinta-4">Meta de faturamento</span>
        <span className="mono text-tinta" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>{brl(meta)}</span>
        <div className="h-2 w-full overflow-hidden rounded-full bg-trilho">
          <div className="h-full rounded-full bg-mar" style={{ width: `${Math.min(100, progresso)}%` }} />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <span className="text-sm font-bold text-tinta">{brlInteiro(feito)} feitos · {progresso}%</span>
          <span className="text-xs text-tinta-4">faltam {brlInteiro(meta - feito)} em 4 dias</span>
        </div>
      </Cartao>

      <Cartao className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                <th className="px-4 py-2.5 rotulo text-tinta-4">Categoria</th>
                <th className="px-4 py-2.5 rotulo text-tinta-4 text-right">Teto</th>
                <th className="px-4 py-2.5 rotulo text-tinta-4 text-right">Realizado</th>
                <th className="px-4 py-2.5 rotulo text-tinta-4 text-right">Em R$</th>
                <th className="px-4 py-2.5 rotulo text-tinta-4">Situação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.cat} className="border-b border-divisoria last:border-0 hover:bg-preenchimento/30">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-tinta">{l.nome}</div>
                    <div className="text-xs text-tinta-4">{l.contabil}</div>
                  </td>
                  <td className="mono px-4 py-3 text-right text-tinta-2">{l.teto}%</td>
                  <td className={cn('mono px-4 py-3 text-right font-bold', corReal(l.status))}>{l.realPct.toFixed(1)}%</td>
                  <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(l.valor)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-chip px-2 py-0.5 text-xs font-semibold', STATUS_CHIP[l.status].cls)}>{STATUS_CHIP[l.status].txt}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

      <Cartao className="border border-[rgba(192,84,55,0.3)] bg-insight-fundo">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-telhado" />
          <span className="rotulo text-insight-rotulo">Onde a margem tá vazando</span>
        </div>
        <p className="pretty text-[15px] leading-relaxed text-insight-texto">
          {vazamento ? (
            <>
              Onde a margem tá vazando: <span className="font-bold">{vazamento.nome.toLowerCase()}</span> está{' '}
              <span className="mono font-bold">{(vazamento.realPct - vazamento.teto).toFixed(1)} ponto(s)</span> acima do teto —{' '}
              <span className="mono font-bold">{brlInteiro((r.entrou * (vazamento.realPct - vazamento.teto)) / 100)}</span> no mês.
            </>
          ) : (
            <>Nenhum grupo passou do teto neste mês. Margem no lugar.</>
          )}
        </p>
      </Cartao>

      <Cartao className="flex flex-col items-start justify-between gap-3 cel:flex-row cel:items-center">
        <div>
          <p className="text-[15px] font-bold text-tinta">Montar o plano de {nomeDoMes(proximo).split(' de ')[0]}</p>
          <p className="text-sm text-tinta-3">
            {planoDoProximo
              ? `Meta de ${brlInteiro(planoDoProximo.metaFaturamento)} já definida. Dá pra ajustar.`
              : 'Defina os tetos por grupo do DRE e a meta de faturamento pro próximo mês.'}
          </p>
        </div>
        <button
          onClick={() => setMontando(true)}
          className="shrink-0 rounded-botao bg-mar px-5 py-2.5 text-sm font-bold text-creme transition hover:bg-mar-escuro"
        >
          {planoDoProximo ? 'Ajustar' : 'Começar'}
        </button>
      </Cartao>

      {montando && (
        <MontarPlano
          mes={proximo}
          metaInicial={planoDoProximo?.metaFaturamento ?? Math.round((r.entrou * 1.05) / 100) * 100}
          tetosIniciais={planoDoProximo?.tetos ?? Object.fromEntries(linhas.map((l) => [l.cat, l.teto]))}
          realizado={Object.fromEntries(linhas.map((l) => [l.cat, l.realPct]))}
          aoFechar={() => setMontando(false)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Montar o plano do mês que vem: meta e teto de cada grupo do DRE.
 * O realizado do mês corrente fica ao lado de cada campo — é a única
 * âncora honesta pra escolher um teto que dê pra cumprir.
 * ------------------------------------------------------------------ */

function MontarPlano({
  mes,
  metaInicial,
  tetosIniciais,
  realizado,
  aoFechar,
}: {
  mes: string
  metaInicial: number
  tetosIniciais: Record<string, number>
  realizado: Record<string, number>
  aoFechar: () => void
}) {
  const salvar = useSalvarPlanoMes()
  const { adicionarToast } = useUI()
  const [meta, setMeta] = useState(String(metaInicial))
  const [tetos, setTetos] = useState<Record<string, number>>({ ...tetosIniciais })

  const metaNum = Number(meta.replace(/\D/g, '')) || 0
  const somaTetos = GRUPOS_COM_TETO.reduce((s, g) => s + (tetos[g] ?? 0), 0)
  const sobra = 100 - somaTetos

  async function confirmar() {
    await salvar.mutateAsync({ mes, metaFaturamento: metaNum, tetos })
    adicionarToast({
      tipo: 'sucesso',
      titulo: `Plano de ${nomeDoMes(mes).split(' de ')[0]} salvo`,
      texto: `Meta de ${brlInteiro(metaNum)} e ${GRUPOS_COM_TETO.length} tetos definidos.`,
    })
    aoFechar()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={aoFechar}>
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-cartao bg-superficie shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-divisoria px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-tinta">Plano de {nomeDoMes(mes)}</h2>
            <p className="text-sm text-tinta-3">O teto é quanto daquele grupo você aceita gastar, em % do que faturar.</p>
          </div>
          <button onClick={aoFechar} className="grid h-8 w-8 shrink-0 place-items-center rounded-botao text-tinta-3 hover:bg-preenchimento">
            <X size={18} />
          </button>
        </div>

        <div className="scroll-fina flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <Campo
            rotulo="Meta de faturamento"
            inputMode="numeric"
            placeholder="Quanto quer faturar no mês"
            value={meta ? brlInteiro(metaNum) : ''}
            onChange={(e) => setMeta(e.target.value)}
          />

          <div className="flex flex-col gap-2.5">
            <span className="rotulo text-tinta-4">Teto por grupo do DRE</span>
            {GRUPOS_COM_TETO.map((g) => {
              const real = realizado[g] ?? 0
              const teto = tetos[g] ?? 0
              return (
                <div key={g} className="flex items-center gap-3">
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GRUPO[g].cor }} />
                    <span className="truncate text-sm text-tinta-2">{GRUPO[g].simples}</span>
                  </span>
                  <span className={cn('mono shrink-0 text-xs', real > teto ? 'text-telha-alerta' : 'text-tinta-4')}>
                    fez {real.toFixed(1)}%
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-2.5 py-1.5">
                    <input
                      inputMode="decimal"
                      value={String(teto)}
                      onChange={(e) => setTetos({ ...tetos, [g]: Number(e.target.value.replace(',', '.')) || 0 })}
                      className="mono w-12 bg-transparent text-right text-sm text-tinta outline-none"
                    />
                    <span className="text-sm text-tinta-4">%</span>
                  </span>
                </div>
              )
            })}
          </div>

          <div className={cn('rounded-cartao p-3.5 text-sm', sobra >= 0 ? 'bg-preenchimento/60 text-tinta-2' : 'bg-telha-alerta/10 text-telha-alerta')}>
            {sobra >= 0 ? (
              <>
                Os tetos somam <strong className="font-bold">{somaTetos.toFixed(1)}%</strong>. Sobram{' '}
                <strong className="font-bold">{sobra.toFixed(1)}%</strong> de margem — {brlInteiro((metaNum * sobra) / 100)} se
                bater a meta.
              </>
            ) : (
              <>
                Os tetos somam <strong className="font-bold">{somaTetos.toFixed(1)}%</strong> — passam de 100%. Do jeito que
                está, o mês fecha no prejuízo.
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-divisoria px-6 py-4">
          <button onClick={aoFechar} className="text-sm font-semibold text-tinta-3 hover:text-tinta">Cancelar</button>
          <Button variante="primario" onClick={confirmar} disabled={salvar.isPending || metaNum <= 0}>
            {salvar.isPending ? 'Salvando…' : 'Salvar plano'}
          </Button>
        </div>
      </div>
    </div>
  )
}
