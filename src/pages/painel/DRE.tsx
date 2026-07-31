import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'
import { gerarCSV, baixarCSV } from '@/lib/csv'
import { useContexto, useRestaurante, useDespesas } from '@/data/hooks'
import { dreDoMes, type LinhaDRE } from '@/data/derive'
import { CONTA, GRUPO } from '@/data/planoContas'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** '2026-07' → 'julho de 2026'. */
function nomeMes(mes: string): string {
  const [ano, m] = mes.split('-')
  return `${MESES[Number(m) - 1] ?? ''} de ${ano}`
}

/** Chave de colapso da linha: as de receita ficam sob 'receita'. */
function chaveColapso(l: LinhaDRE): string {
  return l.grupo ?? 'receita'
}

export function DRE() {
  const { ctx } = useContexto()
  const despesas = useDespesas()
  const cfg = useRestaurante().data
  const dre = useMemo(() => dreDoMes(ctx), [ctx])
  const [fechados, setFechados] = useState<Record<string, boolean>>({})

  const sub = cfg ? `${cfg.nome} · ${cfg.bairro} · ${nomeMes(dre.mes)}` : ''
  const regime = cfg?.regimeTributario === 'presumido' ? 'Lucro presumido' : 'Simples Nacional'
  const mesCurto = (MESES[Number(dre.mes.split('-')[1]) - 1] ?? '').replace(/^./, (c) => c.toUpperCase())

  function alternar(chave: string) {
    setFechados((f) => ({ ...f, [chave]: !f[chave] }))
  }

  const linhas = dre.linhas.filter((l) => l.nivel === 0 || !fechados[chaveColapso(l)])

  // Pra onde vai cada R$ 100: os grupos com valor + o que sobrou.
  const segmentos = [
    ...dre.grupos.filter((g) => g.total > 0).map((g) => ({ nome: g.simples, valor: g.total, cor: g.cor })),
    { nome: 'Sobra', valor: Math.max(0, dre.lucroLiquido), cor: '#1E4354' },
  ]
  const pct = (v: number) => (dre.receitaBruta ? (v / dre.receitaBruta) * 100 : 0)

  function baixarDRE() {
    const linhasCSV = dre.linhas
      .filter((l) => l.tipo !== 'info')
      .map((l) => [
        l.nivel === 1 ? `  ${l.label}` : l.label,
        l.valor.toFixed(2).replace('.', ','),
        `${l.pct.toFixed(1).replace('.', ',')}%`,
        l.estimado ? 'provisão' : '',
      ])
    baixarCSV(
      `dre-${dre.mes}`,
      gerarCSV(['Conta', `${mesCurto} (R$)`, '% receita', 'Observação'], linhasCSV),
    )
  }

  function baixarLancamentos() {
    const doMes = (despesas.data ?? []).filter((d) => d.dataCompetencia.slice(0, 7) === dre.mes)
    const linhasCSV = doMes
      .sort((a, b) => (a.dataCompetencia < b.dataCompetencia ? -1 : 1))
      .map((d) => [
        d.dataCompetencia.slice(0, 10).split('-').reverse().join('/'),
        d.fornecedor,
        d.descricao ?? '',
        GRUPO[CONTA[d.categoria]?.grupo ?? 'cmv'].nome,
        CONTA[d.categoria]?.nome ?? d.categoria,
        d.formaPagamento,
        d.status,
        d.valorTotal.toFixed(2).replace('.', ','),
      ])
    baixarCSV(
      `lancamentos-${dre.mes}`,
      gerarCSV(['Data', 'Fornecedor', 'Descrição', 'Grupo do DRE', 'Conta', 'Pagamento', 'Situação', 'Valor (R$)'], linhasCSV),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="DRE" subtitulo={sub} aoExportar={baixarDRE} />
      <p className="-mt-2 text-sm text-tinta-4">Demonstrativo de resultado · {nomeMes(dre.mes)}</p>
      <p className="-mt-3 text-sm text-tinta-4">
        Regime de caixa · {cfg?.nome ?? '—'}
        {cfg?.cnpj ? ` · CNPJ ${cfg.cnpj}` : ''} · {regime}
      </p>

      {dre.pendencias.length > 0 && (
        <div className="flex flex-col gap-2 rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-4">
          {dre.pendencias.map((p) => (
            <div key={p} className="flex items-start gap-2 text-sm text-insight-texto">
              <Info size={16} className="mt-0.5 shrink-0" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 tab:grid-cols-12">
        {/* Coluna esquerda: tabela + barra */}
        <div className="flex flex-col gap-4 tab:col-span-8">
          <Cartao className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                    <th className="px-4 py-2.5 rotulo text-tinta-4">Conta</th>
                    <th className="px-4 py-2.5 rotulo text-tinta-4 text-right">{mesCurto}</th>
                    <th className="px-4 py-2.5 rotulo text-tinta-4 text-right">% receita</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <Linha
                      key={l.id}
                      linha={l}
                      colapsavel={l.tipo === 'grupo' || l.id === 'receita_bruta'}
                      fechado={!!fechados[chaveColapso(l)]}
                      aoAlternar={() => alternar(chaveColapso(l))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Cartao>

          <Cartao className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-tinta">Pra onde vai cada R$ 100 que o cliente paga</h2>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-preenchimento">
              {segmentos.map((s) => (
                <div key={s.nome} className="h-full" style={{ width: `${Math.max(0, pct(s.valor))}%`, background: s.cor }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 tab:grid-cols-3">
              {segmentos.map((s) => (
                <div key={s.nome} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.cor }} />
                  <span className="text-tinta-3">{s.nome}</span>
                  <span className="mono ml-auto font-bold text-tinta">{brl(pct(s.valor))}</span>
                </div>
              ))}
            </div>
          </Cartao>
        </div>

        {/* Coluna direita */}
        <div className="flex flex-col gap-4 tab:col-span-4">
          <Cartao className="flex flex-col gap-2">
            <span className="rotulo text-tinta-4">Lucro líquido de {MESES[Number(dre.mes.split('-')[1]) - 1]}</span>
            <span className="mono text-tinta" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{brl(dre.lucroLiquido)}</span>
            <span className="text-sm text-tinta-3">
              {pct(dre.lucroLiquido).toFixed(1)}% do que entrou. No operacional, {brl(dre.lucroOperacional)}.
            </span>
          </Cartao>

          <Cartao className="flex flex-col gap-1">
            <h2 className="mb-2 text-[15px] font-bold text-tinta">Como o CMV fechou</h2>
            <LinhaCMV rotulo="Compras do mês" valor={dre.cmv.compras} />
            <LinhaCMV rotulo="(+) Estoque no início" valor={dre.cmv.estoqueInicial} />
            <LinhaCMV rotulo="(−) Estoque no fim" valor={dre.cmv.estoqueFinal} />
            <LinhaCMV rotulo="= CMV do mês" valor={dre.cmv.total} forte />
            <p className="border-t border-divisoria pt-3 text-xs text-tinta-4">
              {dre.cmv.temInventario
                ? `${pct(dre.cmv.total).toFixed(1)}% da receita, com a contagem de estoque fechada.`
                : 'Sem contagem fechada no mês — por enquanto o CMV é só o que você comprou.'}
            </p>
          </Cartao>

          <Cartao className="flex flex-col gap-1">
            <h2 className="mb-2 text-[15px] font-bold text-tinta">Pro contador</h2>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-tinta-2">DRE em planilha</span>
              <button onClick={baixarDRE} className="text-sm font-bold text-mar hover:underline">Baixar</button>
            </div>
            <div className="flex items-center justify-between border-t border-divisoria py-2.5">
              <span className="text-sm text-tinta-2">Lançamentos do mês</span>
              <button onClick={baixarLancamentos} className="text-sm font-bold text-mar hover:underline">Baixar</button>
            </div>
            <p className="border-t border-divisoria pt-3 text-xs text-tinta-4">
              Sai no mesmo plano de contas do modelo padrão, conta por conta.
            </p>
          </Cartao>
        </div>
      </div>
    </div>
  )
}

function Linha({
  linha: l,
  colapsavel,
  fechado,
  aoAlternar,
}: {
  linha: LinhaDRE
  colapsavel: boolean
  fechado: boolean
  aoAlternar: () => void
}) {
  const total = l.tipo === 'total'
  const subtotal = l.tipo === 'subtotal'
  const grupo = l.tipo === 'grupo'
  const info = l.tipo === 'info'

  return (
    <tr
      className={cn(
        'border-b border-divisoria',
        total ? 'bg-mar text-creme' : 'hover:bg-preenchimento/30',
        subtotal && 'bg-preenchimento/25',
      )}
    >
      <td className={cn('px-4 py-3', total ? 'font-bold' : subtotal || grupo ? 'font-bold text-tinta' : 'text-tinta-2', l.nivel === 1 && 'pl-9')}>
        {colapsavel ? (
          <button onClick={aoAlternar} className="flex items-center gap-1.5 text-left hover:opacity-70">
            {fechado ? <ChevronRight size={14} className="text-tinta-4" /> : <ChevronDown size={14} className="text-tinta-4" />}
            {l.grupo && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GRUPO[l.grupo].cor }} />}
            {l.label}
          </button>
        ) : (
          <span className={cn(info && 'italic text-tinta-4')}>
            {l.label}
            {l.nota && <span className="ml-2 text-xs font-normal text-tinta-4">· {l.nota}</span>}
          </span>
        )}
      </td>
      <td className={cn('mono px-4 py-3 text-right', total ? 'font-bold' : subtotal || grupo ? 'font-bold text-tinta' : 'text-tinta', l.estimado && 'text-insight-rotulo')}>
        {info ? '—' : brl(l.valor)}
      </td>
      <td className={cn('mono px-4 py-3 text-right', total ? 'font-bold' : subtotal || grupo ? 'font-bold text-tinta' : 'text-tinta-3')}>
        {info ? '' : `${l.pct.toFixed(1)}%`}
      </td>
    </tr>
  )
}

function LinhaCMV({ rotulo, valor, forte }: { rotulo: string; valor: number; forte?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between py-2 text-sm', forte && 'border-t border-divisoria pt-2.5')}>
      <span className={cn(forte ? 'font-bold text-tinta' : 'text-tinta-2')}>{rotulo}</span>
      <span className={cn('mono', forte ? 'font-bold text-tinta' : 'text-tinta-2')}>{brl(valor)}</span>
    </div>
  )
}
