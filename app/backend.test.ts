import { afterEach, describe, expect, it } from 'vitest'

import { logoutBackend, requireAdminUser } from './backend.ts'

const originalFetch = globalThis.fetch

function mockAuthMeResponse(user: { id: string; name: string; role: string } | null) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ user }), { status: 200 })) as unknown as typeof fetch
}

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('requireAdminUser', () => {
  it('redirects an anonymous visitor (no session) instead of granting access', async () => {
    mockAuthMeResponse(null)
    const result = await requireAdminUser(new Request('http://localhost/ordena/admin'))
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBeGreaterThanOrEqual(300)
    expect((result as Response).status).toBeLessThan(400)
    expect((result as Response).headers.get('location')).toContain('/login')
  })

  it('redirects a logged-in citizen account (role "user") instead of granting access', async () => {
    mockAuthMeResponse({ id: '00000000-0000-4000-a000-000000000007', name: 'Ciudadano', role: 'user' })
    const result = await requireAdminUser(new Request('http://localhost/ordena/admin'))
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get('location')).toContain('/login')
  })

  it('lets an admin session through and returns the user', async () => {
    mockAuthMeResponse({ id: '00000000-0000-4000-a000-000000000001', name: 'Root', role: 'admin' })
    const result = await requireAdminUser(new Request('http://localhost/ordena/admin'))
    expect(result).not.toBeInstanceOf(Response)
    expect(result).toEqual({ id: '00000000-0000-4000-a000-000000000001', name: 'Root', role: 'admin' })
  })
})

/**
 * Regression test: the sidebar's "Cerrar sesión" button used to be a plain
 * `<a href="/login">` that never called this endpoint at all, so the
 * session cookie stayed valid after "logging out" and /admin/* let the
 * same session straight back in.
 */
describe('logoutBackend', () => {
  it('calls POST /api/auth/logout and forwards the expiring Set-Cookie', async () => {
    let calledUrl = ''
    let calledMethod = ''
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calledUrl = String(url)
      calledMethod = init?.method ?? ''
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'set-cookie': 'ordenamiento_session=; HttpOnly; Path=/; Max-Age=0' },
      })
    }) as unknown as typeof fetch

    const setCookie = await logoutBackend(new Request('http://localhost/ordena/admin'))

    expect(calledUrl).toContain('/api/auth/logout')
    expect(calledMethod).toBe('POST')
    expect(setCookie).toContain('Max-Age=0')
  })
})
