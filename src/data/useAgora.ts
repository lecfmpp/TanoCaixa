import { useEffect, useState } from 'react'

/** Hoje agora — refeito a cada 30 s pro tempo de espera andar sem recarregar. */
export function useAgora(intervalo = 30_000) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), intervalo)
    return () => clearInterval(id)
  }, [intervalo])
  return agora
}

