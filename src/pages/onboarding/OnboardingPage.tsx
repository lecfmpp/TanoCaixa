import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { fotos } from '@/lib/fotos'
import { cn } from '@/lib/cn'
import { useAuth } from '@/auth/AuthContext'
import { usePersistirOnboarding, type RespostasOnboarding } from '@/data/hooks'
import { HORARIO_PADRAO } from '@/components/ui/HorarioSemana'
import {
  Passo1Restaurante,
  Passo2Canais,
  Passo3Numeros,
  Passo4Integracoes,
  Passo5Equipe,
  Passo6Metas,
  Passo7Pronto,
} from './passos'

const PASSOS = [
  { indice: 1, nome: 'O restaurante' },
  { indice: 2, nome: 'Canais de venda' },
  { indice: 3, nome: 'Números de partida' },
  { indice: 4, nome: 'Integrações' },
  { indice: 5, nome: 'Sua equipe' },
  { indice: 6, nome: 'Metas e avisos' },
  { indice: 7, nome: 'Tudo pronto' },
]

const RESPOSTAS_INICIAIS: RespostasOnboarding = {
  nome: 'Zaatar Cozinha Árabe',
  bairro: 'Botafogo',
  lojas: '1',
  operacao: 'Delivery + salão',
  cozinha: 'Árabe',
  cnpj: '',
  canais: ['ifood', 'rappi', 'balcao'],
  ticket: '68',
  pedidos: '48',
  horarios: HORARIO_PADRAO,
  faturamento: '50.000',
  folha: 10900,
  contasFixas: 6300,
  pessoas: '6',
  meta: '50.000',
  tetos: { mercadoria: 30, pessoal: 25, ocupacao: 15, taxas_app: 12 },
  avisos: { whatsapp: true, email: true, sms: false },
}

export function OnboardingPage() {
  const navegar = useNavigate()
  const { entrarDemo, sessao } = useAuth()
  const persistir = usePersistirOnboarding()
  const [passo, setPasso] = useState(1)
  const [r, setR] = useState<RespostasOnboarding>(RESPOSTAS_INICIAIS)
  const upd = (patch: Partial<RespostasOnboarding>) => setR((atual) => ({ ...atual, ...patch }))

  const pontoEquilibrio = useMemo(
    () => Math.round((r.folha + r.contasFixas) / 0.415 / 100) * 100,
    [r.folha, r.contasFixas],
  )
  const sobraPct = 100 - (r.tetos.mercadoria + r.tetos.pessoal + r.tetos.ocupacao + r.tetos.taxas_app)
  const sobraReais = Math.round(((Number(r.meta.replace(/\D/g, '')) || 50000) * sobraPct) / 100)

  const ehUltimo = passo === PASSOS.length
  const rotuloProximo = ehUltimo ? 'Ver meu painel' : 'Continuar'

  async function avancar() {
    if (ehUltimo) {
      // Conta real: grava as respostas no restaurante dela. Sem sessão: demo.
      if (sessao && !sessao.demo) {
        try {
          await persistir.mutateAsync(r)
        } catch (e) {
          console.warn('persistir onboarding:', e)
        }
      } else {
        entrarDemo()
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
            Sete perguntas e seu painel fica pronto
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
          onClick={() => navegar('/entrar')}
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
            {passo === 1 && <Passo1Restaurante r={r} upd={upd} />}
            {passo === 2 && <Passo2Canais r={r} upd={upd} />}
            {passo === 3 && (
              <Passo3Numeros
                folha={r.folha}
                contasFixas={r.contasFixas}
                onFolha={(n) => upd({ folha: n })}
                onContasFixas={(n) => upd({ contasFixas: n })}
                pontoEquilibrio={pontoEquilibrio}
                faturamento={r.faturamento}
                pessoas={r.pessoas}
                onFaturamento={(v) => upd({ faturamento: v })}
                onPessoas={(v) => upd({ pessoas: v })}
              />
            )}
            {passo === 4 && <Passo4Integracoes />}
            {passo === 5 && <Passo5Equipe />}
            {passo === 6 && (
              <Passo6Metas
                tetos={r.tetos}
                onTetos={(tt) => upd({ tetos: tt })}
                sobraPct={sobraPct}
                sobraReais={sobraReais}
                meta={r.meta}
                onMeta={(v) => upd({ meta: v })}
              />
            )}
            {passo === 7 && <Passo7Pronto />}
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
