import { useState } from 'react'
import type { Periodo } from '@/types'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContexto, useRestaurante } from '@/data/hooks'
import { resumoInicio } from '@/data/derive'
import { tetosNormalizados } from '@/data/planoContas'

const HISTORICO = [
  { mes: 'Fev', valor: 3200 },
  { mes: 'Mar', valor: 2800 },
  { mes: 'Abr', valor: 4100 },
  { mes: 'Mai', valor: 5300 },
  { mes: 'Jun', valor: 6900 },
  { mes: 'Jul', valor: 8140 },
]

export function Numeros() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const { ctx } = useContexto()
  const restaurante = useRestaurante()
  const r = resumoInicio(ctx, periodo)
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
          texto="iFood, Rappi, maquininha"
        />
        <CartaoKpi
          rotulo="Ponto de equilíbrio"
          valor={brlInteiro(r.pontoEquilibrio)}
          texto="Pra não ter prejuízo"
        />
      </div>

      <Cartao className="flex flex-col">
        <h2 className="mb-6 text-[15px] font-bold text-tinta">Quanto sobrou, mês a mês</h2>
        <GraficoSobrou />
        <p className="mt-5 text-sm text-tinta-3">
          Quatro meses seguidos de alta desde abril. Julho ainda tem 4 dias pela frente.
        </p>
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

function GraficoSobrou() {
  const AREA = 150
  const max = Math.max(...HISTORICO.map((m) => m.valor), 1)
  return (
    <div className="flex items-end justify-between gap-2">
      {HISTORICO.map((m) => {
        const altura = Math.max(6, (m.valor / max) * AREA)
        return (
          <div key={m.mes} className="flex flex-1 flex-col items-center">
            <div className="flex flex-col items-center justify-end" style={{ height: AREA + 24 }}>
              <span className="mono mb-1.5 text-[13px] font-medium text-mar">{brl(m.valor)}</span>
              <div className="w-9 rounded-t-md bg-mar" style={{ height: altura }} />
            </div>
            <div className="mt-3 text-xs text-tinta-4">{m.mes}</div>
          </div>
        )
      })}
    </div>
  )
}
