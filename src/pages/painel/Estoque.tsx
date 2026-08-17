import { useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { SectionHeader } from '@/components/layout/SectionHeader'
import { Cartao } from '@/components/ui/Cartao'
import { useUI } from '@/ui/UIProvider'
import { brl, brlInteiro } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useContagens, useMovimentos, useProdutos, useRestaurante, useSalvarContagem } from '@/data/hooks'
import { MES_REF } from '@/data/derive'
import { nomeDoMes } from '@/data/planoMes'
import { mensagemDeErro } from '@/lib/erros'

export function Estoque() {
  const { abrirGaveta, confirmar, adicionarToast } = useUI()
  const restaurante = useRestaurante()
  const contagens = useContagens()
  const produtos = useProdutos()
  const movimentos = useMovimentos()
  const salvarContagem = useSalvarContagem()

  const cfg = restaurante.data
  const contagem = contagens.data?.find((c) => c.mesReferencia === MES_REF) ?? contagens.data?.[0]
  /** 'agosto' — o mês da contagem que está aberta na tela. */
  const mesNome = nomeDoMes(contagem?.mesReferencia ?? MES_REF).split(' de ')[0]

  /**
   * O que aparece na contagem: TODO produto cadastrado, não só o que já foi
   * contado uma vez. Produto novo (ou comprado por nota este mês) entrava no
   * estoque sem aparecer aqui — e a prateleira ficava fora da conta.
   */
  const itens = useMemo(() => {
    const contados = new Map((contagem?.itens ?? []).map((i) => [i.produtoId, i]))
    const doCadastro = (produtos.data ?? []).map((p) => {
      const c = contados.get(p.id)
      return {
        produtoId: p.id,
        nome: p.nome,
        unidade: p.unidade,
        // Custo do cadastro: é ele que a nota fiscal mantém em dia.
        custoUnitario: p.custoAtual || c?.custoUnitario || 0,
        quantidade: c?.quantidade ?? 0,
        contadoPor: c?.contadoPor ?? '',
        novo: !c,
      }
    })
    // Itens contados de produtos que saíram do cadastro continuam valendo
    // dinheiro no estoque — não somem da conta.
    const semCadastro = (contagem?.itens ?? [])
      .filter((i) => !(produtos.data ?? []).some((p) => p.id === i.produtoId))
      .map((i) => ({ ...i, novo: false }))
    return [...doCadastro, ...semCadastro]
  }, [contagem, produtos.data])

  /** Entradas e saídas do mês por produto — o elo que faltava com a nota fiscal. */
  const movimentoDoMes = useMemo(() => {
    const mapa = new Map<string, { entrou: number; saiu: number }>()
    for (const m of movimentos.data ?? []) {
      const quando = (m.data ?? m.criadoEm ?? '').slice(0, 7)
      if (quando !== MES_REF) continue
      const atual = mapa.get(m.produtoId) ?? { entrou: 0, saiu: 0 }
      if (m.tipo === 'Entrou mercadoria') atual.entrou += m.quantidade
      else if (m.tipo !== 'Contagem do mês') atual.saiu += m.quantidade
      mapa.set(m.produtoId, atual)
    }
    return mapa
  }, [movimentos.data])

  const [quantidades, setQuantidades] = useState<Record<string, number>>({})

  /**
   * Quantidade que a tela mostra. Produto já contado começa no que foi contado;
   * produto que nunca foi contado começa no saldo que os movimentos indicam
   * (o que entrou por nota menos o que se perdeu).
   */
  function baseDe(item: { produtoId: string; quantidade: number; novo?: boolean }): number {
    if (!item.novo) return item.quantidade
    const m = movimentoDoMes.get(item.produtoId)
    return Math.max(0, (m?.entrou ?? 0) - (m?.saiu ?? 0))
  }

  const qtdDe = (produtoId: string, base: number) => quantidades[produtoId] ?? base

  const ajustar = (produtoId: string, base: number, delta: number) =>
    setQuantidades((q) => {
      const atual = q[produtoId] ?? base
      return { ...q, [produtoId]: Math.max(0, atual + delta) }
    })

  /**
   * Estoque fechado dos meses anteriores — vem das contagens fechadas, não de
   * número escrito na tela (que ficava mentindo assim que alguém contava).
   */
  const fechados = useMemo(() => {
    return (contagens.data ?? [])
      .filter((c) => c.status === 'fechada' && c.mesReferencia !== contagem?.mesReferencia)
      .map((c) => ({
        mes: c.mesReferencia,
        valor: c.valorEstoque ?? c.itens.reduce((s, i) => s + i.quantidade * i.custoUnitario, 0),
      }))
      .sort((a, b) => (a.mes < b.mes ? -1 : 1))
      .slice(-3)
  }, [contagens.data, contagem])

  const valorLive = useMemo(
    () => itens.reduce((s, i) => s + qtdDe(i.produtoId, baseDe(i)) * i.custoUnitario, 0),
    [itens, quantidades, movimentoDoMes],
  )

  /** Fecha o mês: o valor contado vira o estoque final e entra no CMV do DRE. */
  async function fecharContagem() {
    if (!contagem) return
    try {
      await salvarContagem.mutateAsync({
        ...contagem,
        status: 'fechada',
        itens: itens.map(({ novo: _novo, ...i }) => ({
          ...i,
          contadoPor: i.contadoPor || 'equipe',
          quantidade: qtdDe(i.produtoId, baseDe({ ...i, novo: _novo })),
        })),
        valorEstoque: valorLive,
      })
      adicionarToast({
        tipo: 'sucesso',
        titulo: 'Contagem fechada',
        texto: `${brl(valorLive)} viraram o estoque do mês — o CMV do DRE já considera isso.`,
      })
    } catch (e) {
      console.error('contagem:', e)
      adicionarToast({ tipo: 'erro', titulo: 'Não deu pra fechar', texto: mensagemDeErro(e, 'A contagem não foi salva.') })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader titulo="Estoque" subtitulo={cfg ? `${cfg.nome} · ${cfg.bairro} · ${cfg.aberturaMes}` : ''} />

      <div className="grid grid-cols-1 gap-3.5 tab:grid-cols-12">
        {/* Coluna principal — contagem */}
        <div className="tab:col-span-8">
          <Cartao className="flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-tinta">Contagem de {mesNome}</h2>
              <span className="text-xs text-tinta-4">{itens.length} itens</span>
            </div>
            <ul className="flex flex-col">
              {itens.map((item, idx) => {
                const base = baseDe(item)
                const qtd = qtdDe(item.produtoId, base)
                const subtotal = qtd * item.custoUnitario
                const mov = movimentoDoMes.get(item.produtoId)
                return (
                  <li
                    key={item.produtoId}
                    className={cn('flex items-center gap-3 py-3', idx > 0 && 'border-t border-divisoria')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-tinta">{item.nome}</div>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-tinta-4">
                        {/* O que a nota fiscal e as perdas fizeram com este item no mês. */}
                        {mov?.entrou ? <span className="font-semibold text-mata">+{mov.entrou} entrou</span> : null}
                        {mov?.saiu ? <span className="font-semibold text-telha-alerta">−{mov.saiu} saiu</span> : null}
                        <span>{item.contadoPor ? `contado por ${item.contadoPor}` : 'ainda não contado'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => ajustar(item.produtoId, base, -1)}
                        className="grid h-8 w-8 place-items-center rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2 transition hover:border-mar/50"
                        aria-label="Diminuir"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="mono w-12 text-center text-[15px] font-bold text-tinta">{qtd}</span>
                      <button
                        type="button"
                        onClick={() => ajustar(item.produtoId, base, 1)}
                        className="grid h-8 w-8 place-items-center rounded-botao border border-[rgba(46,95,115,0.18)] bg-superficie text-tinta-2 transition hover:border-mar/50"
                        aria-label="Aumentar"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <div className="w-28 shrink-0 text-right">
                      <div className="mono font-bold text-tinta">{brl(subtotal)}</div>
                      <div className="mono text-[11px] text-tinta-4">{brl(item.custoUnitario)} / {item.unidade}</div>
                    </div>
                  </li>
                )
              })}
            </ul>

            <button
              onClick={() => abrirGaveta('estoque')}
              className="mt-4 self-start rounded-botao bg-telhado px-4 py-2.5 text-sm font-bold text-creme shadow-telhado transition hover:brightness-95"
            >
              + Movimento de estoque
            </button>
          </Cartao>
        </div>

        {/* Lateral — valor contado */}
        <div className="flex flex-col gap-3.5 tab:col-span-4">
          <Cartao className="flex flex-col gap-2">
            <span className="rotulo text-tinta-4">Valor contado</span>
            <span className="mono text-tinta" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em' }}>
              {brl(valorLive)}
            </span>
            <span className="text-sm text-tinta-4">
              {fechados.length
                ? `mês passado: ${brlInteiro(fechados[fechados.length - 1].valor)}`
                : 'primeira contagem — ainda não há mês fechado pra comparar'}
            </span>
          </Cartao>

          <Cartao className="flex flex-col">
            <span className="mb-3 rotulo text-tinta-4">Estoque fechado</span>
            <ul className="flex flex-col">
              {fechados.map((f, i) => (
                <li key={f.mes} className={cn('flex items-center justify-between py-2 text-sm', i > 0 && 'border-t border-divisoria')}>
                  <span className="text-tinta-3 capitalize">{nomeDoMes(f.mes).split(' de ')[0]}</span>
                  <span className="mono font-semibold text-tinta">{brlInteiro(f.valor)}</span>
                </li>
              ))}
              <li className={cn('flex items-center justify-between py-2 text-sm', fechados.length > 0 && 'border-t border-divisoria')}>
                <span className="font-bold text-tinta capitalize">{mesNome} · contando</span>
                <span className="mono font-bold text-mar">{brl(valorLive)}</span>
              </li>
            </ul>
          </Cartao>

          <div className="rounded-cartao border border-[rgba(46,95,115,0.12)] bg-preenchimento/50 px-4 py-3 text-sm text-tinta-3">
            No estoque, dá pra contar direto do celular andando pelas prateleiras.
          </div>

          <button
            onClick={() =>
              confirmar({
                gravidade: 'destrutivo',
                titulo: `Fechar a contagem de ${mesNome}?`,
                texto: 'Depois de fechar, esse valor vira o estoque do mês e entra no CMV. Só o dono consegue reabrir.',
                resumo: [
                  { rot: 'Itens contados', val: `${itens.length} de ${itens.length}` },
                  { rot: 'Valor do estoque', val: brl(valorLive) },
                ],
                rotuloCancelar: 'Continuar contando',
                rotuloConfirmar: 'Fechar mês',
                onConfirmar: fecharContagem,
              })
            }
            disabled={!contagem || salvarContagem.isPending}
            className="rounded-botao bg-mar px-4 py-2.5 text-sm font-bold text-creme transition hover:bg-mar-escuro"
          >
            Fechar contagem
          </button>
        </div>
      </div>
    </div>
  )
}
