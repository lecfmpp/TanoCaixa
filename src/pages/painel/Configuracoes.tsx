import { Navigate, NavLink, useParams } from 'react-router-dom'
import { Store, Users, Bell, Globe, Plug, History } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Secoes } from '@/components/ui/Acordeao'
import { Cartao } from '@/components/ui/Cartao'
import { PlanoDeContas } from '@/components/plano/PlanoDeContas'
import { LembretesWhatsapp } from '@/components/ajustes/LembretesWhatsapp'
import {
  Equipe,
  Historico,
  Integracoes,
  LogoDaLojaCartao,
  OndeTeAvisar,
  SeuNegocio,
  WhatsappEmBreve,
} from '@/components/ajustes/SecoesConfiguracoes'
import { useConfiguracoesLiberadas, useSiteLiberado } from '@/auth/site'
import { useAuth } from '@/auth/AuthContext'
import { useRestaurante } from '@/data/hooks'
import { cn } from '@/lib/cn'
import { TelaMeuSite } from './MeuSite'

type Aba = 'loja' | 'equipe' | 'notificacoes' | 'site' | 'integracoes' | 'historico'

/** `curto` é o rótulo no celular, onde as abas ficam em grade de três. */
const ABAS: { id: Aba; rotulo: string; curto: string; icone: typeof Globe }[] = [
  { id: 'loja', rotulo: 'Loja', curto: 'Loja', icone: Store },
  { id: 'equipe', rotulo: 'Equipe', curto: 'Equipe', icone: Users },
  { id: 'notificacoes', rotulo: 'Notificações', curto: 'Avisos', icone: Bell },
  { id: 'site', rotulo: 'Meu site', curto: 'Site', icone: Globe },
  { id: 'integracoes', rotulo: 'Integrações', curto: 'Integrações', icone: Plug },
  { id: 'historico', rotulo: 'Histórico', curto: 'Histórico', icone: History },
]

/**
 * Configurações da loja (antiga página Ajustes + Configurações), em abas.
 * Cada aba tem endereço próprio (/painel/configuracoes/equipe…), então dá pra
 * mandar o link direto e o "voltar" do navegador funciona. Dentro de cada aba,
 * as seções são acordeões.
 *
 * Ainda em teste, só pras contas de CONTAS_COM_CONFIGURACOES: as notificações
 * de WhatsApp de verdade. As demais veem o "em breve". A aba Meu site segue a
 * lista de CONTAS_COM_SITE.
 */
export function Configuracoes() {
  const { aba } = useParams<{ aba?: string }>()
  const { carregando } = useAuth()
  const siteLiberado = useSiteLiberado()
  const whatsappLiberado = useConfiguracoesLiberadas()
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

      <div role="tablist" aria-label="Configurações" className="grid grid-cols-3 gap-1.5 cel:flex cel:flex-wrap">
        {abas.map((a) => {
          const Icone = a.icone
          return (
            <NavLink
              key={a.id}
              to={`/painel/configuracoes/${a.id}`}
              role="tab"
              aria-selected={a.id === atual}
              className={cn(
                'inline-flex min-w-0 items-center justify-center gap-2 rounded-botao px-2 py-2.5 text-sm font-bold transition cel:px-4',
                a.id === atual
                  ? 'bg-mar text-creme shadow-sm'
                  : 'bg-superficie text-tinta-3 hover:bg-preenchimento hover:text-tinta',
              )}
            >
              <Icone size={16} aria-hidden className="hidden shrink-0 cel:block" />
              <span className="truncate cel:hidden">{a.curto}</span>
              <span className="hidden cel:inline">{a.rotulo}</span>
            </NavLink>
          )
        })}
      </div>

      {/* key: cada aba começa com os acordeões no estado inicial. */}
      <div role="tabpanel" key={atual}>
        {atual === 'loja' && (
          <Secoes>
            <LogoDaLojaCartao />
            <SeuNegocio />
            <PlanoDeContas />
          </Secoes>
        )}
        {atual === 'equipe' && (
          <Secoes>
            <Equipe />
          </Secoes>
        )}
        {atual === 'notificacoes' && (
          <Secoes>
            <OndeTeAvisar />
            {whatsappLiberado ? <LembretesWhatsapp semGrupo={<SemGrupo />} /> : <WhatsappEmBreve />}
          </Secoes>
        )}
        {atual === 'site' && <TelaMeuSite />}
        {atual === 'integracoes' && (
          <Secoes>
            <Integracoes />
          </Secoes>
        )}
        {atual === 'historico' && (
          <Secoes>
            <Historico />
          </Secoes>
        )}
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
