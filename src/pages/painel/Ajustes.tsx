import { useMemo, useState } from 'react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { Avatar } from '@/components/ui/Avatar'
import { Switch } from '@/components/ui/Switch'
import { Chip } from '@/components/ui/Chip'
import { brl, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useMembros, useAtividades, useRestaurante } from '@/data/hooks'
import { HOJE } from '@/data/derive'
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
