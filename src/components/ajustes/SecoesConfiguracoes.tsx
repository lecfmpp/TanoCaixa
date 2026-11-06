import { useMemo, useState } from 'react'
import { mensagemDeErro } from '@/lib/erros'
import { Download } from 'lucide-react'
import { Secao } from '@/components/ui/Acordeao'
import { Avatar } from '@/components/ui/Avatar'
import { Switch } from '@/components/ui/Switch'
import { Chip } from '@/components/ui/Chip'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { Campo } from '@/components/ui/Campo'
import { ConvidarEquipe } from '@/components/ajustes/ConvidarEquipe'
import { EmailsQueRecebo } from '@/components/ajustes/EmailsQueRecebo'
import { CampoLogo } from '@/components/ajustes/CampoLogo'
import { brl, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { gerarCSV, baixarCSV, arquivoDe } from '@/lib/csv'
import {
  useMembros,
  useAtividades,
  useRestaurante,
  useSalvarMembro,
  useRemoverMembro,
  useSalvarRestaurante,
} from '@/data/hooks'
import { useAuth } from '@/auth/AuthContext'
import { useUI } from '@/ui/UIProvider'
import { agora } from '@/data/derive'
import { PAPEIS, TIPOS_NEGOCIO, rotuloPapel, normalizarPapel, type Papel, type Origem, type TipoNegocio } from '@/types'
import type { MembroDoc, AtividadeDoc } from '@/data/types'

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

/*
 * Seções da página Configurações, uma por bloco de assunto. A página
 * (pages/painel/Configuracoes.tsx) distribui estas seções pelas abas.
 */

/** "Onde te avisar": canais e o que chega em cada um, mais os e-mails que a pessoa recebe. */
export function OndeTeAvisar() {
  const [whatsapp, setWhatsapp] = useState(true)
  const [sms, setSms] = useState(false)
  return (
    <>
      <Secao titulo="Onde te avisar" corpoClassName="!pt-1" abertaPorPadrao>
        <LinhaAviso rotulo="WhatsApp" apoio="alerta de teto" ligado={whatsapp} aoTrocar={setWhatsapp} primeira />
        <LinhaAviso rotulo="SMS" apoio="só emergência" ligado={sms} aoTrocar={setSms} />
      </Secao>

      {/* E-mails de dicas, recado e novidades (LGPD) */}
      <EmailsQueRecebo />
    </>
  )
}

/** Notificações de WhatsApp para as contas que ainda não têm a funcionalidade. */
export function WhatsappEmBreve() {
  return (
    <Secao
      titulo="Notificações de WhatsApp"
      resumo={<SeloEmBreve />}
      descricao="Avisos de rotina da loja no grupo de WhatsApp. Estamos preparando: assim que estiver pronto, aparece aqui."
    >
      <p className="text-sm text-tinta-3">Em breve você vai poder escolher quais avisos chegam no WhatsApp da loja.</p>
    </Secao>
  )
}

/** Histórico de tudo que foi feito na loja, com filtro por pessoa e exportação. */
export function Historico() {
  const cfg = useRestaurante().data
  const atividadesData = useAtividades().data ?? []
  const atividades = useMemo(
    () => [...atividadesData].sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1)),
    [atividadesData],
  )
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
    <Secao
      id="historico"
      titulo="Histórico de tudo que foi feito"
      descricao="Cada lançamento, correção e fechamento fica registrado com nome, hora e aparelho."
      resumo={`${atividades.length} ${atividades.length === 1 ? 'registro' : 'registros'}`}
      abertaPorPadrao
      acoes={
        <button
          onClick={exportarHistorico}
          disabled={!filtrada.length}
          className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-mar hover:underline disabled:opacity-40"
        >
          <Download size={15} />
          Exportar
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
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
    </Secao>
  )
}

/**
 * Integrações que ainda não estão no ar. Ficam visíveis pra pessoa saber que
 * vêm aí, mas sem fluxo de conectar: na versão 1 tudo entra por foto, planilha
 * ou pelo fechamento do dia. (As Cloud Functions do iFood/Rappi continuam no
 * repositório, só não são chamadas pelo app.)
 */
const INTEGRACOES_EM_BREVE = [
  { id: 'ifood', nome: 'iFood', sigla: 'iF', cor: '#EA1D2C', dica: 'vendas e taxas do dia' },
  { id: 'rappi', nome: 'Rappi', sigla: 'Ra', cor: '#FF5A00', dica: 'vendas e taxas do dia' },
  { id: 'maquininha', nome: 'Maquininha', sigla: 'Ma', cor: '#6A7A7E', dica: 'Stone, Cielo, PagSeguro, Mercado Pago' },
  { id: 'pdv', nome: 'Sistema de PDV', sigla: 'PD', cor: '#6A7A7E', dica: 'Colibri, Consumer, Goomer…' },
]

/** Logo da loja aberta. Dono e gestão enviam e trocam; os outros só veem. */
export function LogoDaLojaCartao() {
  const { permissoes } = useAuth()
  const pode = (permissoes?.gerenciaEquipe ?? 'nao') !== 'nao'
  return (
    <Secao titulo="Logo da loja" descricao="Aparece no topo de todas as páginas desta loja." abertaPorPadrao>
      <CampoLogo podeEditar={pode} />
    </Secao>
  )
}

/** Loja única, várias lojas, franqueada ou franqueadora — e o que ela paga. */
export function SeuNegocio() {
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
    try {
      await salvar.mutateAsync({
        taxasFranquia: {
          royalties: Number(royalties.replace(',', '.')) || taxas?.royalties || 0,
          fundoPromocao: Number(fundo.replace(',', '.')) || taxas?.fundoPromocao || 0,
        },
      })
    } catch (e) {
      console.error('taxas:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra salvar', texto: mensagemDeErro(e, 'As taxas não foram gravadas.') })
      return
    }
    adicionarToast({ tipo: 'sucesso', titulo: 'Taxas salvas', texto: 'O DRE já usa esses percentuais.' })
  }

  return (
    <Secao
      titulo="Seu negócio"
      descricao="Define o que aparece no seu DRE e se você tem visão de rede."
      resumo={TIPOS_NEGOCIO.find((t) => t.id === tipo)?.nome}
      corpoClassName="flex flex-col gap-4"
    >
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
    </Secao>
  )
}

export function Integracoes() {
  return (
    <Secao
      titulo={
        <span className="inline-flex items-center gap-2">
          Integrações <SeloEmBreve />
        </span>
      }
      abertaPorPadrao
    >
      <p className="mb-3 text-sm text-tinta-3">
        Por enquanto as vendas entram pelo fechamento do dia (botão "Lançar vendas") e as despesas por foto ou
        planilha. As conexões automáticas abaixo estão chegando.
      </p>
      <ul className="flex flex-col">
        {INTEGRACOES_EM_BREVE.map((it, i) => (
          <li
            key={it.id}
            aria-disabled
            className={cn('flex items-center gap-3 py-3 opacity-70', i > 0 && 'border-t border-divisoria')}
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-botao text-xs font-bold text-creme grayscale-[35%]"
              style={{ background: it.cor }}
            >
              {it.sigla}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-tinta">{it.nome}</div>
              <div className="truncate text-xs text-tinta-4">{it.dica}</div>
            </div>
            <SeloEmBreve />
          </li>
        ))}
      </ul>
    </Secao>
  )
}

export function Equipe() {
  const { sessao, permissoes } = useAuth()
  const membros = (useMembros().data ?? []) as (MembroDoc & { id: string })[]
  const salvar = useSalvarMembro()
  const remover = useRemoverMembro()

  const gestao = permissoes?.gerenciaEquipe ?? 'nao'
  const podeGerenciar = gestao !== 'nao'
  const ehDono = gestao === 'total'

  return (
    <Secao
      id="equipe"
      titulo="Quem usa e o que cada um pode"
      resumo={`${membros.length} ${membros.length === 1 ? 'pessoa' : 'pessoas'}`}
      abertaPorPadrao
    >
      {gestao === 'proposta' && (
        <p className="mb-2 rounded-campo bg-sol/15 px-3 py-2 text-xs text-insight-rotulo">
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

      {podeGerenciar && <ConvidarEquipe />}
      {!ehDono && gestao === 'proposta' && podeGerenciar && (
        <p className="mt-2 text-xs text-tinta-4">
          Quem entra por esse link já começa ativo com o papel escolhido — mudanças de permissão depois é que passam pela aprovação do dono.
        </p>
      )}
    </Secao>
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
      <td className="px-4 py-3 text-tinta-4">{quando(new Date(a.criadoEm), agora())}</td>
    </tr>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn('rotulo px-4 py-2.5 text-tinta-4', className)}>{children}</th>
}
