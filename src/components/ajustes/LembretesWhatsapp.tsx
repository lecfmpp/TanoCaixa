import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { Secao } from '@/components/ui/Acordeao'
import { useTenant } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import { PainelWhatsapp, PillStatus } from './whatsapp/PainelWhatsapp'
import type { AcoesWhatsapp, ConfigWhatsapp, ResultadoTeste } from './whatsapp/tipos'

type Loja = { restauranteId: string }
const buscar = httpsCallable<Loja, ConfigWhatsapp>(functions, 'lembretesWhatsappConfig')
const salvar = httpsCallable<Loja & { id: string; ativo: boolean }, ConfigWhatsapp>(functions, 'lembretesWhatsappSalvar')
const porLink = httpsCallable<Loja & { link: string }, ConfigWhatsapp>(functions, 'lembretesWhatsappLink')
const gerarCodigo = httpsCallable<Loja, ConfigWhatsapp>(functions, 'lembretesWhatsappCodigo')
const porId = httpsCallable<Loja & { grupoId: string }, ConfigWhatsapp>(functions, 'lembretesWhatsappGrupo')
const desconectar = httpsCallable<Loja, ConfigWhatsapp>(functions, 'lembretesWhatsappDesconectar')
const testar = httpsCallable<Loja, ResultadoTeste>(functions, 'lembretesWhatsappTeste')

/**
 * Notificações no WhatsApp, em Ajustes. Busca os dados no servidor e entrega
 * para o PainelWhatsapp. Só dono e gestão veem: para os outros papéis o
 * servidor recusa e a seção não aparece.
 */
export function LembretesWhatsapp() {
  const t = useTenant()
  const qc = useQueryClient()
  const { adicionarToast } = useUI()
  const chave = [t, 'lembretes-whatsapp']
  const testeEm = useRef(0)

  // Recarrega a cada 5 s enquanto espera o código chegar ou a entrega do teste.
  const config = useQuery({
    queryKey: chave,
    queryFn: async () => (await buscar({ restauranteId: t })).data,
    retry: false,
    staleTime: 30_000,
    refetchInterval: (q) => {
      const d = q.state.data
      return (d && !d.temGrupo && d.codigo) || Date.now() - testeEm.current < 90_000 ? 5_000 : false
    },
  })
  const atualizar = (novo: ConfigWhatsapp) => qc.setQueryData(chave, novo)

  // Grupo conectado pelo código (chega pelo servidor, não por clique aqui): avisa uma vez.
  const [tinhaGrupo, setTinhaGrupo] = useState<boolean | null>(null)
  useEffect(() => {
    const tem = config.data?.temGrupo
    if (tem === undefined) return
    if (tinhaGrupo === false && tem) adicionarToast({ tipo: 'sucesso', titulo: 'Grupo conectado', texto: 'Mandamos uma mensagem de boas-vindas no grupo.' })
    setTinhaGrupo(tem)
  }, [config.data?.temGrupo]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = config.data
  if (!c) return null

  const loja = { restauranteId: t }
  const acoes: AcoesWhatsapp = {
    conectarPorLink: async (link) => {
      setTinhaGrupo(true) // o toast desta conexão sai aqui, não no efeito
      atualizar((await porLink({ ...loja, link })).data)
      adicionarToast({ tipo: 'sucesso', titulo: 'Grupo conectado', texto: 'Mandamos uma mensagem de boas-vindas no grupo.' })
    },
    gerarCodigo: async () => {
      atualizar((await gerarCodigo(loja)).data)
    },
    conectarPorId: async (grupoId) => {
      setTinhaGrupo(true)
      atualizar((await porId({ ...loja, grupoId })).data)
      adicionarToast({ tipo: 'sucesso', titulo: 'Grupo salvo', texto: 'Os próximos lembretes vão para este grupo.' })
    },
    desconectar: async () => {
      atualizar((await desconectar(loja)).data)
      adicionarToast({ tipo: 'sucesso', titulo: 'Grupo desconectado', texto: 'Os lembretes pararam. Conecte outro grupo quando quiser.' })
    },
    testar: async () => {
      const r = (await testar(loja)).data
      atualizar(r.config)
      if (r.resultado === 'enviada') testeEm.current = Date.now()
      return { ok: r.resultado === 'enviada', texto: r.mensagem }
    },
    ligar: async (id, ativo) => {
      try {
        atualizar((await salvar({ ...loja, id, ativo })).data)
      } catch (e) {
        adicionarToast({ tipo: 'erro', titulo: 'Não deu pra salvar', texto: e instanceof Error ? e.message : 'O lembrete não foi alterado.' })
      }
    },
    copiar: (texto) => {
      navigator.clipboard
        .writeText(texto)
        .then(() => adicionarToast({ tipo: 'sucesso', titulo: 'Copiado', texto }))
        .catch(() => undefined)
    },
  }

  return (
    <Secao
      id="whatsapp"
      titulo="Notificações no WhatsApp"
      descricao="Lembretes num grupo de WhatsApp só desta loja, com o dono dentro. Veja como cada mensagem chega e ligue só o que ajuda você."
      resumo={<PillStatus status={c.status} />}
    >
      <PainelWhatsapp c={c} acoes={acoes} />
    </Secao>
  )
}
