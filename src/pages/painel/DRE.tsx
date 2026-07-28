import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { brl } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContexto, useRestaurante } from '@/data/hooks'
import { resumoInicio } from '@/data/derive'

interface Linha {
  label: string
  valor: number
  subtotal?: boolean
}

export function DRE() {
  const { ctx } = useContexto()
  const r = resumoInicio(ctx, 'mes')
  const cfg = useRestaurante().data

  const fat = r.entrou
  const p = (v: number) => (fat ? (v / fat) * 100 : 0)
  const sub = cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''

  const linhas: Linha[] = [
    { label: 'Receita bruta', valor: fat, subtotal: true },
    { label: '(−) Taxas de app', valor: r.apps },
    { label: '= Receita líquida', valor: fat - r.apps, subtotal: true },
    { label: '(−) CMV', valor: r.cmv },
    { label: '= Lucro bruto', valor: fat - r.apps - r.cmv, subtotal: true },
    { label: '(−) Pessoal', valor: r.pessoal },
    { label: '(−) Ocupação', valor: r.ocupacao },
    { label: '= Resultado operacional', valor: r.sobrou, subtotal: true },
    { label: '(−) Imposto', valor: r.imposto },
  ]

  const segmentos = [
    { nome: 'Comida', valor: r.cmv, cor: '#C05437' },
    { nome: 'Equipe', valor: r.pessoal, cor: '#2E5F73' },
    { nome: 'Apps e maquininha', valor: r.apps, cor: '#2F6B4A' },
    { nome: 'Aluguel e contas', valor: r.ocupacao, cor: '#EFAB5C' },
    { nome: 'Imposto', valor: r.imposto, cor: '#6A7A7E' },
    { nome: 'Sobra', valor: r.sobrouFinal, cor: '#1E4354' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="DRE" subtitulo={sub} />
      <p className="-mt-2 text-sm text-tinta-4">Demonstrativo de resultado · julho de 2026</p>
      <p className="-mt-3 text-sm text-tinta-4">Regime de caixa · Zaatar Cozinha Árabe LTDA · Simples Nacional</p>

      <div className="grid grid-cols-1 gap-3.5 tab:grid-cols-12">
        {/* Coluna esquerda: tabela + barra */}
        <div className="flex flex-col gap-4 tab:col-span-8">
          <Cartao className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                    <th className="px-4 py-2.5 rotulo text-tinta-4">Conta</th>
                    <th className="px-4 py-2.5 rotulo text-tinta-4 text-right">Julho</th>
                    <th className="px-4 py-2.5 rotulo text-tinta-4 text-right">% receita</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.label} className="border-b border-divisoria hover:bg-preenchimento/30">
                      <td className={cn('px-4 py-3 text-tinta', l.subtotal ? 'font-bold' : 'text-tinta-2')}>{l.label}</td>
                      <td className={cn('mono px-4 py-3 text-right text-tinta', l.subtotal && 'font-bold')}>{brl(l.valor)}</td>
                      <td className={cn('mono px-4 py-3 text-right text-tinta-3', l.subtotal && 'font-bold text-tinta')}>{p(l.valor).toFixed(1)}%</td>
                    </tr>
                  ))}
                  <tr className="bg-mar text-creme">
                    <td className="px-4 py-3.5 font-bold">Sobrou no fim do mês</td>
                    <td className="mono px-4 py-3.5 text-right font-bold">{brl(r.sobrouFinal)}</td>
                    <td className="mono px-4 py-3.5 text-right font-bold">{p(r.sobrouFinal).toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Cartao>

          <Cartao className="flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-tinta">Pra onde vai cada R$ 100 que o cliente paga</h2>
            <div className="flex h-4 w-full overflow-hidden rounded-full bg-preenchimento">
              {segmentos.map((s) => (
                <div key={s.nome} className="h-full" style={{ width: `${p(s.valor)}%`, background: s.cor }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 tab:grid-cols-3">
              {segmentos.map((s) => (
                <div key={s.nome} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.cor }} />
                  <span className="text-tinta-3">{s.nome}</span>
                  <span className="mono ml-auto font-bold text-tinta">{brl(p(s.valor))}</span>
                </div>
              ))}
            </div>
          </Cartao>
        </div>

        {/* Coluna direita */}
        <div className="flex flex-col gap-4 tab:col-span-4">
          <Cartao className="flex flex-col gap-2">
            <span className="rotulo text-tinta-4">Sobrou em julho, depois de tudo</span>
            <span className="mono text-tinta" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>{brl(r.sobrouFinal)}</span>
            <span className="text-sm text-tinta-3">
              {p(r.sobrouFinal).toFixed(1)}% do que entrou. Antes do imposto, {brl(r.sobrou)}.
            </span>
          </Cartao>

          <Cartao className="flex flex-col gap-1">
            <h2 className="mb-2 text-[15px] font-bold text-tinta">Pro contador</h2>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-tinta-2">DRE em PDF</span>
              <button className="text-sm font-bold text-mar hover:underline">Baixar</button>
            </div>
            <div className="flex items-center justify-between border-t border-divisoria py-2.5">
              <span className="text-sm text-tinta-2">Planilha de lançamentos</span>
              <button className="text-sm font-bold text-mar hover:underline">Baixar</button>
            </div>
            <div className="flex items-center justify-between border-t border-divisoria py-2.5">
              <span className="text-sm text-tinta-2">XMLs das notas (47)</span>
              <button className="text-sm font-bold text-mar hover:underline">Baixar</button>
            </div>
            <p className="border-t border-divisoria pt-3 text-xs text-tinta-4">Enviar por e-mail todo dia 5.</p>
          </Cartao>
        </div>
      </div>
    </div>
  )
}
