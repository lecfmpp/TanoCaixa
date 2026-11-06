import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { Secao } from '@/components/ui/Acordeao'
import { Switch } from '@/components/ui/Switch'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { useTenant } from '@/data/hooks'
import { useUI } from '@/ui/UIProvider'
import { cn } from '@/lib/cn'

type StatusGrupo = 'sem_grupo' | 'conectado' | 'dono_fora' | 'sem_acesso' | 'erro'
type StatusEnvio = 'falhou' | 'enviado' | 'entregue' | 'lido'

interface Lembrete {
  id: string
  titulo: string
  grupo: string
  quando: string
  disponivel: boolean
  ativo: boolean
}
interface Envio {
  id: string
  tipo: 'lembrete' | 'teste' | 'boas_vindas' | 'aviso'
  titulo: string | null
  porNome: string | null
  status: StatusEnvio
  erro: string | null
  criadoEm: string
}
interface Config {
  status: StatusGrupo
  statusMotivo: string
  temGrupo: boolean
  grupoId: string
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
interface ResultadoTeste {
  resultado: 'enviada' | 'falhou' | 'dono_fora' | 'sem_acesso'
  mensagem: string
  config: Config
}

type Loja = { restauranteId: string }
const buscar = httpsCallable<Loja, Config>(functions, 'lembretesWhatsappConfig')
const salvar = httpsCallable<Loja & { id: string; ativo: boolean }, Config>(functions, 'lembretesWhatsappSalvar')
const gerarCodigo = httpsCallable<Loja, Config>(functions, 'lembretesWhatsappCodigo')
const trocarGrupo = httpsCallable<Loja & { grupoId: string }, Config>(functions, 'lembretesWhatsappGrupo')
const desconectar = httpsCallable<Loja, Config>(functions, 'lembretesWhatsappDesconectar')
const testar = httpsCallable<Loja, ResultadoTeste>(functions, 'lembretesWhatsappTeste')

/** O servidor já manda a explicação em português; mostra ela. */
const erroDoServidor = (e: unknown, padrao: string) => (e instanceof Error && e.message && !/^internal$/i.test(e.message) ? e.message : padrao)

const STATUS: Record<StatusGrupo, { rotulo: string; classe: string }> = {
  sem_grupo: { rotulo: 'Sem grupo', classe: 'bg-preenchimento text-tinta-3' },
  conectado: { rotulo: 'Conectado', classe: 'bg-mata/15 text-mata' },
  dono_fora: { rotulo: 'Falta o dono no grupo', classe: 'bg-sol/25 text-insight-rotulo' },
  sem_acesso: { rotulo: 'Sem acesso ao grupo', classe: 'bg-telha-alerta/15 text-telha-alerta' },
  erro: { rotulo: 'Com erro', classe: 'bg-telha-alerta/15 text-telha-alerta' },
}

const ENVIO: Record<StatusEnvio, { rotulo: string; classe: string }> = {
  falhou: { rotulo: 'falhou', classe: 'text-telha-alerta' },
  enviado: { rotulo: 'enviado', classe: 'text-tinta-3' },
  entregue: { rotulo: 'entregue', classe: 'text-mata' },
  lido: { rotulo: 'lido', classe: 'text-mata' },
}

const TIPO: Record<Envio['tipo'], string> = { lembrete: 'Lembrete', teste: 'Teste', boas_vindas: 'Grupo conectado', aviso: 'Aviso' }

function quando(isoData: string): string {
  const d = new Date(isoData)
  const hoje = new Date()
  const ontem = new Date(Date.now() - 24 * 3600 * 1000)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === hoje.toDateString()) return `hoje ${hora}`
  if (d.toDateString() === ontem.toDateString()) return `ontem ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`
}

function Pill({ status }: { status: StatusGrupo }) {
  const s = STATUS[status]
  return <span className={cn('shrink-0 rounded-chip px-2 py-0.5 text-[11px] font-bold', s.classe)}>{s.rotulo}</span>
}

/**
 * Grupo de WhatsApp da loja e lembretes de rotina. O dono cria o grupo no
 * WhatsApp dele, adiciona o número do Tá no Caixa e manda o código que aparece
 * aqui. Dono e gestão configuram e testam; só o dono desconecta. Caixa e
 * cozinha não veem (o servidor recusa e a seção não aparece).
 */
export function LembretesWhatsapp() {
  const t = useTenant()
  const qc = useQueryClient()
  const { adicionarToast } = useUI()
  const chave = [t, 'lembretes-whatsapp']
  const [ultimoTeste, setUltimoTeste] = useState<{ ok: boolean; texto: string; em: number } | null>(null)

  // Enquanto espera o grupo (código ativo) ou a entrega do teste, recarrega a cada 5 s.
  const config = useQuery({
    queryKey: chave,
    queryFn: async () => (await buscar({ restauranteId: t })).data,
    retry: false,
    staleTime: 30_000,
    refetchInterval: (q) => {
      const d = q.state.data
      const esperandoGrupo = d && !d.temGrupo && d.codigo
      const esperandoEntrega = ultimoTeste?.ok && Date.now() - ultimoTeste.em < 90_000
      return esperandoGrupo || esperandoEntrega ? 5_000 : false
    },
  })
  const atualizar = (novo: Config) => qc.setQueryData(chave, novo)
  const falhou = (titulo: string) => (e: unknown) => adicionarToast({ tipo: 'erro', titulo, texto: erroDoServidor(e, 'Tente de novo em instantes.') })

  const ligar = useMutation({
    mutationFn: async (p: { id: string; ativo: boolean }) => (await salvar({ restauranteId: t, ...p })).data,
    onSuccess: atualizar,
    onError: falhou('Não deu pra salvar o lembrete'),
  })
  const codigo = useMutation({
    mutationFn: async () => (await gerarCodigo({ restauranteId: t })).data,
    onSuccess: atualizar,
    onError: falhou('Não deu pra gerar o código'),
  })
  const teste = useMutation({
    mutationFn: async () => (await testar({ restauranteId: t })).data,
    onSuccess: (r) => {
      atualizar(r.config)
      setUltimoTeste({ ok: r.resultado === 'enviada', texto: r.mensagem, em: Date.now() })
    },
    onError: (e) => setUltimoTeste({ ok: false, texto: erroDoServidor(e, 'O teste não foi enviado.'), em: Date.now() }),
  })
  const sair = useMutation({
    mutationFn: async () => (await desconectar({ restauranteId: t })).data,
    onSuccess: (novo) => {
      atualizar(novo)
      setConfirmarSaida(false)
      adicionarToast({ tipo: 'sucesso', titulo: 'Grupo desconectado', texto: 'Os lembretes pararam. Conecte outro grupo quando quiser.' })
    },
    onError: falhou('Não deu pra desconectar'),
  })
  const [grupoManual, setGrupoManual] = useState('')
  const manual = useMutation({
    mutationFn: async () => (await trocarGrupo({ restauranteId: t, grupoId: grupoManual.trim() })).data,
    onSuccess: (novo) => {
      atualizar(novo)
      setGrupoManual('')
      adicionarToast({ tipo: 'sucesso', titulo: 'Grupo salvo', texto: 'Os próximos lembretes vão para este grupo.' })
    },
    onError: falhou('Não deu pra salvar o grupo'),
  })
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const [trocando, setTrocando] = useState(false)

  // Grupo conectado pelo código: avisa uma vez e fecha o passo a passo.
  const [tinhaGrupo, setTinhaGrupo] = useState<boolean | null>(null)
  useEffect(() => {
    const tem = config.data?.temGrupo
    if (tem === undefined) return
    if (tinhaGrupo === false && tem) {
      setTrocando(false)
      adicionarToast({ tipo: 'sucesso', titulo: 'Grupo conectado', texto: 'Mandamos uma mensagem de boas-vindas no grupo.' })
    }
    setTinhaGrupo(tem)
  }, [config.data?.temGrupo]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = config.data
  if (!c) return null
  const grupos = [...new Set(c.lembretes.map((l) => l.grupo))]
  const mostrarPasso = !c.temGrupo || trocando

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto)
      adicionarToast({ tipo: 'sucesso', titulo: 'Copiado', texto })
    } catch {
      /* o texto continua visível para copiar à mão */
    }
  }

  return (
    <Secao
      id="whatsapp"
      titulo="Lembretes no WhatsApp"
      descricao="Um grupo de WhatsApp só desta loja, com o dono dentro. No máximo um lembrete por dia, sempre com o link da tela certa."
      resumo={<Pill status={c.status} />}
    >
      {/* Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Pill status={c.status} />
          {c.temGrupo && c.pessoas ? <span className="text-xs text-tinta-4">{c.pessoas} pessoas no grupo</span> : null}
        </div>
        {c.temGrupo && !trocando && (
          <div className="flex flex-wrap gap-2">
            <Button variante="fantasma" onClick={() => setTrocando(true)}>
              Trocar grupo
            </Button>
            {c.podeDesconectar && (
              <Button variante="fantasma" onClick={() => setConfirmarSaida((v) => !v)}>
                Desconectar
              </Button>
            )}
          </div>
        )}
      </div>
      {c.temGrupo && c.status !== 'conectado' && (
        <p className="mt-2 rounded-campo bg-insight-fundo p-3 text-sm text-insight-texto">
          {c.status === 'dono_fora' && `Os lembretes estão pausados: o número do dono (${c.celularDono ?? 'cadastrado no perfil'}) não está no grupo. Adicione o dono e mande um teste.`}
          {c.status === 'sem_acesso' && 'Os lembretes estão pausados: o número do Tá no Caixa saiu do grupo, ou o grupo foi apagado. Adicione o número de novo ou conecte outro grupo.'}
          {c.status === 'erro' && `Os últimos envios falharam${c.statusMotivo ? ` (${c.statusMotivo})` : ''}. Mande um teste para conferir.`}
        </p>
      )}
      {confirmarSaida && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-campo bg-preenchimento/60 p-3 text-sm text-tinta-2">
          <span className="flex-1">Desconectar o grupo? Os lembretes param até você conectar outro.</span>
          <Button variante="secundario" onClick={() => setConfirmarSaida(false)}>
            Cancelar
          </Button>
          <Button variante="lancar" disabled={sair.isPending} onClick={() => sair.mutate()}>
            {sair.isPending ? 'Desconectando…' : 'Desconectar'}
          </Button>
        </div>
      )}

      {/* Passo a passo para conectar (ou trocar) o grupo */}
      {mostrarPasso && (
        <div className="mt-3 flex flex-col gap-3 rounded-campo bg-preenchimento/40 p-3.5">
          <div>
            <div className="text-sm font-bold text-tinta">1. Crie um grupo no seu WhatsApp e adicione o Tá no Caixa</div>
            {c.numeroTaNoCaixa ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[15px] font-bold text-tinta select-all">{c.numeroTaNoCaixa}</span>
                <Button variante="fantasma" onClick={() => copiar(c.numeroTaNoCaixa)}>
                  Copiar número
                </Button>
              </div>
            ) : (
              <div className="mt-1 text-xs text-tinta-4">O número do Tá no Caixa ainda não foi configurado. Fale com a gente.</div>
            )}
            <div className="mt-1 text-xs text-tinta-4">
              Salve o número como "Tá no Caixa" antes de adicionar. O seu número
              {c.celularDono ? ` (${c.celularDono})` : ''} precisa estar no grupo.
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-tinta">2. Mande este código no grupo</div>
            {c.codigo ? (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-2xl font-bold tracking-wider text-tinta select-all">{c.codigo.codigo}</span>
                <Button variante="fantasma" onClick={() => copiar(c.codigo!.codigo)}>
                  Copiar código
                </Button>
                <span className="text-xs text-tinta-4">
                  vale até {new Date(c.codigo.expiraEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · esperando o grupo…
                </span>
              </div>
            ) : (
              <Button className="mt-1" disabled={codigo.isPending || !c.numeroTaNoCaixa} onClick={() => codigo.mutate()}>
                {codigo.isPending ? 'Gerando…' : 'Gerar código'}
              </Button>
            )}
            {c.codigo && (
              <button type="button" className="mt-1 text-xs font-bold text-mar underline-offset-2 hover:underline" onClick={() => codigo.mutate()}>
                Gerar outro código
              </button>
            )}
            {!c.temGrupo && c.statusMotivo && <div className="mt-1 text-xs text-telha-alerta">Último código recusado: {c.statusMotivo}.</div>}
          </div>
          <div className="text-xs text-tinta-4">
            Assim que o código chega, o grupo aparece aqui como conectado e o Tá no Caixa manda uma mensagem de boas-vindas.
          </div>
          {trocando && (
            <Button variante="secundario" className="self-start" onClick={() => setTrocando(false)}>
              Manter o grupo atual
            </Button>
          )}
          <details className="text-xs text-tinta-4">
            <summary className="cursor-pointer font-bold">Tenho o ID do grupo</summary>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Campo
                  rotulo="ID do grupo (termina em @g.us)"
                  name="grupo-whatsapp"
                  value={grupoManual}
                  onChange={(e) => setGrupoManual(e.target.value)}
                  placeholder="120363012345678901@g.us"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <Button variante="secundario" disabled={!grupoManual.trim() || manual.isPending} onClick={() => manual.mutate()}>
                {manual.isPending ? 'Salvando…' : 'Salvar grupo'}
              </Button>
            </div>
          </details>
        </div>
      )}

      {/* Teste e histórico */}
      {c.temGrupo && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={teste.isPending} onClick={() => teste.mutate()}>
              {teste.isPending ? 'Enviando…' : 'Mandar mensagem de teste'}
            </Button>
            {ultimoTeste && <span className={cn('text-sm', ultimoTeste.ok ? 'text-mata' : 'text-telha-alerta')}>{ultimoTeste.texto}</span>}
          </div>
          {c.envios.length > 0 && (
            <div className="mt-1">
              <div className="rotulo mb-1 text-tinta-4">Últimos envios</div>
              <ul className="flex flex-col">
                {c.envios.slice(0, 10).map((e, i) => (
                  <li key={e.id} className={cn('flex flex-wrap items-baseline justify-between gap-x-3 py-1.5 text-sm', i > 0 && 'border-t border-divisoria')}>
                    <span className="min-w-0 text-tinta">
                      {e.titulo ?? TIPO[e.tipo]}
                      {e.tipo === 'teste' && e.porNome ? <span className="text-tinta-4"> · {e.porNome}</span> : null}
                    </span>
                    <span className="font-mono text-xs text-tinta-4">
                      {quando(e.criadoEm)} · <span className={ENVIO[e.status].classe}>{ENVIO[e.status].rotulo}</span>
                      {e.status === 'falhou' && e.erro ? <span className="block max-w-[28ch] truncate text-telha-alerta sm:inline sm:max-w-none"> ({e.erro})</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Quais lembretes */}
      {c.temGrupo &&
        grupos.map((g) => (
          <div key={g} className="mt-4">
            <div className="rotulo mb-1 text-tinta-4">{g}</div>
            <ul className="flex flex-col">
              {c.lembretes
                .filter((l) => l.grupo === g)
                .map((l, i) => (
                  <li key={l.id} className={i > 0 ? 'flex items-center gap-3 border-t border-divisoria py-3' : 'flex items-center gap-3 py-3'}>
                    <div className={l.disponivel ? 'min-w-0 flex-1' : 'min-w-0 flex-1 opacity-70'}>
                      <div className="text-sm font-bold text-tinta">{l.titulo}</div>
                      <div className="text-xs text-tinta-4">{l.quando}</div>
                    </div>
                    {l.disponivel ? (
                      <Switch ligado={l.ativo} rotulo={`Lembrete: ${l.titulo}`} aoTrocar={(ativo) => ligar.mutate({ id: l.id, ativo })} />
                    ) : (
                      <SeloEmBreve />
                    )}
                  </li>
                ))}
            </ul>
          </div>
        ))}
    </Secao>
  )
}
