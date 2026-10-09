import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { useRestaurante } from '@/data/hooks'
import { MES_REF } from '@/data/derive'
import { nomeDoMes } from '@/data/planoMes'

/** CMV ainda não construído: a página existe no menu, mas só avisa que vem aí. */
export function Cmv() {
  const cfg = useRestaurante().data
  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        titulo="CMV"
        subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${nomeDoMes(MES_REF)}` : ''}
        lancar={false}
      />
      <Cartao className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <SeloEmBreve />
        <h2 className="text-[17px] font-bold text-tinta">Custo da Mercadoria Vendida</h2>
        <p className="pretty max-w-md text-sm text-tinta-3">
          Em breve você vai ver aqui quanto a mercadoria vendida custou no período, prato a prato e
          produto a produto, ligado às suas notas fiscais e à contagem de estoque.
        </p>
      </Cartao>
    </div>
  )
}
