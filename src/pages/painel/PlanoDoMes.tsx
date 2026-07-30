import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContexto, useRestaurante } from '@/data/hooks'
import { resumoInicio, planoLinhas } from '@/data/derive'

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
  const linhas = planoLinhas(ctx)
  const cfg = useRestaurante().data

  // O grupo que mais passou do teto — é ele que come a margem.
  const vazamento = [...linhas]
    .filter((l) => l.realPct > l.teto)
    .sort((a, b) => b.realPct - b.teto - (a.realPct - a.teto))[0]

  const meta = cfg?.metaFaturamento ?? 50000
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
          <p className="text-[15px] font-bold text-tinta">Montar o plano de agosto</p>
          <p className="text-sm text-tinta-3">Defina os tetos por categoria e a meta de faturamento pro próximo mês.</p>
        </div>
        <button className="shrink-0 rounded-botao bg-mar px-5 py-2.5 text-sm font-bold text-creme transition hover:bg-mar-escuro">
          Começar
        </button>
      </Cartao>
    </div>
  )
}
