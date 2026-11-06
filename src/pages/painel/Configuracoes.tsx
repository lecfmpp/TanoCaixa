import { Navigate, NavLink, useParams } from 'react-router-dom'
import { MessageCircle, Globe } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Secoes } from '@/components/ui/Acordeao'
import { Cartao } from '@/components/ui/Cartao'
import { LembretesWhatsapp } from '@/components/ajustes/LembretesWhatsapp'
import { useSiteLiberado } from '@/auth/site'
import { useAuth } from '@/auth/AuthContext'
import { useRestaurante } from '@/data/hooks'
import { cn } from '@/lib/cn'
import { TelaMeuSite } from './MeuSite'

type Aba = 'whatsapp' | 'site'

/** `curto` é o rótulo no celular, onde as duas abas dividem a largura. */
const ABAS: { id: Aba; rotulo: string; curto: string; icone: typeof Globe }[] = [
  { id: 'whatsapp', rotulo: 'Notificações de WhatsApp', curto: 'WhatsApp', icone: MessageCircle },
  { id: 'site', rotulo: 'Meu site', curto: 'Meu site', icone: Globe },
]

/**
 * Configurações da loja, em abas: notificações de WhatsApp e o site do
 * cliente (Meu site). Cada aba tem endereço próprio
 * (/painel/configuracoes/whatsapp, /painel/configuracoes/site), então dá pra
 * mandar o link direto e o "voltar" do navegador funciona.
 */
export function Configuracoes() {
  const { aba } = useParams<{ aba?: string }>()
  const { carregando } = useAuth()
  const siteLiberado = useSiteLiberado()
  const cfg = useRestaurante().data

  const abas = ABAS.filter((a) => a.id !== 'site' || siteLiberado)
  if (carregando) return null
  // Sem aba, ou aba que esta conta não vê: cai na primeira.
  if (!aba || !abas.some((a) => a.id === aba)) {
    return <Navigate to={`/painel/configuracoes/${abas[0].id}`} replace />
  }
  const atual = aba as Aba

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="Configurações"
        subtitulo={cfg ? [cfg.nome, cfg.bairro].filter(Boolean).join(' · ') : ''}
        semMes
      />

      {abas.length > 1 && (
        <div role="tablist" aria-label="Configurações" className="grid auto-cols-fr grid-flow-col gap-1.5 cel:flex">
          {abas.map((a) => {
            const Icone = a.icone
            return (
              <NavLink
                key={a.id}
                to={`/painel/configuracoes/${a.id}`}
                role="tab"
                aria-selected={a.id === atual}
                className={cn(
                  'inline-flex min-w-0 items-center justify-center gap-2 rounded-botao px-4 py-2.5 text-sm font-bold transition',
                  a.id === atual
                    ? 'bg-mar text-creme shadow-sm'
                    : 'bg-superficie text-tinta-3 hover:bg-preenchimento hover:text-tinta',
                )}
              >
                <Icone size={16} aria-hidden />
                <span className="truncate cel:hidden">{a.curto}</span>
                <span className="hidden cel:inline">{a.rotulo}</span>
              </NavLink>
            )
          })}
        </div>
      )}

      <div role="tabpanel">
        {atual === 'whatsapp' && (
          <Secoes>
            <LembretesWhatsapp semGrupo={<SemGrupo />} />
          </Secoes>
        )}
        {atual === 'site' && <TelaMeuSite />}
      </div>
    </div>
  )
}

function SemGrupo() {
  return (
    <Cartao className="flex flex-col gap-1.5">
      <h2 className="text-[15px] font-bold text-tinta">Notificações de WhatsApp</h2>
      <p className="text-sm text-tinta-3">
        Esta loja ainda não tem um grupo de WhatsApp ligado ao Tá no Caixa. Quando o grupo estiver
        cadastrado, os avisos de rotina aparecem aqui para você ligar e desligar.
      </p>
    </Cartao>
  )
}
