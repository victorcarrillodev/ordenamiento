import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireAdminUser } from './backend.ts'

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
