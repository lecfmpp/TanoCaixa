import { useAuth } from './AuthContext'
import { Button } from '@/components/ui/Button'

/**
 * Aviso de quando o login deu certo mas a sessão não montou (ler/criar o
 * restaurante, aceitar convite). Sem isso a pessoa voltava pro /entrar sem
 * explicação nenhuma.
 */
export function ErroDeSessao() {
  const { erroSessao, tentarDeNovo, sair, carregando } = useAuth()
  if (!erroSessao) return null
  return (
    <div
      role="alert"
      className="rounded-campo border border-telha-alerta/40 bg-telha-alerta/8 px-4 py-3 text-sm text-telha-alerta"
    >
      <p className="pretty">{erroSessao}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variante="primario" onClick={tentarDeNovo} disabled={carregando}>
          {carregando ? 'Tentando…' : 'Tentar de novo'}
        </Button>
        <Button variante="fantasma" onClick={() => void sair()}>
          Sair
        </Button>
      </div>
    </div>
  )
}
