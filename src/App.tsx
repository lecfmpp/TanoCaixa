import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { DataProvider } from '@/data/Provider'
import { UIProvider } from '@/ui/UIProvider'
import { ToastHost } from '@/ui/ToastHost'
import { ModalHost } from '@/ui/ModalHost'
import { GavetaHost } from '@/components/gaveta/GavetaHost'
import { RotaProtegida } from '@/auth/RotaProtegida'
import { AppShell } from '@/components/layout/AppShell'
import { EntrarPage } from '@/pages/auth/EntrarPage'
import { CriarContaPage } from '@/pages/auth/CriarContaPage'
import { EsqueciSenhaPage } from '@/pages/auth/EsqueciSenhaPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { Inicio } from '@/pages/painel/Inicio'
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
                <Route index element={<Inicio />} />
                <Route path="despesas" element={<Despesas />} />
                <Route path="produtos" element={<Produtos />} />
                <Route path="estoque" element={<Estoque />} />
                <Route path="plano" element={<PlanoDoMes />} />
                <Route path="dre" element={<DRE />} />
                <Route path="numeros" element={<Numeros />} />
                <Route path="ajustes" element={<Ajustes />} />
              </Route>

              <Route path="/" element={<Navigate to="/painel" replace />} />
              <Route path="*" element={<Navigate to="/painel" replace />} />
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
