import { useEffect, useState } from 'react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Campo } from '@/components/ui/Campo'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { useUI } from '@/ui/UIProvider'
import { useRestaurante, useSalvarRestaurante } from '@/data/hooks'
import { MES_REF } from '@/data/derive'
import { nomeDoMes } from '@/data/planoMes'
import { GRUPO, GRUPOS_COM_TETO, tetosNormalizados, type Tetos } from '@/data/planoContas'
import { pagaFranqueadora } from '@/types'
import { apenasDigitos, brlInteiro, inteiro } from '@/lib/format'
import { mensagemDeErro } from '@/lib/erros'
import type { RestauranteDoc } from '@/data/types'

const OPERACOES: { id: string; nome: string }[] = [
  { id: 'delivery', nome: 'Só delivery' },
  { id: 'delivery_salao', nome: 'Delivery + salão' },
  { id: 'salao', nome: 'Só salão' },
  { id: 'buffet', nome: 'Buffet / eventos' },
]

/** "1.234" digitado → 1234. Campos de dinheiro guardam número, mostram com ponto de milhar. */
const soNumero = (v: string) => Number(apenasDigitos(v)) || 0
const decimal = (v: string) => Number(v.replace(',', '.')) || 0
/** 6 → '6', 7.5 → '7,5' (percentual no formato que o dono digita). */
const pctTexto = (n: number | undefined) => (n === undefined ? '' : String(Math.round(n * 10) / 10).replace('.', ','))

interface Form {
  nome: string
  bairro: string
  cozinha: string
  operacao: string
  faturamentoMensal: number
  meta: number
  ticket: string
  pedidosDia: number
  pessoas: number
  folha: number
  contasFixas: number
  mercadoria: number
  aliquota: string
  tetos: Record<string, string>
}

function formDe(cfg: RestauranteDoc): Form {
  const tetos = tetosNormalizados(cfg.tetos as Record<string, number> | undefined)
  return {
    nome: cfg.nome ?? '',
    bairro: cfg.bairro ?? '',
    cozinha: cfg.tipoCozinha ?? '',
    operacao: cfg.tipoOperacao ?? 'delivery_salao',
    faturamentoMensal: cfg.faturamentoMensal ?? 0,
    meta: cfg.metaFaturamento ?? 0,
    ticket: cfg.ticketMedio ? String(cfg.ticketMedio).replace('.', ',') : '',
    pedidosDia: cfg.pedidosDia ?? 0,
    pessoas: cfg.pessoas ?? 0,
    folha: cfg.folha ?? 0,
    contasFixas: cfg.contasFixas ?? 0,
    mercadoria: cfg.mercadoria ?? 0,
    aliquota: pctTexto((cfg.aliquotaImposto ?? 0.06) * 100),
    tetos: Object.fromEntries(GRUPOS_COM_TETO.map((g) => [g, pctTexto(tetos[g])])),
  }
}

/**
 * Metas e números: as respostas do onboarding, editáveis a qualquer hora.
 * O que se grava aqui é o que o Dashboard lê — metas dos KPIs (tetos), meta de
 * faturamento e alíquota do imposto estimado.
 */
export function Metas() {
  const cfg = useRestaurante().data
  const salvar = useSalvarRestaurante()
  const { adicionarToast } = useUI()
  const [form, setForm] = useState<Form | null>(null)

  // Carrega uma vez quando o restaurante chega; depois o que vale é o que a pessoa digita.
  useEffect(() => {
    if (cfg && !form) setForm(formDe(cfg))
  }, [cfg, form])

  if (!cfg || !form) {
    return <p className="py-10 text-center text-sm text-tinta-4">Carregando…</p>
  }

  const upd = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const grupos = GRUPOS_COM_TETO.filter((g) => g !== 'franqueadora' || pagaFranqueadora(cfg.tipoNegocio))
  const somaTetos = grupos.reduce((s, g) => s + decimal(form.tetos[g] ?? ''), 0)
  const sobra = 100 - somaTetos
  const impliedFat = Math.round(decimal(form.ticket) * form.pedidosDia * 30)

  /** Tetos a partir de folha, contas fixas e compras ÷ meta — a mesma conta do onboarding. */
  function calcularTetos() {
    const base = form!.meta || form!.faturamentoMensal
    if (!base) {
      adicionarToast({ tipo: 'atencao', titulo: 'Falta a meta', texto: 'Preencha a meta (ou o faturamento de um mês normal) pra calcular os tetos.' })
      return
    }
    const pct = (v: number) => pctTexto(Math.round((v / base) * 100))
    upd({
      tetos: {
        ...form!.tetos,
        ...(form!.folha > 0 ? { pessoal: pct(form!.folha) } : {}),
        ...(form!.contasFixas > 0 ? { ocupacao: pct(form!.contasFixas) } : {}),
        ...(form!.mercadoria > 0 ? { cmv: pct(form!.mercadoria) } : {}),
      },
    })
  }

  async function gravar() {
    const f = form!
    const tetos: Tetos = {}
    for (const g of GRUPOS_COM_TETO) tetos[g] = decimal(f.tetos[g] ?? '')
    try {
      await salvar.mutateAsync({
        nome: f.nome.trim() || cfg!.nome,
        bairro: f.bairro.trim(),
        tipoCozinha: f.cozinha.trim(),
        tipoOperacao: f.operacao,
        faturamentoMensal: f.faturamentoMensal,
        metaFaturamento: f.meta,
        ticketMedio: decimal(f.ticket),
        pedidosDia: f.pedidosDia,
        pessoas: f.pessoas,
        folha: f.folha,
        contasFixas: f.contasFixas,
        mercadoria: f.mercadoria,
        aliquotaImposto: decimal(f.aliquota) / 100,
        tetos,
      })
      adicionarToast({ tipo: 'sucesso', titulo: 'Metas salvas', texto: 'O Dashboard já usa os números novos.' })
    } catch (e) {
      console.error('metas:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra salvar', texto: mensagemDeErro(e, 'As alterações não foram gravadas. Tente de novo.') })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Metas e números"
        subtitulo={[cfg.nome, cfg.bairro, nomeDoMes(MES_REF)].filter(Boolean).join(' · ')}
        lancar={false}
      />

      <p className="text-sm text-tinta-3">
        São as mesmas respostas do começo. Mude quando o negócio mudar — o Dashboard passa a usar na hora.
      </p>

      <Cartao className="flex flex-col gap-4">
        <h2 className="text-[15px] font-bold text-tinta">O restaurante</h2>
        <div className="grid grid-cols-1 gap-3 cel:grid-cols-3">
          <Campo rotulo="Nome" value={form.nome} onChange={(e) => upd({ nome: e.target.value })} />
          <Campo rotulo="Bairro" value={form.bairro} onChange={(e) => upd({ bairro: e.target.value })} />
          <Campo rotulo="Tipo de cozinha" value={form.cozinha} onChange={(e) => upd({ cozinha: e.target.value })} />
        </div>
        <div>
          <span className="rotulo mb-1.5 block text-tinta-4">Como opera</span>
          <div className="flex flex-wrap gap-2">
            {OPERACOES.map((o) => (
              <Chip key={o.id} rotulo={o.nome} selecionado={form.operacao === o.id} aoClicar={() => upd({ operacao: o.id })} />
            ))}
          </div>
        </div>
      </Cartao>

      <Cartao className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-tinta">Números de partida</h2>
          <p className="text-sm text-tinta-3">Chute redondo já serve. Servem de base pra sugerir os tetos.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 cel:grid-cols-2 tab:grid-cols-3">
          <Campo rotulo="Faturamento de um mês normal (R$)" inputMode="numeric" value={inteiro(form.faturamentoMensal) === '0' ? '' : inteiro(form.faturamentoMensal)} onChange={(e) => upd({ faturamentoMensal: soNumero(e.target.value) })} />
          <Campo rotulo="Ticket médio (R$)" inputMode="decimal" value={form.ticket} onChange={(e) => upd({ ticket: e.target.value })} />
          <Campo rotulo="Pedidos por dia" inputMode="numeric" value={form.pedidosDia ? String(form.pedidosDia) : ''} onChange={(e) => upd({ pedidosDia: soNumero(e.target.value) })} />
          <Campo rotulo="Folha por mês (R$)" inputMode="numeric" value={inteiro(form.folha) === '0' ? '' : inteiro(form.folha)} onChange={(e) => upd({ folha: soNumero(e.target.value) })} />
          <Campo rotulo="Contas fixas por mês (R$)" inputMode="numeric" value={inteiro(form.contasFixas) === '0' ? '' : inteiro(form.contasFixas)} onChange={(e) => upd({ contasFixas: soNumero(e.target.value) })} />
          <Campo rotulo="Compras de mercadoria por mês (R$)" inputMode="numeric" value={inteiro(form.mercadoria) === '0' ? '' : inteiro(form.mercadoria)} onChange={(e) => upd({ mercadoria: soNumero(e.target.value) })} />
          <Campo rotulo="Pessoas na equipe" inputMode="numeric" value={form.pessoas ? String(form.pessoas) : ''} onChange={(e) => upd({ pessoas: soNumero(e.target.value) })} />
        </div>
        {impliedFat > 0 && (
          <p className="text-xs text-tinta-4">
            Ticket × pedidos × 30 dias dá cerca de <strong className="font-bold text-tinta-2">{brlInteiro(impliedFat)}</strong> por mês.
          </p>
        )}
      </Cartao>

      <Cartao className="flex flex-col gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-tinta">Metas</h2>
          <p className="text-sm text-tinta-3">A meta de faturamento e o teto de cada gasto, em % da receita bruta. É contra isso que o Dashboard compara.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 cel:grid-cols-2">
          <Campo rotulo="Meta de faturamento do mês (R$)" inputMode="numeric" value={inteiro(form.meta) === '0' ? '' : inteiro(form.meta)} onChange={(e) => upd({ meta: soNumero(e.target.value) })} />
          <Campo rotulo="Imposto sobre venda (%) · alíquota estimada" inputMode="decimal" value={form.aliquota} onChange={(e) => upd({ aliquota: e.target.value })} />
        </div>

        <div className="flex flex-col gap-3 border-t border-divisoria pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rotulo text-tinta-4">Teto por grupo · % da receita bruta</span>
            <button onClick={calcularTetos} className="text-sm font-bold text-mar hover:text-mar-escuro">
              Sugerir pelos números de partida
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 tab:grid-cols-4">
            {grupos.map((g) => (
              <Campo
                key={g}
                rotulo={GRUPO[g].simples}
                inputMode="decimal"
                value={form.tetos[g] ?? ''}
                onChange={(e) => upd({ tetos: { ...form.tetos, [g]: e.target.value } })}
              />
            ))}
          </div>
          <p className="text-xs text-tinta-3">
            Os tetos somam <strong className="font-bold text-tinta">{somaTetos.toFixed(1)}%</strong>. Sobram{' '}
            <strong className={sobra < 0 ? 'font-bold text-telha-alerta' : 'font-bold text-mata'}>{sobra.toFixed(1)}%</strong> de margem
            {form.meta > 0 && sobra > 0 ? ` — ${brlInteiro((form.meta * sobra) / 100)} se bater a meta` : ''}.
          </p>
        </div>
      </Cartao>

      <div className="flex justify-end">
        <Button onClick={gravar} disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}
