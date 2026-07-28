/* ------------------------------------------------------------------ *
 * Utilitários de CSV — parse, geração e download.
 * Detecta o separador (vírgula ou ponto-e-vírgula do Excel pt-BR) e trata
 * campos entre aspas. Templates saem com ';' + BOM para abrir limpo no Excel.
 * ------------------------------------------------------------------ */

function detectarSeparador(texto: string): ',' | ';' {
  const primeira = texto.split(/\r?\n/)[0] ?? ''
  const virgulas = (primeira.match(/,/g) ?? []).length
  const pontoVirgula = (primeira.match(/;/g) ?? []).length
  return pontoVirgula > virgulas ? ';' : ','
}

/** Converte texto CSV numa matriz de células (ignora linhas vazias). */
export function parseCSV(texto: string): string[][] {
  const sep = detectarSeparador(texto)
  const t = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const linhas: string[][] = []
  let campo = ''
  let linha: string[] = []
  let aspas = false

  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"'
          i++
        } else aspas = false
      } else campo += c
    } else if (c === '"') {
      aspas = true
    } else if (c === sep) {
      linha.push(campo)
      campo = ''
    } else if (c === '\n') {
      linha.push(campo)
      linhas.push(linha)
      linha = []
      campo = ''
    } else campo += c
  }
  if (campo !== '' || linha.length) {
    linha.push(campo)
    linhas.push(linha)
  }
  return linhas.filter((l) => l.some((c) => c.trim() !== ''))
}

/** Converte CSV em objetos usando a primeira linha como cabeçalho. */
export function parseCSVObjetos(texto: string): Record<string, string>[] {
  const linhas = parseCSV(texto)
  if (linhas.length < 2) return []
  const cabecalho = linhas[0].map((h) => h.trim().toLowerCase())
  return linhas.slice(1).map((l) => {
    const o: Record<string, string> = {}
    cabecalho.forEach((h, i) => (o[h] = (l[i] ?? '').trim()))
    return o
  })
}

function escapar(v: string, sep: string): string {
  if (v.includes(sep) || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

/** Gera texto CSV (separador ';' para o Excel pt-BR). */
export function gerarCSV(cabecalho: string[], linhas: string[][]): string {
  const sep = ';'
  const todas = [cabecalho, ...linhas]
  return todas.map((l) => l.map((c) => escapar(c, sep)).join(sep)).join('\n')
}

/** Dispara o download de um CSV (com BOM para acentos no Excel). */
export function baixarCSV(nomeArquivo: string, conteudo: string): void {
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo.endsWith('.csv') ? nomeArquivo : `${nomeArquivo}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Lê um arquivo como texto (UTF-8). */
export function lerArquivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'utf-8')
  })
}

/** Converte "1.234,56" ou "1234.56" em número. */
export function numeroBR(v: string): number {
  const limpo = v.replace(/[^\d,.-]/g, '').trim()
  if (!limpo) return 0
  // Se tem vírgula, trata como decimal BR (remove pontos de milhar).
  if (limpo.includes(',')) return Number(limpo.replace(/\./g, '').replace(',', '.')) || 0
  return Number(limpo) || 0
}

/** Converte "DD/MM/AAAA" (ou ISO) em 'AAAA-MM-DD'. */
export function dataBRparaISO(v: string): string {
  const s = v.trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    const [, d, mes, a] = m
    const ano = a.length === 2 ? `20${a}` : a
    return `${ano}-${mes.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return s.slice(0, 10) // assume já ISO
}
