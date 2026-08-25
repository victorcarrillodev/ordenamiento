import { afterEach, describe, expect, it, vi } from 'vitest'

import { logoutBackend, requireAdminUser } from './backend.ts'

/**
 * requireAdminUser() is the single guard every /admin/* controller calls
 * before rendering anything (see app/actions/admin/*-controller.tsx). This
 * mocks the backend's `/api/auth/me` response instead of running a real
 * Postgres + backend, so the redirect-when-not-admin behavior is provable
 * without live infrastructure.
 */
function mockAuthMeResponse(user: { id: number; name: string; role: string } | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ user }), { status: 200 })),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
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
    mockAuthMeResponse({ id: 7, name: 'Ciudadano', role: 'user' })
    const result = await requireAdminUser(new Request('http://localhost/ordena/admin'))
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).headers.get('location')).toContain('/login')
  })

  it('lets an admin session through and returns the user', async () => {
    mockAuthMeResponse({ id: 1, name: 'Root', role: 'admin' })
    const result = await requireAdminUser(new Request('http://localhost/ordena/admin'))
    expect(result).not.toBeInstanceOf(Response)
    expect(result).toEqual({ id: 1, name: 'Root', role: 'admin' })
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
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'set-cookie': 'ordenamiento_session=; HttpOnly; Path=/; Max-Age=0' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const setCookie = await logoutBackend(new Request('http://localhost/ordena/admin'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit | undefined]
    expect(String(url)).toContain('/api/auth/logout')
    expect(init?.method).toBe('POST')
    expect(setCookie).toContain('Max-Age=0')
  })
})
