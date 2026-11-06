import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ *
 * Seções em acordeão das páginas do painel.
 *
 *   <Secoes>
 *     <Secao titulo="Logo da loja" abertaPorPadrao>…</Secao>
 *     <Secao titulo="Equipe" descricao="Quem usa e o que cada um pode">…</Secao>
 *   </Secoes>
 *
 * Por padrão só a seção marcada `abertaPorPadrao` (a primeira da página)
 * vem aberta. O botão "Abrir tudo" no topo abre todas; com todas abertas
 * ele vira "Fechar tudo". Cada seção abre e fecha sozinha no clique do título.
 * ------------------------------------------------------------------ */

interface Grupo {
  /** Muda a cada "Abrir/Fechar tudo": cada seção segue o comando. */
  comando: { abrir: boolean; vez: number }
  informar: (id: string, aberta: boolean | null) => void
}

const GrupoCtx = createContext<Grupo | null>(null)

export function Secoes({ children, className }: { children: ReactNode; className?: string }) {
  const [estados, setEstados] = useState<Record<string, boolean>>({})
  const [comando, setComando] = useState({ abrir: true, vez: 0 })

  const informar = useCallback((id: string, aberta: boolean | null) => {
    setEstados((e) => {
      if (aberta === null) {
        if (!(id in e)) return e
        const { [id]: _, ...resto } = e
        return resto
      }
      return e[id] === aberta ? e : { ...e, [id]: aberta }
    })
  }, [])

  const lista = Object.values(estados)
  const todasAbertas = lista.length > 0 && lista.every(Boolean)
  const grupo = useMemo(() => ({ comando, informar }), [comando, informar])

  return (
    <GrupoCtx.Provider value={grupo}>
      <div className={cn('flex flex-col gap-3', className)}>
        {lista.length > 1 && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setComando((c) => ({ abrir: !todasAbertas, vez: c.vez + 1 }))}
              className="inline-flex items-center gap-1.5 rounded-botao px-2.5 py-1.5 text-sm font-bold text-mar transition hover:bg-mar/8"
            >
              {todasAbertas ? <ChevronsDownUp size={16} /> : <ChevronsUpDown size={16} />}
              {todasAbertas ? 'Fechar tudo' : 'Abrir tudo'}
            </button>
          </div>
        )}
        {children}
      </div>
    </GrupoCtx.Provider>
  )
}

interface SecaoProps {
  titulo: ReactNode
  /** Linha de apoio abaixo do título (sempre visível). */
  descricao?: ReactNode
  /** Botões do cabeçalho (Exportar, + Nova…). Clicar neles não abre/fecha a seção. */
  acoes?: ReactNode
  /** Mostrado no cabeçalho só com a seção fechada (ex.: um total). */
  resumo?: ReactNode
  abertaPorPadrao?: boolean
  /** Âncora (ex.: "historico") — abrir a página com #id abre a seção. */
  id?: string
  className?: string
  /** Classes do miolo (por padrão o padding do cartão). */
  corpoClassName?: string
  children: ReactNode
}

export function Secao({
  titulo,
  descricao,
  acoes,
  resumo,
  abertaPorPadrao = false,
  id,
  className,
  corpoClassName,
  children,
}: SecaoProps) {
  const grupo = useContext(GrupoCtx)
  const idAuto = useId()
  const chave = id ?? idAuto
  const corpoId = `${chave}-corpo`
  const ancorada = typeof window !== 'undefined' && !!id && window.location.hash === `#${id}`
  const [aberta, setAberta] = useState(abertaPorPadrao || ancorada)

  // Link com #id (ex.: e-mail "Convidar a equipe" → /painel/ajustes#equipe): abre e rola até a seção.
  useEffect(() => {
    if (!ancorada || !id) return
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => clearTimeout(t)
  }, [ancorada, id])

  // Segue o "Abrir tudo / Fechar tudo" do grupo (vez 0 = ainda ninguém clicou).
  const vez = grupo?.comando.vez ?? 0
  const abrir = grupo?.comando.abrir ?? true
  useEffect(() => {
    if (vez > 0) setAberta(abrir)
  }, [vez, abrir])

  const informar = grupo?.informar
  useEffect(() => {
    informar?.(chave, aberta)
  }, [informar, chave, aberta])
  useEffect(() => () => informar?.(chave, null), [informar, chave])

  return (
    <section
      id={id}
      className={cn(
        'scroll-mt-6 rounded-cartao border border-[rgba(46,95,115,0.12)] bg-superficie',
        className,
      )}
    >
      <div className="flex items-start gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-expanded={aberta}
          aria-controls={corpoId}
          className="group flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-tinta">{titulo}</span>
            {descricao && <span className="mt-0.5 block text-sm text-tinta-3">{descricao}</span>}
          </span>
          {!aberta && resumo && <span className="shrink-0 self-center text-sm text-tinta-2">{resumo}</span>}
          <ChevronDown
            size={18}
            aria-hidden
            className={cn('mt-0.5 shrink-0 text-tinta-4 transition group-hover:text-mar', aberta && 'rotate-180')}
          />
        </button>
        {acoes && aberta && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      </div>
      {aberta && (
        <div id={corpoId} className={cn('border-t border-divisoria px-5 pb-5 pt-4', corpoClassName)}>
          {children}
        </div>
      )}
    </section>
  )
}
