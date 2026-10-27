/* ------------------------------------------------------------------ *
 * Regras de layout (puras) dos gráficos de barras "entrou × saiu": quanto texto
 * cabe, de quantos em quantos grupos mostrar data e saldo. Ficam fora dos
 * componentes pra poderem ser testadas sem navegador (layoutBarras.test.mjs).
 * ------------------------------------------------------------------ */

export type ModoValores = 'inteiro' | 'curto' | 'nenhum'

/** Largura de `caracteres` na fonte mono do app (JetBrains Mono: 0,6 em por caractere). */
export const larguraMono = (tamanhoPx: number, caracteres: number): number => caracteres * tamanhoPx * 0.6

const maior = (textos: string[]): number => textos.reduce((m, t) => Math.max(m, t.length), 0)

/** Textos exatamente como são desenhados (com sinal e separador), pra medir o que de fato aparece. */
export interface TextosBarras {
  /** Valor sobre a barra: "120.000". */
  inteiro: string[]
  /** Valor sobre a barra, curto: "120k". */
  curto: string[]
  /** Saldo embaixo: "+1.838". */
  saldoInteiro: string[]
  /** Saldo embaixo, curto: "+1,8k". */
  saldoCurto: string[]
}

export interface LayoutBarras {
  gap: number
  grupo: number
  entreColunas: number
  valores: ModoValores
  saldoCurto: boolean
  passo: number
}

/** Folga (px) entre dois rótulos vizinhos, pra não ficarem colados. */
const FOLGA = 6
const COLUNA_MAX = 40

/**
 * `largura` = largura útil do gráfico (0 = ainda não medida). Valores sobre as barras
 * só aparecem se o texto MAIS LARGO couber na sua coluna (antes o corte era fixo, e
 * "120.000" colidia com "118.000" na mesma altura).
 */
export function layoutBarras({ largura, n, textos }: { largura: number; n: number; textos: TextosBarras }): LayoutBarras {
  const gap = n > 20 ? 2 : n > 12 ? 4 : 8
  const grupo = largura > 0 ? (largura - gap * (n - 1)) / Math.max(n, 1) : Infinity
  const entreColunas = grupo < 30 ? 1 : 4
  const coluna = Math.min(COLUNA_MAX, (grupo - entreColunas) / 2)

  // Dois rótulos lado a lado, na mesma altura: cada um precisa caber na sua coluna mais o espaço entre elas.
  const cabe = (caracteres: number) => larguraMono(12, caracteres) + FOLGA <= coluna + entreColunas
  const valores: ModoValores = cabe(maior(textos.inteiro)) ? 'inteiro' : cabe(maior(textos.curto)) ? 'curto' : 'nenhum'

  // Saldo (14px) que não cabe no seu grupo vira curto (12px).
  const saldoCurto = larguraMono(14, maior(textos.saldoInteiro)) + FOLGA > grupo + gap
  const larguraSaldo = saldoCurto ? larguraMono(12, maior(textos.saldoCurto)) : larguraMono(14, maior(textos.saldoInteiro))
  const precisa = Math.max(40, larguraSaldo + 16)
  const passo = grupo + gap >= precisa ? 1 : Math.ceil(precisa / Math.max(grupo + gap, 1))
  return { gap, grupo, entreColunas, valores, saldoCurto, passo }
}

/**
 * Quando o passo pula grupos, a contagem parte do ÚLTIMO (o mais recente): é o que
 * mais interessa e nunca pode ficar sem data e saldo.
 */
export const visivelNoPasso = (indice: number, total: number, passo: number): boolean => (total - 1 - indice) % passo === 0
