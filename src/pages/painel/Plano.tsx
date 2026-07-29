import { useAuth } from '@/auth/AuthContext'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useState } from 'react'

interface PlanoCard {
  id: 'cozinha' | 'casa' | 'rede'
  nome: string
  preco: number
  descricao: string
  features: string[]
}

const PLANOS: PlanoCard[] = [
  {
    id: 'cozinha',
    nome: 'Cozinha só',
    preco: 79,
    descricao: 'Para restaurantes pequenos com uma cozinha',
    features: [
      'Até 1 ponto de venda',
      'Controle de estoque básico',
      'Relatórios simples',
      'Suporte por email',
    ],
  },
  {
    id: 'casa',
    nome: 'Casa cheia',
    preco: 149,
    descricao: 'Para restaurantes com múltiplos pontos',
    features: [
      'Até 3 pontos de venda',
      'Controle avançado de estoque',
      'Relatórios detalhados (DRE, etc)',
      'Gerenciamento de equipe',
      'Suporte prioritário',
    ],
  },
  {
    id: 'rede',
    nome: 'Mais de uma casa',
    preco: 299,
    descricao: 'Para redes e franquias',
    features: [
      'Ilimitado de pontos de venda',
      'Gestão completa de operações',
      'Análise por filial',
      'Gerenciamento avançado de equipe',
      'Integrações prioritárias',
      'Suporte dedicado',
    ],
  },
]

export function Plano() {
  const { sessao } = useAuth()
  const [carregando, setCarregando] = useState(false)

  async function abrirCheckout(planoId: 'cozinha' | 'casa' | 'rede') {
    if (!sessao) return
    setCarregando(true)
    try {
      const criarCheckout = httpsCallable(functions, 'criarCheckoutAssinatura')
      const result = await criarCheckout({
        restauranteId: sessao.tenantId,
        plano: planoId,
        email: sessao.usuario.email,
        sucessoUrl: `${window.location.origin}/painel?assinatura=ok`,
        cancelUrl: `${window.location.origin}/painel/plano`,
      })
      const { url } = result.data as { url: string }
      if (url) window.location.href = url
    } catch (e) {
      console.error('Erro ao criar checkout:', e)
      alert('Erro ao abrir checkout. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Planos de Assinatura</h1>
          <p className="text-lg text-slate-600">
            Escolha o plano certo para seu restaurante
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PLANOS.map((plano) => (
            <div
              key={plano.id}
              className={`rounded-lg border-2 p-8 flex flex-col ${
                plano.id === 'casa'
                  ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {plano.id === 'casa' && (
                <div className="mb-4">
                  <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Mais popular
                  </span>
                </div>
              )}

              <h2 className="text-2xl font-bold text-slate-900 mb-2">{plano.nome}</h2>
              <p className="text-slate-600 text-sm mb-6">{plano.descricao}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">R$ {plano.preco}</span>
                <span className="text-slate-600 ml-2">/mês</span>
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plano.features.map((feature, i) => (
                  <li key={i} className="flex items-center text-slate-700">
                    <svg
                      className="w-5 h-5 text-green-500 mr-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => abrirCheckout(plano.id)}
                disabled={carregando}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  plano.id === 'casa'
                    ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200 disabled:bg-slate-50'
                }`}
              >
                {carregando ? 'Abrindo...' : 'Contratar plano'}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-20 pt-12 border-t border-slate-200">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">Dúvidas?</h3>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Posso mudar de plano depois?</h4>
              <p className="text-slate-600">
                Sim! Você pode fazer upgrade ou downgrade a qualquer momento no portal de assinatura.
                A cobrança será ajustada proporcionalmente.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Como cancelo minha assinatura?</h4>
              <p className="text-slate-600">
                Você pode cancelar a qualquer momento via portal de assinatura. Sem contrato, sem
                multa.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Qual é a política de reembolso?</h4>
              <p className="text-slate-600">
                Se cancelar no primeiro mês, reembolsamos 100% (com exceção das taxas de processamento).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
