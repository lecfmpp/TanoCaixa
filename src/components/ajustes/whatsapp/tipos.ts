/** Formato do que o servidor manda para a tela de WhatsApp (lembretesWhatsappConfig). */

export type StatusGrupo = 'sem_grupo' | 'conectado' | 'dono_fora' | 'sem_acesso' | 'erro'
export type StatusEnvio = 'falhou' | 'enviado' | 'entregue' | 'lido'

export interface Lembrete {
  id: string
  titulo: string
  grupo: string
  /** Quando sai, em palavras ("Nenhuma venda lançada no dia"). */
  quando: string
  /** Rodada: "9h" ou "18h30". */
  horario: string
  disponivel: boolean
  ativo: boolean
  exemplo: { legenda: string; imagemUrl: string; link: string } | null
}

export interface Envio {
  id: string
  tipo: 'lembrete' | 'teste' | 'boas_vindas' | 'aviso'
  titulo: string | null
  porNome: string | null
  status: StatusEnvio
  erro: string | null
  criadoEm: string
}

export interface ConfigWhatsapp {
  status: StatusGrupo
  statusMotivo: string
  temGrupo: boolean
  grupoId: string
  grupoNome: string | null
  grupoLink: string | null
  pessoas: number | null
  conectadoEm: string | null
  numeroTaNoCaixa: string
  celularDono: string | null
  codigo: { codigo: string; expiraEm: string } | null
  podeEditarGrupo: boolean
  podeDesconectar: boolean
  lembretes: Lembrete[]
  envios: Envio[]
}

export interface ResultadoTeste {
  resultado: 'enviada' | 'falhou' | 'dono_fora' | 'sem_acesso'
  mensagem: string
  config: ConfigWhatsapp
}

/** O que a tela pede ao servidor. Cada ação devolve a configuração nova. */
export interface AcoesWhatsapp {
  conectarPorLink: (link: string) => Promise<void>
  gerarCodigo: () => Promise<void>
  conectarPorId: (grupoId: string) => Promise<void>
  desconectar: () => Promise<void>
  testar: () => Promise<{ ok: boolean; texto: string }>
  ligar: (id: string, ativo: boolean) => Promise<void>
  copiar: (texto: string) => void
}
