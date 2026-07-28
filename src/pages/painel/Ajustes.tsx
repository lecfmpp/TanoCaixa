import { useMemo, useState } from 'react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { Switch } from '@/components/ui/Switch'
import { Chip } from '@/components/ui/Chip'
import { brl, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useMembros, useAtividades, useRestaurante, useIntegracoes, useConectarIntegracao } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import { HOJE } from '@/data/derive'
import type { IntegracaoDoc } from '@/data/repo'
import type { Papel, Origem } from '@/types'
import type { MembroDoc, AtividadeDoc } from '@/data/types'

const PAPEL_DESC: Partial<Record<Papel, string>> = {
  dono: 'vê tudo, inclusive o lucro',
  gerente: 'compras, estoque e notas',
  estoque: 'só o estoque',
}

const ORIGEM_ROTULO: Record<Origem, string> = {
  ia_foto: 'foto lida pela IA',
  celular: 'no celular',
  computador: 'no computador',
  integracao: 'integração',
}

const FILTROS = ['Todos', 'Halim', 'Jamile', 'Wesley'] as const
type Filtro = (typeof FILTROS)[number]

export function Ajustes() {
  const restaurante = useRestaurante()
  const cfg = restaurante.data
  const membros = (useMembros().data ?? []) as (MembroDoc & { id: string })[]
  const atividadesData = useAtividades().data ?? []
  const atividades = useMemo(
    () => [...atividadesData].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)),
    [atividadesData],
  )

  const [whatsapp, setWhatsapp] = useState(true)
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('Todos')

  const lista = atividades.filter((a) => (filtro === 'Todos' ? true : a.quem === filtro))

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Ajustes"
        subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''}
      />

      {/* Quem usa */}
      <Cartao className="flex flex-col">
        <h2 className="mb-3 text-[15px] font-bold text-tinta">Quem usa</h2>
        <ul className="flex flex-col">
          {membros.map((m, i) => (
            <li
              key={m.id}
              className={cn('flex items-center gap-3 py-3', i > 0 && 'border-t border-divisoria')}
            >
              <Avatar inicial={m.inicial} cor={m.cor} tamanho={32} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-tinta">
                  <span className="font-bold">{m.nome}</span>{' '}
                  <span className="text-tinta-3 capitalize">{m.papel}</span>
                </p>
                <p className="mt-0.5 text-xs text-tinta-4">{PAPEL_DESC[m.papel] ?? m.papel}</p>
              </div>
              <span className="rounded-chip bg-preenchimento px-2.5 py-0.5 text-xs font-semibold capitalize text-tinta-2">
                {m.papel}
              </span>
            </li>
          ))}
        </ul>
        <button className="mt-3 self-start rounded-botao bg-preenchimento px-4 py-2 text-sm font-bold text-tinta-2 transition hover:brightness-95">
          Convidar alguém
        </button>
      </Cartao>

      {/* Onde te avisar */}
      <Cartao className="flex flex-col">
        <h2 className="mb-3 text-[15px] font-bold text-tinta">Onde te avisar</h2>
        <LinhaAviso rotulo="WhatsApp" apoio="alerta de teto" ligado={whatsapp} aoTrocar={setWhatsapp} primeira />
        <LinhaAviso rotulo="E-mail" apoio="resumo de segunda" ligado={email} aoTrocar={setEmail} />
        <LinhaAviso rotulo="SMS" apoio="só emergência" ligado={sms} aoTrocar={setSms} />
      </Cartao>

      {/* Integrações */}
      <Integracoes />

      {/* Histórico */}
      <Cartao className="flex flex-col">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-tinta">Histórico de tudo que foi feito</h2>
            <p className="mt-1 text-sm text-tinta-3">
              Cada lançamento, correção e fechamento fica registrado com nome, hora e aparelho.
            </p>
          </div>
          <button className="shrink-0 text-sm font-bold text-mar hover:underline">Exportar</button>
        </div>

        <div className="mb-3 mt-1 flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <Chip key={f} rotulo={f} selecionado={filtro === f} aoClicar={() => setFiltro(f)} />
          ))}
        </div>

        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-divisoria bg-preenchimento/40 text-left">
                <Th>Quem</Th>
                <Th>Ação</Th>
                <Th>Origem</Th>
                <Th>Tipo</Th>
                <Th className="text-right">Valor</Th>
                <Th>Hora</Th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <LinhaAtividade key={a.id} a={a} />
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  )
}

const PROVEDOR = {
  ifood: { nome: 'iFood', cor: '#EA1D2C' },
  rappi: { nome: 'Rappi', cor: '#FF5A00' },
} as const

const STATUS_INT: Record<IntegracaoDoc['status'], { txt: string; cls: string }> = {
  conectado: { txt: 'conectado', cls: 'bg-mata/12 text-mata' },
  conectando: { txt: 'conectando…', cls: 'bg-sol/20 text-insight-rotulo' },
  desconectado: { txt: 'conectar', cls: 'bg-preenchimento text-tinta-2' },
}

const DICA_PROV: Record<string, string> = {
  maquininha: 'Stone, Cielo, PagSeguro, Mercado Pago',
  pdv: 'Colibri, Consumer, Goomer…',
}

function Integracoes() {
  const integracoes = (useIntegracoes().data ?? []) as IntegracaoDoc[]
  const conectar = useConectarIntegracao()
  const { adicionarToast } = useUI()
  const conhecidas = ['ifood', 'rappi', 'maquininha', 'pdv']
  const porId = new Map(integracoes.map((i) => [i.provedor, i]))

  const [abrindo, setAbrindo] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState('')

  async function salvarConexao(prov: string) {
    await conectar.mutateAsync({ provedor: prov, merchantId: merchantId.trim(), status: 'conectando' })
    setAbrindo(null)
    setMerchantId('')
    const nome = PROVEDOR[prov as keyof typeof PROVEDOR]?.nome ?? prov
    adicionarToast({
      tipo: 'sistema',
      titulo: `${nome} conectando…`,
      texto: 'Assim que o backend entrar no ar, o faturamento entra sozinho todo dia às 6h.',
    })
  }

  return (
    <Cartao className="flex flex-col">
      <h2 className="text-[15px] font-bold text-tinta">Integrações</h2>
      <p className="mt-1 mb-3 text-sm text-tinta-3">
        Faturamento, taxas e pedidos entram sozinhos todo dia às 6 da manhã.
      </p>
      <ul className="flex flex-col">
        {conhecidas.map((prov, i) => {
          const info = PROVEDOR[prov as keyof typeof PROVEDOR]
          const it = porId.get(prov)
          const status = it?.status ?? 'desconectado'
          const st = STATUS_INT[status]
          const aberto = abrindo === prov
          return (
            <li key={prov} className={cn('py-3', i > 0 && 'border-t border-divisoria')}>
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-botao text-xs font-bold text-creme"
                  style={{ background: info?.cor ?? '#6A7A7E' }}
                >
                  {(info?.nome ?? prov).slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-tinta capitalize">{info?.nome ?? prov}</div>
                  <div className="text-xs text-tinta-4">
                    {status === 'conectado' && it?.pedidosUltimoDia != null
                      ? `${it.pedidosUltimoDia} pedidos ontem · ${brl(it.faturamentoUltimoDia ?? 0)}`
                      : status === 'conectando'
                        ? 'conectando… entra no ar no próximo sync'
                        : (DICA_PROV[prov] ?? 'não conectado')}
                  </div>
                </div>
                {status === 'conectado' ? (
                  <button
                    onClick={() =>
                      adicionarToast({ tipo: 'andamento', titulo: `Sincronizando ${info?.nome}…`, texto: 'O sync automático roda todo dia às 6h.' })
                    }
                    className="shrink-0 text-xs font-bold text-mar hover:underline"
                  >
                    Sincronizar
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setAbrindo(aberto ? null : prov)
                      setMerchantId('')
                    }}
                    className={cn('shrink-0 rounded-chip px-2.5 py-1 text-xs font-bold', st.cls)}
                  >
                    {aberto ? 'fechar' : status === 'conectando' ? st.txt : 'conectar'}
                  </button>
                )}
              </div>

              {aberto && (
                <div className="mt-3 flex flex-col gap-2 rounded-campo bg-preenchimento/50 p-3 cel:flex-row cel:items-center">
                  <input
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    placeholder={prov === 'ifood' ? 'ID da loja no iFood (merchantId)' : 'ID / conta da integração'}
                    className="flex-1 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3 py-2 text-sm text-tinta outline-none focus:border-mar"
                  />
                  <button
                    onClick={() => salvarConexao(prov)}
                    disabled={!merchantId.trim() || conectar.isPending}
                    className="shrink-0 rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50"
                  >
                    Conectar
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Cartao>
  )
}

function LinhaAviso({
  rotulo,
  apoio,
  ligado,
  aoTrocar,
  primeira,
}: {
  rotulo: string
  apoio: string
  ligado: boolean
  aoTrocar: (v: boolean) => void
  primeira?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between py-3', !primeira && 'border-t border-divisoria')}>
      <div>
        <p className="text-sm font-semibold text-tinta">{rotulo}</p>
        <p className="mt-0.5 text-xs text-tinta-4">{apoio}</p>
      </div>
      <Switch ligado={ligado} aoTrocar={aoTrocar} rotulo={rotulo} />
    </div>
  )
}

function LinhaAtividade({ a }: { a: AtividadeDoc }) {
  const ehFoto = a.origem === 'ia_foto'
  return (
    <tr className="border-b border-divisoria last:border-0 hover:bg-preenchimento/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar inicial={a.quemInicial} cor={a.quemCor} tamanho={26} />
          <span className="text-sm font-semibold text-tinta">{a.quem}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-tinta-2">
        {a.acao} <span className="font-semibold text-tinta">{a.entidade}</span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'rounded-chip px-2 py-0.5 text-xs font-semibold',
            ehFoto ? 'bg-insight-fundo text-insight-rotulo' : 'bg-preenchimento text-tinta-2',
          )}
        >
          {ORIGEM_ROTULO[a.origem]}
        </span>
      </td>
      <td className="px-4 py-3 text-tinta-2">{a.tipo}</td>
      <td className="mono px-4 py-3 text-right font-medium text-tinta">
        {a.valor != null ? brl(a.valor) : '—'}
      </td>
      <td className="px-4 py-3 text-tinta-4">{quando(new Date(a.criadoEm), HOJE)}</td>
    </tr>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('rotulo px-4 py-2.5 text-tinta-4', className)}>{children}</th>
}
