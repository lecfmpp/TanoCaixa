/** Evento no Google Analytics (já carregado no index.html). Não faz nada se o gtag não existir. */
export function rastrear(evento: string, parametros: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return
  const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag
  gtag?.('event', evento, parametros)
}
