import '../index.css'
import { montarBlog } from './mount'

/** Entrada do blog e dos materiais grátis (ver blog.html). Não carrega Firebase nem o app. */
montarBlog(document.getElementById('root')!)
