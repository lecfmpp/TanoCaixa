import type { ReactNode } from 'react'

/**
 * Markdown mínimo para o texto dos posts: **negrito**, *itálico* e [links](url).
 * Links internos (começam com "/") e externos viram <a> comum: o blog é pré-renderizado e cada página
 * é um documento próprio, então não há roteamento no cliente.
 */
const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\([^)]+\))/g

export function Inline({ texto }: { texto: string }): ReactNode {
  const partes = texto.split(TOKEN).filter((p) => p !== '')
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-bold text-tinta">{p.slice(2, -2)}</strong>
        if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>
        const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(p)
        if (m) {
          const externo = /^https?:\/\//.test(m[2])
          return (
            <a
              key={i}
              href={m[2]}
              {...(externo ? { target: '_blank', rel: 'noopener' } : {})}
              className="font-semibold text-mar underline decoration-sol decoration-2 underline-offset-[3px] hover:text-mar-escuro"
            >
              {m[1]}
            </a>
          )
        }
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

/** Texto puro (sem marcação): usado em meta tags, JSON-LD e contagem de palavras. */
export function textoPuro(texto: string): string {
  return texto
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
}
