import { codigoDoErro } from '@/auth/erros'

/**
 * Recados para falha de gravação no banco. Sem isso o lançamento sumia em
 * silêncio: a gaveta ficava parada no "Confirmar" e o dono jurava que tinha
 * salvo — era o caso de "cadastrei a despesa e ela não apareceu".
 */
const MENSAGENS: Record<string, string> = {
  'permission-denied':
    'Você não tem permissão para gravar nesta loja. Se acabou de entrar por convite, saia e entre de novo; se o problema seguir, fale com o dono da conta.',
  unauthenticated: 'Sua sessão expirou. Entre de novo e refaça o lançamento.',
  unavailable: 'Sem conexão com o banco. O lançamento não foi salvo — confira a internet e tente de novo.',
  'deadline-exceeded': 'O banco demorou demais para responder. O lançamento não foi salvo, tente de novo.',
  'failed-precondition': 'O banco recusou a gravação (falta um índice ou a base está indisponível).',
  'resource-exhausted': 'A cota do banco estourou. Tente de novo em alguns minutos.',
  'invalid-argument': 'Algum campo do lançamento saiu fora do formato que o banco aceita.',
}

/**
 * Mensagem que vai pro toast. Código desconhecido aparece no texto de
 * propósito — melhor o dono nos dizer "deu erro tal" do que "não funcionou".
 */
export function mensagemDeErro(e: unknown, fallback: string): string {
  const codigo = codigoDoErro(e).replace(/^firestore\//, '')
  if (codigo && MENSAGENS[codigo]) return MENSAGENS[codigo]
  const msg = e instanceof Error ? e.message : ''
  if (codigo) return `${fallback} (${codigo})`
  return msg ? `${fallback} ${msg}` : fallback
}
