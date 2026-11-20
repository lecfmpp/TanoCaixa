import { useState, useSyncExternalStore } from 'react'
import { Switch } from '@/components/ui/Switch'
import { Campo } from '@/components/ui/Campo'
import { Button } from '@/components/ui/Button'
import { SeloEmBreve } from '@/components/ui/SeloEmBreve'
import { cn } from '@/lib/cn'
import { Secao, Secoes } from '@/components/ui/Acordeao'
import { Abas } from './Abas'
import { PreviaMensagem } from './PreviaMensagem'
import type { AcoesWhatsapp, ConfigWhatsapp, Envio, Lembrete, StatusEnvio, StatusGrupo } from './tipos'

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
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === new Date().toDateString()) return `hoje ${hora}`
  if (d.toDateString() === new Date(Date.now() - 864e5).toDateString()) return `ontem ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`
}

export function PillStatus({ status }: { status: StatusGrupo }) {
  const s = STATUS[status]
  return <span className={cn('shrink-0 rounded-chip px-2 py-0.5 text-[11px] font-bold', s.classe)}>{s.rotulo}</span>
}

/** Executa uma ação e guarda o erro (em português, vindo do servidor) para mostrar ao lado. */
function useAcao() {
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  async function rodar(f: () => Promise<void>) {
    setOcupado(true)
    setErro('')
    try {
      await f()
    } catch (e) {
      setErro(e instanceof Error && e.message && !/^internal$/i.test(e.message) ? e.message : 'Não deu certo. Tente de novo em instantes.')
    } finally {
      setOcupado(false)
    }
  }
  return { ocupado, erro, rodar }
}

/* ------------------------------ Grupo -------------------------------- */

function ConectarGrupo({ c, acoes, aoCancelar }: { c: ConfigWhatsapp; acoes: AcoesWhatsapp; aoCancelar?: () => void }) {
  const [link, setLink] = useState('')
  const porLink = useAcao()
  const porCodigo = useAcao()
  const [idManual, setIdManual] = useState('')
  const porId = useAcao()

  return (
    <div className="flex flex-col gap-4 rounded-campo bg-preenchimento/40 p-3.5">
      <div>
        <div className="text-sm font-bold text-tinta">1. Crie um grupo no seu WhatsApp e adicione o número do Tá no Caixa</div>
        {c.numeroTaNoCaixa ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[15px] font-bold text-tinta select-all">{c.numeroTaNoCaixa}</span>
            <Button variante="fantasma" onClick={() => acoes.copiar(c.numeroTaNoCaixa)}>
              Copiar número
            </Button>
          </div>
        ) : (
          <div className="mt-1 text-xs text-tinta-4">O número do Tá no Caixa ainda não foi configurado. Fale com a gente.</div>
        )}
        <div className="mt-1 text-xs text-tinta-4">
          Salve o número como "Tá no Caixa" antes de adicionar. O seu número{c.celularDono ? ` (${c.celularDono})` : ''} precisa estar no grupo. Pode
          chamar também quem é da gestão.
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-tinta">2. Cole aqui o link do grupo</div>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Campo
              rotulo="Link do grupo"
              name="link-grupo-whatsapp"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/…"
              autoComplete="off"
              spellCheck={false}
              inputMode="url"
            />
          </div>
          <Button disabled={!link.trim() || porLink.ocupado || !c.numeroTaNoCaixa} onClick={() => porLink.rodar(() => acoes.conectarPorLink(link.trim()))}>
            {porLink.ocupado ? 'Conectando…' : 'Conectar grupo'}
          </Button>
        </div>
        <div className="mt-1 text-xs text-tinta-4">No WhatsApp: abra o grupo, toque no nome dele, depois em "Convidar via link" e "Copiar link".</div>
        {porLink.erro && <div className="mt-1 text-xs font-bold text-telha-alerta">{porLink.erro}</div>}
      </div>

      <details className="text-xs text-tinta-3">
        <summary className="cursor-pointer font-bold">O link não funcionou? Conecte com um código</summary>
        <div className="mt-2 flex flex-col gap-1.5">
          <span>Mande este código no grupo. Assim que ele chegar, o grupo aparece aqui como conectado.</span>
          {c.codigo ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-2xl font-bold tracking-wider text-tinta select-all">{c.codigo.codigo}</span>
              <Button variante="fantasma" onClick={() => acoes.copiar(c.codigo!.codigo)}>
                Copiar código
              </Button>
              <span className="text-tinta-4">
                vale até {new Date(c.codigo.expiraEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · esperando o grupo…
              </span>
            </div>
          ) : null}
          <Button variante="secundario" className="self-start" disabled={porCodigo.ocupado || !c.numeroTaNoCaixa} onClick={() => porCodigo.rodar(acoes.gerarCodigo)}>
            {porCodigo.ocupado ? 'Gerando…' : c.codigo ? 'Gerar outro código' : 'Gerar código'}
          </Button>
          {porCodigo.erro && <div className="font-bold text-telha-alerta">{porCodigo.erro}</div>}
          {!c.temGrupo && c.statusMotivo && <div className="text-telha-alerta">Última tentativa recusada: {c.statusMotivo}</div>}

          <div className="mt-2 flex flex-col gap-2 border-t border-divisoria pt-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <Campo
                rotulo="Suporte: ID do grupo (termina em @g.us)"
                name="grupo-whatsapp"
                value={idManual}
                onChange={(e) => setIdManual(e.target.value)}
                placeholder="120363012345678901@g.us"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button variante="secundario" disabled={!idManual.trim() || porId.ocupado} onClick={() => porId.rodar(() => acoes.conectarPorId(idManual.trim()))}>
              {porId.ocupado ? 'Salvando…' : 'Salvar ID'}
            </Button>
          </div>
          {porId.erro && <div className="font-bold text-telha-alerta">{porId.erro}</div>}
        </div>
      </details>

      {aoCancelar && (
        <Button variante="secundario" className="self-start" onClick={aoCancelar}>
          Manter o grupo atual
        </Button>
      )}
    </div>
  )
}

function GrupoConectado({ c, acoes, aoTrocar }: { c: ConfigWhatsapp; acoes: AcoesWhatsapp; aoTrocar: () => void }) {
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  const saida = useAcao()
  const teste = useAcao()
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 rounded-campo bg-preenchimento/40 p-3.5">
        <div className="text-sm font-bold text-tinta">{c.grupoNome || 'Grupo da loja'}</div>
        <div className="text-xs text-tinta-4">
          {[c.pessoas ? `${c.pessoas} pessoas` : null, c.conectadoEm ? `conectado em ${new Date(c.conectadoEm).toLocaleDateString('pt-BR')}` : null]
            .filter(Boolean)
            .join(' · ')}
        </div>
        {c.grupoLink && (
          <a href={c.grupoLink} target="_blank" rel="noreferrer" className="self-start font-mono text-xs break-all text-mar underline-offset-2 hover:underline">
            {c.grupoLink}
          </a>
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          <Button variante="secundario" onClick={aoTrocar}>
            Trocar grupo
          </Button>
          {c.podeDesconectar && (
            <Button variante="fantasma" onClick={() => setConfirmarSaida((v) => !v)}>
              Desconectar
            </Button>
          )}
        </div>
      </div>

      {c.status !== 'conectado' && (
        <p className="rounded-campo bg-insight-fundo p-3 text-sm text-insight-texto">
          {c.status === 'dono_fora' && `Os lembretes estão pausados: o número do dono (${c.celularDono ?? 'cadastrado no perfil'}) não está no grupo. Adicione o dono e mande um teste.`}
          {c.status === 'sem_acesso' && 'Os lembretes estão pausados: o número do Tá no Caixa saiu do grupo, ou o grupo foi apagado. Adicione o número de novo ou troque de grupo.'}
          {c.status === 'erro' && `Os últimos envios falharam${c.statusMotivo ? ` (${c.statusMotivo})` : ''}. Mande um teste para conferir.`}
        </p>
      )}

      {confirmarSaida && (
        <div className="flex flex-wrap items-center gap-2 rounded-campo bg-preenchimento/60 p-3 text-sm text-tinta-2">
          <span className="min-w-0 flex-1">Desconectar o grupo? Os lembretes param até você conectar outro.</span>
          <Button variante="secundario" onClick={() => setConfirmarSaida(false)}>
            Cancelar
          </Button>
          <Button variante="lancar" disabled={saida.ocupado} onClick={() => saida.rodar(acoes.desconectar)}>
            {saida.ocupado ? 'Desconectando…' : 'Desconectar'}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={teste.ocupado} onClick={() => teste.rodar(async () => setResultado(await acoes.testar()))}>
          {teste.ocupado ? 'Enviando…' : 'Mandar mensagem de teste'}
        </Button>
        {(teste.erro || resultado) && (
          <span className={cn('min-w-0 text-sm', !teste.erro && resultado?.ok ? 'text-mata' : 'text-telha-alerta')}>{teste.erro || resultado?.texto}</span>
        )}
      </div>

    </div>
  )
}

function HistoricoEnvios({ envios }: { envios: Envio[] }) {
  if (!envios.length) return <p className="rounded-campo bg-preenchimento/50 p-3 text-sm text-tinta-3">Nenhum envio ainda. Os lembretes, testes e boas-vindas aparecem aqui, com a situação de cada um.</p>
  return (
    <ul className="flex flex-col">
      {envios.map((e, i) => (
        <li key={e.id} className={cn('flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm', i > 0 && 'border-t border-divisoria')}>
          <span className="min-w-0 text-tinta">
            {e.titulo ?? TIPO[e.tipo]}
            {e.tipo === 'teste' && e.porNome ? <span className="text-tinta-4"> · {e.porNome}</span> : null}
          </span>
          <span className="font-mono text-xs text-tinta-4">
            {quando(e.criadoEm)} · <span className={ENVIO[e.status].classe}>{ENVIO[e.status].rotulo}</span>
            {e.status === 'falhou' && e.erro ? <span className="text-telha-alerta"> ({e.erro})</span> : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Celular (< 700 px, o mesmo corte do painel): exemplos começam recolhidos para a lista não ficar enorme. */
const CELULAR = '(max-width: 699px)'
function useCelular(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = window.matchMedia(CELULAR)
      mq.addEventListener('change', avisar)
      return () => mq.removeEventListener('change', avisar)
    },
    () => window.matchMedia(CELULAR).matches,
    () => false,
  )
}

/* --------------------------- Notificações ----------------------------- */

function CartaoNotificacao({ l, temGrupo, aoTrocar }: { l: Lembrete; temGrupo: boolean; aoTrocar: (ativo: boolean) => void }) {
  const celular = useCelular()
  // null = automático (aberto no computador, recolhido no celular) até a pessoa tocar no botão.
  const [escolha, setEscolha] = useState<boolean | null>(null)
  const verExemplo = escolha ?? !celular
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-cartao border border-divisoria bg-superficie p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-tinta">{l.titulo}</span>
            {!l.disponivel && <SeloEmBreve />}
          </div>
          <div className="mt-0.5 text-xs text-tinta-4">
            {l.quando} · sai às {l.horario}
          </div>
        </div>
        {l.disponivel && (
          <Switch ligado={l.ativo && temGrupo} rotulo={`Enviar "${l.titulo}" no grupo`} aoTrocar={(v) => temGrupo && aoTrocar(v)} />
        )}
      </div>
      {l.exemplo && (
        <>
          <button
            type="button"
            className="self-start text-xs font-bold text-mar underline-offset-2 hover:underline"
            aria-expanded={verExemplo}
            onClick={() => setEscolha(!verExemplo)}
          >
            {verExemplo ? 'Esconder exemplo' : 'Ver exemplo da mensagem'}
          </button>
          {verExemplo && (
            <div className="flex flex-col gap-1.5">
              <PreviaMensagem legenda={l.exemplo.legenda} imagemUrl={l.exemplo.imagemUrl} hora={l.horario === '18h30' ? '18:30' : '09:00'} />
              <div className="text-[11px] text-tinta-4">
                O link abre <span className="font-mono break-all">{l.exemplo.link.replace(/^https:\/\//, '')}</span>. Os números são de exemplo: no grupo vão os da sua loja.
              </div>
            </div>
          )}
        </>
      )}
    </li>
  )
}

/* ------------------------------- Painel -------------------------------- */

/**
 * Tela de notificações no WhatsApp (só apresentação: recebe os dados e as ações).
 * Resumo do status sempre visível e três abas: Notificações (categorias em
 * acordeão, cada uma com o exemplo da mensagem e o botão de ligar), Grupo
 * (conectar pelo link, trocar, testar) e Envios (histórico).
 */
export function PainelWhatsapp({ c, acoes }: { c: ConfigWhatsapp; acoes: AcoesWhatsapp }) {
  const [trocando, setTrocando] = useState(false)
  const [aba, setAba] = useState<'notificacoes' | 'grupo' | 'envios'>(c.temGrupo ? 'notificacoes' : 'grupo')
  const categorias = [...new Set(c.lembretes.map((l) => l.grupo))]
  const disponiveis = c.lembretes.filter((l) => l.disponivel)
  const ligados = disponiveis.filter((l) => l.ativo).length
  const falhas = c.envios.filter((e) => e.status === 'falhou').length

  return (
    <div className="flex flex-col gap-4">
      {/* Resumo sempre visível, em qualquer aba */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <PillStatus status={c.status} />
        <span className="min-w-0 text-sm text-tinta-3">
          {c.temGrupo ? `${c.grupoNome || 'Grupo da loja'} · ${ligados} de ${disponiveis.length} notificações ligadas` : 'Conecte o grupo da loja para ligar as notificações.'}
        </span>
        {!c.temGrupo && aba !== 'grupo' && (
          <button type="button" className="text-sm font-bold text-mar underline-offset-2 hover:underline" onClick={() => setAba('grupo')}>
            Conectar agora
          </button>
        )}
      </div>

      <Abas
        rotulo="Notificações no WhatsApp"
        valor={aba}
        aoTrocar={setAba}
        abas={[
          { id: 'notificacoes', rotulo: 'Notificações', contador: `${ligados}/${disponiveis.length}` },
          { id: 'grupo', rotulo: 'Grupo' },
          { id: 'envios', rotulo: 'Envios', contador: falhas || undefined, alerta: falhas > 0 },
        ]}
      >
        {aba === 'grupo' &&
          (c.temGrupo && !trocando ? (
            <GrupoConectado c={c} acoes={acoes} aoTrocar={() => setTrocando(true)} />
          ) : (
            <ConectarGrupo
              c={c}
              acoes={{ ...acoes, conectarPorLink: async (l) => (await acoes.conectarPorLink(l), setTrocando(false)) }}
              aoCancelar={c.temGrupo ? () => setTrocando(false) : undefined}
            />
          ))}

        {aba === 'notificacoes' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-tinta-4">
              No máximo uma notificação por dia. Toque em cada categoria para ver as mensagens e ligar só o que ajuda você.
            </p>
            <Secoes>
              {categorias.map((g, i) => {
                const daCategoria = c.lembretes.filter((l) => l.grupo === g)
                const disp = daCategoria.filter((l) => l.disponivel)
                const lig = disp.filter((l) => l.ativo).length
                return (
                  <Secao
                    key={g}
                    titulo={g}
                    descricao={`${daCategoria.length} ${daCategoria.length === 1 ? 'notificação' : 'notificações'}`}
                    resumo={disp.length ? `${lig} de ${disp.length} ligadas` : 'em breve'}
                    abertaPorPadrao={i === 0}
                    className="bg-fundo-app/40"
                    corpoClassName="!px-3 !pb-3 sm:!px-4 sm:!pb-4"
                  >
                    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {daCategoria.map((l) => (
                        <CartaoNotificacao key={l.id} l={l} temGrupo={c.temGrupo} aoTrocar={(ativo) => acoes.ligar(l.id, ativo)} />
                      ))}
                    </ul>
                  </Secao>
                )
              })}
            </Secoes>
          </div>
        )}

        {aba === 'envios' && <HistoricoEnvios envios={c.envios} />}
      </Abas>
    </div>
  )
}
