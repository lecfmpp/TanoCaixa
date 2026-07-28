import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { RotaProtegida } from '@/auth/RotaProtegida'
import { AppShell } from '@/components/layout/AppShell'
import { EntrarPage } from '@/pages/auth/EntrarPage'
import { CriarContaPage } from '@/pages/auth/CriarContaPage'
import { EsqueciSenhaPage } from '@/pages/auth/EsqueciSenhaPage'
import { Inicio } from '@/pages/painel/Inicio'
import { Placeholder } from '@/pages/painel/Placeholder'
import { fotos } from '@/lib/fotos'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<EntrarPage />} />
          <Route path="/criar" element={<CriarContaPage />} />
          <Route path="/esqueci" element={<EsqueciSenhaPage />} />

          <Route
            path="/painel"
            element={
              <RotaProtegida>
                <AppShell />
              </RotaProtegida>
            }
          >
            <Route index element={<Inicio />} />
            <Route
              path="despesas"
              element={<Placeholder titulo="Despesas" fase="Fase 2" foto={fotos.orla} />}
            />
            <Route
              path="produtos"
              element={<Placeholder titulo="Produtos" fase="Fase 3" foto={fotos.selaron} />}
            />
            <Route
              path="estoque"
              element={<Placeholder titulo="Estoque" fase="Fase 3" foto={fotos.bondinho} />}
            />
            <Route
              path="plano"
              element={<Placeholder titulo="Plano do mês" fase="Fase 6" foto={fotos.porDoSol} />}
            />
            <Route
              path="dre"
              element={<Placeholder titulo="DRE" fase="Fase 6" foto={fotos.aerea} />}
            />
            <Route
              path="numeros"
              element={<Placeholder titulo="Números" fase="Fase 6" foto={fotos.orla} />}
            />
            <Route
              path="ajustes"
              element={<Placeholder titulo="Ajustes" fase="Fase 0+" foto={fotos.selaron} />}
            />
          </Route>

          <Route path="/" element={<Navigate to="/painel" replace />} />
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
