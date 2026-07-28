import { clsx, type ClassValue } from 'clsx'

/** Junta classes condicionais (padrão do projeto). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
