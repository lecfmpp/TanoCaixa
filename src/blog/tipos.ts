/**
 * Contrato dos artigos do blog. Cada post é um arquivo em `src/blog/posts/` que exporta um `Post`
 * feito de blocos tipados: o mesmo conteúdo vira HTML pré-renderizado (SEO), componentes visuais
 * (gráficos, calculadoras, tabelas) e JSON-LD (Article, FAQPage, BreadcrumbList).
 *
 * Texto aceita markdown mínimo: **negrito**, *itálico*, [link](/caminho). Nada de HTML.
 */

export type Tom = 'mar' | 'telha' | 'mata' | 'sol'

/** Variantes do cartão de cadastro. Alternar entre posts para não repetir. */
export type VarianteTeste = 'painel' | 'numero' | 'nota' | 'comparacao' | 'rede'

export type RefCta =
  | { tipo: 'recurso'; id: string }
  | { tipo: 'teste'; variante: VarianteTeste }

export interface ItemFaq {
  p: string
  r: string
}

export interface DadoBarra {
  rotulo: string
  valor: number
  /** Destaca a barra (cor sol/telha). */
  destaque?: boolean
  /** Texto curto abaixo do rótulo (ex.: "plano grátis"). */
  nota?: string
}

export interface ParteEmpilhada {
  rotulo: string
  valor: number
  tom: Tom | 'areia' | 'noite' | 'cinza'
}

export interface SerieLinha {
  rotulo: string
  tom: Tom
  /** Um valor de y por ponto de x. */
  y: number[]
  tracejada?: boolean
}

export type BlocoGrafico =
  | { t: 'grafico'; tipo: 'barras'; titulo: string; subtitulo?: string; dados: DadoBarra[]; formato?: 'brl' | 'pct' | 'num'; fonte?: string }
  | { t: 'grafico'; tipo: 'empilhada'; titulo: string; subtitulo?: string; partes: ParteEmpilhada[]; formato?: 'brl' | 'pct'; fonte?: string }
  | { t: 'grafico'; tipo: 'linhas'; titulo: string; subtitulo?: string; x: number[]; series: SerieLinha[]; formatoX?: 'brl' | 'num'; formatoY?: 'brl' | 'num'; marcaX?: { x: number; rotulo: string }; fonte?: string }

export type IdWidget = 'taxa-ifood' | 'cmv' | 'equilibrio' | 'custo-prato'

export type Bloco =
  | { t: 'h2'; texto: string }
  | { t: 'h3'; texto: string }
  | { t: 'p'; texto: string }
  | { t: 'ul'; itens: string[] }
  | { t: 'ol'; itens: string[] }
  /** Resposta curta no topo (AEO). 4 a 5 itens, cada um com **lead-in:** frase. */
  | { t: 'tldr'; itens: string[] }
  | { t: 'numeros'; itens: { valor: string; rotulo: string; tom?: Tom }[]; nota?: string }
  | {
      t: 'tabela'
      cabecalho: string[]
      linhas: string[][]
      /** Índice da coluna a destacar (ex.: a nossa). */
      destaqueColuna?: number
      /** Enfatiza a última linha (total/resultado). */
      ultimaEmDestaque?: boolean
      legenda?: string
      /** Ex.: "Conferido em 21/10/2026". */
      fonte?: string
    }
  | {
      t: 'comparacao'
      colA: string
      colB: string
      linhas: { dim: string; a: string; b: string; aOk?: boolean; bOk?: boolean }[]
    }
  | { t: 'passos'; itens: { titulo: string; texto: string }[] }
  | { t: 'erros'; itens: { titulo: string; texto: string }[] }
  | { t: 'checklist'; titulo?: string; itens: string[] }
  | { t: 'nota'; rotulo?: string; texto: string; tom?: 'info' | 'alerta' | 'dica' }
  | { t: 'citacao'; texto: string }
  /** Conta passo a passo com números (exemplo ilustrativo). */
  | { t: 'exemplo'; titulo: string; linhas: { rotulo: string; valor: string; destaque?: boolean }[]; conclusao?: string }
  | BlocoGrafico
  | { t: 'widget'; id: IdWidget; preset?: string }
  /** Print real do app numa moldura de navegador. `src` vem de /public/landing. */
  | { t: 'print'; src: string; alt: string; url: string; legenda: string }
  | { t: 'cartao-link'; slug: string; rotulo?: string }
  /** CTA no meio do texto (uma vez por post). */
  | { t: 'cta'; cta: RefCta }
  | { t: 'faq'; itens: ItemFaq[] }

export type TipoPost = 'pilar' | 'cluster' | 'nicho' | 'comparativo'

export type Categoria = 'Delivery' | 'Custos e CMV' | 'Gestão financeira' | 'Comparativos' | 'Por tipo de cozinha'

export interface Capa {
  /** Formato do diagrama da capa (ver `blog/FRAMEWORK.md`). */
  tipo: 'spread' | 'versus' | 'steps' | 'bars'
  /** Texto pequeno em mono (ex.: "DELIVERY · CÁLCULO"). */
  etiqueta: string
  /** Números/rótulos que o diagrama usa. */
  itens: { rotulo: string; valor?: number }[]
}

export interface FontePost {
  rotulo: string
  url: string
}

export interface Post {
  slug: string
  /** H1 (pode ter até ~65 caracteres). */
  titulo: string
  /** <title> (≤ 60). */
  tituloMeta: string
  /** Meta description (≤ 160). */
  descricao: string
  /** Resumo exibido nos cartões do índice. */
  resumo: string
  palavraChave: string
  secundarias: string[]
  tipo: TipoPost
  categoria: Categoria
  publicadoEm: string
  atualizadoEm: string
  capa: Capa
  blocos: Bloco[]
  /** Slugs de outros posts (o 1º é o pilar, quando houver). */
  relacionados: string[]
  cta: { principal: RefCta; secundario?: RefCta }
  fontes?: FontePost[]
}

export interface Recurso {
  id: string
  titulo: string
  /** Frase curta (≤ 110) usada no cartão. */
  resumo: string
  descricao: string
  formato: 'XLSX' | 'PDF'
  /** Caminho em /public, ex.: /downloads/planilha.xlsx */
  arquivo: string
  tom: Tom
  inclui: string[]
  paraQuem: string
  /** Posts onde este recurso é a isca. */
  slugsRelacionados: string[]
}
