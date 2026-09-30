import { useState } from 'react'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { Campo } from '@/components/ui/Campo'
import { useUI } from '@/ui/UIProvider'
import { brl } from '@/lib/format'
import { mensagemDeErro } from '@/lib/erros'
import { useAbrirCaixa } from '@/data/pdvHooks'

const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0)

/** Sem caixa aberto não há venda: o caixa é quem responde pelo dinheiro do turno. */
export function AbrirCaixa() {
  const { adicionarToast } = useUI()
  const abrir = useAbrirCaixa()
  const [fundo, setFundo] = useState('')
  return (
    <Cartao className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div>
        <h2 className="text-[17px] font-bold text-tinta">Abra o caixa pra começar a vender</h2>
        <p className="text-sm text-tinta-3">Informe o troco que está na gaveta agora (fundo de caixa). No fim do turno você confere o dinheiro contra as vendas.</p>
      </div>
      <Campo rotulo="Fundo de caixa · R$" inputMode="decimal" placeholder="0,00" value={fundo} onChange={(e) => setFundo(e.target.value)} />
      <Button
        variante="lancar"
        bloco
        disabled={abrir.isPending}
        onClick={async () => {
          try {
            const c = await abrir.mutateAsync({ fundo: num(fundo) })
            adicionarToast({ tipo: 'sucesso', titulo: `Caixa #${c.numero} aberto`, texto: `Fundo de ${brl(c.fundo)}.` })
          } catch (e) {
            adicionarToast({ tipo: 'erro', titulo: 'Não deu pra abrir o caixa', texto: mensagemDeErro(e, 'Tente de novo.') })
          }
        }}
      >
        {abrir.isPending ? 'Abrindo…' : 'Abrir caixa'}
      </Button>
    </Cartao>
  )
}
