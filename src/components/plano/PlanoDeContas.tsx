import { useMemo, useState } from 'react'
import { ArchiveRestore, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Campo } from '@/components/ui/Campo'
import { useUI } from '@/ui/UIProvider'
import { useAuth } from '@/auth/AuthContext'
import { useDespesas, usePlanoContas, useRemoverConta, useReativarConta, useSalvarConta } from '@/data/hooks'
import {
  CONTA,
  CONTAS,
  GRUPO,
  GRUPOS,
  contasDoGrupo,
  novaContaId,
  type ContaInfo,
  type GrupoDRE,
} from '@/data/planoContas'
import { brl } from '@/lib/format'
import { mensagemDeErro } from '@/lib/erros'
import { cn } from '@/lib/cn'

interface Form {
  nome: string
  grupo: GrupoDRE
  ajuda: string
}

const VAZIO: Form = { nome: '', grupo: 'ocupacao', ajuda: '' }

/**
 * Plano de contas da loja — criar, renomear, mover de linha do DRE e tirar de
 * circulação as contas em que se lança despesa.
 *
 * O modelo padrão é a base e não some: conta do modelo é ARQUIVADA (sai das
 * listas de lançamento, o histórico continua somando no DRE); conta criada
 * pela loja é apagada mesmo. Nos dois casos, se ainda existe lançamento nela,
 * é obrigatório dizer para qual conta esses lançamentos vão — senão o valor
 * sumiria do DRE junto com a conta.
 */
export function PlanoDeContas() {
  const { confirmar, adicionarToast } = useUI()
  const { permissoes } = useAuth()
  // Assina o plano: quando ele muda, esta tela redesenha com as contas novas.
  usePlanoContas()
  const despesas = useDespesas()
  const salvarConta = useSalvarConta()
  const removerConta = useRemoverConta()
  const reativarConta = useReativarConta()

  /** Id em edição, ou 'nova' quando é uma conta sendo criada. */
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(VAZIO)
  /** Conta que está prestes a sair: aqui se escolhe o destino dos lançamentos. */
  const [saindo, setSaindo] = useState<{ conta: ContaInfo; destino: string } | null>(null)
  const [verArquivadas, setVerArquivadas] = useState(false)

  /** Quanto já foi lançado em cada conta — é o que decide se pode apagar. */
  const uso = useMemo(() => {
    const mapa = new Map<string, { qtd: number; total: number }>()
    for (const d of despesas.data ?? []) {
      const atual = mapa.get(d.categoria) ?? { qtd: 0, total: 0 }
      mapa.set(d.categoria, { qtd: atual.qtd + 1, total: atual.total + d.valorTotal })
    }
    return mapa
  }, [despesas.data])

  const podeMexer = permissoes?.veAjustes && permissoes?.lancaDespesa

  function abrirNova(grupo: GrupoDRE) {
    setSaindo(null)
    setForm({ ...VAZIO, grupo })
    setEditando('nova')
  }

  function abrirEdicao(c: ContaInfo) {
    setSaindo(null)
    setForm({ nome: c.nome, grupo: c.grupo, ajuda: c.ajuda ?? '' })
    setEditando(c.id)
  }

  function fecharForm() {
    setEditando(null)
    setForm(VAZIO)
  }

  function avisarErro(e: unknown, padrao: string) {
    console.error('plano de contas:', e)
    adicionarToast({ tipo: 'erro', titulo: 'Não deu pra fazer isso', texto: mensagemDeErro(e, padrao) })
  }

  /** Salvar sempre passa pelo modal: a conta muda o DRE de todo mundo. */
  function pedirSalvar() {
    const nome = form.nome.trim()
    if (!nome) {
      adicionarToast({ tipo: 'atencao', titulo: 'Falta o nome', texto: 'A conta precisa de um nome pra aparecer no DRE.' })
      return
    }
    const nova = editando === 'nova'
    const atual = nova ? null : CONTA[editando!]
    const mudouGrupo = !!atual && atual.grupo !== form.grupo
    const usoAtual = atual ? uso.get(atual.id) : undefined

    const resumo = [
      { rot: 'Nome', val: atual && atual.nome !== nome ? `${atual.nome} → ${nome}` : nome },
      {
        rot: 'Linha do DRE',
        val: mudouGrupo ? `${GRUPO[atual!.grupo].nome} → ${GRUPO[form.grupo].nome}` : GRUPO[form.grupo].nome,
      },
      ...(usoAtual ? [{ rot: 'Lançamentos nesta conta', val: `${usoAtual.qtd} · ${brl(usoAtual.total)}` }] : []),
    ]

    confirmar({
      gravidade: mudouGrupo ? 'atencao' : 'neutro',
      titulo: nova ? 'Criar esta conta?' : 'Salvar a conta?',
      texto: nova
        ? 'Ela passa a aparecer na hora de lançar despesa e vira uma linha da sua DRE, dentro do grupo escolhido.'
        : mudouGrupo
          ? 'Mudar o grupo move TODOS os lançamentos desta conta para outra linha da DRE — os totais das duas linhas mudam a partir de agora, inclusive nos meses fechados.'
          : 'O nome novo aparece em todo lugar onde essa conta é mostrada: lançamentos, filtros, DRE e exportações.',
      resumo,
      rotuloConfirmar: nova ? 'Criar conta' : 'Salvar',
      onConfirmar: () => {
        void (async () => {
          try {
            await salvarConta.mutateAsync({
              id: nova ? novaContaId() : editando!,
              nome,
              grupo: form.grupo,
              ajuda: form.ajuda.trim() || undefined,
              ...(nova ? { propria: true } : {}),
            })
            adicionarToast({
              tipo: 'sucesso',
              titulo: nova ? 'Conta criada' : 'Conta salva',
              texto: `${nome} está em ${GRUPO[form.grupo].simples}.`,
            })
            fecharForm()
          } catch (e) {
            avisarErro(e, 'A conta não entrou no banco. Tente de novo.')
          }
        })()
      },
    })
  }

  /**
   * Primeiro se resolve o destino dos lançamentos; o modal vem depois.
   *
   * Conta própria some de vez, então lançamento nela PRECISA de destino. Conta
   * do modelo só é arquivada — o histórico fica onde está, e mover é escolha.
   */
  function comecarSaida(c: ContaInfo) {
    fecharForm()
    const temUso = (uso.get(c.id)?.qtd ?? 0) > 0
    const padrao = CONTAS.find((x) => x.grupo === c.grupo && x.id !== c.id && !x.arquivada)
    setSaindo({ conta: c, destino: temUso && c.propria ? (padrao?.id ?? '') : '' })
  }

  function pedirSaida() {
    if (!saindo) return
    const { conta, destino } = saindo
    const usoAtual = uso.get(conta.id)
    if (usoAtual?.qtd && !destino && conta.propria) {
      adicionarToast({
        tipo: 'atencao',
        titulo: 'Falta dizer pra onde vai',
        texto: `Esta conta tem ${usoAtual.qtd} lançamentos. Escolha a conta que vai recebê-los.`,
      })
      return
    }
    confirmar({
      gravidade: 'destrutivo',
      titulo: conta.propria ? 'Apagar esta conta?' : 'Tirar esta conta de uso?',
      texto: conta.propria
        ? 'A conta some do plano e das listas de lançamento. Ela é sua, então não volta sozinha — dá pra criar de novo depois.'
        : 'Ela sai das listas de lançamento, mas continua no plano padrão: o que já foi lançado nela segue somando no DRE, e dá pra reativar quando quiser.',
      resumo: [
        { rot: 'Conta', val: conta.nome },
        { rot: 'Linha do DRE', val: GRUPO[conta.grupo].nome },
        { rot: 'Lançamentos', val: usoAtual ? `${usoAtual.qtd} · ${brl(usoAtual.total)}` : 'nenhum' },
        ...(usoAtual?.qtd
          ? [{ rot: 'Lançamentos vão para', val: destino ? (CONTA[destino]?.nome ?? '—') : 'ficam nesta conta' }]
          : []),
      ],
      rotuloConfirmar: conta.propria ? 'Apagar' : 'Tirar de uso',
      onConfirmar: () => {
        void (async () => {
          try {
            const r = await removerConta.mutateAsync({ id: conta.id, destino: destino || undefined })
            adicionarToast({
              tipo: 'sucesso',
              titulo: conta.propria ? 'Conta apagada' : 'Conta fora de uso',
              texto: r.movidos
                ? `${r.movidos} ${r.movidos === 1 ? 'lançamento foi' : 'lançamentos foram'} para ${CONTA[destino]?.nome}.`
                : `${conta.nome} não aparece mais na hora de lançar.`,
            })
            setSaindo(null)
          } catch (e) {
            avisarErro(e, 'A conta continua no plano. Tente de novo.')
          }
        })()
      },
    })
  }

  function pedirReativar(c: ContaInfo) {
    confirmar({
      gravidade: 'neutro',
      titulo: 'Voltar a usar esta conta?',
      texto: 'Ela reaparece na hora de lançar despesa, na linha do DRE dela.',
      resumo: [
        { rot: 'Conta', val: c.nome },
        { rot: 'Linha do DRE', val: GRUPO[c.grupo].nome },
      ],
      rotuloConfirmar: 'Voltar a usar',
      onConfirmar: () => {
        void (async () => {
          try {
            await reativarConta.mutateAsync(c.id)
            adicionarToast({ tipo: 'sucesso', titulo: 'Conta de volta', texto: `${c.nome} já dá pra usar de novo.` })
          } catch (e) {
            avisarErro(e, 'A conta continua arquivada. Tente de novo.')
          }
        })()
      },
    })
  }

  const arquivadas = CONTAS.filter((c) => c.arquivada)

  return (
    <Cartao className="flex flex-col">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-tinta">Plano de contas</h2>
          <p className="pretty mt-1 max-w-xl text-sm text-tinta-3">
            As contas em que você lança despesa. Cada uma é uma linha da sua DRE — renomeie no jeito que a sua
            operação fala, crie o que faltar e tire de uso o que não usa.
          </p>
        </div>
        {arquivadas.length > 0 && (
          <button
            onClick={() => setVerArquivadas((v) => !v)}
            className="shrink-0 text-sm font-bold text-mar underline underline-offset-2 hover:text-mar-escuro"
          >
            {verArquivadas ? 'Esconder fora de uso' : `Ver ${arquivadas.length} fora de uso`}
          </button>
        )}
      </div>

      {GRUPOS.map((g) => {
        const contas = contasDoGrupo(g.id).filter((c) => verArquivadas || !c.arquivada)
        return (
          <div key={g.id} className="border-t border-divisoria py-3 first:border-t-0">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-bold text-tinta">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.cor }} />
                {g.nome}
              </span>
              {podeMexer && (
                <button
                  onClick={() => abrirNova(g.id)}
                  className="flex items-center gap-1 text-xs font-bold text-mar hover:text-mar-escuro"
                >
                  <Plus size={14} /> Nova conta
                </button>
              )}
            </div>

            <div className="flex flex-col">
              {contas.map((c) => {
                const u = uso.get(c.id)
                const emEdicao = editando === c.id
                const emSaida = saindo?.conta.id === c.id
                return (
                  <div key={c.id} className="border-b border-divisoria last:border-0">
                    <div className="flex items-center gap-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cn('text-sm font-semibold', c.arquivada ? 'text-tinta-4 line-through' : 'text-tinta')}>
                            {c.nome}
                          </span>
                          {c.propria && <Etiqueta texto="sua" cor="#2F6B4A" />}
                          {c.arquivada && <Etiqueta texto="fora de uso" cor="#A8A29A" />}
                        </span>
                        <span className="block text-xs text-tinta-4">
                          {u ? `${u.qtd} ${u.qtd === 1 ? 'lançamento' : 'lançamentos'} · ${brl(u.total)}` : 'sem lançamento'}
                          {c.ajuda ? ` · ${c.ajuda}` : ''}
                        </span>
                      </span>
                      {podeMexer && (
                        <span className="flex shrink-0 items-center gap-1">
                          {c.arquivada ? (
                            <IconeBotao rotulo="Voltar a usar" aoClicar={() => pedirReativar(c)}>
                              <ArchiveRestore size={15} />
                            </IconeBotao>
                          ) : (
                            <>
                              <IconeBotao rotulo={`Corrigir ${c.nome}`} aoClicar={() => (emEdicao ? fecharForm() : abrirEdicao(c))}>
                                <Pencil size={15} />
                              </IconeBotao>
                              <IconeBotao rotulo={`Tirar ${c.nome} de uso`} perigo aoClicar={() => (emSaida ? setSaindo(null) : comecarSaida(c))}>
                                <Trash2 size={15} />
                              </IconeBotao>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {emEdicao && <Formulario form={form} setForm={setForm} aoSalvar={pedirSalvar} aoCancelar={fecharForm} />}

                    {emSaida && (
                      <div className="mb-3 flex flex-col gap-3 rounded-cartao bg-preenchimento/60 p-3.5">
                        {u?.qtd ? (
                          <label className="flex flex-col gap-1.5">
                            <span className="rotulo text-tinta-4">
                              {c.propria
                                ? `Para onde vão os ${u.qtd} ${u.qtd === 1 ? 'lançamento' : 'lançamentos'}`
                                : `Mover os ${u.qtd} ${u.qtd === 1 ? 'lançamento' : 'lançamentos'} · opcional`}
                            </span>
                            <select
                              value={saindo!.destino}
                              onChange={(e) => setSaindo({ ...saindo!, destino: e.target.value })}
                              className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5 text-[15px] text-tinta outline-none focus:border-mar"
                            >
                              <option value="">
                                {c.propria ? 'Escolha a conta…' : 'Deixar onde estão'}
                              </option>
                              {CONTAS.filter((x) => x.id !== c.id && !x.arquivada).map((x) => (
                                <option key={x.id} value={x.id}>
                                  {GRUPO[x.grupo].simples} · {x.nome}
                                </option>
                              ))}
                            </select>
                            <span className="text-xs text-tinta-4">
                              {c.propria
                                ? 'O valor não some do DRE — ele muda de linha, e cada lançamento fica marcado como corrigido.'
                                : 'Deixando onde estão, o histórico continua somando nesta conta no DRE; ela só some da hora de lançar.'}
                            </span>
                          </label>
                        ) : (
                          <p className="text-sm text-tinta-2">
                            Nada foi lançado nesta conta, então ela sai sem mexer em nenhum número.
                          </p>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <Button variante="fantasma" onClick={() => setSaindo(null)}>Cancelar</Button>
                          <Button variante="primario" onClick={pedirSaida}>Continuar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {editando === 'nova' && form.grupo === g.id && (
                <div className="border-t border-divisoria pt-3">
                  <Formulario form={form} setForm={setForm} aoSalvar={pedirSalvar} aoCancelar={fecharForm} nova />
                </div>
              )}

              {contas.length === 0 && editando !== 'nova' && (
                <p className="py-2 text-xs text-tinta-4">Nenhuma conta neste grupo.</p>
              )}
            </div>
          </div>
        )
      })}
    </Cartao>
  )
}

function Formulario({
  form,
  setForm,
  aoSalvar,
  aoCancelar,
  nova,
}: {
  form: Form
  setForm: (f: Form) => void
  aoSalvar: () => void
  aoCancelar: () => void
  nova?: boolean
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-cartao bg-preenchimento/60 p-3.5">
      <Campo
        rotulo={nova ? 'Nome da conta nova' : 'Nome da conta'}
        placeholder="Ex: Manutenção de equipamento"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
      />
      <div>
        <span className="rotulo mb-1.5 block text-tinta-4">Em que linha do DRE ela entra</span>
        <div className="flex flex-wrap gap-2">
          {GRUPOS.map((g) => (
            <Chip key={g.id} rotulo={g.simples} selecionado={form.grupo === g.id} aoClicar={() => setForm({ ...form, grupo: g.id })} />
          ))}
        </div>
      </div>
      <Campo
        rotulo="Dica na hora de lançar · opcional"
        placeholder="Ex: conserto de forno, geladeira, exaustor"
        value={form.ajuda}
        onChange={(e) => setForm({ ...form, ajuda: e.target.value })}
      />
      <div className="flex items-center justify-end gap-2">
        <Button variante="fantasma" onClick={aoCancelar}>
          <X size={15} /> Cancelar
        </Button>
        <Button variante="primario" onClick={aoSalvar}>
          <Check size={15} /> {nova ? 'Criar conta' : 'Salvar'}
        </Button>
      </div>
    </div>
  )
}

function Etiqueta({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span className="rounded-chip px-2 py-0.5 text-[11px] font-bold" style={{ background: `${cor}1f`, color: cor }}>
      {texto}
    </span>
  )
}

function IconeBotao({
  children,
  rotulo,
  aoClicar,
  perigo,
}: {
  children: React.ReactNode
  rotulo: string
  aoClicar: () => void
  perigo?: boolean
}) {
  return (
    <button
      onClick={aoClicar}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-botao text-tinta-4 transition',
        perigo ? 'hover:bg-telha-alerta/10 hover:text-telha-alerta' : 'hover:bg-preenchimento hover:text-tinta',
      )}
    >
      {children}
    </button>
  )
}
