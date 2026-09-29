import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Campo } from '@/components/ui/Campo'
import { Chip } from '@/components/ui/Chip'
import { Switch } from '@/components/ui/Switch'
import { SeletorProduto } from '@/components/ui/SeletorProduto'
import { brl, pct } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useSalvarPrato } from '@/data/hooks'
import { mensagemDeErro } from '@/lib/erros'
import { useUI } from '@/ui/UIProvider'
import {
  CATEGORIAS_SUGERIDAS,
  cmvDoPrato,
  custoDaLinha,
  custoDoPrato,
  precoParaMeta,
  situacaoDoCmv,
  unidadeDaFicha,
} from '@/data/cardapio'
import type { PratoDoc, ProdutoDoc } from '@/data/types'

/** '12,5' → 12.5 · vazio → 0 */
const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0)
const fmt = (v: number | undefined) => (v ? String(v).replace('.', ',') : '')

interface LinhaFicha { produtoId: string; quantidade: string; perda: string }
interface LinhaCombo { pratoId: string; quantidade: string }

interface Props {
  /** Prato em edição; ausente = cadastro novo. */
  prato?: PratoDoc
  /** Abre com os dados do prato, mas salva como um novo. */
  copia?: boolean
  produtos: ProdutoDoc[]
  pratos: PratoDoc[]
  categorias: string[]
  metaCmv: number
  aoFechar: () => void
}

export function PratoEditor({ prato, copia, produtos, pratos, categorias, metaCmv, aoFechar }: Props) {
  const { adicionarToast } = useUI()
  const salvar = useSalvarPrato()
  const editando = !!prato && !copia

  const [tipo, setTipo] = useState<'prato' | 'combo'>(prato?.tipo ?? 'prato')
  const [nome, setNome] = useState(prato ? (copia ? `${prato.nome} (cópia)` : prato.nome) : '')
  const [codigo, setCodigo] = useState(copia ? '' : (prato?.codigo ?? ''))
  const [categoria, setCategoria] = useState(prato?.categoria ?? '')
  const [novaCategoria, setNovaCategoria] = useState('')
  const [preco, setPreco] = useState(fmt(prato?.preco))
  const [descricao, setDescricao] = useState(prato?.descricao ?? '')
  const [ativo, setAtivo] = useState(prato?.ativo ?? true)
  const [presencial, setPresencial] = useState(prato?.canais.presencial ?? true)
  const [delivery, setDelivery] = useState(prato?.canais.delivery ?? true)
  const [ficha, setFicha] = useState<LinhaFicha[]>(
    prato?.ficha.map((i) => ({ produtoId: i.produtoId, quantidade: fmt(i.quantidade), perda: fmt(i.perdaPct) })) ?? [],
  )
  const [comps, setComps] = useState<LinhaCombo[]>(
    prato?.componentes?.map((c) => ({ pratoId: c.pratoId, quantidade: fmt(c.quantidade) })) ?? [],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [aoFechar])

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])
  const base = useMemo(() => pratos.filter((p) => p.tipo === 'prato' && p.id !== prato?.id), [pratos, prato])
  const categoriaFinal = (novaCategoria.trim() || categoria).trim()

  /** O prato como o formulário o descreve agora — alimenta o custo ao vivo e o salvar. */
  const rascunho = useMemo(
    () => ({
      tipo,
      preco: num(preco),
      ficha: ficha
        .filter((l) => l.produtoId && num(l.quantidade) > 0)
        .map((l) => ({ produtoId: l.produtoId, quantidade: num(l.quantidade), ...(num(l.perda) > 0 ? { perdaPct: num(l.perda) } : {}) })),
      componentes: comps
        .filter((c) => c.pratoId && num(c.quantidade) > 0)
        .map((c) => ({ pratoId: c.pratoId, quantidade: num(c.quantidade) })),
    }),
    [tipo, preco, ficha, comps],
  )
  const { custo, semFicha } = custoDoPrato({ ...(prato ?? ({} as PratoDoc)), ...rascunho } as PratoDoc, produtos, pratos)
  const cmv = cmvDoPrato(custo, rascunho.preco)
  const situacao = situacaoDoCmv(cmv, metaCmv)
  const margem = rascunho.preco - custo

  const codigoRepetido = !!codigo.trim() && pratos.some((p) => p.id !== prato?.id && p.codigo?.trim().toLowerCase() === codigo.trim().toLowerCase())
  const podeSalvar = nome.trim().length > 0 && num(preco) > 0 && categoriaFinal.length > 0 && (presencial || delivery)

  async function gravar() {
    try {
      await salvar.mutateAsync({
        existente: editando ? prato : undefined,
        dados: {
          nome: nome.trim(),
          ...(codigo.trim() ? { codigo: codigo.trim() } : {}),
          categoria: categoriaFinal,
          tipo,
          preco: rascunho.preco,
          ...(descricao.trim() ? { descricao: descricao.trim() } : {}),
          ativo,
          canais: { presencial, delivery },
          ficha: tipo === 'prato' ? rascunho.ficha : [],
          ...(tipo === 'combo' ? { componentes: rascunho.componentes } : {}),
        },
      })
      adicionarToast({
        tipo: 'sucesso',
        titulo: editando ? 'Prato atualizado' : 'Prato cadastrado',
        texto: semFicha ? `${nome.trim()} · ainda sem ficha técnica, o CMV só aparece depois dela.` : `${nome.trim()} · CMV ${cmv === null ? '—' : pct(cmv)}.`,
      })
      aoFechar()
    } catch (e) {
      console.error('prato:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra salvar', texto: mensagemDeErro(e, 'O prato não foi salvo. Tente de novo.') })
    }
  }

  const corCmv = { ok: 'text-mata', atencao: 'text-insight-rotulo', alto: 'text-telha-alerta', sem_ficha: 'text-tinta-4' }[situacao]

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-noite/45" onClick={aoFechar}>
      <div className="flex h-full w-full max-w-[620px] flex-col bg-fundo-app shadow-gaveta" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="flex items-start justify-between border-b border-divisoria bg-superficie px-6 py-4">
          <div>
            <h2 className="text-tinta" style={{ fontSize: 19, fontWeight: 800 }}>
              {editando ? 'Editar prato' : copia ? 'Duplicar prato' : 'Novo prato'}
            </h2>
            <p className="text-sm text-tinta-3">Produto final do cardápio e o que ele leva</p>
          </div>
          <button onClick={aoFechar} aria-label="Fechar" className="grid h-8 w-8 place-items-center rounded-botao text-tinta-3 hover:bg-preenchimento">
            <X size={18} />
          </button>
        </div>

        <div className="scroll-fina flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="flex gap-2">
            <Chip rotulo="Prato ou bebida" selecionado={tipo === 'prato'} aoClicar={() => setTipo('prato')} />
            <Chip rotulo="Combo" selecionado={tipo === 'combo'} aoClicar={() => setTipo('combo')} />
          </div>

          <Campo rotulo="Nome" placeholder={tipo === 'combo' ? 'Combo: Kebab + Batata + Bebida' : 'Kebab de Frango'} value={nome} onChange={(e) => setNome(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Preço de venda" inputMode="decimal" placeholder="R$ 0,00" value={preco} onChange={(e) => setPreco(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <Campo rotulo="Código do PDV · opcional" placeholder="P1" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              {codigoRepetido && <span className="text-xs font-semibold text-telha-alerta">Esse código já é de outro prato.</span>}
            </div>
          </div>

          <div>
            <span className="rotulo mb-1.5 block text-tinta-4">Categoria</span>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...categorias, ...CATEGORIAS_SUGERIDAS])].map((c) => (
                <Chip key={c} rotulo={c} selecionado={!novaCategoria.trim() && categoria === c} aoClicar={() => { setCategoria(c); setNovaCategoria('') }} />
              ))}
            </div>
            <div className="mt-2">
              <Campo rotulo="Ou crie uma categoria" placeholder="Ex.: Kebabs" value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} />
            </div>
          </div>

          <Campo rotulo="Descrição · opcional" placeholder="Pão árabe, carne, molho de alho…" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

          {/* -------- Ficha técnica / componentes do combo -------- */}
          <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-tinta">{tipo === 'combo' ? 'O que leva no combo' : 'Ficha técnica'}</h3>
              <p className="text-xs text-tinta-4">
                {tipo === 'combo'
                  ? 'Escolha os pratos do cardápio. O custo do combo é a soma do custo deles.'
                  : 'Cada matéria-prima e quanto vai no prato. É isso que baixa o estoque a cada venda e fecha o CMV.'}
              </p>
            </div>

            {tipo === 'prato' ? (
              produtos.length === 0 ? (
                <p className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">
                  Cadastre suas matérias-primas em <strong>Produtos</strong> primeiro — a ficha é montada com elas.
                </p>
              ) : (
                <>
                  {ficha.map((l, i) => {
                    const p = porId.get(l.produtoId)
                    const un = p ? unidadeDaFicha(p.unidade).unidade : ''
                    const linhaCusto = p ? custoDaLinha({ produtoId: p.id, quantidade: num(l.quantidade), perdaPct: num(l.perda) }, p) : 0
                    return (
                      <div key={i} className="flex flex-col gap-3 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-3.5">
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <SeletorProduto
                              rotulo={`Matéria-prima ${i + 1}`}
                              produtos={produtos}
                              valor={l.produtoId}
                              aoTrocar={(id) => setFicha((f) => f.map((x, j) => (j === i ? { ...x, produtoId: id } : x)))}
                            />
                          </div>
                          <button
                            onClick={() => setFicha((f) => f.filter((_, j) => j !== i))}
                            aria-label={`Tirar matéria-prima ${i + 1}`}
                            className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-botao text-tinta-4 transition hover:bg-preenchimento hover:text-telha-alerta"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Campo rotulo={`Quantidade${un ? ` · ${un}` : ''}`} inputMode="decimal" placeholder="0" value={l.quantidade} onChange={(e) => setFicha((f) => f.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)))} />
                          <Campo rotulo="Perda · %" inputMode="decimal" placeholder="0" value={l.perda} onChange={(e) => setFicha((f) => f.map((x, j) => (j === i ? { ...x, perda: e.target.value } : x)))} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-tinta-4">
                          <span>{p ? `${brl(p.custoAtual)} / ${p.unidade}` : 'escolha o produto'}</span>
                          <span className="mono font-bold text-tinta">{brl(linhaCusto)}</span>
                        </div>
                      </div>
                    )
                  })}
                  <button
                    onClick={() => setFicha((f) => [...f, { produtoId: '', quantidade: '', perda: '' }])}
                    className="flex items-center justify-center gap-1.5 rounded-campo border border-dashed border-[rgba(46,95,115,0.3)] py-2.5 text-sm font-bold text-mar transition hover:bg-preenchimento"
                  >
                    <Plus size={16} /> Adicionar matéria-prima
                  </button>
                </>
              )
            ) : base.length === 0 ? (
              <p className="rounded-cartao bg-preenchimento/60 p-3.5 text-sm text-tinta-2">Cadastre os pratos primeiro — o combo é feito com eles.</p>
            ) : (
              <>
                {comps.map((c, i) => (
                  <div key={i} className="flex items-end gap-2 rounded-cartao border border-[rgba(46,95,115,0.14)] bg-superficie p-3.5">
                    <label className="flex flex-1 flex-col gap-1.5">
                      <span className="rotulo text-tinta-4">Prato {i + 1}</span>
                      <select
                        value={c.pratoId}
                        onChange={(e) => setComps((cs) => cs.map((x, j) => (j === i ? { ...x, pratoId: e.target.value } : x)))}
                        className="rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-3.5 py-2.5 text-[15px] text-tinta outline-none focus:border-mar"
                      >
                        <option value="">Escolha o prato…</option>
                        {base.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                    </label>
                    <div className="w-24">
                      <Campo rotulo="Qtd." inputMode="decimal" value={c.quantidade} onChange={(e) => setComps((cs) => cs.map((x, j) => (j === i ? { ...x, quantidade: e.target.value } : x)))} />
                    </div>
                    <button onClick={() => setComps((cs) => cs.filter((_, j) => j !== i))} aria-label={`Tirar prato ${i + 1}`} className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-botao text-tinta-4 hover:bg-preenchimento hover:text-telha-alerta">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setComps((cs) => [...cs, { pratoId: '', quantidade: '1' }])}
                  className="flex items-center justify-center gap-1.5 rounded-campo border border-dashed border-[rgba(46,95,115,0.3)] py-2.5 text-sm font-bold text-mar transition hover:bg-preenchimento"
                >
                  <Plus size={16} /> Adicionar prato ao combo
                </button>
              </>
            )}
          </div>

          {/* -------- Resultado ao vivo -------- */}
          <div className="grid grid-cols-3 gap-3 rounded-cartao bg-preenchimento/60 p-4">
            <div>
              <span className="rotulo text-tinta-4">Custo</span>
              <div className="mono text-[17px] font-bold text-tinta">{brl(custo)}</div>
            </div>
            <div>
              <span className="rotulo text-tinta-4">Margem</span>
              <div className={cn('mono text-[17px] font-bold', margem >= 0 ? 'text-tinta' : 'text-telha-alerta')}>{rascunho.preco ? brl(margem) : '—'}</div>
            </div>
            <div>
              <span className="rotulo text-tinta-4">CMV</span>
              <div className={cn('mono text-[17px] font-bold', corCmv)}>{cmv === null ? '—' : pct(cmv)}</div>
            </div>
            <p className="col-span-3 text-xs text-tinta-3">
              {semFicha
                ? 'Sem ficha técnica o CMV não aparece e a venda não consegue baixar estoque.'
                : custo > 0
                  ? `Meta de CMV ${pct(metaCmv, 0)} → preço de ${brl(precoParaMeta(custo, metaCmv))} fecha na meta.`
                  : 'Informe quantidade e preço das matérias-primas.'}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
              <span className="text-sm font-bold text-tinta">Ativo no cardápio</span>
              <Switch ligado={ativo} aoTrocar={setAtivo} rotulo="Ativo no cardápio" />
            </label>
            <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
              <span className="text-sm font-bold text-tinta">Vende no presencial</span>
              <Switch ligado={presencial} aoTrocar={setPresencial} rotulo="Vende no presencial" />
            </label>
            <label className="flex items-center justify-between rounded-campo border border-[rgba(46,95,115,0.14)] bg-superficie px-4 py-3">
              <span className="text-sm font-bold text-tinta">Vende no delivery</span>
              <Switch ligado={delivery} aoTrocar={setDelivery} rotulo="Vende no delivery" />
            </label>
            {!presencial && !delivery && <span className="text-xs font-semibold text-telha-alerta">Escolha pelo menos um canal de venda.</span>}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-divisoria bg-superficie px-6 py-4">
          <button onClick={aoFechar} className="text-sm font-semibold text-tinta-3 hover:text-tinta">Cancelar</button>
          <Button disabled={!podeSalvar || salvar.isPending} onClick={gravar}>
            {salvar.isPending ? 'Salvando…' : editando ? 'Salvar alterações' : 'Salvar prato'}
          </Button>
        </div>
      </div>
    </div>
  )
}
