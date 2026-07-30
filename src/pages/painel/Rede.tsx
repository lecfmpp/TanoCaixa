import { useMemo, useState } from 'react'
import { Store, Plus } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useUI } from '@/ui/UIProvider'
import { useNavigate } from 'react-router-dom'
import { useRede, useContextosDaRede, useCriarRede, useAbrirLoja, useRestaurante, useTenantDoLogin } from '@/data/hooks'
import { definirLojaAtiva } from '@/data/lojaAtiva'
import { dreDoMes } from '@/data/derive'
import { GRUPO } from '@/data/planoContas'
import type { LojaComContexto } from '@/data/hooks'

export function Rede() {
  const rede = useRede()
  const { lojas, carregando } = useContextosDaRede()

  if (rede.isLoading) return <p className="text-sm text-tinta-4">Carregando a rede…</p>
  if (!rede.data) return <SemRede />

  return <PainelDaRede nomeRede={rede.data.nome} tipo={rede.data.tipo} lojas={lojas} carregando={carregando} />
}

/* ------------------------- Ainda não tem rede ------------------------- */

function SemRede() {
  const criar = useCriarRede()
  const cfg = useRestaurante().data
  const { adicionarToast } = useUI()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<'franquia' | 'multi_loja'>('multi_loja')

  async function confirmar() {
    await criar.mutateAsync({ nome: nome || cfg?.nome || 'Minha rede', tipo })
    adicionarToast({ tipo: 'sucesso', titulo: 'Rede criada', texto: 'Sua loja atual já entrou como primeira unidade.' })
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Rede" subtitulo="Várias lojas no mesmo lugar" />
      <Cartao className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-tinta">Você ainda não tem uma rede</h2>
          <p className="pretty mt-1 text-sm text-tinta-3">
            Crie a rede pra acompanhar o consolidado e comparar loja a loja. Cada loja continua com seu próprio caixa,
            sua equipe e seu DRE — a rede só junta os números.
          </p>
        </div>
        <Campo rotulo="Nome da rede" placeholder="Zaatar" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div>
          <span className="rotulo mb-1.5 block text-tinta-4">Tipo</span>
          <div className="flex flex-wrap gap-2">
            <Chip rotulo="Lojas minhas" selecionado={tipo === 'multi_loja'} aoClicar={() => setTipo('multi_loja')} />
            <Chip rotulo="Franquia" selecionado={tipo === 'franquia'} aoClicar={() => setTipo('franquia')} />
          </div>
        </div>
        <Button variante="primario" onClick={confirmar} disabled={criar.isPending}>
          {criar.isPending ? 'Criando…' : 'Criar rede'}
        </Button>
      </Cartao>
    </div>
  )
}

/* --------------------------- Painel da rede --------------------------- */

function PainelDaRede({
  nomeRede,
  tipo,
  lojas,
  carregando,
}: {
  nomeRede: string
  tipo: 'franquia' | 'multi_loja'
  lojas: LojaComContexto[]
  carregando: boolean
}) {
  const [aberta, setAberta] = useState(false)
  const navegar = useNavigate()
  const tenantDoLogin = useTenantDoLogin()

  /** Troca o painel inteiro pra loja escolhida e cai no DRE dela. */
  function abrirPainelDaLoja(restauranteId: string) {
    definirLojaAtiva(restauranteId === tenantDoLogin ? null : restauranteId)
    navegar('/painel/dre')
  }

  // Consolidado: o mesmo DRE, somando o contexto de todas as lojas.
  const consolidado = useMemo(() => dreDoMes(lojas.map((l) => l.ctx)), [lojas])
  const porLoja = useMemo(
    () => lojas.map((l) => ({ ...l, dre: dreDoMes(l.ctx) })).sort((a, b) => b.dre.receitaBruta - a.dre.receitaBruta),
    [lojas],
  )

  const receita = consolidado.receitaBruta
  const pct = (v: number) => (receita ? (v / receita) * 100 : 0)
  const melhor = [...porLoja].sort((a, b) => b.dre.lucroLiquido / (b.dre.receitaBruta || 1) - a.dre.lucroLiquido / (a.dre.receitaBruta || 1))[0]

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Rede" subtitulo={`${nomeRede} · ${lojas.length} loja${lojas.length === 1 ? '' : 's'} · julho de 2026`} />

      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <CartaoMini rotulo="Lojas" valor={String(lojas.length)} apoio={tipo === 'franquia' ? 'na franquia' : 'na rede'} />
        <CartaoMini rotulo="Faturamento" valor={brlInteiro(receita)} apoio="soma do mês" />
        <CartaoMini rotulo="Lucro líquido" valor={brlInteiro(consolidado.lucroLiquido)} apoio={`${pct(consolidado.lucroLiquido).toFixed(1)}% da receita`} tom={consolidado.lucroLiquido >= 0 ? 'mata' : 'telha'} />
        <CartaoMini rotulo="Melhor margem" valor={melhor?.loja.nome ?? '—'} apoio={melhor ? `${((melhor.dre.lucroLiquido / (melhor.dre.receitaBruta || 1)) * 100).toFixed(1)}% de margem` : ''} pequeno />
      </div>

      {carregando && <p className="text-sm text-tinta-4">Somando as lojas…</p>}

      {/* Comparativo loja a loja */}
      <Cartao className="overflow-hidden p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-[15px] font-bold text-tinta">Loja a loja</h2>
          <button
            onClick={() => setAberta((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-bold text-mar hover:underline"
          >
            <Plus size={15} /> Abrir loja
          </button>
        </div>
        {aberta && <FormAbrirLoja aoFechar={() => setAberta(false)} />}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-divisoria bg-preenchimento/40 text-left">
                <Th>Loja</Th>
                <Th className="text-right">Receita</Th>
                <Th className="text-right">CMV</Th>
                <Th className="text-right">Equipe</Th>
                <Th className="text-right">Lucro líquido</Th>
                <Th className="text-right">Margem</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {porLoja.map(({ loja, dre }) => {
                const margem = dre.receitaBruta ? (dre.lucroLiquido / dre.receitaBruta) * 100 : 0
                const p = (v: number) => (dre.receitaBruta ? (v / dre.receitaBruta) * 100 : 0)
                return (
                  <tr key={loja.restauranteId} className="border-b border-divisoria last:border-0 hover:bg-preenchimento/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Store size={15} className="shrink-0 text-tinta-4" />
                        <div>
                          <div className="font-semibold text-tinta">{loja.nome}</div>
                          <div className="text-xs text-tinta-4">{loja.bairro}{loja.propria ? ' · própria' : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(dre.receitaBruta)}</td>
                    <td className="mono px-4 py-3 text-right text-tinta-2">{p(dre.cmv.total).toFixed(1)}%</td>
                    <td className="mono px-4 py-3 text-right text-tinta-2">
                      {p(dre.grupos.find((g) => g.grupo === 'pessoal')?.total ?? 0).toFixed(1)}%
                    </td>
                    <td className={cn('mono px-4 py-3 text-right font-bold', dre.lucroLiquido >= 0 ? 'text-mata' : 'text-telha-alerta')}>
                      {brl(dre.lucroLiquido)}
                    </td>
                    <td className={cn('mono px-4 py-3 text-right font-bold', margem >= 0 ? 'text-tinta' : 'text-telha-alerta')}>
                      {margem.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => abrirPainelDaLoja(loja.restauranteId)}
                        className="whitespace-nowrap text-sm font-bold text-mar hover:underline"
                      >
                        Ver painel
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Cartao>

      {/* DRE consolidado */}
      <Cartao className="overflow-hidden p-0">
        <div className="px-4 py-3">
          <h2 className="text-[15px] font-bold text-tinta">DRE consolidado</h2>
          <p className="text-xs text-tinta-4">Mesmo plano de contas das lojas, somado.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-y border-divisoria bg-preenchimento/40 text-left">
                <Th>Conta</Th>
                <Th className="text-right">Rede</Th>
                <Th className="text-right">% receita</Th>
              </tr>
            </thead>
            <tbody>
              {consolidado.linhas
                .filter((l) => l.nivel === 0)
                .map((l) => (
                  <tr
                    key={l.id}
                    className={cn(
                      'border-b border-divisoria',
                      l.tipo === 'total' ? 'bg-mar text-creme' : l.tipo === 'subtotal' ? 'bg-preenchimento/25' : '',
                    )}
                  >
                    <td className="px-4 py-3 font-bold">
                      <span className="flex items-center gap-2">
                        {l.grupo && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GRUPO[l.grupo].cor }} />}
                        {l.label}
                      </span>
                    </td>
                    <td className="mono px-4 py-3 text-right font-bold">{brl(l.valor)}</td>
                    <td className="mono px-4 py-3 text-right font-bold">{l.pct.toFixed(1)}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  )
}

function FormAbrirLoja({ aoFechar }: { aoFechar: () => void }) {
  const abrir = useAbrirLoja()
  const { adicionarToast } = useUI()
  const [nome, setNome] = useState('')
  const [bairro, setBairro] = useState('')

  async function confirmar() {
    if (!nome.trim()) return
    await abrir.mutateAsync({ nome: nome.trim(), bairro: bairro.trim(), cidade: 'Rio de Janeiro' })
    adicionarToast({ tipo: 'sucesso', titulo: 'Loja aberta', texto: `${nome} já entrou no consolidado da rede.` })
    setNome('')
    setBairro('')
    aoFechar()
  }

  return (
    <div className="flex flex-col gap-3 border-t border-divisoria bg-preenchimento/30 px-4 py-4 cel:flex-row cel:items-end">
      <div className="flex-1"><Campo rotulo="Nome da loja" placeholder="Zaatar Tijuca" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
      <div className="flex-1"><Campo rotulo="Bairro" placeholder="Tijuca" value={bairro} onChange={(e) => setBairro(e.target.value)} /></div>
      <Button variante="primario" onClick={confirmar} disabled={abrir.isPending || !nome.trim()}>
        {abrir.isPending ? 'Abrindo…' : 'Abrir'}
      </Button>
    </div>
  )
}

function CartaoMini({ rotulo, valor, apoio, tom, pequeno }: { rotulo: string; valor: string; apoio: string; tom?: 'mata' | 'telha'; pequeno?: boolean }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span
        className={cn('mono', tom === 'telha' ? 'text-telha-alerta' : tom === 'mata' ? 'text-mata' : 'text-tinta')}
        style={{ fontSize: pequeno ? 16 : 22, fontWeight: 700, letterSpacing: '-0.02em' }}
      >
        {valor}
      </span>
      <span className="text-xs text-tinta-4">{apoio}</span>
    </Cartao>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn('px-4 py-2.5 rotulo text-tinta-4', className)}>{children}</th>
}
