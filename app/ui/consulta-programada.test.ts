import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

const script = readFileSync('public/consulta-periodo.js', 'utf8')
it('recarga al cruzar el límite sin desbordar el temporizador de periodos largos', () => {
  let ahora = Date.parse('2026-11-01T14:00:00Z')
  let comprobar: () => void = () => {}
  let demora = 0
  const reload = vi.fn()
  runInNewContext(script, {
    Date: { now: () => ahora, parse: Date.parse },
    document: {
      querySelector: () => ({
        dataset: {
          consultaInicio: '2026-12-01T15:00:00Z',
          consultaCierre: '2026-12-03T15:00:00Z',
          consultaEtapa: 'pendiente',
        },
      }),
      addEventListener: vi.fn(),
    },
    window: { location: { reload } },
    setTimeout: (fn: () => void, ms: number) => {
      comprobar = fn
      demora = ms
    },
  })
  expect(demora).toBe(2147483647)
  expect(reload).not.toHaveBeenCalled()
  ahora = Date.parse('2026-12-01T15:00:00Z')
  comprobar()
  expect(reload).toHaveBeenCalledOnce()
})
