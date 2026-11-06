import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Secao } from '@/components/ui/Acordeao'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/auth/AuthContext'
import { db } from '@/lib/firebase'
import { cn } from '@/lib/cn'
import { useUI } from '@/ui/UIProvider'

type Topico = 'dicas' | 'recado' | 'novidades'
const PADRAO: Record<Topico, boolean> = { dicas: true, recado: true, novidades: false }
const LINHAS: { id: Topico; rotulo: string; apoio: string }[] = [
  { id: 'recado', rotulo: 'Recado de segunda', apoio: 'os números da semana passada' },
  { id: 'dicas', rotulo: 'Dicas de uso', apoio: 'o que dá pra fazer no seu papel' },
  { id: 'novidades', rotulo: 'Novidades', apoio: 'uma vez por mês, o que mudou no app' },
]

/** Preferências de e-mail (users/{uid}.emails). Senha, convite e cobrança sempre chegam. */
export function EmailsQueRecebo() {
  const { sessao } = useAuth()
  const { adicionarToast } = useUI()
  const uid = sessao && !sessao.demo ? sessao.usuario.id : null
  const [prefs, setPrefs] = useState<Record<Topico, boolean>>(PADRAO)

  useEffect(() => {
    if (!uid) return
    getDoc(doc(db, 'users', uid)).then(
      (s) => {
        const e = (s.data()?.emails ?? {}) as Partial<Record<Topico, unknown>>
        setPrefs({
          dicas: typeof e.dicas === 'boolean' ? e.dicas : PADRAO.dicas,
          recado: typeof e.recado === 'boolean' ? e.recado : PADRAO.recado,
          novidades: typeof e.novidades === 'boolean' ? e.novidades : PADRAO.novidades,
        })
      },
      (e) => console.warn('preferências de e-mail:', e),
    )
  }, [uid])

  async function trocar(id: Topico, valor: boolean) {
    if (!uid) return
    setPrefs((p) => ({ ...p, [id]: valor }))
    try {
      await setDoc(doc(db, 'users', uid), { emails: { [id]: valor, atualizadoEm: new Date().toISOString(), origem: 'ajustes' } }, { merge: true })
    } catch (e) {
      console.error('preferências de e-mail:', e)
      setPrefs((p) => ({ ...p, [id]: !valor }))
      adicionarToast({ tipo: 'erro', titulo: 'Não salvou', texto: 'Tente de novo em instantes.' })
    }
  }

  if (!uid) return null
  return (
    <Secao titulo="E-mails que recebo" corpoClassName="!pt-1">
      {LINHAS.map((l, i) => (
        <div key={l.id} className={cn('flex items-center justify-between py-3', i > 0 && 'border-t border-divisoria')}>
          <div>
            <p className="text-sm font-semibold text-tinta">{l.rotulo}</p>
            <p className="mt-0.5 text-xs text-tinta-4">{l.apoio}</p>
          </div>
          <Switch ligado={prefs[l.id]} aoTrocar={(v) => trocar(l.id, v)} rotulo={l.rotulo} />
        </div>
      ))}
      <p className="border-t border-divisoria pt-3 text-xs text-tinta-4">Senha, convites e cobrança sempre chegam por e-mail.</p>
    </Secao>
  )
}
