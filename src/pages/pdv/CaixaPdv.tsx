import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, Lock, Plus, X } from 'lucide-react'
import { Cartao } from '@/components/ui/Cartao'
import { Button } from '@/components/ui/Button'
import { Campo } from '@/components/ui/Campo'
import { AbrirCaixa } from '@/components/pdv/AbrirCaixa'
import { useUI } from '@/ui/UIProvider'
import { brl, quando } from '@/lib/format'
import { cn } from '@/lib/cn'
import { mensagemDeErro } from '@/lib/erros'
import { agora } from '@/data/derive'
import { useProdutos } from '@/data/hooks'
import { useCaixasPdv, useFecharCaixa, useMovimentoCaixa, usePedidosPdv } from '@/data/pdvHooks'
import { FORMAS, ROTULO_FORMA, resumoDoCaixa } from '@/data/pdv'
import type { CaixaPdvDoc, FormaPagamentoPdv } from '@/data/types'

const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '') || 0)

export function CaixaPdv() {
  const caixasQ = useCaixasPdv()
  const caixas = caixasQ.data ?? []
  const aberto = caixas.find((c) => c.status === 'aberto')
  // O caixa pode ter sido aberto ontem e ainda estar rodando: busca desde o dia dele.
  const pedidos = usePedidosPdv(aberto?.dia)
  const produtos = useProdutos().data ?? []
  const custoInsumo = (id: string) => produtos.find((p) => p.id === id)?.custoAtual ?? 0
  const [modal, setModal] = useState<null | 'sangria' | 'reforco' | 'fechar'>(null)

  const doCaixa = (pedidos.data ?? []).filter((p) => p.caixaId === aberto?.id)
  const r = resumoDoCaixa(aberto, doCaixa, custoInsumo)
  const emPreparo = doCaixa.filter((p) => p.status === 'em_preparo').length
  const fechados = caixas.filter((c) => c.status === 'fechado')

  return (
    <>
      {!aberto ? (
        <AbrirCaixa />
      ) : (
        <>
          <Cartao className="flex flex-col gap-3 cel:flex-row cel:items-center cel:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-mata" />
                <h2 className="text-[16px] font-bold text-tinta">Caixa #{aberto.numero} aberto</h2>
              </div>
              <p className="text-sm text-tinta-3">
                {aberto.abertoPorNome} · {quando(new Date(aberto.abertoEm), agora())} · fundo {brl(aberto.fundo)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/painel/pdv/pedido/novo"><Button variante="lancar"><Plus size={16} strokeWidth={2.5} /> Novo pedido</Button></Link>
              <Button variante="secundario" onClick={() => setModal('reforco')}><ArrowDownToLine size={15} /> Reforço</Button>
              <Button variante="secundario" onClick={() => setModal('sangria')}><ArrowUpFromLine size={15} /> Sangria</Button>
              <Button onClick={() => setModal('fechar')}><Lock size={15} /> Fechar caixa</Button>
            </div>
          </Cartao>

          <div className="grid grid-cols-2 gap-3.5 tab:grid-cols-4">
            <Mini rotulo="Faturamento" valor={brl(r.faturamento)} apoio={`${r.pedidos} ${r.pedidos === 1 ? 'pedido' : 'pedidos'}`} />
            <Mini rotulo="Ticket médio" valor={brl(r.ticketMedio)} apoio={`${brl(r.presencial)} presencial · ${brl(r.delivery)} entrega`} />
            <Mini rotulo="CMV do turno" valor={r.cmv === null ? '—' : `${r.cmv.toFixed(1).replace('.', ',')}%`} apoio={r.custo ? `custo ${brl(r.custo)}` : 'pela ficha técnica'} />
            <Mini rotulo="Perda prevista" valor={brl(r.desperdicioPrevisto)} apoio="desperdício das fichas" />
          </div>

          <Cartao className="p-0">
            <div className="px-5 py-3.5"><h2 className="text-[15px] font-bold text-tinta">Recebido por forma de pagamento</h2></div>
            <ul className="border-t border-divisoria">
              {FORMAS.map((f) => (
                <li key={f.id} className="flex items-center justify-between border-b border-divisoria px-5 py-3 text-sm last:border-0">
                  <span className="text-tinta-2">{f.rotulo}</span>
                  <span className="mono font-bold text-tinta">{brl(r.porForma[f.id])}</span>
                </li>
              ))}
              <li className="flex items-center justify-between bg-preenchimento/40 px-5 py-3 text-sm">
                <span className="font-bold text-tinta">Dinheiro esperado na gaveta</span>
                <span className="mono font-bold text-tinta">{brl(r.esperadoDinheiro)}</span>
              </li>
            </ul>
            <p className="px-5 py-3 text-xs text-tinta-4">Fundo {brl(aberto.fundo)} + vendas em dinheiro (sem o troco) {r.reforcos ? `+ reforços ${brl(r.reforcos)} ` : ''}{r.sangrias ? `− sangrias ${brl(r.sangrias)}` : ''}</p>
          </Cartao>
        </>
      )}

      <Cartao className="overflow-hidden p-0">
        <div className="px-5 py-3.5">
          <h2 className="text-[15px] font-bold text-tinta">Caixas anteriores</h2>
          <p className="text-xs text-tinta-4">Quem operou, quanto vendeu e se o dinheiro bateu.</p>
        </div>
        {fechados.length === 0 ? (
          <p className="border-t border-divisoria px-5 py-8 text-center text-sm text-tinta-4">Nenhum caixa fechado ainda.</p>
        ) : (
          <div className="overflow-x-auto border-t border-divisoria">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-divisoria bg-preenchimento/40 text-left">
                  {['Caixa', 'Aberto em', 'Fechado em', 'Operador', 'Diferença', 'Faturamento'].map((h, i) => (
                    <th key={h} className={cn('px-4 py-2.5 rotulo text-tinta-4', i >= 4 && 'text-right')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fechados.map((c) => (
                  <Fragment key={c.id}>
                    <tr className="border-b border-divisoria last:border-0">
                      <td className="mono px-4 py-3 font-bold text-tinta">#{c.numero}</td>
                      <td className="px-4 py-3 text-tinta-2">{quando(new Date(c.abertoEm), agora())}</td>
                      <td className="px-4 py-3 text-tinta-2">{c.fechadoEm ? quando(new Date(c.fechadoEm), agora()) : '—'}</td>
                      <td className="px-4 py-3 text-tinta-2">{c.abertoPorNome}</td>
                      <td className={cn('mono px-4 py-3 text-right font-bold', (c.diferenca ?? 0) === 0 ? 'text-mata' : 'text-telha-alerta')}>
                        {(c.diferenca ?? 0) === 0 ? 'bateu' : `${(c.diferenca ?? 0) > 0 ? '+' : '−'} ${brl(Math.abs(c.diferenca ?? 0))}`}
                      </td>
                      <td className="mono px-4 py-3 text-right font-bold text-tinta">{brl(c.faturamento ?? 0)}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {aberto && modal && modal !== 'fechar' && <ModalMovimento caixa={aberto} tipo={modal} aoFechar={() => setModal(null)} />}
      {aberto && modal === 'fechar' && <ModalFechar caixa={aberto} r={r} emPreparo={emPreparo} aoFechar={() => setModal(null)} />}
    </>
  )
}

function Casca({ titulo, texto, aoFechar, children }: { titulo: string; texto?: string; aoFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-noite/50 p-4 cel:items-center" onClick={aoFechar}>
      <div className="scroll-fina max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-cartao-g bg-superficie shadow-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="h-1.5 w-full bg-mar" />
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-tinta" style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{titulo}</h2>
              {texto && <p className="pretty mt-1.5 text-sm text-tinta-2">{texto}</p>}
            </div>
            <button onClick={aoFechar} aria-label="Fechar" className="grid h-8 w-8 shrink-0 place-items-center rounded-botao text-tinta-3 hover:bg-preenchimento"><X size={18} /></button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function ModalMovimento({ caixa, tipo, aoFechar }: { caixa: CaixaPdvDoc; tipo: 'sangria' | 'reforco'; aoFechar: () => void }) {
  const { adicionarToast } = useUI()
  const mover = useMovimentoCaixa()
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const sangria = tipo === 'sangria'
  return (
    <Casca
      titulo={sangria ? 'Sangria' : 'Reforço de caixa'}
      texto={sangria ? 'Dinheiro que sai da gaveta durante o turno (depósito, pagamento, retirada).' : 'Dinheiro que entra na gaveta durante o turno (troco extra).'}
      aoFechar={aoFechar}
    >
      <Campo rotulo="Valor · R$" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
      <Campo rotulo="Motivo · opcional" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      <Button
        bloco
        disabled={num(valor) <= 0 || mover.isPending}
        onClick={async () => {
          try {
            await mover.mutateAsync({ caixa, tipo, valor: num(valor), motivo: motivo.trim() || undefined })
            adicionarToast({ tipo: 'sucesso', titulo: sangria ? 'Sangria registrada' : 'Reforço registrado', texto: brl(num(valor)) })
            aoFechar()
          } catch (e) {
            adicionarToast({ tipo: 'erro', titulo: 'Não deu pra registrar', texto: mensagemDeErro(e, 'Tente de novo.') })
          }
        }}
      >
        {mover.isPending ? 'Salvando…' : 'Registrar'}
      </Button>
    </Casca>
  )
}

function ModalFechar({ caixa, r, emPreparo, aoFechar }: { caixa: CaixaPdvDoc; r: ReturnType<typeof resumoDoCaixa>; emPreparo: number; aoFechar: () => void }) {
  const { adicionarToast } = useUI()
  const fechar = useFecharCaixa()
  const esperado: Record<FormaPagamentoPdv, number> = { ...r.porForma, dinheiro: r.esperadoDinheiro }
  const formas = FORMAS.filter((f) => f.id === 'dinheiro' || esperado[f.id] > 0).map((f) => f.id)
  const [contado, setContado] = useState<Record<string, string>>({})
  const [obs, setObs] = useState('')
  const diferenca = formas.reduce((s, f) => s + ((contado[f] !== undefined && contado[f] !== '' ? num(contado[f]) : 0) - esperado[f]), 0)
  const preenchido = formas.every((f) => contado[f] !== undefined && contado[f] !== '')

  return (
    <Casca titulo={`Fechar o caixa #${caixa.numero}`} texto="Conte o que tem de cada forma de pagamento e confira contra o que o sistema espera." aoFechar={aoFechar}>
      {emPreparo > 0 && (
        <p className="rounded-cartao border border-[rgba(192,84,55,0.3)] bg-insight-fundo p-3 text-sm font-semibold text-insight-texto">
          Há {emPreparo} {emPreparo === 1 ? 'pedido' : 'pedidos'} em preparo. Marque como pronto ou cancele antes de fechar.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {formas.map((f) => (
          <div key={f} className="grid grid-cols-[1fr_120px] items-end gap-3">
            <div>
              <div className="text-sm font-bold text-tinta">{ROTULO_FORMA[f]}</div>
              <div className="mono text-xs text-tinta-4">esperado {brl(esperado[f])}</div>
            </div>
            <Campo rotulo="Contado" inputMode="decimal" placeholder="0,00" value={contado[f] ?? ''} onChange={(e) => setContado((c) => ({ ...c, [f]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-cartao bg-preenchimento/60 px-4 py-3">
        <span className="text-sm font-bold text-tinta">Diferença</span>
        <span className={cn('mono text-[17px] font-bold', !preenchido ? 'text-tinta-4' : Math.abs(diferenca) < 0.005 ? 'text-mata' : 'text-telha-alerta')}>
          {!preenchido ? '—' : Math.abs(diferenca) < 0.005 ? 'bateu' : `${diferenca > 0 ? '+' : '−'} ${brl(Math.abs(diferenca))}`}
        </span>
      </div>
      <Campo rotulo="Observação · opcional" placeholder="Ex.: faltou troco de R$ 5" value={obs} onChange={(e) => setObs(e.target.value)} />
      <Button
        bloco
        disabled={!preenchido || emPreparo > 0 || fechar.isPending}
        onClick={async () => {
          try {
            const res = await fechar.mutateAsync({
              caixa,
              contado: Object.fromEntries(formas.map((f) => [f, num(contado[f] ?? '')])),
              obs: obs.trim() || undefined,
            })
            adicionarToast({ tipo: 'sucesso', titulo: `Caixa #${caixa.numero} fechado`, texto: `${brl(res.faturamento)} viraram a receita do dia no DRE.` })
            aoFechar()
          } catch (e) {
            adicionarToast({ tipo: 'erro', titulo: 'Não deu pra fechar o caixa', texto: mensagemDeErro(e, 'Tente de novo.') })
          }
        }}
      >
        {fechar.isPending ? 'Fechando…' : 'Fechar caixa'}
      </Button>
    </Casca>
  )
}

function Mini({ rotulo, valor, apoio }: { rotulo: string; valor: string; apoio: string }) {
  return (
    <Cartao className="flex flex-col gap-1">
      <span className="rotulo text-tinta-4">{rotulo}</span>
      <span className="mono truncate text-tinta" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{valor}</span>
      <span className="truncate text-xs text-tinta-4">{apoio}</span>
    </Cartao>
  )
}
