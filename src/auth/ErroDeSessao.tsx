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

/**
 * Aviso de logout forçado: a pessoa perdeu o acesso à loja ou o papel dela
 * mudou. Mostra o motivo real (vindo do vigia de acesso ou do login) até ela
 * entrar de novo ou fechar o aviso.
 */
export function AvisoSaida() {
  const { motivoSaida, limparMotivoSaida } = useAuth()
  if (!motivoSaida) return null
  return (
    <div role="alert" className="rounded-campo border border-sol/50 bg-insight-fundo px-4 py-3 text-sm text-insight-texto">
      <p className="font-bold text-tinta">Você foi desconectado</p>
      <p className="pretty mt-1">{motivoSaida}</p>
      <button type="button" onClick={limparMotivoSaida} className="mt-2 text-xs font-bold text-mar hover:underline">
        Entendi
      </button>
    </div>
  )
}
