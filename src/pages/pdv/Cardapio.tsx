import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Cartao } from '@/components/ui/Cartao'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { PratoEditor } from '@/components/pdv/PratoEditor'
import { useUI } from '@/ui/UIProvider'
import { brl, pct } from '@/lib/format'
import { cn } from '@/lib/cn'
import { mensagemDeErro } from '@/lib/erros'
import { useAtivarPrato, useProdutos, usePratos, useRemoverPrato, useRestaurante } from '@/data/hooks'
import { tetosNormalizados } from '@/data/planoContas'
import { CATEGORIAS_SUGERIDAS, cmvDoPrato, custoDoPrato, situacaoDoCmv, type SituacaoCmv } from '@/data/cardapio'
import type { PratoDoc } from '@/data/types'

type Filtro = 'todos' | 'ativos' | 'inativos' | 'sem_ficha'

const ESTILO_CMV: Record<SituacaoCmv, string> = {
  ok: 'bg-mata/12 text-mata',
  atencao: 'bg-sol/25 text-insight-rotulo',
  alto: 'bg-telha-alerta/12 text-telha-alerta',
  sem_ficha: 'bg-preenchimento text-tinta-3',
}

export function Cardapio() {
  const { confirmar, adicionarToast } = useUI()
  const produtosQ = useProdutos()
  const produtos = useMemo(() => produtosQ.data ?? [], [produtosQ.data])
  const pratosQ = usePratos()
  const pratos = useMemo(() => pratosQ.data ?? [], [pratosQ.data])
  const cfg = useRestaurante().data
  const remover = useRemoverPrato()
  const ativar = useAtivarPrato()
  const metaCmv = tetosNormalizados(cfg?.tetos as Record<string, number> | undefined).cmv ?? 30

  const [editor, setEditor] = useState<{ prato?: PratoDoc; copia?: boolean } | null>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [categoria, setCategoria] = useState('todas')
  const [fechadas, setFechadas] = useState<Set<string>>(new Set())

  /** Cada prato com o custo já calculado — a tela inteira lê daqui. */
  const linhas = useMemo(
    () =>
      pratos.map((p) => {
        const c = custoDoPrato(p, produtos, pratos)
        const cmv = cmvDoPrato(c.custo, p.preco)
        return { prato: p, ...c, cmv, situacao: c.semFicha ? ('sem_ficha' as const) : situacaoDoCmv(cmv, metaCmv) }
      }),
    [pratos, produtos, metaCmv],
  )

  const categorias = useMemo(() => {
    const usadas = [...new Set(pratos.map((p) => p.categoria))]
    const ordem = (c: string) => {
      const i = CATEGORIAS_SUGERIDAS.indexOf(c)
      return i === -1 ? 99 : i
    }
    return usadas.sort((a, b) => ordem(a) - ordem(b) || a.localeCompare(b, 'pt-BR'))
  }, [pratos])

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase()
    return linhas
      .filter((l) => (categoria === 'todas' ? true : l.prato.categoria === categoria))
      .filter((l) => (filtro === 'ativos' ? l.prato.ativo : filtro === 'inativos' ? !l.prato.ativo : filtro === 'sem_ficha' ? l.semFicha : true))
      .filter((l) => (b ? `${l.prato.nome} ${l.prato.codigo ?? ''}`.toLowerCase().includes(b) : true))
  }, [linhas, busca, filtro, categoria])

  const porCategoria = useMemo(
    () => categorias.map((c) => ({ categoria: c, itens: visiveis.filter((l) => l.prato.categoria === c).sort((a, b) => a.prato.nome.localeCompare(b.prato.nome, 'pt-BR')) })).filter((g) => g.itens.length),
    [categorias, visiveis],
  )

  const comFicha = linhas.filter((l) => !l.semFicha && l.cmv !== null)
  const cmvMedio = comFicha.length ? comFicha.reduce((s, l) => s + (l.cmv ?? 0), 0) / comFicha.length : null
  const semFicha = linhas.filter((l) => l.semFicha).length
  const acimaDaMeta = linhas.filter((l) => l.situacao === 'alto' || l.situacao === 'atencao').length

  function pedirExclusao(p: PratoDoc) {
    confirmar({
      gravidade: 'destrutivo',
      titulo: `Excluir ${p.nome}?`,
      texto: 'O prato sai do cardápio e da ficha técnica. Combos que usam esse prato ficam com um item a menos.',
      resumo: [
        { rot: 'Prato', val: p.nome },
        { rot: 'Categoria', val: p.categoria },
        { rot: 'Preço', val: brl(p.preco) },
      ],
      rotuloCancelar: 'Manter prato',
      rotuloConfirmar: 'Excluir prato',
      onConfirmar: async () => {
        try {
          await remover.mutateAsync(p)
          adicionarToast({ tipo: 'sucesso', titulo: 'Prato excluído', texto: p.nome })
        } catch (e) {
          adicionarToast({ tipo: 'erro', titulo: 'Não deu pra excluir', texto: mensagemDeErro(e, 'O prato continua no cardápio.') })
        }
      },
    })
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
        <Mini rotulo="Itens no cardápio" valor={String(pratos.length)} apoio={`${pratos.filter((p) => p.ativo).length} ativos`} />
        <Mini rotulo="CMV médio" valor={cmvMedio === null ? '—' : pct(cmvMedio)} apoio={`meta ${pct(metaCmv, 0)}`} tom={cmvMedio !== null && cmvMedio > metaCmv ? 'alerta' : undefined} />
        <Mini rotulo="Acima da meta" valor={String(acimaDaMeta)} apoio="CMV alto pro preço" tom={acimaDaMeta ? 'alerta' : undefined} />
        <Mini rotulo="Sem ficha técnica" valor={String(semFicha)} apoio={semFicha ? 'não baixam estoque' : 'tudo com ficha'} tom={semFicha ? 'alerta' : undefined} />
      </div>

      <div className="flex flex-col gap-3 cel:flex-row cel:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5">
          <Search size={16} className="text-tinta-4" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou código…" className="w-full bg-transparent text-sm text-tinta outline-none placeholder:text-tinta-5" />
        </div>
        <Button variante="lancar" onClick={() => setEditor({})}>
          <Plus size={16} strokeWidth={2.5} /> Novo prato
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip rotulo="Todos" selecionado={filtro === 'todos'} aoClicar={() => setFiltro('todos')} />
        <Chip rotulo="Ativos" selecionado={filtro === 'ativos'} aoClicar={() => setFiltro('ativos')} />
        <Chip rotulo="Desativados" selecionado={filtro === 'inativos'} aoClicar={() => setFiltro('inativos')} />
        <Chip rotulo="Sem ficha técnica" selecionado={filtro === 'sem_ficha'} aoClicar={() => setFiltro('sem_ficha')} />
      </div>
      {categorias.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Chip rotulo="Todas as categorias" selecionado={categoria === 'todas'} aoClicar={() => setCategoria('todas')} />
          {categorias.map((c) => <Chip key={c} rotulo={c} selecionado={categoria === c} aoClicar={() => setCategoria(c)} />)}
        </div>
      )}

      {pratos.length === 0 ? (
        <Cartao className="flex flex-col items-center gap-3 py-12 text-center">
          <h2 className="text-[17px] font-bold text-tinta">Seu cardápio começa aqui</h2>
          <p className="max-w-md text-sm text-tinta-3">
            Cadastre cada prato com o preço e as matérias-primas que ele leva. Com a ficha técnica, o app calcula o custo e o CMV de cada item — e, quando o PDV começar a vender, baixa o estoque sozinho.
          </p>
          <Button variante="lancar" onClick={() => setEditor({})}><Plus size={16} strokeWidth={2.5} /> Cadastrar o primeiro prato</Button>
        </Cartao>
      ) : porCategoria.length === 0 ? (
        <Cartao className="py-10 text-center text-sm text-tinta-4">Nenhum item com esse filtro.</Cartao>
      ) : (
        porCategoria.map((g) => {
          const fechada = fechadas.has(g.categoria)
          return (
            <Cartao key={g.categoria} className="overflow-hidden p-0">
              <button
                onClick={() => setFechadas((s) => { const n = new Set(s); if (n.has(g.categoria)) n.delete(g.categoria); else n.add(g.categoria); return n })}
                className="flex w-full items-center gap-2 px-5 py-3.5 text-left hover:bg-preenchimento/30"
              >
                {fechada ? <ChevronRight size={16} className="text-tinta-4" /> : <ChevronDown size={16} className="text-tinta-4" />}
                <span className="text-[15px] font-bold text-tinta">{g.categoria}</span>
                <span className="text-xs text-tinta-4">{g.itens.length} {g.itens.length === 1 ? 'item' : 'itens'}</span>
              </button>
              {!fechada && (
                <ul className="border-t border-divisoria">
                  {g.itens.map((l) => (
                    <li key={l.prato.id} className={cn('flex flex-col gap-3 border-b border-divisoria px-5 py-3.5 last:border-0 tab:flex-row tab:items-center', !l.prato.ativo && 'opacity-60')}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-tinta">{l.prato.nome}</span>
                          {l.prato.codigo && <span className="mono rounded-chip bg-preenchimento px-2 py-0.5 text-[11px] font-semibold text-tinta-3">{l.prato.codigo}</span>}
                          {l.prato.tipo === 'combo' && <span className="rounded-chip bg-mar/10 px-2 py-0.5 text-[11px] font-bold text-mar">combo</span>}
                        </div>
                        <div className="mt-0.5 text-xs text-tinta-4">
                          {l.prato.tipo === 'combo' ? `${l.prato.componentes?.length ?? 0} pratos` : `${l.prato.ficha.length} ${l.prato.ficha.length === 1 ? 'matéria-prima' : 'matérias-primas'}`}
                          {' · '}{[l.prato.canais.presencial && 'presencial', l.prato.canais.delivery && 'delivery'].filter(Boolean).join(' + ')}
                          {l.orfaos > 0 && <span className="font-semibold text-telha-alerta"> · {l.orfaos} item excluído do cadastro</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <div className="mono font-bold text-tinta">{brl(l.prato.preco)}</div>
                          <div className="mono text-[11px] text-tinta-4">custo {l.semFicha ? '—' : brl(l.custo)}</div>
                        </div>
                        <span className={cn('w-20 rounded-chip px-2 py-1 text-center text-xs font-bold', ESTILO_CMV[l.situacao])}>
                          {l.situacao === 'sem_ficha' ? (l.semFicha ? 'sem ficha' : '—') : `CMV ${pct(l.cmv ?? 0, 0)}`}
                        </span>
                        <Switch
                          ligado={l.prato.ativo}
                          rotulo={`${l.prato.ativo ? 'Desativar' : 'Ativar'} ${l.prato.nome}`}
                          aoTrocar={(v) => ativar.mutate({ id: l.prato.id, ativo: v })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Acao icone={<Pencil size={13} />} rotulo="Editar" aoClicar={() => setEditor({ prato: l.prato })} />
                        <Acao icone={<Copy size={13} />} rotulo="Duplicar" aoClicar={() => setEditor({ prato: l.prato, copia: true })} />
                        <Acao icone={<Trash2 size={13} />} rotulo="Excluir" perigo aoClicar={() => pedirExclusao(l.prato)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          )
        })
      )}

      {editor && (
        <PratoEditor
          key={`${editor.prato?.id ?? 'novo'}-${editor.copia ? 'copia' : 'edicao'}`}
          prato={editor.prato}
          copia={editor.copia}
          produtos={produtos}
          pratos={pratos}
          categorias={categorias}
          metaCmv={metaCmv}
          aoFechar={() => setEditor(null)}
        />
      )}
    </>
  )
}

function Acao({ icone, rotulo, aoClicar, perigo }: { icone: React.ReactNode; rotulo: string; aoClicar: () => void; perigo?: boolean }) {
  return (
    <button
      onClick={aoClicar}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-botao border bg-superficie px-3 py-1.5 text-xs font-bold transition',
        perigo ? 'border-telha-alerta/30 text-telha-alerta hover:bg-telha-alerta/8' : 'border-[rgba(46,95,115,0.18)] text-tinta-2 hover:border-mar/50',
      )}
    >
      {icone} {rotulo}
    </button>
  )
}

function Mini({ rotulo, valor, apoio, tom }: { rotulo: string; valor: string; apoio: string; tom?: 'alerta' }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span className={cn('mono', tom === 'alerta' ? 'text-telha-alerta' : 'text-tinta')} style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{valor}</span>
      <span className="text-xs text-tinta-4">{apoio}</span>
    </Cartao>
  )
}
