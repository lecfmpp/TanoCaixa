/* ------------------------------------------------------------------ *
 * Monta o lembrete (legenda + URL da imagem) a partir do catálogo.
 * Puro: sem Firebase e sem rede. Formatos: moeda `R$ 1.240,00`, data `dd/mm`,
 * percentual inteiro, locale pt-BR.
 * ------------------------------------------------------------------ */
import { LEMBRETES, URL_DO_APP, urlDaImagem, type IdLembrete } from './lembretesCatalogo'

export type Variaveis = Record<string, string | number>

export interface LembretePronto {
  /** Texto que acompanha a imagem. */
  legenda: string
  /** URL pública da imagem fixa do tipo de lembrete. */
  imagemUrl: string
  /** Nome do arquivo (vai como fileName no WhatsApp). */
  arquivo: string
}

/** Troca {variavel} pelo valor. Variável sem valor é erro: nunca enviar "{valor}" para o cliente. */
export function preencher(modelo: string, vars: Variaveis): string {
  return modelo.replace(/\{([a-z_0-9]+)\}/gi, (_, nome: string) => {
    const v = vars[nome]
    if (v === undefined || v === null || v === '') throw new Error(`lembrete: falta a variável {${nome}}`)
    return String(v)
  })
}

/**
 * Põe o link do app numa linha própria (o WhatsApp o torna clicável), antes da
 * assinatura em itálico (`_restaurante_`) quando existe; senão, no fim.
 */
export function comLink(legenda: string, url: string): string {
  const linhas = legenda.split('\n')
  const linkLinha = `Abrir no app: ${url}`
  const ultima = linhas[linhas.length - 1]
  if (/^_.+_$/.test(ultima)) linhas.splice(linhas.length - 1, 0, linkLinha)
  else linhas.push(linkLinha)
  return linhas.join('\n')
}

/**
 * `variante` escolhe uma legenda alternativa da mesma imagem (ex.: ponto de
 * equilíbrio "passou", assinatura "pagamento"). Sem `restaurante` na lista de
 * variáveis, a linha da assinatura (_{restaurante}_) simplesmente não existe no
 * modelo — cadastro e assinatura não levam restaurante.
 */
export function montarLembrete(id: IdLembrete, vars: Variaveis, variante?: string): LembretePronto {
  const l: { arquivo: string; token: string; link: string; corpo: string; variantes?: Record<string, string> } = LEMBRETES[id]
  const modelo = variante ? l.variantes?.[variante] : l.corpo
  if (!modelo) throw new Error(`lembrete ${id}: variante "${variante}" não existe`)
  return { legenda: comLink(preencher(modelo, vars), `${URL_DO_APP}${l.link}`), imagemUrl: urlDaImagem(l), arquivo: l.arquivo }
}

/** Vencimentos: o título concorda com a quantidade e cada item vira uma linha. */
export function varsDeVencimentos(
  itens: { fornecedor: string; valor: string; situacao: string }[],
  restaurante: string,
): Variaveis {
  const n = itens.length
  return {
    titulo: `${n} ${n === 1 ? 'vencimento pede' : 'vencimentos pedem'} atenção`,
    itens: itens.map((i) => `• ${i.fornecedor}: ${i.valor}, ${i.situacao}`).join('\n'),
    restaurante,
  }
}
