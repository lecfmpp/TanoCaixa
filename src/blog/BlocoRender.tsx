import { Grafico } from './graficos'
import { CtaPorRef } from './ctas'
import { Widget } from './widgets'
import { acharPost } from './posts'
import { CartaoLink, Checklist, Citacao, Comparacao, Erros, Exemplo, Faq, Lista, Nota, Numeros, Paragrafo, Passos, Print, Tabela, Titulo2, Titulo3, Tldr } from './elementos'
import type { Bloco } from './tipos'

/** Converte um bloco do post no componente visual correspondente. */
export function BlocoRender({ bloco, origem }: { bloco: Bloco; origem: string }) {
  switch (bloco.t) {
    case 'h2':
      return <Titulo2 texto={bloco.texto} />
    case 'h3':
      return <Titulo3 texto={bloco.texto} />
    case 'p':
      return <Paragrafo texto={bloco.texto} />
    case 'ul':
      return <Lista itens={bloco.itens} />
    case 'ol':
      return <Lista itens={bloco.itens} ordenada />
    case 'tldr':
      return <Tldr itens={bloco.itens} />
    case 'numeros':
      return <Numeros bloco={bloco} />
    case 'tabela':
      return <Tabela bloco={bloco} />
    case 'comparacao':
      return <Comparacao bloco={bloco} />
    case 'passos':
      return <Passos itens={bloco.itens} />
    case 'erros':
      return <Erros itens={bloco.itens} />
    case 'checklist':
      return <Checklist titulo={bloco.titulo} itens={bloco.itens} />
    case 'nota':
      return <Nota rotulo={bloco.rotulo} texto={bloco.texto} tom={bloco.tom} />
    case 'citacao':
      return <Citacao texto={bloco.texto} />
    case 'exemplo':
      return <Exemplo bloco={bloco} />
    case 'grafico':
      return <Grafico bloco={bloco} />
    case 'widget':
      return <Widget id={bloco.id} preset={bloco.preset} />
    case 'print':
      return <Print bloco={bloco} />
    case 'cartao-link': {
      const p = acharPost(bloco.slug)
      if (!p) return null
      return <CartaoLink href={`/blog/${p.slug}`} titulo={p.titulo} resumo={p.resumo} rotulo={bloco.rotulo ?? 'Continue lendo'} />
    }
    case 'cta':
      return <CtaPorRef cta={bloco.cta} origem={origem} compacto />
    case 'faq':
      return <Faq itens={bloco.itens} />
  }
}
