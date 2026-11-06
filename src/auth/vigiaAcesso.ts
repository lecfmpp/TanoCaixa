/* ------------------------------------------------------------------ *
 * Vigia de acesso: confere, com o painel aberto, se a pessoa ainda é membro
 * da loja que está vendo e se o papel dela lá continua o mesmo. Se foi
 * tirada da loja (ou deixou de ser dono, por exemplo), desloga e a tela de
 * entrar mostra o motivo real — em vez de o painel seguir aberto com erros
 * de permissão que ninguém entende.
 *
 * Confere ao abrir, a cada 2 minutos e quando a pessoa volta pra aba.
 * ------------------------------------------------------------------ */
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth, msgSemAcesso } from './AuthContext'
import { useTenant } from '@/data/hooks'
import { normalizarPapel, rotuloPapel, type Papel } from '@/types'
import type { RestauranteDoc } from '@/data/types'

type Resultado = { acesso: false } | { acesso: true; papel: Papel | null }

export function useVigiaAcesso() {
  const { sessao, encerrarPorAcesso } = useAuth()
  const tenant = useTenant()
  const qc = useQueryClient()
  const uid = sessao?.usuario.id
  const ativo = !!sessao && !sessao.demo && !!uid

  const q = useQuery({
    queryKey: ['vigia-acesso', tenant, uid],
    enabled: ativo,
    retry: false,
    refetchInterval: 2 * 60_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<Resultado> => {
      try {
        const [r, m] = await Promise.all([
          getDoc(doc(db, 'restaurants', tenant)),
          getDoc(doc(db, 'restaurants', tenant, 'membros', uid!)),
        ])
        const membros = (r.data()?.memberUids as string[] | undefined) ?? []
        if (!r.exists() || !membros.includes(uid!)) return { acesso: false }
        return { acesso: true, papel: m.exists() ? normalizarPapel(m.data().papel as string) : null }
      } catch (e) {
        // As regras só liberam a loja pra quem está em memberUids.
        if ((e as { code?: string })?.code === 'permission-denied') return { acesso: false }
        throw e // rede caiu etc.: não desloga ninguém por isso
      }
    },
  })

  useEffect(() => {
    if (!ativo || !sessao || !q.data) return
    const nome =
      (qc.getQueryData([tenant, 'restaurante']) as RestauranteDoc | null | undefined)?.nome ??
      sessao.acessos?.[tenant]?.nome ??
      (tenant === sessao.tenantId ? sessao.restaurante.nome : undefined)

    if (!q.data.acesso) {
      void encerrarPorAcesso(msgSemAcesso(nome))
      return
    }
    // Papel esperado: o da loja do login, ou o gravado no convite aceito.
    // (Lojas que a pessoa vê por ser dona da rede só têm a checagem de acesso.)
    const esperado = tenant === sessao.tenantId ? sessao.usuario.papel : sessao.acessos?.[tenant]?.papel
    const atual = q.data.papel
    if (esperado && atual && atual !== esperado) {
      void encerrarPorAcesso(
        `Seu papel na loja ${nome ?? 'que estava aberta'} mudou de ${rotuloPapel(esperado)} para ${rotuloPapel(atual)}. Entre de novo pra continuar com as permissões novas.`,
      )
    }
  }, [ativo, sessao, q.data, tenant, qc, encerrarPorAcesso])
}
