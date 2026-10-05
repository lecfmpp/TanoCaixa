import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { Cartao } from '@/components/ui/Cartao'
import { Switch } from '@/components/ui/Switch'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
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
  grupoId: string
  podeEditarGrupo: boolean
  lembretes: Lembrete[]
}

const buscar = httpsCallable<{ restauranteId: string }, Config>(functions, 'lembretesWhatsappConfig')
const trocarGrupo = httpsCallable<{ restauranteId: string; grupoId: string }, Config>(functions, 'lembretesWhatsappGrupo')
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

  const [grupoId, setGrupoId] = useState('')
  useEffect(() => setGrupoId(config.data?.grupoId ?? ''), [config.data?.grupoId])

  const salvarGrupo = useMutation({
    mutationFn: async (id: string) => (await trocarGrupo({ restauranteId: t, grupoId: id.trim() })).data,
    onSuccess: (novo) => {
      qc.setQueryData(chave, novo)
      adicionarToast({ tipo: 'sucesso', titulo: 'Grupo atualizado', texto: 'Os próximos lembretes vão para o novo grupo.' })
    },
    onError: (e) => adicionarToast({ tipo: 'erro', titulo: 'Não deu pra trocar o grupo', texto: mensagemDeErro(e, 'O grupo não foi alterado.') }),
  })

  if (!config.data?.temGrupo) return null
  const mudou = grupoId.trim() !== config.data.grupoId
  const grupos = [...new Set(config.data.lembretes.map((l) => l.grupo))]

  return (
    <Cartao className="flex flex-col">
      <h2 className="text-[15px] font-bold text-tinta">Lembretes no WhatsApp</h2>
      <p className="mt-1 mb-2 text-sm text-tinta-3">
        Avisos de rotina no grupo do seu restaurante, no máximo um por dia e sempre com o link da tela certa. Tudo
        começa desligado: ligue só o que ajuda você.
      </p>
      <div className="mt-2 flex flex-col gap-2 rounded-campo bg-preenchimento/40 p-3.5 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Campo
            rotulo="Grupo do WhatsApp (ID)"
            name="grupo-whatsapp"
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            readOnly={!config.data.podeEditarGrupo}
            placeholder="120363012345678901@g.us"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {config.data.podeEditarGrupo && (
          <Button variante="secundario" disabled={!mudou || !grupoId.trim() || salvarGrupo.isPending} onClick={() => salvarGrupo.mutate(grupoId)}>
            {salvarGrupo.isPending ? 'Salvando…' : 'Salvar grupo'}
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-tinta-4">
        {config.data.podeEditarGrupo
          ? 'Para mudar de grupo, cole o ID do novo grupo (termina em @g.us). O número do Tá no Caixa precisa estar no grupo.'
          : 'Só o dono do restaurante troca o grupo.'}
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
