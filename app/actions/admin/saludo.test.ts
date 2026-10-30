import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * El saludo de la vista general sigue la hora de Tlaquepaque (America/Mexico_City,
 * UTC-6 todo el año). Una versión guardó «Buenos días» con la codificación rota y
 * por la mañana se leía «Buenos dÃ­as»: la prueba fija el texto de cada franja.
 */
const originalFetch = globalThis.fetch

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.restoreAllMocks()
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    if (String(input).includes('/api/auth/me')) {
      return Promise.resolve(json({ user: { id: '1', name: 'Ana Admin', role: 'admin' } }))
    }
    return Promise.resolve(json({ usuarios: 1, digitales: 0, fisicas: 0, resultado: [] }))
  })
})

afterEach(() => {
  vi.useRealTimers()
  globalThis.fetch = originalFetch
})

/** Saludo que muestra la vista general a la hora UTC indicada. */
async function saludoA(utc: string): Promise<string> {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(utc))
  const res = await router.fetch(new Request('http://localhost/ordena/admin'))
  const html = (await res?.text()) ?? ''
  return html.match(/<h1 class="page-title">([^<]*)<\/h1>/)?.[1] ?? ''
}

describe('saludo de la vista general', () => {
  it('por la mañana dice «Buenos días», con la tilde bien', async () => {
    // 15:00 UTC = 09:00 en Tlaquepaque.
    const saludo = await saludoA('2026-10-09T15:00:00Z')
    expect(saludo).toBe('Buenos días, Ana')
    expect(saludo).not.toContain('Ã')
  })

  it('a las 5 de la mañana ya es «Buenos días»', async () => {
    expect(await saludoA('2026-10-09T11:00:00Z')).toBe('Buenos días, Ana')
  })

  it('de las 12 a las 19 es «Buenas tardes»', async () => {
    expect(await saludoA('2026-10-09T20:00:00Z')).toBe('Buenas tardes, Ana')
  })

  it('desde las 19 y de madrugada es «Buenas noches»', async () => {
    expect(await saludoA('2026-10-10T01:00:00Z')).toBe('Buenas noches, Ana') // 19:00
    expect(await saludoA('2026-10-10T06:30:00Z')).toBe('Buenas noches, Ana') // 00:30
    expect(await saludoA('2026-10-10T10:59:00Z')).toBe('Buenas noches, Ana') // 04:59
  })
})
