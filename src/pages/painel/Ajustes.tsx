import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { Switch } from '@/components/ui/Switch'
import { Chip } from '@/components/ui/Chip'
import { Campo } from '@/components/ui/Campo'
import { brl, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { gerarCSV, baixarCSV, arquivoDe } from '@/lib/csv'
import {
  useMembros,
  useAtividades,
  useRestaurante,
  useIntegracoes,
  useConectarIntegracao,
  useSalvarMembro,
  useRemoverMembro,
  useSalvarRestaurante,
} from '@/data/hooks'
import { useAuth } from '@/auth/AuthContext'
import { useUI } from '@/ui/UIProvider'
import { functions } from '@/lib/firebase'
import { HOJE } from '@/data/derive'
import { PAPEIS, TIPOS_NEGOCIO, rotuloPapel, normalizarPapel, type Papel, type Origem, type TipoNegocio } from '@/types'
import type { IntegracaoDoc } from '@/data/repo'
import type { MembroDoc, AtividadeDoc } from '@/data/types'

const criarConviteFn = httpsCallable<{ restauranteId: string; papel: Papel }, { token: string; url: string }>(
  functions,
  'criarConvite',
)

const PAPEL_DESC: Record<Papel, string> = {
  franqueador: 'vê o consolidado da rede e o número de cada loja',
  dono: 'vê tudo e gerencia usuários',
  gestao: 'vê tudo; convida com aprovação do dono',
  caixa: 'só abre, fecha e concilia o caixa',
  cozinha: 'produtos e estoque; não vê finanças',
}

const ORIGEM_ROTULO: Record<Origem, string> = {
  ia_foto: 'foto lida pela IA',
  celular: 'no celular',
  computador: 'no computador',
  integracao: 'integração',
}

/** Quantas linhas o histórico mostra antes de pedir "ver tudo". */
const HISTORICO_INICIAL = 12

export function Ajustes() {
  const restaurante = useRestaurante()
  const cfg = restaurante.data
  const atividadesData = useAtividades().data ?? []
  const atividades = useMemo(
    () => [...atividadesData].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)),
    [atividadesData],
  )

  const [whatsapp, setWhatsapp] = useState(true)
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [filtro, setFiltro] = useState('Todos')
  const [verTudo, setVerTudo] = useState(false)

  // Filtros saem de quem realmente aparece no histórico — nomes fixos deixavam
  // de fora quem entrou na equipe depois.
  const filtros = useMemo(
    () => ['Todos', ...[...new Set(atividades.map((a) => a.quem))].sort()],
    [atividades],
  )

  const filtrada = atividades.filter((a) => (filtro === 'Todos' ? true : a.quem === filtro))
  const lista = verTudo ? filtrada : filtrada.slice(0, HISTORICO_INICIAL)

  // Chegando de "Ver tudo" (/painel/ajustes#historico): o router não rola até
  // a âncora sozinho, e o histórico fica lá embaixo, depois de quatro cartões.
  const hash = useLocation().hash
  useEffect(() => {
    if (hash !== '#historico') return
    document.getElementById('historico')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, atividades.length])

  /** Histórico completo (respeitando o filtro) em CSV, pro Excel pt-BR. */
  function exportarHistorico() {
    const linhas = filtrada.map((a) => [
      new Date(a.criadoEm).toLocaleString('pt-BR'),
      a.quem,
      `${a.acao} ${a.entidade}`,
      a.tipo,
      ORIGEM_ROTULO[a.origem],
      a.valor != null ? a.valor.toFixed(2).replace('.', ',') : '',
    ])
    baixarCSV(
      `historico-${arquivoDe(cfg?.nome)}`,
      gerarCSV(['Quando', 'Quem', 'Ação', 'Tipo', 'Origem', 'Valor (R$)'], linhas),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Ajustes"
        subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''}
      />

      {/* Natureza do negócio — governa o DRE e a visão de rede */}
      <SeuNegocio />

      {/* Quem usa / gestão de permissões */}
      <Equipe />

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
      <Cartao id="historico" className="flex flex-col scroll-mt-6">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-tinta">Histórico de tudo que foi feito</h2>
            <p className="mt-1 text-sm text-tinta-3">
              Cada lançamento, correção e fechamento fica registrado com nome, hora e aparelho.
            </p>
          </div>
          <button
            onClick={exportarHistorico}
            disabled={!filtrada.length}
            className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-mar hover:underline disabled:opacity-40"
          >
            <Download size={15} />
            Exportar
          </button>
        </div>

        <div className="mb-3 mt-1 flex flex-wrap gap-2">
          {filtros.map((f) => (
            <Chip key={f} rotulo={f} selecionado={filtro === f} aoClicar={() => { setFiltro(f); setVerTudo(false) }} />
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

        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-tinta-4">
            {lista.length} de {filtrada.length} {filtrada.length === 1 ? 'registro' : 'registros'}
          </span>
          {filtrada.length > HISTORICO_INICIAL && (
            <button onClick={() => setVerTudo((v) => !v)} className="font-bold text-mar hover:underline">
              {verTudo ? 'Ver menos' : `Ver todos os ${filtrada.length}`}
            </button>
          )}
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

/** Loja única, várias lojas, franqueada ou franqueadora — e o que ela paga. */
function SeuNegocio() {
  const cfg = useRestaurante().data
  const salvar = useSalvarRestaurante()
  const { adicionarToast } = useUI()

  const tipo = cfg?.tipoNegocio ?? 'loja_unica'
  const [royalties, setRoyalties] = useState('')
  const [fundo, setFundo] = useState('')
  const taxas = cfg?.taxasFranquia

  async function trocarTipo(novo: TipoNegocio) {
    // Deixa de ser franqueada → zera as taxas, senão o DRE segue provisionando.
    await salvar.mutateAsync({
      tipoNegocio: novo,
      taxasFranquia:
        novo === 'franqueada' ? (taxas ?? { royalties: 0, fundoPromocao: 0 }) : { royalties: 0, fundoPromocao: 0 },
    })
  }

  async function salvarTaxas() {
    await salvar.mutateAsync({
      taxasFranquia: {
        royalties: Number(royalties.replace(',', '.')) || taxas?.royalties || 0,
        fundoPromocao: Number(fundo.replace(',', '.')) || taxas?.fundoPromocao || 0,
      },
    })
    adicionarToast({ tipo: 'sucesso', titulo: 'Taxas salvas', texto: 'O DRE já usa esses percentuais.' })
  }

  return (
    <Cartao className="flex flex-col gap-4">
      <div>
        <h2 className="text-[15px] font-bold text-tinta">Seu negócio</h2>
        <p className="text-sm text-tinta-3">Define o que aparece no seu DRE e se você tem visão de rede.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {TIPOS_NEGOCIO.map((t) => (
          <Chip key={t.id} rotulo={t.nome} selecionado={tipo === t.id} aoClicar={() => trocarTipo(t.id)} />
        ))}
      </div>
      <p className="text-xs text-tinta-4">{TIPOS_NEGOCIO.find((t) => t.id === tipo)?.desc}</p>

      {tipo === 'franqueada' && (
        <div className="flex flex-col gap-3 border-t border-divisoria pt-4">
          <span className="rotulo text-tinta-4">O que você paga pra franqueadora</span>
          <div className="grid grid-cols-2 gap-3">
            <Campo
              rotulo="Royalties (%)"
              inputMode="decimal"
              placeholder={String(taxas?.royalties ?? 0)}
              value={royalties}
              onChange={(e) => setRoyalties(e.target.value)}
            />
            <Campo
              rotulo="Fundo de promoção (%)"
              inputMode="decimal"
              placeholder={String(taxas?.fundoPromocao ?? 0)}
              value={fundo}
              onChange={(e) => setFundo(e.target.value)}
            />
          </div>
          <button
            onClick={salvarTaxas}
            disabled={salvar.isPending}
            className="self-start rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50"
          >
            Salvar percentuais
          </button>
          <p className="text-xs text-tinta-4">
            Hoje: royalties {taxas?.royalties ?? 0}% e fundo {taxas?.fundoPromocao ?? 0}% da receita bruta. Sem o boleto
            lançado, o DRE provisiona por esses números.
          </p>
        </div>
      )}
    </Cartao>
  )
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

function Equipe() {
  const { sessao, permissoes } = useAuth()
  const membros = (useMembros().data ?? []) as (MembroDoc & { id: string })[]
  const salvar = useSalvarMembro()
  const remover = useRemoverMembro()
  const { adicionarToast } = useUI()

  const gestao = permissoes?.gerenciaEquipe ?? 'nao'
  const podeGerenciar = gestao !== 'nao'
  const ehDono = gestao === 'total'

  const [papelNovo, setPapelNovo] = useState<Papel>('caixa')
  const [linkGerado, setLinkGerado] = useState<string | null>(null)
  const [gerando, setGerando] = useState(false)

  async function gerarConvite() {
    if (!sessao) return
    setGerando(true)
    try {
      const resp = await criarConviteFn({ restauranteId: sessao.tenantId, papel: papelNovo })
      setLinkGerado(resp.data.url)
    } catch {
      adicionarToast({ tipo: 'sistema', titulo: 'Não deu pra gerar o convite', texto: 'Tenta de novo em instantes.' })
    } finally {
      setGerando(false)
    }
  }

  async function copiarLink() {
    if (!linkGerado) return
    await navigator.clipboard.writeText(linkGerado)
    adicionarToast({
      tipo: 'sucesso',
      titulo: 'Link copiado',
      texto: 'Manda por WhatsApp (ou onde preferir) pra pessoa entrar como ' + rotuloPapel(papelNovo) + '.',
    })
  }

  return (
    <Cartao className="flex flex-col">
      <h2 className="text-[15px] font-bold text-tinta">Quem usa e o que cada um pode</h2>
      {gestao === 'proposta' && (
        <p className="mt-1 rounded-campo bg-sol/15 px-3 py-2 text-xs text-insight-rotulo">
          Você pode convidar, mas mudanças de permissão só valem com a aprovação do dono.
        </p>
      )}

      <ul className="mt-3 flex flex-col">
        {membros.map((m, i) => {
          const ehVoce = m.id === sessao?.usuario.id
          const pendente = m.conviteStatus === 'aguardando_dono'
          const papel = normalizarPapel(m.papel)
          return (
            <li key={m.id} className={cn('flex items-center gap-3 py-3', i > 0 && 'border-t border-divisoria')}>
              <Avatar inicial={m.inicial} cor={m.cor} tamanho={32} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-tinta">
                  {m.nome} {ehVoce && <span className="text-xs font-normal text-tinta-4">(você)</span>}
                </p>
                <p className="text-xs text-tinta-4">
                  {pendente ? 'aguardando o dono aprovar' : PAPEL_DESC[papel]}
                </p>
              </div>

              {pendente && ehDono ? (
                <button
                  onClick={() => salvar.mutate({ id: m.id, dados: { conviteStatus: 'ativo' } })}
                  className="rounded-chip bg-mata/12 px-3 py-1 text-xs font-bold text-mata hover:brightness-95"
                >
                  Aprovar
                </button>
              ) : ehDono && !ehVoce ? (
                <select
                  value={papel}
                  onChange={(e) => salvar.mutate({ id: m.id, dados: { papel: e.target.value as Papel } })}
                  className="rounded-chip border border-[rgba(46,95,115,0.14)] bg-superficie px-2 py-1 text-xs font-semibold text-tinta-2 outline-none focus:border-mar"
                >
                  {PAPEIS.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              ) : (
                <span className="rounded-chip bg-preenchimento px-2.5 py-0.5 text-xs font-semibold text-tinta-2">
                  {rotuloPapel(papel)}
                </span>
              )}

              {ehDono && !ehVoce && (
                <button onClick={() => remover.mutate(m.id)} title="Remover" className="text-tinta-4 hover:text-telha-alerta">
                  ×
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {podeGerenciar && (
        <div className="mt-4 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-fundo-app p-4">
          <span className="rotulo text-tinta-4">Convidar alguém pra equipe</span>
          <p className="mt-1 text-xs text-tinta-4">
            Gera um link único já com o papel definido. Você manda por WhatsApp (ou onde preferir) — a pessoa cria a conta e entra direto neste restaurante.
          </p>
          <div className="mt-2 flex flex-col gap-2 cel:flex-row">
            <select value={papelNovo} onChange={(e) => setPapelNovo(e.target.value as Papel)} className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-2 py-2 text-sm text-tinta-2 outline-none focus:border-mar">
              {PAPEIS.filter((p) => p.id !== 'dono').map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <button onClick={gerarConvite} disabled={gerando} className="rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50">
              {gerando ? 'Gerando…' : 'Gerar link de convite'}
            </button>
          </div>

          {linkGerado && (
            <div className="mt-3 flex flex-col gap-2 rounded-campo bg-preenchimento/50 p-3 cel:flex-row cel:items-center">
              <input readOnly value={linkGerado} className="flex-1 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3 py-2 text-sm text-tinta-2 outline-none" />
              <button onClick={copiarLink} className="shrink-0 rounded-botao bg-telhado px-4 py-2 text-sm font-bold text-creme transition hover:brightness-95">
                Copiar link
              </button>
            </div>
          )}
        </div>
      )}
      {!ehDono && gestao === 'proposta' && podeGerenciar && (
        <p className="mt-2 text-xs text-tinta-4">
          Quem entra por esse link já começa ativo com o papel escolhido — mudanças de permissão depois é que passam pela aprovação do dono.
        </p>
      )}
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
