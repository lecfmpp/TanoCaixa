import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { TituloPasso, CaixaViva, CampoTexto, Rotulo, LinhaPontilhada } from './ui'
import { Chip } from '@/components/ui/Chip'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { HorarioSemana } from '@/components/ui/HorarioSemana'
import { ImportarCSV } from '@/components/importar/ImportarCSV'
import { CONFIGS_IMPORT, type TipoImport } from '@/data/importar'
import { pctDaMeta, TAXA_APP_TETO_PADRAO, type RespostasOnboarding } from '@/data/hooks'
import { TIPOS_NEGOCIO, temRede } from '@/types'

type Upd = (p: Partial<RespostasOnboarding>) => void
import { brlInteiro, inteiro, mascararCNPJ, mascararTelefone, apenasDigitos } from '@/lib/format'
import { cn } from '@/lib/cn'

const soDigitos = (s: string) => Number(s.replace(/\D/g, '') || 0)

/* -------------------------------- Passo 1 ------------------------------- */

const OPERACOES = ['Só delivery', 'Delivery + salão', 'Só salão', 'Buffet / eventos']
const COZINHAS = ['Árabe', 'Boteco', 'Pizza', 'Japonês', 'Outro']

export function Passo1Restaurante({ r, upd }: { r: RespostasOnboarding; upd: Upd }) {
  const franqueada = r.tipoNegocio === 'franqueada'
  const rede = temRede(r.tipoNegocio)
  return (
    <div>
      <TituloPasso titulo="Me conta do seu restaurante" sub="Só o básico. Dá pra mudar depois." />
      <div className="flex flex-col gap-5">
        <CampoTexto rotulo="Nome que aparece pro cliente" value={r.nome} onChange={(e) => upd({ nome: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto rotulo="Bairro" value={r.bairro} onChange={(e) => upd({ bairro: e.target.value })} />
          <CampoTexto rotulo="Lojas" value={r.lojas} onChange={(e) => upd({ lojas: e.target.value })} inputMode="numeric" />
        </div>

        {/* Tipo de negócio — define o DRE (linha de franqueadora) e a visão de rede */}
        <div>
          <Rotulo>Como é o seu negócio</Rotulo>
          <div className="flex flex-wrap gap-2">
            {TIPOS_NEGOCIO.map((t) => (
              <Chip key={t.id} rotulo={t.nome} selecionado={r.tipoNegocio === t.id} aoClicar={() => upd({ tipoNegocio: t.id })} />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-tinta-4">
            {TIPOS_NEGOCIO.find((t) => t.id === r.tipoNegocio)?.desc}
          </p>
        </div>

        {(franqueada || rede) && (
          <CampoTexto
            rotulo={franqueada ? 'Nome da rede que você é franqueado' : 'Nome da sua rede'}
            placeholder="Zaatar"
            value={r.nomeRede}
            onChange={(e) => upd({ nomeRede: e.target.value })}
          />
        )}

        {franqueada && (
          <div>
            <Rotulo>O que você paga pra franqueadora</Rotulo>
            <div className="grid grid-cols-2 gap-3">
              <CampoTexto
                rotulo="Royalties (% da receita)"
                inputMode="decimal"
                value={String(r.royalties || '')}
                onChange={(e) => upd({ royalties: Number(e.target.value.replace(',', '.')) || 0 })}
              />
              <CampoTexto
                rotulo="Fundo de promoção (%)"
                inputMode="decimal"
                value={String(r.fundoPromocao || '')}
                onChange={(e) => upd({ fundoPromocao: Number(e.target.value.replace(',', '.')) || 0 })}
              />
            </div>
            <p className="mt-1.5 text-xs text-tinta-4">
              Entram como linha própria no DRE. Se você não lançar o boleto, a gente provisiona por esse percentual.
            </p>
          </div>
        )}

        <div>
          <Rotulo>Como você opera</Rotulo>
          <div className="flex flex-wrap gap-2">
            {OPERACOES.map((o) => (
              <Chip key={o} rotulo={o} selecionado={r.operacao === o} aoClicar={() => upd({ operacao: o })} />
            ))}
          </div>
        </div>

        <div>
          <Rotulo>Tipo de comida</Rotulo>
          <div className="flex flex-wrap gap-2">
            {COZINHAS.map((o) => (
              <Chip key={o} rotulo={o} selecionado={r.cozinha === o} aoClicar={() => upd({ cozinha: o })} />
            ))}
          </div>
        </div>

        <CampoTexto
          rotulo="CNPJ · opcional agora"
          placeholder="00.000.000/0001-00"
          inputMode="numeric"
          value={r.cnpj}
          onChange={(e) => upd({ cnpj: mascararCNPJ(e.target.value) })}
        />
      </div>
    </div>
  )
}

/* -------------------------------- Passo 2 ------------------------------- */

const CANAIS = [
  { id: 'ifood', nome: 'iFood', dica: 'vendas e taxas automáticas' },
  { id: 'rappi', nome: 'Rappi', dica: '' },
  { id: 'whatsapp', nome: 'WhatsApp / site próprio', dica: 'o mais lucrativo pra você' },
  { id: 'balcao', nome: 'Balcão e retirada', dica: 'maquininha ou Pix na loja' },
]

export function Passo2Canais({ r, upd }: { r: RespostasOnboarding; upd: Upd }) {
  const sel = new Set(r.canais)
  const alterna = (id: string) => {
    const n = new Set(r.canais)
    n.has(id) ? n.delete(id) : n.add(id)
    upd({ canais: [...n] })
  }
  return (
    <div>
      <TituloPasso
        titulo="Por onde você vende?"
        sub="Marca tudo que usa hoje — cada canal marcado vira uma integração no passo 4."
      />
      <div className="flex flex-col gap-2.5">
        {CANAIS.map((c) => {
          const on = sel.has(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => alterna(c.id)}
              className={cn(
                'flex items-center gap-3 rounded-campo border bg-superficie px-4 py-3.5 text-left transition',
                on ? 'border-mar ring-2 ring-mar/15' : 'border-[rgba(46,95,115,0.14)] hover:border-mar/40',
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border-2 transition',
                  on ? 'border-mar bg-mar text-creme' : 'border-tinta-5',
                )}
              >
                {on && <Check size={13} strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-sm font-bold text-tinta">{c.nome}</span>
                {c.dica && <span className="block text-xs text-tinta-4">{c.dica}</span>}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <CampoTexto
          rotulo="Ticket médio"
          prefixo="R$"
          inputMode="numeric"
          value={r.ticket}
          onChange={(e) => upd({ ticket: apenasDigitos(e.target.value) })}
        />
        <CampoTexto
          rotulo="Pedidos por dia"
          inputMode="numeric"
          value={r.pedidos}
          onChange={(e) => upd({ pedidos: apenasDigitos(e.target.value) })}
        />
      </div>

      <div className="mt-5">
        <Rotulo>Dias e horários de funcionamento</Rotulo>
        <p className="-mt-1 mb-2 text-xs text-tinta-4">
          A gente usa isso pra saber quando a loja tá aberta. No botão "Aplicar em todos os dias",
          você repete o horário de um dia pros outros.
        </p>
        <HorarioSemana valor={r.horarios} aoMudar={(h) => upd({ horarios: h })} />
      </div>
    </div>
  )
}

/* -------------------------------- Passo 3 ------------------------------- */

export function Passo3Numeros({
  folha,
  contasFixas,
  onFolha,
  onContasFixas,
  pontoEquilibrio,
  faturamento,
  pessoas,
  onFaturamento,
  onPessoas,
}: {
  folha: number
  contasFixas: number
  onFolha: (n: number) => void
  onContasFixas: (n: number) => void
  pontoEquilibrio: number
  faturamento: string
  pessoas: string
  onFaturamento: (v: string) => void
  onPessoas: (v: string) => void
}) {
  return (
    <div>
      <TituloPasso
        titulo="Os números de partida"
        sub="Chute redondo já serve. Depois do primeiro mês o app corrige sozinho."
      />
      <div className="flex flex-col gap-5">
        <CampoTexto rotulo="Faturamento de um mês normal" prefixo="R$" inputMode="numeric" value={faturamento} onChange={(e) => onFaturamento(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto
            rotulo="Folha por mês"
            prefixo="R$"
            inputMode="numeric"
            value={inteiro(folha)}
            onChange={(e) => onFolha(soDigitos(e.target.value))}
          />
          <CampoTexto rotulo="Pessoas" value={pessoas} onChange={(e) => onPessoas(apenasDigitos(e.target.value))} inputMode="numeric" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto
            rotulo="Contas fixas do mês"
            prefixo="R$"
            inputMode="numeric"
            value={inteiro(contasFixas)}
            onChange={(e) => onContasFixas(soDigitos(e.target.value))}
          />
          <CampoTexto rotulo="Estoque parado hoje · se souber" prefixo="R$" defaultValue="0" inputMode="numeric" />
        </div>
      </div>

      <CaixaViva rotulo="Já dá pra dizer">
        Você precisa vender uns <strong className="font-bold">{brlInteiro(pontoEquilibrio)}</strong> por
        mês pra não ter prejuízo.
      </CaixaViva>
    </div>
  )
}

/* -------------------------------- Passo 4 ------------------------------- */

export function Passo4Integracoes() {
  return (
    <div>
      <TituloPasso
        titulo="Conecta pra não digitar nunca mais"
        sub="Uma vez só. Depois o faturamento entra sozinho todo dia."
      />
      <div className="flex flex-col gap-2.5">
        <LinhaIntegracao nome="iFood" dica="conectado · 38 pedidos ontem" estado="conectado" />
        <LinhaIntegracao nome="Rappi" dica="conectando…" estado="conectando" />
        <LinhaIntegracao nome="Maquininha" dica="Stone, Cielo, PagSeguro, Mercado Pago" estado="conectar" />
        <LinhaIntegracao nome="Sistema de PDV" dica="Colibri, Consumer, Goomer…" estado="conectar" />
      </div>
    </div>
  )
}

function LinhaIntegracao({
  nome,
  dica,
  estado,
}: {
  nome: string
  dica: string
  estado: 'conectado' | 'conectando' | 'conectar'
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-sm font-bold text-tinta">{nome}</div>
        <div className="flex items-center gap-1.5 text-xs text-tinta-4">
          {estado === 'conectando' && <Loader2 size={12} className="animate-spin text-sol" />}
          {estado === 'conectado' && <span className="h-1.5 w-1.5 rounded-full bg-mata" />}
          {dica}
        </div>
      </div>
      {estado === 'conectado' && (
        <span className="flex items-center gap-1 rounded-chip bg-mata/12 px-2.5 py-1 text-xs font-bold text-mata">
          <Check size={13} strokeWidth={3} /> pronto
        </span>
      )}
      {estado === 'conectar' && (
        <div className="flex shrink-0 items-center gap-3">
          <button className="text-xs font-semibold text-tinta-4 hover:text-tinta-2">faço depois</button>
          <Button variante="secundario" className="px-3.5 py-2 text-xs">
            Conectar
          </Button>
        </div>
      )}
    </div>
  )
}

/* -------------------------------- Passo 5 ------------------------------- */

const PAPEIS = ['Gerente', 'Estoque', 'Só lançar nota', 'Contador']

export function Passo5Equipe() {
  const [telConvite, setTelConvite] = useState('')
  return (
    <div>
      <TituloPasso
        titulo="Quem mais mexe nisso com você?"
        sub="Cada um vê só o que precisa. Ninguém vê seu lucro sem você deixar."
      />
      <div className="flex flex-col gap-2.5">
        <LinhaMembro
          inicial="H"
          cor="#2E5F73"
          nome="Halim (você)"
          info="vê tudo, inclusive o lucro"
          papel="dono"
        />
        <LinhaMembro
          inicial="J"
          cor="#C05437"
          nome="Jamile Rocha"
          info="(21) 99640-1188 · convite enviado"
          papel="gerente"
        />
      </div>

      <div className="mt-5 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-4">
        <Rotulo>Convidar mais alguém</Rotulo>
        <div className="flex flex-col gap-2.5 cel:flex-row">
          <input
            placeholder="(21) 90000-0000"
            inputMode="tel"
            value={telConvite}
            onChange={(e) => setTelConvite(mascararTelefone(e.target.value))}
            className="flex-1 rounded-campo border border-[rgba(46,95,115,0.14)] bg-fundo-app px-3.5 py-2.5 text-[15px] text-tinta outline-none placeholder:text-tinta-5 focus:border-mar"
          />
          <select
            className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-fundo-app px-3 py-2.5 text-sm text-tinta-2 outline-none focus:border-mar"
            defaultValue="Gerente"
          >
            {PAPEIS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <Button variante="secundario">Enviar convite</Button>
        </div>
      </div>
    </div>
  )
}

function LinhaMembro({
  inicial,
  cor,
  nome,
  info,
  papel,
}: {
  inicial: string
  cor: string
  nome: string
  info: string
  papel: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
      <Avatar inicial={inicial} cor={cor} tamanho={36} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-tinta">{nome}</div>
        <div className="truncate text-xs text-tinta-4">{info}</div>
      </div>
      <span className="rounded-chip bg-preenchimento px-2.5 py-1 text-xs font-bold text-tinta-2 capitalize">
        {papel}
      </span>
    </div>
  )
}

/* -------------------------------- Passo 6 ------------------------------- */

/** Campo de despesa em R$ com o % da meta calculado sozinho embaixo. */
function CampoDespesa({
  rotulo,
  valor,
  onValor,
  meta,
}: {
  rotulo: string
  valor: number
  onValor: (n: number) => void
  meta: string
}) {
  return (
    <div>
      <CampoTexto
        grande
        destaque
        rotulo={rotulo}
        prefixo="R$"
        inputMode="numeric"
        value={inteiro(valor)}
        onChange={(e) => onValor(soDigitos(e.target.value))}
      />
      <p className="mt-1 text-xs text-tinta-4">≈ {pctDaMeta(valor, meta)}% da meta de faturamento</p>
    </div>
  )
}

export function Passo6Metas({
  meta,
  onMeta,
  contasFixas,
  onContasFixas,
  folha,
  onFolha,
  mercadoria,
  onMercadoria,
  sobraPct,
  sobraReais,
}: {
  meta: string
  onMeta: (v: string) => void
  contasFixas: number
  onContasFixas: (n: number) => void
  folha: number
  onFolha: (n: number) => void
  mercadoria: number
  onMercadoria: (n: number) => void
  sobraPct: number
  sobraReais: number
}) {
  return (
    <div>
      <TituloPasso
        titulo="Suas metas do primeiro mês"
        sub="Já deixamos preenchido com o que você disse antes. Ajusta se quiser."
      />

      <Rotulo>Receita</Rotulo>
      <CampoTexto
        grande
        rotulo="Meta de faturamento"
        prefixo="R$"
        inputMode="numeric"
        value={meta}
        onChange={(e) => onMeta(e.target.value)}
      />
      <p className="mt-1.5 text-xs text-tinta-4">Um degrau acima de julho, sem apertar demais.</p>

      <LinhaPontilhada rotulo="despesas" />

      <div className="flex flex-col gap-4">
        <CampoDespesa rotulo="Aluguel e contas" valor={contasFixas} onValor={onContasFixas} meta={meta} />
        <CampoDespesa rotulo="Pessoal" valor={folha} onValor={onFolha} meta={meta} />
        <CampoDespesa rotulo="Compras · estoque" valor={mercadoria} onValor={onMercadoria} meta={meta} />
      </div>

      <LinhaPontilhada rotulo="taxa de app" />

      <p className="pretty text-sm text-tinta-3">
        As taxas de app (iFood, Rappi…) entram sozinhas quando você conecta as integrações — cerca de{' '}
        <strong className="font-bold text-tinta-2">{TAXA_APP_TETO_PADRAO}%</strong> pra começar. Dá pra ajustar
        depois no Plano do mês.
      </p>

      <LinhaPontilhada />

      <div className="flex items-center justify-between rounded-cartao bg-mar px-5 py-3.5 text-creme">
        <span className="text-sm font-semibold">Sobra prevista</span>
        <span className="mono text-sm font-bold">
          {sobraPct}% · {brlInteiro(sobraReais)}
        </span>
      </div>
    </div>
  )
}

/* -------------------------------- Passo 7 ------------------------------- */

export function Passo7Avisos({
  avisos,
  onAvisos,
}: {
  avisos: { whatsapp: boolean; email: boolean; sms: boolean }
  onAvisos: (a: { whatsapp: boolean; email: boolean; sms: boolean }) => void
}) {
  return (
    <div>
      <TituloPasso titulo="Onde te avisar" sub="A gente só chama a atenção quando importa — sem spam." />
      <div className="flex flex-col gap-2">
        <LinhaAviso
          nome="WhatsApp"
          dica="alerta quando um teto chega perto"
          ligado={avisos.whatsapp}
          aoTrocar={(v) => onAvisos({ ...avisos, whatsapp: v })}
        />
        <LinhaAviso
          nome="E-mail"
          dica="resumo toda segunda de manhã"
          ligado={avisos.email}
          aoTrocar={(v) => onAvisos({ ...avisos, email: v })}
        />
        <LinhaAviso
          nome="SMS"
          dica="só emergência, se faltar internet"
          ligado={avisos.sms}
          aoTrocar={(v) => onAvisos({ ...avisos, sms: v })}
        />
      </div>
    </div>
  )
}

function LinhaAviso({
  nome,
  dica,
  ligado,
  aoTrocar,
}: {
  nome: string
  dica: string
  ligado: boolean
  aoTrocar: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
      <div>
        <div className="text-sm font-bold text-tinta">{nome}</div>
        <div className="text-xs text-tinta-4">{dica}</div>
      </div>
      <Switch ligado={ligado} aoTrocar={aoTrocar} rotulo={nome} />
    </div>
  )
}

/* -------------------------------- Passo 8 ------------------------------- */

const TIPOS_IMPORT: TipoImport[] = ['produtos', 'despesas', 'estoque']

export function Passo8Pronto() {
  const [tipoImp, setTipoImp] = useState<TipoImport>('produtos')
  const feitos = [
    'Restaurante e equipe cadastrados',
    'iFood conectado, Rappi a caminho',
    'Meta de R$ 50.000 e tetos definidos',
  ]
  return (
    <div>
      <h2 className="text-tinta" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em' }}>
        Pronto, chefe. Agora é só cozinhar.
      </h2>

      <ul className="mt-6 flex flex-col gap-2.5">
        {feitos.map((f) => (
          <li
            key={f}
            className="flex items-center gap-3 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mata text-creme">
              <Check size={14} strokeWidth={3} />
            </span>
            <span className="text-sm font-semibold text-tinta">{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-5">
        <span className="rotulo text-insight-rotulo">Primeira missão</span>
        <p className="pretty mt-2 text-[15px] leading-relaxed text-insight-texto">
          Tira foto da última nota de fornecedor que estiver aí no balcão. Leva 40 segundos.
        </p>
      </div>

      {/* Importar dados por planilha (opcional) */}
      <div className="mt-8 border-t border-divisoria pt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-bold text-tinta">Já tem seus dados numa planilha?</h3>
            <p className="text-sm text-tinta-3">Opcional — importe de uma vez em vez de digitar um a um.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIPOS_IMPORT.map((tp) => (
              <Chip key={tp} rotulo={CONFIGS_IMPORT[tp].titulo} selecionado={tipoImp === tp} aoClicar={() => setTipoImp(tp)} />
            ))}
          </div>
        </div>
        <div className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie p-4">
          <ImportarCSV tipo={tipoImp} />
        </div>
      </div>
    </div>
  )
}
