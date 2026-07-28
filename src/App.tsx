import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { DataProvider } from '@/data/Provider'
import { UIProvider } from '@/ui/UIProvider'
import { ToastHost } from '@/ui/ToastHost'
import { ModalHost } from '@/ui/ModalHost'
import { GavetaHost } from '@/components/gaveta/GavetaHost'
import { RotaProtegida } from '@/auth/RotaProtegida'
import { ExigePermissao } from '@/auth/ExigePermissao'
import { AppShell } from '@/components/layout/AppShell'
import { EntrarPage } from '@/pages/auth/EntrarPage'
import { CriarContaPage } from '@/pages/auth/CriarContaPage'
import { EsqueciSenhaPage } from '@/pages/auth/EsqueciSenhaPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { LandingPage } from '@/pages/LandingPage'
import { Inicio } from '@/pages/painel/Inicio'
import { Caixa } from '@/pages/painel/Caixa'
import { Despesas } from '@/pages/painel/Despesas'
import { Produtos } from '@/pages/painel/Produtos'
import { Estoque } from '@/pages/painel/Estoque'
import { PlanoDoMes } from '@/pages/painel/PlanoDoMes'
import { DRE } from '@/pages/painel/DRE'
import { Numeros } from '@/pages/painel/Numeros'
import { Ajustes } from '@/pages/painel/Ajustes'

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <UIProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/entrar" element={<EntrarPage />} />
              <Route path="/criar" element={<CriarContaPage />} />
              <Route path="/esqueci" element={<EsqueciSenhaPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />

              <Route
                path="/painel"
                element={
                  <RotaProtegida>
                    <AppShell />
                  </RotaProtegida>
                }
              >
                <Route index element={<ExigePermissao chave="veInicio"><Inicio /></ExigePermissao>} />
                <Route path="caixa" element={<ExigePermissao chave="veFechamento"><Caixa /></ExigePermissao>} />
                <Route path="despesas" element={<ExigePermissao chave="veDespesas"><Despesas /></ExigePermissao>} />
                <Route path="produtos" element={<ExigePermissao chave="veProdutos"><Produtos /></ExigePermissao>} />
                <Route path="estoque" element={<ExigePermissao chave="veEstoque"><Estoque /></ExigePermissao>} />
                <Route path="plano" element={<ExigePermissao chave="vePlano"><PlanoDoMes /></ExigePermissao>} />
                <Route path="dre" element={<ExigePermissao chave="veDRE"><DRE /></ExigePermissao>} />
                <Route path="numeros" element={<ExigePermissao chave="veNumeros"><Numeros /></ExigePermissao>} />
                <Route path="ajustes" element={<ExigePermissao chave="veAjustes"><Ajustes /></ExigePermissao>} />
              </Route>

              <Route path="/" element={<LandingPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <ToastHost />
            <ModalHost />
            <GavetaHost />
          </BrowserRouter>
        </UIProvider>
      </DataProvider>
    </AuthProvider>
  )
}
