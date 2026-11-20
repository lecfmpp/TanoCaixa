import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Formatação do WhatsApp em React (sem HTML cru): *negrito*, _itálico_ e
 * links clicáveis. Uma linha do texto vira uma linha na tela.
 */
function formatarLinha(linha: string, chave: string): ReactNode[] {
  const partes: ReactNode[] = []
  const re = /(\*[^*\n]+\*)|(_[^_\n]+_)|(https?:\/\/[^\s]+)/g
  let ultimo = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(linha))) {
    if (m.index > ultimo) partes.push(linha.slice(ultimo, m.index))
    const k = `${chave}-${i++}`
    if (m[1]) partes.push(<strong key={k}>{m[1].slice(1, -1)}</strong>)
    else if (m[2]) partes.push(<em key={k}>{m[2].slice(1, -1)}</em>)
    else
      partes.push(
        <a key={k} href={m[3]} target="_blank" rel="noreferrer" className="break-all text-[#027eb5] underline-offset-2 hover:underline">
          {m[3]}
        </a>,
      )
    ultimo = m.index + m[0].length
  }
  if (ultimo < linha.length) partes.push(linha.slice(ultimo))
  return partes
}

export function TextoWhatsapp({ texto }: { texto: string }) {
  const linhas = texto.split('\n')
  return (
    <>
      {linhas.map((l, i) => (
        <Fragment key={i}>
          {formatarLinha(l, String(i))}
          {i < linhas.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  )
}

interface Props {
  legenda: string
  imagemUrl?: string
  /** Hora mostrada no canto da bolha (ex.: "09:00"). */
  hora: string
  className?: string
}

/** Bolha de mensagem como aparece no grupo: imagem em cima, legenda e hora. */
export function PreviaMensagem({ legenda, imagemUrl, hora, className }: Props) {
  return (
    <div className={cn('rounded-campo bg-[#e9e4dc] p-3', className)} aria-label="Exemplo da mensagem no WhatsApp">
      <div className="mb-1.5 text-[11px] font-bold text-[#1f7a54]">Tá no Caixa</div>
      <div className="max-w-[300px] rounded-[10px] rounded-tl-[3px] bg-white p-1 text-[13.5px] leading-snug text-[#111b21] shadow-[0_1px_1px_rgba(0,0,0,0.12)]">
        {imagemUrl && (
          <img src={imagemUrl} alt="" loading="lazy" width={1080} height={1080} className="aspect-square w-full rounded-[7px] bg-preenchimento object-cover" />
        )}
        <div className="px-1.5 pt-1.5 pb-0.5 [overflow-wrap:anywhere]">
          <TextoWhatsapp texto={legenda} />
        </div>
        <div className="px-1.5 pb-0.5 text-right text-[10.5px] text-[#667781]">{hora}</div>
      </div>
    </div>
  )
}
