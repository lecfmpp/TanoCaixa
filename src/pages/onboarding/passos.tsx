import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { TituloPasso, CampoTexto, Rotulo } from './ui'
import { Chip } from '@/components/ui/Chip'
import { ImportarCSV } from '@/components/importar/ImportarCSV'
import { CONFIGS_IMPORT, type TipoImport } from '@/data/importar'
import type { LojaNova, RespostasOnboarding } from '@/data/hooks'
import { DIAS_TESTE, emailValido } from '@/data/assinatura'
import { PRECO_EXPANSAO, PRECO_LOJA, totalMensal } from '@/data/preco'
import { cn } from '@/lib/cn'
import { TIPOS_NEGOCIO, temRede } from '@/types'

type Upd = (p: Partial<RespostasOnboarding>) => void

/* ------------------------------ O restaurante ----------------------------- */

export function PassoRestaurante({ r, upd }: { r: RespostasOnboarding; upd: Upd }) {
  const franqueada = r.tipoNegocio === 'franqueada'
  const rede = temRede(r.tipoNegocio)
  return (
    <div>
      <TituloPasso titulo="Me conta do seu restaurante" sub="Só o básico. Dá pra mudar depois." />
      <div className="flex flex-col gap-5">
        <CampoTexto
          rotulo="Nome do seu restaurante"
          placeholder="Como o cliente conhece"
          value={r.nome}
          onChange={(e) => upd({ nome: e.target.value })}
        />
        <CampoTexto rotulo="Bairro" placeholder="Onde fica a loja" value={r.bairro} onChange={(e) => upd({ bairro: e.target.value })} />

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
            placeholder={franqueada ? 'A marca que você representa' : 'A marca das suas lojas'}
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
                placeholder="Ex: 5"
                inputMode="decimal"
                value={String(r.royalties || '')}
                onChange={(e) => upd({ royalties: Number(e.target.value.replace(',', '.')) || 0 })}
              />
              <CampoTexto
                rotulo="Fundo de promoção (%)"
                placeholder="Ex: 2"
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

        {rede ? (
          <SuasLojas r={r} upd={upd} />
        ) : (
          <CampoGestor
            rotulo="E-mail de quem gerencia a loja · opcional"
            valor={r.gestorEmail}
            aoMudar={(v) => upd({ gestorEmail: v })}
            dica="Deixe em branco se o gestor é você. Se for outra pessoa, ela recebe um convite por e-mail e entra só nesta loja."
          />
        )}
      </div>
    </div>
  )
}

/* -------------------------------- Lojas -------------------------------- */

const LOJA_VAZIA: LojaNova = { nome: '', bairro: '', gestorEmail: '' }

function CampoGestor({ rotulo, valor, aoMudar, dica }: { rotulo: string; valor: string; aoMudar: (v: string) => void; dica?: string }) {
  const invalido = valor.trim() !== '' && !emailValido(valor)
  return (
    <div>
      <CampoTexto rotulo={rotulo} type="email" placeholder="gerente@email.com" value={valor} onChange={(e) => aoMudar(e.target.value)} />
      {invalido ? (
        <p className="mt-1.5 text-xs font-semibold text-telha-alerta">Confira o e-mail — falta algo.</p>
      ) : (
        dica && <p className="mt-1.5 text-xs text-tinta-4">{dica}</p>
      )}
    </div>
  )
}

/** Várias lojas: a desta conta + as outras, cada uma com o e-mail do seu gestor. */
function SuasLojas({ r, upd }: { r: RespostasOnboarding; upd: Upd }) {
  const mudar = (i: number, patch: Partial<LojaNova>) =>
    upd({ outrasLojas: r.outrasLojas.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  const total = 1 + r.outrasLojas.filter((l) => l.nome.trim()).length
  return (
    <div>
      <Rotulo>Suas lojas</Rotulo>
      <p className="-mt-1 mb-3 text-xs text-tinta-4">
        Você vê todas e troca de uma pra outra no topo do painel. Cada gestor recebe um convite por e-mail e vê só a loja
        dele. Pode cadastrar agora ou depois, em Rede.
      </p>
      <div className="flex flex-col gap-2.5">
        <div className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie p-3.5">
          <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-tinta">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-mar text-[11px] text-creme">1</span>
            {r.nome.trim() || 'Esta loja'}
            <span className="text-xs font-medium text-tinta-4">· {r.bairro.trim() || 'a do cadastro'}</span>
          </div>
          <CampoGestor rotulo="E-mail do gestor · opcional" valor={r.gestorEmail} aoMudar={(v) => upd({ gestorEmail: v })} dica="Em branco = você mesmo gerencia." />
        </div>

        {r.outrasLojas.map((l, i) => (
          <div key={i} className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-tinta">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-mar text-[11px] text-creme">{i + 2}</span>
                Loja {i + 2}
              </span>
              <button
                type="button"
                onClick={() => upd({ outrasLojas: r.outrasLojas.filter((_, j) => j !== i) })}
                className="grid h-7 w-7 place-items-center rounded-botao text-tinta-4 hover:bg-preenchimento hover:text-tinta"
                aria-label={`Tirar a loja ${i + 2}`}
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <CampoTexto rotulo="Nome da loja" placeholder="Ex: Tijuca" value={l.nome} onChange={(e) => mudar(i, { nome: e.target.value })} />
                <CampoTexto rotulo="Bairro" placeholder="Onde fica" value={l.bairro} onChange={(e) => mudar(i, { bairro: e.target.value })} />
              </div>
              <CampoGestor rotulo="E-mail do gestor · opcional" valor={l.gestorEmail} aoMudar={(v) => mudar(i, { gestorEmail: v })} />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => upd({ outrasLojas: [...r.outrasLojas, { ...LOJA_VAZIA }] })}
          className={cn(
            'flex items-center justify-center gap-2 rounded-campo border border-dashed border-mar/40 px-4 py-3 text-sm font-bold text-mar transition hover:border-mar hover:bg-mar/5',
          )}
        >
          <Plus size={16} /> Adicionar outra loja
        </button>
      </div>
      <p className="mt-2.5 text-xs text-tinta-4">
        {DIAS_TESTE} dias grátis. Depois, Pro R$ {PRECO_LOJA}/mês com 1 loja + Expansão R$ {PRECO_EXPANSAO}/mês por loja a
        mais — com {total} {total === 1 ? 'loja' : 'lojas'}, R$ {totalMensal(total).toLocaleString('pt-BR')}/mês.
      </p>
    </div>
  )
}

/* ------------------------------ Tudo pronto ----------------------------- */

const TIPOS_IMPORT: TipoImport[] = ['produtos', 'despesas', 'estoque']

export function PassoPronto({ r }: { r: RespostasOnboarding }) {
  const [tipoImp, setTipoImp] = useState<TipoImport>('produtos')
  const outras = temRede(r.tipoNegocio) ? r.outrasLojas.filter((l) => l.nome.trim()) : []
  const gestores = [r.gestorEmail, ...outras.map((l) => l.gestorEmail)].filter(emailValido).length
  const feitos = [
    r.nome.trim() ? `${r.nome.trim()} cadastrado` : 'Restaurante cadastrado',
    TIPOS_NEGOCIO.find((t) => t.id === r.tipoNegocio)?.nome,
    outras.length ? `${outras.length + 1} lojas cadastradas` : null,
    gestores ? `${gestores} ${gestores === 1 ? 'gestor recebe' : 'gestores recebem'} o convite por e-mail` : null,
  ].filter((f): f is string => !!f)
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

      <div className="mt-3 flex items-start gap-3 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mar text-xs font-extrabold text-creme" aria-hidden>
          {DIAS_TESTE}
        </span>
        <span className="text-sm text-tinta-2">
          <strong className="font-bold text-tinta">{DIAS_TESTE} dias grátis pra testar tudo.</strong> Depois, é só assinar
          o Pro (R$ {PRECO_LOJA}/mês) pra continuar usando.
        </span>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-campo border border-sol/60 bg-superficie px-4 py-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sol text-sm font-extrabold text-noite" aria-hidden>
          !
        </span>
        <span className="text-sm text-tinta-2">
          <strong className="font-bold text-tinta">Faturamento e meta ficam pra depois.</strong> No painel, abra{' '}
          <strong className="font-bold">Metas e números</strong> — o "!" no menu mostra que falta conferir.
        </span>
      </div>

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
