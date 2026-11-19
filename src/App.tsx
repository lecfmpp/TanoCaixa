import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { DataProvider } from '@/data/Provider'
import { UIProvider } from '@/ui/UIProvider'
import { ToastHost } from '@/ui/ToastHost'
import { ModalHost } from '@/ui/ModalHost'
import { GavetaHost } from '@/components/gaveta/GavetaHost'
import { RotaProtegida } from '@/auth/RotaProtegida'
import { ExigePermissao } from '@/auth/ExigePermissao'
import { AppShell } from '@/components/layout/AppShell'

/** Cada página vira um chunk próprio: a landing (/) não baixa o código do painel, do PDV nem das telas de login. */
const carrega = <T extends string>(imp: () => Promise<Record<T, React.ComponentType>>, nome: T) =>
  lazy(() => imp().then((m) => ({ default: m[nome] })))
const EntrarPage = carrega(() => import('@/pages/auth/EntrarPage'), 'EntrarPage')
const CriarContaPage = carrega(() => import('@/pages/auth/CriarContaPage'), 'CriarContaPage')
const EsqueciSenhaPage = carrega(() => import('@/pages/auth/EsqueciSenhaPage'), 'EsqueciSenhaPage')
const OnboardingPage = carrega(() => import('@/pages/onboarding/OnboardingPage'), 'OnboardingPage')
const LandingPage = carrega(() => import('@/pages/LandingPage'), 'LandingPage')
const Inicio = carrega(() => import('@/pages/painel/Inicio'), 'Inicio')
const Caixa = carrega(() => import('@/pages/painel/Caixa'), 'Caixa')
const Despesas = carrega(() => import('@/pages/painel/Despesas'), 'Despesas')
const Compras = carrega(() => import('@/pages/painel/Compras'), 'Compras')
const FluxoCaixa = carrega(() => import('@/pages/painel/FluxoCaixa'), 'FluxoCaixa')
const Produtos = carrega(() => import('@/pages/painel/Produtos'), 'Produtos')
const Estoque = carrega(() => import('@/pages/painel/Estoque'), 'Estoque')
const PlanoDoMes = carrega(() => import('@/pages/painel/PlanoDoMes'), 'PlanoDoMes')
const DRE = carrega(() => import('@/pages/painel/DRE'), 'DRE')
const Rede = carrega(() => import('@/pages/painel/Rede'), 'Rede')
const Franquias = carrega(() => import('@/pages/painel/Franquias'), 'Franquias')
const Metas = carrega(() => import('@/pages/painel/Metas'), 'Metas')
const Cmv = carrega(() => import('@/pages/painel/Cmv'), 'Cmv')
const Dashboard = carrega(() => import('@/pages/painel/Numeros'), 'Dashboard')
const Configuracoes = carrega(() => import('@/pages/painel/Configuracoes'), 'Configuracoes')
const Perfil = carrega(() => import('@/pages/painel/Perfil'), 'Perfil')
const ConvitePage = carrega(() => import('@/pages/auth/ConvitePage'), 'ConvitePage')
const Plano = carrega(() => import('@/pages/painel/Plano'), 'Plano')
const PdvLayout = carrega(() => import('@/pages/pdv/PdvLayout'), 'PdvLayout')
const Cardapio = carrega(() => import('@/pages/pdv/Cardapio'), 'Cardapio')
const NovoPedido = carrega(() => import('@/pages/pdv/NovoPedido'), 'NovoPedido')
const Pedidos = carrega(() => import('@/pages/pdv/Pedidos'), 'Pedidos')
const CaixaPdv = carrega(() => import('@/pages/pdv/CaixaPdv'), 'CaixaPdv')
const Historico = carrega(() => import('@/pages/pdv/Historico'), 'Historico')
const Kds = carrega(() => import('@/pages/pdv/Kds'), 'Kds')

/**
 * O Início está fora do menu por enquanto: quem abre /painel puro cai no Dashboard.
 * Com query (?acao=…, ?assinatura=ok) a página continua sendo o Início, pra não
 * perder o gesto do link; a rota segue existindo.
 */
/** Antiga página Ajustes: hoje é Configurações (o #historico vira a aba Histórico). */
function RedirecionaAjustes() {
  const { hash } = useLocation()
  return <Navigate to={hash === '#historico' ? '/painel/configuracoes/historico' : '/painel/configuracoes'} replace />
}

function PaginaInicial() {
  const { permissoes } = useAuth()
  const { search } = useLocation()
  if (!search && permissoes?.veNumeros) return <Navigate to="/painel/numeros" replace />
  return <Inicio />
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <UIProvider>
          <BrowserRouter>
            <Suspense fallback={null}>
            <Routes>
              <Route path="/entrar" element={<EntrarPage />} />
              <Route path="/criar" element={<CriarContaPage />} />
              <Route path="/esqueci" element={<EsqueciSenhaPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/convite/:token" element={<ConvitePage />} />

              <Route
                path="/painel"
                element={
                  <RotaProtegida>
                    <AppShell />
                  </RotaProtegida>
                }
              >
                <Route index element={<ExigePermissao chave="veInicio"><PaginaInicial /></ExigePermissao>} />
                <Route path="caixa" element={<ExigePermissao chave="veFechamento"><Caixa /></ExigePermissao>} />
                <Route path="despesas" element={<ExigePermissao chave="veDespesas"><Despesas /></ExigePermissao>} />
                <Route path="fluxo" element={<ExigePermissao chave="veDespesas"><FluxoCaixa /></ExigePermissao>} />
                <Route path="compras" element={<ExigePermissao chave="veDespesas"><Compras /></ExigePermissao>} />
                <Route path="produtos" element={<ExigePermissao chave="veProdutos"><Produtos /></ExigePermissao>} />
                <Route path="estoque" element={<ExigePermissao chave="veEstoque"><Estoque /></ExigePermissao>} />
                <Route path="plano" element={<ExigePermissao chave="vePlano"><PlanoDoMes /></ExigePermissao>} />
                <Route path="dre" element={<ExigePermissao chave="veDRE"><DRE /></ExigePermissao>} />
                <Route path="metas" element={<ExigePermissao chave="veAjustes"><Metas /></ExigePermissao>} />
                <Route path="cmv" element={<ExigePermissao chave="veDRE"><Cmv /></ExigePermissao>} />
                <Route path="rede" element={<ExigePermissao chave="veRede"><Rede /></ExigePermissao>} />
                <Route path="franquias" element={<ExigePermissao chave="veRede"><Franquias /></ExigePermissao>} />
                <Route path="numeros" element={<ExigePermissao chave="veNumeros"><Dashboard /></ExigePermissao>} />
                <Route path="configuracoes/:aba?" element={<ExigePermissao chave="veAjustes"><Configuracoes /></ExigePermissao>} />
                {/* Endereço antigo do Meu site: agora é uma aba de Configurações. */}
                <Route path="site" element={<Navigate to="/painel/configuracoes/site" replace />} />
                <Route path="ajustes" element={<RedirecionaAjustes />} />
                <Route path="pdv" element={<PdvLayout />}>
                  <Route index element={<Navigate to="pedidos" replace />} />
                  <Route path="pedido/novo" element={<NovoPedido />} />
                  <Route path="pedidos" element={<Pedidos />} />
                  <Route path="caixa" element={<CaixaPdv />} />
                  <Route path="historico" element={<Historico />} />
                  <Route path="kds" element={<Kds />} />
                  <Route path="cardapio" element={<Cardapio />} />
                </Route>
                <Route path="assinatura" element={<Plano />} />
                <Route path="perfil" element={<Perfil />} />
              </Route>

              <Route path="/" element={<LandingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>

            <ToastHost />
            <ModalHost />
            <GavetaHost />
          </BrowserRouter>
        </UIProvider>
      </DataProvider>
    </AuthProvider>
  )
}
