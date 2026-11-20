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
const EntrarPage = lazy(() => import('@/pages/auth/EntrarPage').then((m) => ({ default: m.EntrarPage })))
const CriarContaPage = lazy(() => import('@/pages/auth/CriarContaPage').then((m) => ({ default: m.CriarContaPage })))
const EsqueciSenhaPage = lazy(() => import('@/pages/auth/EsqueciSenhaPage').then((m) => ({ default: m.EsqueciSenhaPage })))
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
import { LandingPage } from '@/pages/LandingPage'
const Inicio = lazy(() => import('@/pages/painel/Inicio').then((m) => ({ default: m.Inicio })))
const Caixa = lazy(() => import('@/pages/painel/Caixa').then((m) => ({ default: m.Caixa })))
const Despesas = lazy(() => import('@/pages/painel/Despesas').then((m) => ({ default: m.Despesas })))
const Compras = lazy(() => import('@/pages/painel/Compras').then((m) => ({ default: m.Compras })))
const FluxoCaixa = lazy(() => import('@/pages/painel/FluxoCaixa').then((m) => ({ default: m.FluxoCaixa })))
const Produtos = lazy(() => import('@/pages/painel/Produtos').then((m) => ({ default: m.Produtos })))
const Estoque = lazy(() => import('@/pages/painel/Estoque').then((m) => ({ default: m.Estoque })))
const PlanoDoMes = lazy(() => import('@/pages/painel/PlanoDoMes').then((m) => ({ default: m.PlanoDoMes })))
const DRE = lazy(() => import('@/pages/painel/DRE').then((m) => ({ default: m.DRE })))
const Rede = lazy(() => import('@/pages/painel/Rede').then((m) => ({ default: m.Rede })))
const Franquias = lazy(() => import('@/pages/painel/Franquias').then((m) => ({ default: m.Franquias })))
const Metas = lazy(() => import('@/pages/painel/Metas').then((m) => ({ default: m.Metas })))
const Cmv = lazy(() => import('@/pages/painel/Cmv').then((m) => ({ default: m.Cmv })))
const Dashboard = lazy(() => import('@/pages/painel/Numeros').then((m) => ({ default: m.Dashboard })))
const Configuracoes = lazy(() => import('@/pages/painel/Configuracoes').then((m) => ({ default: m.Configuracoes })))
const Perfil = lazy(() => import('@/pages/painel/Perfil').then((m) => ({ default: m.Perfil })))
const ConvitePage = lazy(() => import('@/pages/auth/ConvitePage').then((m) => ({ default: m.ConvitePage })))
const Plano = lazy(() => import('@/pages/painel/Plano').then((m) => ({ default: m.Plano })))
const PdvLayout = lazy(() => import('@/pages/pdv/PdvLayout').then((m) => ({ default: m.PdvLayout })))
const Cardapio = lazy(() => import('@/pages/pdv/Cardapio').then((m) => ({ default: m.Cardapio })))
const NovoPedido = lazy(() => import('@/pages/pdv/NovoPedido').then((m) => ({ default: m.NovoPedido })))
const Pedidos = lazy(() => import('@/pages/pdv/Pedidos').then((m) => ({ default: m.Pedidos })))
const CaixaPdv = lazy(() => import('@/pages/pdv/CaixaPdv').then((m) => ({ default: m.CaixaPdv })))
const Historico = lazy(() => import('@/pages/pdv/Historico').then((m) => ({ default: m.Historico })))
const Kds = lazy(() => import('@/pages/pdv/Kds').then((m) => ({ default: m.Kds })))
const AcaoContaPage = lazy(() => import('@/pages/auth/AcaoContaPage').then((m) => ({ default: m.AcaoContaPage })))
const EmailsPage = lazy(() => import('@/pages/auth/EmailsPage').then((m) => ({ default: m.EmailsPage })))

/**
 * O Início está fora do menu por enquanto: quem abre /painel puro cai no Dashboard.
 * Com query (?acao=…, ?assinatura=ok) a página continua sendo o Início, pra não
 * perder o gesto do link; a rota segue existindo.
 */
/**
 * Antiga página Ajustes: hoje é Configurações. Links velhos (e-mails já
 * enviados, mensagens no grupo) mantêm o ?loja= e caem na aba da âncora.
 */
const ABA_DA_ANCORA: Record<string, string> = { '#historico': 'historico', '#equipe': 'equipe', '#emails': 'notificacoes' }
function RedirecionaAjustes() {
  const { hash, search } = useLocation()
  const aba = ABA_DA_ANCORA[hash]
  return <Navigate to={`/painel/configuracoes${aba ? `/${aba}` : ''}${search}`} replace />
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
              <Route path="/conta/acao" element={<AcaoContaPage />} />
              <Route path="/emails" element={<EmailsPage />} />

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
