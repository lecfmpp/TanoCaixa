import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { Cartao } from '@/components/ui/Cartao'
import { Switch } from '@/components/ui/Switch'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { useTenant } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import { mensagemDeErro } from '@/lib/erros'

interface Lembrete {
  id: string
  titulo: string
  grupo: string
  quando: string
  disponivel: boolean
  ativo: boolean
}
interface Config {
  temGrupo: boolean
  lembretes: Lembrete[]
}

const buscar = httpsCallable<{ restauranteId: string }, Config>(functions, 'lembretesWhatsappConfig')
const salvar = httpsCallable<{ restauranteId: string; id: string; ativo: boolean }, Config>(functions, 'lembretesWhatsappSalvar')

/**
 * Lembretes de rotina no grupo de WhatsApp do restaurante. Só aparece para quem
 * tem grupo cadastrado (e é dono ou gestão): sem grupo, ou sem permissão, o
 * servidor responde e a seção simplesmente não existe. Tudo começa desligado.
 */
export function LembretesWhatsapp() {
  const t = useTenant()
  const qc = useQueryClient()
  const { adicionarToast } = useUI()
  const chave = [t, 'lembretes-whatsapp']

  const config = useQuery({
    queryKey: chave,
    queryFn: async () => (await buscar({ restauranteId: t })).data,
    retry: false,
    staleTime: 60_000,
  })

  const trocar = useMutation({
    mutationFn: async (p: { id: string; ativo: boolean }) => (await salvar({ restauranteId: t, ...p })).data,
    onSuccess: (novo) => qc.setQueryData(chave, novo),
    onError: (e) => adicionarToast({ tipo: 'erro', titulo: 'Não deu pra salvar', texto: mensagemDeErro(e, 'O lembrete não foi alterado.') }),
  })

  if (!config.data?.temGrupo) return null
  const grupos = [...new Set(config.data.lembretes.map((l) => l.grupo))]

  return (
    <Cartao className="flex flex-col">
      <h2 className="text-[15px] font-bold text-tinta">Lembretes no WhatsApp</h2>
      <p className="mt-1 mb-2 text-sm text-tinta-3">
        Avisos de rotina no grupo do seu restaurante, no máximo um por dia e sempre com o link da tela certa. Tudo
        começa desligado: ligue só o que ajuda você.
      </p>
      {grupos.map((g) => (
        <div key={g} className="mt-3">
          <div className="rotulo mb-1 text-tinta-4">{g}</div>
          <ul className="flex flex-col">
            {config.data!.lembretes
              .filter((l) => l.grupo === g)
              .map((l, i) => (
                <li key={l.id} className={i > 0 ? 'flex items-center gap-3 border-t border-divisoria py-3' : 'flex items-center gap-3 py-3'}>
                  <div className={l.disponivel ? 'min-w-0 flex-1' : 'min-w-0 flex-1 opacity-70'}>
                    <div className="text-sm font-bold text-tinta">{l.titulo}</div>
                    <div className="text-xs text-tinta-4">{l.quando}</div>
                  </div>
                  {l.disponivel ? (
                    <Switch ligado={l.ativo} rotulo={`Lembrete: ${l.titulo}`} aoTrocar={(ativo) => trocar.mutate({ id: l.id, ativo })} />
                  ) : (
                    <SeloEmBreve />
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </Cartao>
  )
}
