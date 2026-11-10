import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { fotos } from '@/lib/fotos'
import { cn } from '@/lib/cn'
import { useAuth } from '@/auth/AuthContext'
import { usePersistirOnboarding, type RespostasOnboarding } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import { PassoPronto, PassoRestaurante } from './passos'

// Só o que o app usa desde o primeiro dia. Faturamento, meta e gastos ficam em
// "Metas e números", com "!" no menu até o dono conferir.
const PASSOS = [
  { indice: 1, nome: 'O restaurante' },
  { indice: 2, nome: 'Tudo pronto' },
]

/** Dados de exemplo — só pra quem entrou explicitamente na demonstração. */
const RESPOSTAS_DEMO: RespostasOnboarding = {
  nome: 'Zaatar Cozinha Árabe',
  bairro: 'Botafogo',
  tipoNegocio: 'franqueadora',
  nomeRede: 'Zaatar',
  royalties: 0,
  fundoPromocao: 0,
  gestorEmail: '',
  outrasLojas: [],
}

/** Semeia o onboarding com o que a pessoa já digitou no cadastro (nome do
 * restaurante, bairro). Os dados de exemplo só aparecem na demonstração. */
function respostasIniciais(sessao: NonNullable<ReturnType<typeof useAuth>['sessao']>): RespostasOnboarding {
  if (sessao.demo) return RESPOSTAS_DEMO
  const rest = sessao.restaurante
  return {
    ...RESPOSTAS_DEMO,
    nome: rest.nome && rest.nome !== 'Meu restaurante' ? rest.nome : '',
    bairro: rest.bairro || '',
    tipoNegocio: 'loja_unica',
    nomeRede: '',
    royalties: 0,
    fundoPromocao: 0,
  }
}

/**
 * Espera a sessão resolver ANTES de montar as respostas: antes, recarregar a
 * página no meio do onboarding pegava a sessão ainda vazia, caía nos dados de
 * exemplo (Zaatar, R$ 50 mil…) e, ao terminar, gravava isso na conta real.
 * Sem login não há onboarding: vai pro cadastro.
 */
export function OnboardingPage() {
  const { sessao, carregando } = useAuth()
  if (carregando) {
    return (
      <div className="grid min-h-dvh place-items-center bg-fundo-app">
        <div className="animate-pulse">
          <Logo tom="escuro" tamanho={26} />
        </div>
      </div>
    )
  }
  if (!sessao) return <Navigate to="/criar" replace />
  return <FluxoOnboarding key={sessao.usuario.id} sessao={sessao} />
}

function FluxoOnboarding({ sessao }: { sessao: NonNullable<ReturnType<typeof useAuth>['sessao']> }) {
  const navegar = useNavigate()
  const { sair } = useAuth()
  const persistir = usePersistirOnboarding()
  const { adicionarToast } = useUI()
  const [passo, setPasso] = useState(1)
  const [r, setR] = useState<RespostasOnboarding>(() => respostasIniciais(sessao))
  const upd = (patch: Partial<RespostasOnboarding>) => setR((atual) => ({ ...atual, ...patch }))

  const ehUltimo = passo === PASSOS.length
  const rotuloProximo = ehUltimo ? 'Ver meu painel' : 'Continuar'

  async function avancar() {
    if (ehUltimo) {
      // Conta real: grava as respostas no restaurante dela. A demonstração
      // não grava nada (o tenant de exemplo é compartilhado).
      if (!sessao.demo) {
        try {
          const res = await persistir.mutateAsync(r)
          if (res.convitesSemEmail.length) {
            adicionarToast({
              tipo: 'atencao',
              titulo: 'Convite de gestor não saiu',
              texto: `Não deu pra mandar o e-mail para ${res.convitesSemEmail.map((c) => c.email).join(', ')}. Reenvie pela página Rede.`,
            })
          }
        } catch (e) {
          console.warn('persistir onboarding:', e)
        }
      }
      navegar('/painel')
      return
    }
    setPasso((p) => Math.min(PASSOS.length, p + 1))
  }
  function voltar() {
    setPasso((p) => Math.max(1, p - 1))
  }

  return (
    <div className="flex min-h-dvh bg-fundo-app">
      {/* Trilha lateral (330px) */}
      <aside className="foto-rio filtro-sol relative hidden w-[330px] shrink-0 flex-col justify-between p-8 tab:flex">
        <img src={fotos.porDoSol} alt="" aria-hidden />
        {/* Scrim escuro para leitura do texto sobre a foto */}
        <div
          className="pointer-events-none absolute inset-0 z-[2]"
          style={{ background: 'linear-gradient(180deg, rgba(22,48,58,.55) 0%, rgba(22,48,58,.42) 42%, rgba(22,48,58,.7) 100%)' }}
          aria-hidden
        />
        <div className="relative z-10">
          <Logo tom="claro" tamanho={18} />
          <h1
            className="mt-8 text-creme"
            style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}
          >
            Um minuto e seu painel fica pronto
          </h1>
          <p className="pretty mt-2 text-sm text-creme/85">
            Dá pra mudar tudo depois. O que você não souber agora, deixa em branco.
          </p>

          <ol className="mt-8 flex flex-col gap-1">
            {PASSOS.map((p) => {
              const feito = p.indice < passo
              const ativo = p.indice === passo
              return (
                <li key={p.indice} className="flex items-center gap-3 py-1.5">
                  <span
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                      feito && 'bg-mata text-creme',
                      ativo && 'bg-sol text-noite',
                      !feito && !ativo && 'border border-creme/30 text-creme/50',
                    )}
                  >
                    {feito ? <Check size={13} strokeWidth={3} /> : p.indice}
                  </span>
                  <span
                    className={cn(
                      'text-sm',
                      ativo ? 'font-bold text-creme' : feito ? 'text-creme/85' : 'text-creme/55',
                    )}
                  >
                    {p.nome}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        <button
          // Só navegar pro /entrar não basta: com a sessão ainda ativa, o
          // /entrar manda de volta pro /onboarding. Desloga antes.
          onClick={async () => {
            await sair()
            navegar('/entrar')
          }}
          className="relative z-10 text-left text-sm text-creme/70 transition hover:text-creme"
        >
          Sair do cadastro
        </button>
      </aside>

      {/* Área direita */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Progresso */}
        <div className="border-b border-divisoria bg-superficie px-6 py-4 tab:px-10">
          <div className="mx-auto flex max-w-[640px] items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-trilho">
              <div
                className="h-full rounded-full bg-mar transition-all"
                style={{ width: `${(passo / PASSOS.length) * 100}%` }}
              />
            </div>
            <span className="rotulo shrink-0 text-tinta-4">
              passo {passo} de {PASSOS.length}
            </span>
          </div>
        </div>

        {/* Conteúdo do passo */}
        <div className="scroll-fina flex-1 overflow-y-auto px-6 py-8 tab:px-10">
          <div className="mx-auto max-w-[640px]">
            {passo === 1 && <PassoRestaurante r={r} upd={upd} />}
            {passo === 2 && <PassoPronto r={r} />}
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="border-t border-divisoria bg-superficie px-6 py-4 tab:px-10">
          <div className="mx-auto flex max-w-[640px] items-center justify-between gap-3">
            <button
              onClick={voltar}
              disabled={passo === 1}
              className="text-sm font-semibold text-tinta-3 transition hover:text-tinta disabled:opacity-0"
            >
              ← Voltar
            </button>
            <div className="flex items-center gap-3">
              {!ehUltimo && (
                <button
                  onClick={avancar}
                  className="text-sm font-semibold text-tinta-4 transition hover:text-tinta-2"
                >
                  Pular por agora
                </button>
              )}
              <Button variante={ehUltimo ? 'lancar' : 'primario'} onClick={avancar}>
                {rotuloProximo}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
