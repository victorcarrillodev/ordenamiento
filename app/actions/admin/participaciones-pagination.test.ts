/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

/**
 * Fuzz y bordes de paginación (C2).
 * Verifica que page/limit malformados caen a default 1/10 y que el bloque
 * de paginación solo aparece cuando corresponde.
 */

const ORIGINAL_FETCH = globalThis.fetch

function mockParticipacionesBackend(capture: { url: string | null; response: { items: unknown[]; total: number; page: number; limit: number } }) {
  globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
    const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
    if (u.includes('/api/auth/me')) {
      return Promise.resolve(new Response(JSON.stringify({ user: { id: 1, name: 'Admin', role: 'admin' } }), { status: 200, headers: { 'content-type': 'application/json' } }))
    }
    if (u.includes('/api/participations')) {
      capture.url = u
      // Echo back page/limit from query for verification, but allow override via capture.response
      const parsed = new URL(u, 'http://localhost')
      const page = Number(parsed.searchParams.get('page'))
      const limit = Number(parsed.searchParams.get('limit'))
      const body = capture.response ?? { items: [], total: 0, page: Number.isInteger(page) && page > 0 ? page : 1, limit: Number.isInteger(limit) && limit > 0 ? limit : 10 }
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }))
    }
    if (u.includes('/api/stats')) return Promise.resolve(new Response(JSON.stringify({ usuarios: 1, digitales: 1, fisicas: 0, resultado: [], fuente: [], genero: [], tematica: [] }), { status: 200 }))
    if (u.includes('/api/users')) return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }))
    if (u.includes('/api/reuniones')) return Promise.resolve(new Response(JSON.stringify({ reuniones: [] }), { status: 200 }))
    if (u.includes('/api/avisos')) return Promise.resolve(new Response(JSON.stringify({ avisos: [] }), { status: 200 }))
    if (u.includes('/api/poel')) return Promise.resolve(new Response(JSON.stringify({ sesiones: [] }), { status: 200 }))
    if (u.includes('/api/settings/theme')) return Promise.resolve(new Response(JSON.stringify({ theme: {} }), { status: 200 }))
    if (u.includes('/api/settings/audit')) return Promise.resolve(new Response(JSON.stringify({ logs: [] }), { status: 200 }))
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
  }) as unknown as typeof fetch
}

describe('Paginación participaciones · fuzz page/limit', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  const fuzzCases: Array<{ page: string | null; limit: string | null; expectedPage: number; expectedLimit: number; label: string }> = [
    { page: '-1', limit: '-1', expectedPage: 1, expectedLimit: 10, label: '-1/-1' },
    { page: '0', limit: '0', expectedPage: 1, expectedLimit: 10, label: '0/0' },
    { page: 'NaN', limit: 'NaN', expectedPage: 1, expectedLimit: 10, label: 'NaN/NaN' },
    { page: 'abc', limit: 'xyz', expectedPage: 1, expectedLimit: 10, label: 'texto/texto' },
    { page: '', limit: '', expectedPage: 1, expectedLimit: 10, label: 'vacío/vacío' },
    { page: '1.5', limit: '2.7', expectedPage: 1, expectedLimit: 10, label: 'float' },
    { page: '1', limit: '10', expectedPage: 1, expectedLimit: 10, label: 'válido 1/10' },
    { page: '999999', limit: '10', expectedPage: 999999, expectedLimit: 10, label: 'page extremo 999999' },
    { page: '1', limit: '999999', expectedPage: 1, expectedLimit: 999999, label: 'limit extremo 999999' },
  ]

  for (const c of fuzzCases) {
    it(`fuzz ${c.label} → page=${c.expectedPage} limit=${c.expectedLimit}`, async () => {
      const capture: { url: string | null; response: { items: unknown[]; total: number; page: number; limit: number } } = { url: null, response: { items: [], total: 0, page: c.expectedPage, limit: c.expectedLimit } }
      mockParticipacionesBackend(capture)
      const url = new URL('http://localhost/ordena/admin/participaciones')
      if (c.page !== null) url.searchParams.set('page', c.page)
      if (c.limit !== null) url.searchParams.set('limit', c.limit)
      const res = await router.fetch(new Request(url.toString()))
      expect(res?.status).toBe(200)
      // Verifica que el backend recibió los valores saneados (fallback a 1/10)
      expect(capture.url).not.toBeNull()
      const backendUrl = new URL(capture.url!)
      const sentPage = Number(backendUrl.searchParams.get('page'))
      const sentLimit = Number(backendUrl.searchParams.get('limit'))
      expect(sentPage).toBe(c.expectedPage)
      expect(sentLimit).toBe(c.expectedLimit)
      // No debe romper: status 200
    })
  }

  it('sin page/limit explícitos → default 1/10', async () => {
    const capture: any = { url: null, response: { items: [], total: 0, page: 1, limit: 10 } }
    mockParticipacionesBackend(capture)
    const res = await router.fetch(new Request('http://localhost/ordena/admin/participaciones'))
    expect(res?.status).toBe(200)
    const backendUrl = new URL(capture.url!)
    expect(Number(backendUrl.searchParams.get('page'))).toBe(1)
    expect(Number(backendUrl.searchParams.get('limit'))).toBe(10)
  })

  it('page/limit con espacios y caracteres raros → fallback', async () => {
    const capture: any = { url: null, response: { items: [], total: 0, page: 1, limit: 10 } }
    mockParticipacionesBackend(capture)
    const res = await router.fetch(new Request('http://localhost/ordena/admin/participaciones?page=%20%201%20&limit=%20'))
    expect(res?.status).toBe(200)
    // '  1 ' → Number('  1 ') =1 → válido, limit '' → fallback 10
    const backendUrl = new URL(capture.url!)
    expect(Number(backendUrl.searchParams.get('page'))).toBe(1)
    expect(Number(backendUrl.searchParams.get('limit'))).toBe(10)
  })
})

describe('Paginación · renderizado condicional', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = ORIGINAL_FETCH))

  it('total=0 → no muestra bloque de paginación (total>0 falso)', async () => {
    const capture: any = { url: null, response: { items: [], total: 0, page: 1, limit: 10 } }
    mockParticipacionesBackend(capture)
    const res = await router.fetch(new Request('http://localhost/ordena/admin/participaciones'))
    expect(res?.status).toBe(200)
    const html = await res?.text()
    expect(html).not.toContain('paginacion__meta')
    expect(html).not.toContain('paginacion__nav')
    expect(html).toContain('No hay registros')
  })

  it('total=5 limit=10 → totalPages=1 → muestra meta pero NO nav', async () => {
    const capture: any = { url: null, response: { items: [{ id: 1, folio: 'X', origen: 'digital', nombre: 'A', estado: 'En proceso', fecha: new Date().toISOString(), adjuntos: [] }], total: 5, page: 1, limit: 10 } }
    mockParticipacionesBackend(capture)
    const res = await router.fetch(new Request('http://localhost/ordena/admin/participaciones?page=1&limit=10'))
    expect(res?.status).toBe(200)
    const html = await res?.text()
    expect(html).toContain('Mostrando 1–5 de 5 registros')
    expect(html).not.toContain('paginacion__nav')
  })

  it('total=25 limit=10 → totalPages=3 → muestra nav con Anterior/Siguiente', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, folio: `F-${i}`, origen: 'digital', nombre: `N${i}`, estado: 'En proceso', fecha: new Date().toISOString(), adjuntos: [] }))
    const capture: any = { url: null, response: { items, total: 25, page: 2, limit: 10 } }
    mockParticipacionesBackend(capture)
    const res = await router.fetch(new Request('http://localhost/ordena/admin/participaciones?page=2&limit=10'))
    expect(res?.status).toBe(200)
    const html = await res?.text()
    expect(html).toContain('Mostrando 11–20 de 25 registros')
    expect(html).toContain('paginacion__nav')
    expect(html).toContain('Anterior')
    expect(html).toContain('Siguiente')
  })

  it('totalPages cálculo nunca es 0: total=0 limit=10 → totalPages=1 (Math.max)', async () => {
    const capture: any = { url: null, response: { items: [], total: 0, page: 1, limit: 10 } }
    mockParticipacionesBackend(capture)
    const res = await router.fetch(new Request('http://localhost/ordena/admin/participaciones'))
    const html = await res?.text()
    // Si totalPages fuera 0, habría división por cero o NaN en desde/hasta; verifica que no crashea
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('Infinity')
  })
})
