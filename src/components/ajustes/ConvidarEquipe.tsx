import { useEffect, useMemo, useState } from 'react'
import { Check, Store } from 'lucide-react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { cn } from '@/lib/cn'
import { mensagemDeErro } from '@/lib/erros'
import { useLojasAcessiveis, useTenant } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import { PAPEIS, rotuloPapel, type Papel } from '@/types'

/** Papéis que dá pra dar num convite (o servidor recusa dono e franqueador). */
type PapelConvite = Extract<Papel, 'gestao' | 'caixa' | 'cozinha'>
const PAPEIS_CONVITE = PAPEIS.filter((p): p is (typeof PAPEIS)[number] & { id: PapelConvite } =>
  p.id === 'gestao' || p.id === 'caixa' || p.id === 'cozinha',
)

const DESC: Record<PapelConvite, string> = {
  gestao: 'vê tudo da loja, inclusive finanças; convida com aprovação do dono',
  caixa: 'só abre, fecha e concilia o caixa',
  cozinha: 'produtos e estoque; não vê finanças',
}

interface LojaEscolhida {
  restauranteId: string
  papel: PapelConvite
}

const criarConviteFn = httpsCallable<
  { lojas: LojaEscolhida[]; email?: string },
  { token: string; url: string; emailEnviado?: boolean; lojas: { restauranteId: string; restauranteNome: string; papel: string }[] }
>(functions, 'criarConvite')

/**
 * Convite por loja: o dono marca em quais lojas a pessoa entra e o papel em
 * cada uma. Antes de gerar o link, um modal mostra exatamente o que a pessoa
 * vai acessar — e o que fica de fora.
 */
export function ConvidarEquipe() {
  const { adicionarToast } = useUI()
  const tenant = useTenant()
  const todas = useLojasAcessiveis()
  const lojas = useMemo(() => todas.filter((l) => l.podeConvidar), [todas])

  // loja → papel. Começa só com a loja aberta agora marcada.
  const [marcadas, setMarcadas] = useState<Record<string, PapelConvite>>({})
  const [papelPadrao, setPapelPadrao] = useState<PapelConvite>('caixa')
  const [confirmando, setConfirmando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [gerado, setGerado] = useState<{ url: string; lojas: { nome: string; papel: PapelConvite }[]; email?: string } | null>(null)
  // Opcional: com e-mail, o convite também chega por e-mail (o link continua valendo pra mandar por WhatsApp).
  const [emailConvidado, setEmailConvidado] = useState('')
  const emailValido = !emailConvidado.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailConvidado.trim())

  useEffect(() => {
    if (!lojas.length) return
    setMarcadas((atual) => {
      if (Object.keys(atual).length) return atual
      const inicial = lojas.find((l) => l.restauranteId === tenant) ?? lojas[0]
      return { [inicial.restauranteId]: 'caixa' }
    })
  }, [lojas, tenant])

  const escolhidas = lojas.filter((l) => marcadas[l.restauranteId])
  const deFora = lojas.filter((l) => !marcadas[l.restauranteId])
  const variasLojas = lojas.length > 1

  function alternar(rid: string) {
    setGerado(null)
    setMarcadas((m) => {
      const novo = { ...m }
      if (novo[rid]) delete novo[rid]
      else novo[rid] = papelPadrao
      return novo
    })
  }

  function trocarPapel(rid: string, papel: PapelConvite) {
    setGerado(null)
    setPapelPadrao(papel)
    setMarcadas((m) => ({ ...m, [rid]: papel }))
  }

  /** Mesmo papel em todas as lojas marcadas — atalho pro caso comum. */
  function papelEmTodas(papel: PapelConvite) {
    setGerado(null)
    setPapelPadrao(papel)
    setMarcadas((m) => Object.fromEntries(Object.keys(m).map((rid) => [rid, papel])))
  }

  async function gerar() {
    setGerando(true)
    try {
      const resp = await criarConviteFn({
        lojas: escolhidas.map((l) => ({ restauranteId: l.restauranteId, papel: marcadas[l.restauranteId] })),
        email: emailConvidado.trim() || undefined,
      })
      setGerado({
        url: resp.data.url,
        lojas: resp.data.lojas.map((l) => ({ nome: l.restauranteNome, papel: l.papel as PapelConvite })),
        email: emailConvidado.trim() || undefined,
      })
      setConfirmando(false)
    } catch (e) {
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra gerar o convite', texto: mensagemDeErro(e, 'Tenta de novo em instantes.') })
    } finally {
      setGerando(false)
    }
  }

  async function copiar() {
    if (!gerado) return
    await navigator.clipboard.writeText(gerado.url)
    adicionarToast({
      tipo: 'sucesso',
      titulo: 'Link copiado',
      texto:
        gerado.lojas.length === 1
          ? `Manda por WhatsApp (ou onde preferir): a pessoa entra em ${gerado.lojas[0].nome} como ${rotuloPapel(gerado.lojas[0].papel)}.`
          : `Manda por WhatsApp (ou onde preferir): a pessoa entra em ${gerado.lojas.length} lojas.`,
    })
  }

  if (!lojas.length) return null

  return (
    <div className="mt-4 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-fundo-app p-4">
      <span className="rotulo text-tinta-4">Convidar alguém pra equipe</span>
      <p className="mt-1 text-xs text-tinta-4">
        {variasLojas
          ? 'Marque as lojas que a pessoa vai acessar e o papel em cada uma. Ela não enxerga as lojas que ficarem desmarcadas.'
          : 'Gera um link único já com o papel definido. Você manda por WhatsApp (ou onde preferir) — a pessoa cria a conta e entra direto nesta loja.'}
      </p>

      {variasLojas && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-tinta-4">
          <span>Mesmo papel em todas:</span>
          {PAPEIS_CONVITE.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => papelEmTodas(p.id)}
              disabled={!escolhidas.length}
              className="rounded-chip border border-[rgba(46,95,115,0.14)] bg-superficie px-2.5 py-1 font-semibold text-tinta-2 transition hover:border-mar disabled:opacity-40"
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-3 flex flex-col gap-2">
        {lojas.map((l) => {
          const marcada = !!marcadas[l.restauranteId]
          return (
            <li
              key={l.restauranteId}
              className={cn(
                'flex flex-col gap-2 rounded-campo border bg-superficie px-3 py-2.5 transition cel:flex-row cel:items-center',
                marcada ? 'border-mar/50' : 'border-[rgba(46,95,115,0.14)]',
              )}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => alternar(l.restauranteId)}
                  className="h-4 w-4 shrink-0 accent-mar"
                />
                <span className={cn('truncate text-sm font-bold', marcada ? 'text-tinta' : 'text-tinta-3')}>{l.nome}</span>
              </label>
              {marcada ? (
                <select
                  aria-label={`Papel em ${l.nome}`}
                  value={marcadas[l.restauranteId]}
                  onChange={(e) => trocarPapel(l.restauranteId, e.target.value as PapelConvite)}
                  className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-2 py-1.5 text-sm text-tinta-2 outline-none focus:border-mar"
                >
                  {PAPEIS_CONVITE.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-tinta-4">sem acesso</span>
              )}
            </li>
          )
        })}
      </ul>

      <label className="mt-3 flex flex-col gap-1 text-xs text-tinta-4" htmlFor="convite-email">
        E-mail da pessoa (opcional: o convite também chega por e-mail)
        <input
          id="convite-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="nome@exemplo.com"
          value={emailConvidado}
          onChange={(e) => { setEmailConvidado(e.target.value); setGerado(null) }}
          className={cn(
            'rounded-campo border bg-superficie px-3 py-2 text-sm text-tinta outline-none focus:border-mar',
            emailValido ? 'border-[rgba(46,95,115,0.14)]' : 'border-telha-alerta',
          )}
        />
      </label>

      <button
        onClick={() => setConfirmando(true)}
        disabled={!escolhidas.length || gerando || !emailValido}
        className="mt-3 rounded-botao bg-mar px-4 py-2 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50"
      >
        {escolhidas.length > 1 ? `Revisar convite (${escolhidas.length} lojas)` : 'Revisar convite'}
      </button>

      {gerado && (
        <div className="mt-3 flex flex-col gap-2 rounded-campo bg-preenchimento/50 p-3">
          <p className="text-xs text-tinta-3">
            Link pra entrar em{' '}
            {gerado.lojas.map((l, i) => (
              <span key={i}>
                {i > 0 && (i === gerado.lojas.length - 1 ? ' e ' : ', ')}
                <b>{l.nome}</b> ({rotuloPapel(l.papel)})
              </span>
            ))}
            . Vale pra uma pessoa só.
            {gerado.email && <> Mandamos também para <b>{gerado.email}</b>.</>}
          </p>
          <div className="flex flex-col gap-2 cel:flex-row cel:items-center">
            <input
              readOnly
              value={gerado.url}
              className="flex-1 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3 py-2 text-sm text-tinta-2 outline-none"
            />
            <button onClick={copiar} className="shrink-0 rounded-botao bg-telhado px-4 py-2 text-sm font-bold text-creme transition hover:brightness-95">
              Copiar link
            </button>
          </div>
        </div>
      )}

      {confirmando && (
        <ModalConfirmarConvite
          escolhidas={escolhidas.map((l) => ({ nome: l.nome, papel: marcadas[l.restauranteId] }))}
          deFora={deFora.map((l) => l.nome)}
          gerando={gerando}
          aoConfirmar={gerar}
          aoFechar={() => !gerando && setConfirmando(false)}
        />
      )}
    </div>
  )
}

function ModalConfirmarConvite({
  escolhidas,
  deFora,
  gerando,
  aoConfirmar,
  aoFechar,
}: {
  escolhidas: { nome: string; papel: PapelConvite }[]
  deFora: string[]
  gerando: boolean
  aoConfirmar: () => void
  aoFechar: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aoFechar])

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-noite/50 p-4 cel:items-center" onClick={aoFechar}>
      <div
        className="w-full max-w-[480px] overflow-hidden rounded-cartao-g bg-superficie shadow-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="titulo-convite"
      >
        <div className="h-1.5 w-full bg-mar" />
        <div className="max-h-[80vh] overflow-y-auto p-6">
          <h2 id="titulo-convite" className="text-tinta" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Confirmar convite
          </h2>
          <p className="mt-1 text-sm text-tinta-3">
            Quem abrir este link vai ter acesso {escolhidas.length === 1 ? 'só a esta loja' : `só a estas ${escolhidas.length} lojas`}:
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {escolhidas.map((l) => (
              <li key={l.nome} className="flex items-start gap-3 rounded-cartao bg-preenchimento/60 p-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mata/15 text-mata">
                  <Check size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-tinta">{l.nome}</span>
                    <span className="rounded-chip bg-mar/10 px-2.5 py-0.5 text-xs font-bold text-mar">{rotuloPapel(l.papel)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-tinta-4">{DESC[l.papel]}</p>
                </div>
              </li>
            ))}
          </ul>

          {deFora.length > 0 && (
            <div className="mt-4 rounded-cartao border border-dashed border-[rgba(46,95,115,0.2)] p-3">
              <p className="rotulo text-tinta-4">Sem acesso</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {deFora.map((n) => (
                  <li key={n} className="flex items-center gap-2 text-sm text-tinta-3">
                    <Store size={14} className="text-tinta-4" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-xs text-tinta-4">O link vale pra uma pessoa só. Dá pra mudar o papel ou remover a pessoa depois, loja por loja.</p>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button onClick={aoFechar} disabled={gerando} className="rounded-botao px-4 py-2.5 text-sm font-bold text-tinta-2 transition hover:bg-preenchimento">
              Voltar
            </button>
            <button
              onClick={aoConfirmar}
              disabled={gerando}
              className="rounded-botao bg-mar px-4 py-2.5 text-sm font-bold text-creme transition hover:bg-mar-escuro disabled:opacity-50"
            >
              {gerando ? 'Gerando…' : 'Confirmar e gerar link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
