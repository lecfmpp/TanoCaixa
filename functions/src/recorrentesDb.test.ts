import test from 'node:test'
import assert from 'node:assert/strict'
import { repetirDoRestaurante, type BancoRec } from './recorrentesDb'

/** Firestore falso em memória: só o que a gravação usa, com `create` que falha se já existir (código 6). */
function bancoFalso(inicial: Record<string, Record<string, unknown>>) {
  const docs = new Map<string, Record<string, unknown>>(Object.entries(inicial))
  const banco: BancoRec = {
    collection: (caminho) => ({
      where: (campo, op, valor) => ({
        get: async () => ({
          docs: [...docs.entries()]
            .filter(([c]) => c.startsWith(caminho + '/') && !c.slice(caminho.length + 1).includes('/'))
            .filter(([, d]) => (op === '==' ? d[campo] === valor : typeof d[campo] === 'string' && (d[campo] as string) > (valor as string)))
            .map(([c, d]) => ({ id: c.split('/').pop()!, data: () => d })),
        }),
      }),
    }),
    doc: (caminho) => caminho,
    batch: () => {
      const pendentes: [string, Record<string, unknown>][] = []
      return {
        create: (ref, dados) => void pendentes.push([ref as string, dados as Record<string, unknown>]),
        commit: async () => {
          if (pendentes.some(([c]) => docs.has(c))) throw Object.assign(new Error('already exists'), { code: 6 })
          for (const [c, d] of pendentes) docs.set(c, d)
        },
      }
    },
  }
  return { banco, docs }
}

const aluguel = { fornecedor: 'Aluguel', categoria: 'aluguel', valorTotal: 3400, dataCompetencia: '2026-10-05', dataVencimento: '2026-10-05', formaPagamento: 'boleto', status: 'pago', recorrente: true, serieId: 'd1' }
const R = 'restaurants/r1'

test('vira o mês: cria a despesa e o marcador; rodar de novo não duplica', async () => {
  const { banco, docs } = bancoFalso({ [`${R}/despesas/d1`]: aluguel })
  assert.equal(await repetirDoRestaurante(banco, 'r1', '2026-11-01', '2026-11-01T03:10:00Z'), 1)
  assert.equal((docs.get(`${R}/despesas/d1_2026-11`) as { status: string }).status, 'a_pagar')
  assert.ok(docs.has(`${R}/recorrencias/d1_2026-11`))
  // segunda rodada (e as do resto do mês)
  assert.equal(await repetirDoRestaurante(banco, 'r1', '2026-11-01', '2026-11-01T03:10:00Z'), 0)
  assert.equal(await repetirDoRestaurante(banco, 'r1', '2026-11-17', '2026-11-17T03:10:00Z'), 0)
  assert.equal([...docs.keys()].filter((c) => c.includes('/despesas/')).length, 2)
})

test('a pessoa apagou a despesa do mês: o marcador impede que ela volte', async () => {
  const { banco, docs } = bancoFalso({ [`${R}/despesas/d1`]: aluguel })
  await repetirDoRestaurante(banco, 'r1', '2026-11-01', 'x')
  docs.delete(`${R}/despesas/d1_2026-11`) // apagou
  assert.equal(await repetirDoRestaurante(banco, 'r1', '2026-11-02', 'x'), 0)
  assert.equal(docs.has(`${R}/despesas/d1_2026-11`), false)
  // mas no mês seguinte a série continua a partir do último lançamento que existe
  assert.equal(await repetirDoRestaurante(banco, 'r1', '2026-12-01', 'x'), 1)
  assert.ok(docs.has(`${R}/despesas/d1_2026-12`))
})

test('lançamento antigo marcado como recorrente (sem serieId) também é repetido, uma vez só', async () => {
  const { banco, docs } = bancoFalso({
    [`${R}/despesas/a`]: { ...aluguel, serieId: undefined, id: 'a', dataCompetencia: '2026-08-05' },
    [`${R}/despesas/b`]: { ...aluguel, serieId: undefined, dataCompetencia: '2026-09-05' },
    [`${R}/despesas/c`]: { ...aluguel, serieId: undefined, dataCompetencia: '2026-10-05' },
  })
  assert.equal(await repetirDoRestaurante(banco, 'r1', '2026-11-01', 'x'), 1)
  assert.ok(docs.has(`${R}/despesas/c_2026-11`))
})

test('outro restaurante não é tocado', async () => {
  const { banco, docs } = bancoFalso({ [`${R}/despesas/d1`]: aluguel, ['restaurants/r2/despesas/z']: { ...aluguel, serieId: 'z' } })
  await repetirDoRestaurante(banco, 'r1', '2026-11-01', 'x')
  assert.equal(docs.has('restaurants/r2/despesas/z_2026-11'), false)
})

test('erro que não é "já existe" sobe (não engole falha de verdade)', async () => {
  const { banco } = bancoFalso({ [`${R}/despesas/d1`]: aluguel })
  banco.batch = () => ({
    create: () => undefined,
    commit: async () => {
      throw Object.assign(new Error('permissão'), { code: 7 })
    },
  })
  await assert.rejects(() => repetirDoRestaurante(banco, 'r1', '2026-11-01', 'x'), /permissão/)
})
