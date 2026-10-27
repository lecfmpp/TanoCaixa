import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

/** Em desenvolvimento, /blog e /recursos abrem a entrada própria do blog (blog.html), como em produção. */
function rotasDoBlog(): Plugin {
  return {
    name: 'rotas-do-blog',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        if (/^\/(blog|recursos)(\/|\?|$)/.test(url) && !/\.\w+(\?|$)/.test(url)) req.url = '/blog.html'
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), rotasDoBlog()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      // Duas entradas: o app (index.html) e o blog pré-renderizado (blog.html), sem Firebase.
      input: { main: path.resolve(__dirname, 'index.html'), blog: path.resolve(__dirname, 'blog.html') },
    },
  },
})
