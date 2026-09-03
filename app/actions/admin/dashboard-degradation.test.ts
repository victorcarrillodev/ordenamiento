import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

describe('Dashboard · degradación con shapes inesperados', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = originalFetch))

  function mockDashboard(statsResponse: { status: number; body: unknown }) {
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      if (u.includes('/api/auth/me')) {
        return Promise.resolve(
          new Response(JSON.stringify({ user: { id: 1, name: 'Admin', role: 'admin' } }), {
            status: 200,
          }),
        )
      }
      if (u.includes('/api/stats')) {
        return Promise.resolve(
          new Response(JSON.stringify(statsResponse.body), { status: statsResponse.status }),
        )
      }
      if (u.includes('/api/users')) {
        return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }) as unknown as typeof fetch
  }

  it('backend 200 pero body {} → 200 con fallbacks tipados, no TypeError', async () => {
    mockDashboard({ status: 200, body: {} })
    const r = await router.fetch(new Request('http://localhost/ordena/admin'))
    expect(r?.status).toBe(200)
    const html = await r?.text()
    expect(html).not.toContain('TypeError')
    expect(html).not.toContain('Cannot read')
  })

  it('backend 503 → 200 con fallbacks', async () => {
    mockDashboard({ status: 503, body: { error: 'caído' } })
    const r = await router.fetch(new Request('http://localhost/ordena/admin'))
    expect(r?.status).toBe(200)
    const html = await r?.text()
    expect(html.length).toBeGreaterThan(0)
  })

  it('backend 200 con JSON no parseable → fallback', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      if (u.includes('/api/auth/me'))
        return Promise.resolve(
          new Response(JSON.stringify({ user: { id: 1, name: 'Admin', role: 'admin' } }), {
            status: 200,
          }),
        )
      if (u.includes('/api/stats')) return Promise.resolve(new Response('no-json', { status: 200 }))
      if (u.includes('/api/users'))
        return Promise.resolve(new Response(JSON.stringify({ users: [] }), { status: 200 }))
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }) as unknown as typeof fetch
    const r = await router.fetch(new Request('http://localhost/ordena/admin'))
    expect(r?.status).toBe(200)
  })

  // Antes reventaba: la dona hacía `.reduce` sobre `stats.resultado`, que en
  // un shape parcial llega `undefined`. Las gráficas compartidas ya toleran la
  // ausencia de cada serie, así que el panel se dibuja vacío en vez de fallar.
  it('body con shape parcial {usuarios: 5} sin digitales/fisicas → no revienta', async () => {
    mockDashboard({ status: 200, body: { usuarios: 5 } })
    const r = await router.fetch(new Request('http://localhost/ordena/admin'))
    expect(r?.status).toBe(200)
    const html = await r?.text()
    expect(html).not.toContain('TypeError')
    expect(html).toContain('Sin datos todavía')
  })
})
