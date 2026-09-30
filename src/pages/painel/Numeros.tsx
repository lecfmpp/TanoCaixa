import { useMemo, useState } from 'react'
import type { Periodo } from '@/types'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContexto, useRestaurante } from '@/data/hooks'
import { dreDoMes, mesAnterior, resumoInicio, MES_REF } from '@/data/derive'
import { tetosNormalizados } from '@/data/planoContas'
import { nomeDoMes } from '@/data/planoMes'

/** 'Jul' — rótulo curto da barra. */
function mesCurto(mes: string): string {
  const nome = nomeDoMes(mes).split(' de ')[0]
  return nome.charAt(0).toUpperCase() + nome.slice(1, 3)
}

export function Numeros() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const { ctx } = useContexto()
  const restaurante = useRestaurante()
  const r = resumoInicio(ctx, periodo)

  /**
   * Lucro líquido dos últimos 6 meses, calculado pelo mesmo DRE da tela de DRE
   * — antes era uma série fixa no código, que não mexia por mais que o dono
   * lançasse.
   */
  const historico = useMemo(() => {
    const meses: string[] = []
    let m = MES_REF
    for (let i = 0; i < 6; i++) { meses.unshift(m); m = mesAnterior(m) }
    return meses
      .map((mes) => {
        const temLancamento =
          ctx.despesas.some((d) => d.dataCompetencia.slice(0, 7) === mes) ||
          ctx.receitaDia.some((rd) => rd.data.slice(0, 7) === mes)
        return { mes, valor: temLancamento ? dreDoMes(ctx, mes).lucroLiquido : null }
      })
      .filter((h): h is { mes: string; valor: number } => h.valor !== null)
  }, [ctx])
  const cfg = restaurante.data
  const fat = r.entrou
  const pctv = (v: number) => (fat ? (v / fat) * 100 : 0)

  // Metas dos KPIs saem dos tetos do Plano do mês, não de número fixo.
  const tetos = tetosNormalizados(cfg?.tetos as Record<string, number> | undefined)
  const cmvPct = pctv(r.cmv)
  const tetoCmv = tetos.cmv ?? 30
  const tetoPessoal = tetos.pessoal ?? 25
  const tetoDeducao = tetos.deducao ?? 12

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Números"
        subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''}
        periodo={periodo}
        aoTrocarPeriodo={setPeriodo}
      />

      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <CartaoKpi
          rotulo="CMV"
          valor={`${cmvPct.toFixed(1)}%`}
          meta={`meta ${tetoCmv}%`}
          texto={r.cmv > 0 ? 'Compras ± estoque contado' : 'Custo de mercadoria vendida'}
          corValor={cmvPct <= tetoCmv ? 'text-mata' : 'text-telha-alerta'}
        />
        <CartaoKpi
          rotulo="Custo de pessoal"
          valor={`${pctv(r.pessoal).toFixed(1)}%`}
          meta={`meta ${tetoPessoal}%`}
          texto="Folha, encargos e benefícios"
        />
        <CartaoKpi
          rotulo="Taxas sobre venda"
          valor={`${pctv(r.apps).toFixed(1)}%`}
          meta={`meta ${tetoDeducao}%`}
          texto="iFood, maquininha"
        />
        <CartaoKpi
          rotulo="Ponto de equilíbrio"
          valor={brlInteiro(r.pontoEquilibrio)}
          texto="Pra não ter prejuízo"
        />
      </div>

      <Cartao className="flex flex-col">
        <h2 className="mb-6 text-[15px] font-bold text-tinta">Quanto sobrou, mês a mês</h2>
        {historico.length ? (
          <>
            <GraficoSobrou historico={historico} />
            <p className="mt-5 text-sm text-tinta-3">{leituraDoHistorico(historico)}</p>
          </>
        ) : (
          <p className="text-sm text-tinta-3">
            Assim que houver venda e despesa lançadas, o quanto sobrou de cada mês aparece aqui.
          </p>
        )}
      </Cartao>
    </div>
  )
}

function CartaoKpi({
  rotulo,
  valor,
  meta,
  texto,
  corValor,
}: {
  rotulo: string
  valor: string
  meta?: string
  texto: string
  corValor?: string
}) {
  return (
    <Cartao className="flex flex-col gap-2">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span
        className={cn('mono', corValor ?? 'text-tinta')}
        style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        {valor}
      </span>
      {meta && <span className="text-xs text-tinta-4">{meta}</span>}
      <span className="text-sm text-tinta-3">{texto}</span>
    </Cartao>
  )
}

interface PontoDoHistorico { mes: string; valor: number }

/** Frase honesta sobre a série — antes era texto fixo falando de abril. */
function leituraDoHistorico(historico: PontoDoHistorico[]): string {
  const atual = historico[historico.length - 1]
  const anterior = historico[historico.length - 2]
  const maiuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
  const nomeAtual = maiuscula(nomeDoMes(atual.mes).split(' de ')[0])
  if (!anterior) return `${nomeAtual} é o primeiro mês com números fechados aqui.`
  const nomeAnterior = nomeDoMes(anterior.mes).split(' de ')[0]
  const dif = atual.valor - anterior.valor
  if (Math.abs(dif) < 1) return `${nomeAtual} está no mesmo patamar de ${nomeAnterior}.`
  // Quantos meses seguidos de alta — só conta enquanto cada mês supera o anterior.
  let seguidos = 0
  for (let i = historico.length - 1; i > 0; i--) {
    if (historico[i].valor > historico[i - 1].valor) seguidos++
    else break
  }
  if (dif > 0) {
    return seguidos > 1
      ? `${seguidos} meses seguidos de alta — ${nomeAtual} sobrou ${brl(dif)} a mais que ${nomeAnterior}.`
      : `${nomeAtual} sobrou ${brl(dif)} a mais que ${nomeAnterior}.`
  }
  return `${nomeAtual} sobrou ${brl(-dif)} a menos que ${nomeAnterior}.`
}

function GraficoSobrou({ historico }: { historico: PontoDoHistorico[] }) {
  const AREA = 150
  const max = Math.max(...historico.map((m) => Math.abs(m.valor)), 1)
  return (
    <div className="flex items-end justify-between gap-2">
      {historico.map((m) => {
        const altura = Math.max(6, (Math.abs(m.valor) / max) * AREA)
        const prejuizo = m.valor < 0
        return (
          <div key={m.mes} className="flex flex-1 flex-col items-center">
            <div className="flex flex-col items-center justify-end" style={{ height: AREA + 24 }}>
              <span className={cn('mono mb-1.5 text-[13px] font-medium', prejuizo ? 'text-telha-alerta' : 'text-mar')}>{brl(m.valor)}</span>
              <div className={cn('w-9 rounded-t-md', prejuizo ? 'bg-telha-alerta' : 'bg-mar')} style={{ height: altura }} />
            </div>
            <div className="mt-3 text-xs text-tinta-4">{mesCurto(m.mes)}</div>
          </div>
        )
      })}
    </div>
  )
}
