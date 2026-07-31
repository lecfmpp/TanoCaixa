import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { useAuth } from '@/auth/AuthContext'

/** Seção ainda não construída — mantém o shell navegável nas próximas fases. */
export function Placeholder({
  titulo,
  fase,
  foto,
}: {
  titulo: string
  fase: string
  foto?: string
}) {
  const { sessao } = useAuth()
  const r = sessao?.restaurante
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo={titulo}
        subtitulo={r ? `${r.nome} · ${r.bairro} · julho de 2026` : ''}
        foto={foto}
        lancar
      />
      <Cartao className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <span className="rotulo text-tinta-4">{fase}</span>
        <p className="max-w-sm text-sm text-tinta-3">
          Esta tela entra em uma próxima fase do backlog. O shell, os tokens e a navegação
          já estão prontos para recebê-la.
        </p>
      </Cartao>
    </div>
  )
}
