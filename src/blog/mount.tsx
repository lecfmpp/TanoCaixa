import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BlogApp } from './rotas'

/** Entrada do blog no navegador: hidrata o HTML pré-renderizado (ou renderiza, em desenvolvimento). */
export function montarBlog(raiz: HTMLElement) {
  const app = (
    <StrictMode>
      <BlogApp caminho={window.location.pathname} />
    </StrictMode>
  )
  if (raiz.hasChildNodes()) hydrateRoot(raiz, app)
  else createRoot(raiz).render(app)
}
