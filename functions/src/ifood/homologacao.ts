#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 * Script de homologação financeira do iFood.
 *
 * Consulta o ambiente de teste (header x-request-homologation: true) e
 * imprime as 20 respostas do formulário já formatadas para copiar e colar.
 *
 * Uso:
 *   cd functions && npm run homologacao
 *
 * Exige no ambiente:
 *   IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET, IFOOD_MERCHANT_ID
 * ------------------------------------------------------------------ */
import { ClienteIFood, ErroIFood } from './client'
import {
  valorBrutoVenda,
  totalBeneficios,
  valorPagoPeloCliente,
  taxaServicoCliente,
  liquidoDaLoja,
  repasseLiquido,
  totalLancamentos,
  entradasComLojaResponsavel,
  cobrancasPorOcorrencia,
  lerConciliacao,
  valorConciliacao,
  temImpactoNoRepasse,
} from './mapper'
import type { LinhaConciliacaoIFood } from './types'

/* Períodos exigidos pelo formulário de homologação. */
const EVENTOS_INICIO = '2025-08-01'
const EVENTOS_FIM = '2025-08-03'
const REPASSE_INICIO = '2025-08-01'
const REPASSE_FIM = '2025-08-03'
const COMPETENCIA = '2025-08'

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

let bloco = 0
function secao(titulo: string, periodo: string) {
  console.log(`\n${'═'.repeat(72)}`)
  console.log(`BLOCO ${++bloco} · ${titulo}`)
  console.log(`Período: ${periodo}`)
  console.log('═'.repeat(72))
}

let pergunta = 0
function resposta(texto: string, valor: string) {
  console.log(`\n  ${String(++pergunta).padStart(2, '0')}. ${texto}`)
  console.log(`      ➜  ${valor}`)
}

function aviso(texto: string) {
  console.log(`\n  ⚠️  ${texto}`)
}

/* --------------------------- Bloco 1 · Sales ---------------------------- */

async function blocoVendas(cliente: ClienteIFood, merchantId: string) {
  secao('API Sales', 'pedido do ambiente de teste')

  // Varremos agosto/2025 inteiro para achar o(s) pedido(s) do exercício.
  const vendas = await cliente.vendas(merchantId, '2025-08-01', '2025-08-31')
  if (!vendas.length) {
    aviso('Nenhuma venda retornada. Confirme o merchantId de homologação.')
    pergunta += 5
    return
  }

  if (vendas.length > 1) {
    aviso(
      `A API devolveu ${vendas.length} vendas. O formulário pergunta sobre UM pedido — ` +
        'confira no enunciado qual é e use a linha correspondente abaixo.',
    )
    console.log('\n      Pedidos encontrados:')
    for (const v of vendas) {
      console.log(
        `        · ${v.id} (#${v.shortId ?? '—'}) ${v.createdAt?.slice(0, 10)} ` +
          `— bruto ${brl(valorBrutoVenda(v))}, líquido ${brl(liquidoDaLoja(v))}`,
      )
    }
  }

  const v = vendas[0]
  console.log(`\n      Usando o pedido ${v.id} (#${v.shortId ?? '—'})`)

  resposta('Valor total dos itens (bag) do pedido', brl(v.saleGrossValue?.bag ?? 0))
  resposta('Valor total de benefícios aplicados', brl(totalBeneficios(v)))
  resposta('Valor pago pelo consumidor', brl(valorPagoPeloCliente(v)))
  resposta('Taxa de serviço iFood cobrada do cliente', brl(taxaServicoCliente(v)))
  resposta('Valor líquido que a loja receberá', brl(liquidoDaLoja(v)))
}

/* ----------------------- Bloco 2 · Reconciliation ----------------------- */

const col = (l: LinhaConciliacaoIFood, ...nomes: string[]) => {
  for (const n of nomes) if (l[n] !== undefined && l[n] !== '') return l[n]
  return ''
}

async function blocoConciliacao(cliente: ClienteIFood, merchantId: string) {
  secao('API Reconciliation (arquivo)', `competência ${COMPETENCIA}`)

  let csv = ''
  try {
    csv = await cliente.conciliacao(merchantId, COMPETENCIA)
  } catch (e) {
    aviso(`Arquivo por competência falhou (${(e as Error).message}). Tentando sob demanda…`)
    try {
      const requestId = await cliente.pedirConciliacao(merchantId, COMPETENCIA)
      console.log(`      requestId: ${requestId}`)
      csv = await cliente.buscarConciliacao(merchantId, requestId)
    } catch (e2) {
      aviso(
        `Sob demanda também falhou: ${(e2 as Error).message}\n` +
          '      O arquivo pode levar alguns minutos. Rode o script de novo.',
      )
      pergunta += 5
      return
    }
  }

  const linhas = lerConciliacao(csv)
  if (!linhas.length) {
    aviso('O arquivo veio vazio.')
    pergunta += 5
    return
  }
  console.log(`\n      ${linhas.length} lançamentos lidos. Colunas: ${Object.keys(linhas[0]).join(', ')}`)

  const pedidos = new Set(
    linhas.map((l) => col(l, 'pedido_associado_ifood')).filter((p) => p && p !== '-'),
  )
  resposta('Quantos pedidos únicos ocorreram em agosto', String(pedidos.size))

  const repasse = linhas
    .filter(temImpactoNoRepasse)
    .reduce((s, l) => s + valorConciliacao(l), 0)
  resposta('Valor total a ser repassado no mês inteiro', brl(repasse))

  const faturado = linhas.reduce((s, l) => s + valorConciliacao(l), 0)
  resposta('Valor total faturado pela loja (todos os lançamentos)', brl(faturado))

  const lojaResponsavel = linhas
    .filter((l) => col(l, 'responsavel_transacao').toUpperCase() === 'LOJA')
    .filter((l) => col(l, 'tipo_lancamento', 'fato_gerador').toLowerCase().includes('entrada'))
    .reduce((s, l) => s + valorConciliacao(l), 0)
  resposta(
    'Valor total de entradas financeiras com a loja responsável pela transação',
    brl(lojaResponsavel),
  )

  const cancelados = linhas.filter((l) =>
    col(l, 'fato_gerador').toLowerCase().includes('cancelamento'),
  )
  const pedidosCancelados = new Set(
    cancelados.map((l) => col(l, 'pedido_associado_ifood')).filter(Boolean),
  )
  const liquidoCancelados = linhas
    .filter((l) => pedidosCancelados.has(col(l, 'pedido_associado_ifood')))
    .filter(temImpactoNoRepasse)
    .reduce((s, l) => s + valorConciliacao(l), 0)
  resposta(
    'Valor líquido dos lançamentos dos pedidos com cancelamento (parcial ou total)',
    brl(liquidoCancelados),
  )
  console.log(`      (${pedidosCancelados.size} pedidos com cancelamento)`)
}

/* ---------------------- Bloco 3 · Financial Events ---------------------- */

async function blocoEventos(cliente: ClienteIFood, merchantId: string) {
  secao('API Financial Events', `${EVENTOS_INICIO} a ${EVENTOS_FIM}`)

  let lancs
  try {
    lancs = await cliente.lancamentosFinanceiros(merchantId, EVENTOS_INICIO, EVENTOS_FIM)
  } catch (e) {
    if (e instanceof ErroIFood && e.status === 400) {
      aviso(
        'O iFood recusou o intervalo. Esta API exige que o período CONTENHA um ciclo\n' +
          '      de apuração inteiro (semanal = segunda a domingo). Tentando a semana cheia…',
      )
      lancs = await cliente.lancamentosFinanceiros(merchantId, '2025-07-28', '2025-08-03')
      console.log('      Usando 2025-07-28 a 2025-08-03 (semana de apuração completa).')
    } else {
      throw e
    }
  }

  if (!lancs.length) {
    aviso('Nenhum lançamento retornado no período.')
    pergunta += 5
    return
  }
  const comImpacto = lancs.filter((l) => l.hasTransferImpact).length
  console.log(
    `\n      ${lancs.length} lançamentos · ${comImpacto} com impacto no repasse · ` +
      `${lancs.length - comImpacto} sem impacto`,
  )

  resposta(
    'Valor total de todos os lançamentos (com e sem impacto no repasse)',
    brl(totalLancamentos(lancs)),
  )
  resposta('Valor total líquido a ser repassado no período', brl(repasseLiquido(lancs)))
  resposta('Valor total das cobranças feitas através de ocorrências', brl(cobrancasPorOcorrencia(lancs)))

  resposta(
    'O ORDER_PAYMENT com Vale Refeição (MEAL_VOUCHER) impacta o repasse?',
    'Não, pois os pagamentos feitos com Meal Voucher não são repassados pelo iFood\n' +
      '          e sim pela própria empresa do cartão',
  )
  const vr = lancs.filter(
    (l) => (l.payment?.method ?? '').toUpperCase().includes('VOUCHER') && !l.hasTransferImpact,
  )
  console.log(
    `      (confirmado nos dados: ${vr.length} lançamento(s) de voucher com hasTransferImpact = false)`,
  )

  resposta(
    'Valor total de entradas financeiras com a loja responsável pela transação',
    brl(entradasComLojaResponsavel(lancs)),
  )
}

/* ------------------------- Bloco 4 · Settlements ------------------------ */

async function blocoRepasses(cliente: ClienteIFood, merchantId: string) {
  secao('API Settlements', `${REPASSE_INICIO} a ${REPASSE_FIM}`)

  const repasse = await cliente.repasses(merchantId, REPASSE_INICIO, REPASSE_FIM)
  const saldos = (repasse?.settlements ?? []).flatMap((s) => s.closingItems ?? [])

  resposta('Valor repassado à loja no período', brl(repasse?.balance ?? 0))

  const datas = [...new Set(saldos.map((s) => s.paymentDate).filter(Boolean))]
  resposta(
    'Data prevista de pagamento do repasse',
    datas.length
      ? datas.map((d) => new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR')).join(' · ')
      : '— nenhuma data no payload; confira o campo paymentDate',
  )

  resposta('Quantos saldos compuseram esta liquidação', String(saldos.length))

  resposta(
    'Valor de cada saldo que compôs a liquidação',
    saldos.length
      ? saldos.map((s) => `${s.type}: ${brl(s.amount)}`).join('  ·  ')
      : '— nenhum saldo retornado',
  )

  const TIPOS_CONTRATO = ['REGISTRO_RECEBIVEIS', 'RENEGOCIADA']
  const efeitos = saldos.filter((s) => TIPOS_CONTRATO.includes((s.type ?? '').toUpperCase()))
  resposta(
    'Houve efeito de contrato nos recebíveis que alterou o repasse esperado?',
    efeitos.length
      ? `Sim — ${efeitos.map((e) => `${e.type} ${brl(e.amount)}`).join(', ')}`
      : 'Não',
  )

  // A API de antecipações confirma a resposta acima por outro caminho.
  try {
    const ant = await cliente.antecipacoes(merchantId, REPASSE_INICIO, REPASSE_FIM)
    const itens = (ant?.settlements ?? []).flatMap((s) => s.closingItems ?? [])
    console.log(
      `\n      Conferência via API Anticipations: saldo ${brl(ant?.balance ?? 0)} ` +
        `em ${itens.length} antecipação(ões).`,
    )
  } catch (e) {
    console.log(`\n      (API Anticipations não respondeu: ${(e as Error).message})`)
  }
}

/* --------------------------------- main --------------------------------- */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Confere o formato das credenciais antes de chamar o iFood. Sem isso o erro
 * que chega é "UUID string too large", que não diz qual campo está errado.
 * Só reporta tamanho e formato — nunca imprime o valor.
 */
function conferirCredenciais(clientId: string, clientSecret: string, merchantId: string): boolean {
  const problemas: string[] = []

  if (!UUID.test(clientId)) {
    problemas.push(
      `IFOOD_CLIENT_ID não tem formato de UUID (recebi ${clientId.length} caracteres; ` +
        'o esperado são 36, no formato 8-4-4-4-12).',
    )
    if (UUID.test(clientSecret)) {
      problemas.push('→ O valor em IFOOD_CLIENT_SECRET *é* um UUID. Os dois parecem trocados.')
    } else if (UUID.test(merchantId) && clientId.length > 60) {
      problemas.push('→ O valor em IFOOD_CLIENT_ID parece ser o clientSecret (longo demais).')
    }
  }

  if (!UUID.test(merchantId)) {
    problemas.push(
      `IFOOD_MERCHANT_ID não tem formato de UUID (recebi ${merchantId.length} caracteres).`,
    )
  }

  if (clientSecret.length < 40) {
    problemas.push(
      `IFOOD_CLIENT_SECRET parece curto demais (${clientSecret.length} caracteres; ` +
        'o do iFood costuma passar de 90).',
    )
  }

  if (!problemas.length) return true

  console.error('\n  ❌ As credenciais não passaram na conferência de formato:\n')
  for (const p of problemas) console.error(`     ${p}`)
  console.error(
    '\n  Onde encontrar cada uma, no Portal do Desenvolvedor:\n' +
      '     clientId e clientSecret → Meus Apps › [seu app de teste] › Credenciais\n' +
      '     merchantId              → menu Testes › loja de teste\n',
  )
  return false
}

async function main() {
  // O .trim() remove quebra de linha e espaço que vêm junto na colagem.
  const clientId = (process.env.IFOOD_CLIENT_ID ?? '').trim()
  const clientSecret = (process.env.IFOOD_CLIENT_SECRET ?? '').trim()
  const merchantId = (process.env.IFOOD_MERCHANT_ID ?? '').trim()

  if (!clientId || !clientSecret || !merchantId) {
    console.error(
      'Faltam variáveis de ambiente.\n\n' +
        '  export IFOOD_CLIENT_ID=...\n' +
        '  export IFOOD_CLIENT_SECRET=...\n' +
        '  export IFOOD_MERCHANT_ID=...\n',
    )
    process.exit(1)
  }

  if (!conferirCredenciais(clientId, clientSecret, merchantId)) process.exit(1)

  const cliente = new ClienteIFood({ clientId, clientSecret, homologacao: true })

  console.log('\n╔' + '═'.repeat(70) + '╗')
  console.log('║  RESPOSTAS DO FORMULÁRIO DE HOMOLOGAÇÃO FINANCEIRA — iFood'.padEnd(71) + '║')
  console.log('║  Chamado 30996427 · x-request-homologation: true'.padEnd(71) + '║')
  console.log('╚' + '═'.repeat(70) + '╝')

  const blocos: [string, () => Promise<void>][] = [
    ['Sales', () => blocoVendas(cliente, merchantId)],
    ['Reconciliation', () => blocoConciliacao(cliente, merchantId)],
    ['Financial Events', () => blocoEventos(cliente, merchantId)],
    ['Settlements', () => blocoRepasses(cliente, merchantId)],
  ]

  for (const [nome, executar] of blocos) {
    try {
      await executar()
    } catch (e) {
      console.error(`\n  ❌ Bloco ${nome} falhou: ${(e as Error).message}`)
      if (e instanceof ErroIFood) console.error(`     ${e.mensagemAmigavel}`)
    }
  }

  console.log(`\n${'═'.repeat(72)}`)
  console.log(`${pergunta} respostas geradas. São necessários 18 acertos de 20.`)
  console.log('═'.repeat(72) + '\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
