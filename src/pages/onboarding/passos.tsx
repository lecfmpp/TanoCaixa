import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { TituloPasso, CaixaViva, CampoTexto, Rotulo } from './ui'
import { Chip } from '@/components/ui/Chip'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { HorarioSemana, HORARIO_PADRAO, type DiaHorario } from '@/components/ui/HorarioSemana'
import { brlInteiro, inteiro, mascararCNPJ, mascararTelefone, apenasDigitos } from '@/lib/format'
import { cn } from '@/lib/cn'

const soDigitos = (s: string) => Number(s.replace(/\D/g, '') || 0)

/* -------------------------------- Passo 1 ------------------------------- */

const OPERACOES = ['Só delivery', 'Delivery + salão', 'Só salão', 'Buffet / eventos']
const COZINHAS = ['Árabe', 'Boteco', 'Pizza', 'Japonês', 'Outro']

export function Passo1Restaurante() {
  const [operacao, setOperacao] = useState('Delivery + salão')
  const [cozinha, setCozinha] = useState('Árabe')
  const [cnpj, setCnpj] = useState('')
  return (
    <div>
      <TituloPasso titulo="Me conta do seu restaurante" sub="Só o básico. Dá pra mudar depois." />
      <div className="flex flex-col gap-5">
        <CampoTexto rotulo="Nome que aparece pro cliente" defaultValue="Zaatar Cozinha Árabe" />
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto rotulo="Bairro" defaultValue="Botafogo" />
          <CampoTexto rotulo="Lojas" defaultValue="1" inputMode="numeric" />
        </div>

        <div>
          <Rotulo>Como você opera</Rotulo>
          <div className="flex flex-wrap gap-2">
            {OPERACOES.map((o) => (
              <Chip key={o} rotulo={o} selecionado={operacao === o} aoClicar={() => setOperacao(o)} />
            ))}
          </div>
        </div>

        <div>
          <Rotulo>Tipo de comida</Rotulo>
          <div className="flex flex-wrap gap-2">
            {COZINHAS.map((o) => (
              <Chip key={o} rotulo={o} selecionado={cozinha === o} aoClicar={() => setCozinha(o)} />
            ))}
          </div>
        </div>

        <CampoTexto
          rotulo="CNPJ · opcional agora"
          placeholder="00.000.000/0001-00"
          inputMode="numeric"
          value={cnpj}
          onChange={(e) => setCnpj(mascararCNPJ(e.target.value))}
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

export function Passo2Canais() {
  const [sel, setSel] = useState<Set<string>>(new Set(['ifood', 'rappi', 'balcao']))
  const [ticket, setTicket] = useState('68')
  const [pedidos, setPedidos] = useState('48')
  const [horarios, setHorarios] = useState<DiaHorario[]>(HORARIO_PADRAO)
  const alterna = (id: string) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
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
          value={ticket}
          onChange={(e) => setTicket(apenasDigitos(e.target.value))}
        />
        <CampoTexto
          rotulo="Pedidos por dia"
          inputMode="numeric"
          value={pedidos}
          onChange={(e) => setPedidos(apenasDigitos(e.target.value))}
        />
      </div>

      <div className="mt-5">
        <Rotulo>Dias e horários de funcionamento</Rotulo>
        <p className="-mt-1 mb-2 text-xs text-tinta-4">
          A gente usa isso pra saber quando a loja tá aberta. No ícone de copiar, você repete o
          horário de um dia pros outros.
        </p>
        <HorarioSemana valor={horarios} aoMudar={setHorarios} />
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
}: {
  folha: number
  contasFixas: number
  onFolha: (n: number) => void
  onContasFixas: (n: number) => void
  pontoEquilibrio: number
}) {
  return (
    <div>
      <TituloPasso
        titulo="Os números de partida"
        sub="Chute redondo já serve. Depois do primeiro mês o app corrige sozinho."
      />
      <div className="flex flex-col gap-5">
        <CampoTexto rotulo="Faturamento de um mês normal" prefixo="R$" defaultValue="50.000" inputMode="numeric" />
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto
            rotulo="Folha por mês"
            prefixo="R$"
            inputMode="numeric"
            value={inteiro(folha)}
            onChange={(e) => onFolha(soDigitos(e.target.value))}
          />
          <CampoTexto rotulo="Pessoas" defaultValue="6" inputMode="numeric" />
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

type Tetos = { mercadoria: number; pessoal: number; ocupacao: number; taxas_app: number }
const ROTULO_TETO: Record<keyof Tetos, string> = {
  mercadoria: 'Mercadoria',
  pessoal: 'Pessoal',
  ocupacao: 'Ocupação',
  taxas_app: 'Taxas de app',
}

export function Passo6Metas({
  tetos,
  onTetos,
  sobraPct,
  sobraReais,
}: {
  tetos: Tetos
  onTetos: (t: Tetos) => void
  sobraPct: number
  sobraReais: number
  meta: number
}) {
  const [avisos, setAvisos] = useState({ whatsapp: true, email: true, sms: false })
  return (
    <div>
      <TituloPasso
        titulo="Suas metas do primeiro mês"
        sub="Já deixamos preenchido com o que costuma funcionar. Ajusta se quiser."
      />

      <CampoTexto rotulo="Meta de faturamento" prefixo="R$" defaultValue="50.000" inputMode="numeric" />
      <p className="mt-1.5 text-xs text-tinta-4">Um degrau acima de julho, sem apertar demais.</p>

      <div className="mt-5 flex flex-col gap-2">
        {(Object.keys(ROTULO_TETO) as (keyof Tetos)[]).map((k) => (
          <div
            key={k}
            className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-2.5"
          >
            <span className="text-sm font-semibold text-tinta-2">{ROTULO_TETO[k]}</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                value={tetos[k]}
                onChange={(e) => onTetos({ ...tetos, [k]: soDigitos(e.target.value) })}
                className="mono w-14 rounded-[8px] border border-[rgba(46,95,115,0.14)] bg-fundo-app px-2 py-1 text-right text-sm text-tinta outline-none focus:border-mar"
              />
              <span className="mono text-sm text-tinta-4">%</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-cartao bg-mar px-5 py-3.5 text-creme">
        <span className="text-sm font-semibold">Sobra prevista</span>
        <span className="mono text-sm font-bold">
          {sobraPct}% · {brlInteiro(sobraReais)}
        </span>
      </div>

      <div className="mt-6">
        <Rotulo>Onde te avisar</Rotulo>
        <div className="flex flex-col gap-2">
          <LinhaAviso
            nome="WhatsApp"
            dica="alerta quando um teto chega perto"
            ligado={avisos.whatsapp}
            aoTrocar={(v) => setAvisos({ ...avisos, whatsapp: v })}
          />
          <LinhaAviso
            nome="E-mail"
            dica="resumo toda segunda de manhã"
            ligado={avisos.email}
            aoTrocar={(v) => setAvisos({ ...avisos, email: v })}
          />
          <LinhaAviso
            nome="SMS"
            dica="só emergência, se faltar internet"
            ligado={avisos.sms}
            aoTrocar={(v) => setAvisos({ ...avisos, sms: v })}
          />
        </div>
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

/* -------------------------------- Passo 7 ------------------------------- */

export function Passo7Pronto() {
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
    </div>
  )
}
