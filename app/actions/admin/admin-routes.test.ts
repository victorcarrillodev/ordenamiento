import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

describe('Admin Routes Protection & Navigation', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('Unauthenticated & non-admin protection', () => {
    const protectedRoutes = [
      '/ordena/admin',
      '/ordena/admin/reuniones',
      '/ordena/admin/exportar',
      '/ordena/admin/usuarios',
      '/ordena/admin/participaciones',
      '/ordena/admin/participaciones/1',
      '/ordena/admin/participaciones/nueva',
      '/ordena/admin/avisos',
      '/ordena/admin/poel',
      '/ordena/admin/estadisticas',
      '/ordena/admin/cuenta',
      '/ordena/admin/personalizacion',
    ]

    for (const path of protectedRoutes) {
      it(`redirects unauthenticated request to /ordena/login for ${path}`, async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ user: null }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          }),
        )

        const response = await router.fetch(new Request(`http://localhost${path}`))
        expect(response?.status).toBe(302)
        expect(response?.headers.get('location')).toBe('/ordena/login')
      })

      it(`redirects non-admin role user to /ordena/login for ${path}`, async () => {
        globalThis.fetch = vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ user: { id: 2, name: 'Ciudadano', role: 'user' } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )

        const response = await router.fetch(new Request(`http://localhost${path}`))
        expect(response?.status).toBe(302)
        expect(response?.headers.get('location')).toBe('/ordena/login')
      })
    }
  })

  describe('Authenticated Admin access', () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()

        if (u.includes('/api/auth/me')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                user: { id: 1, name: 'Admin Root', role: 'admin' },
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          )
        }

        if (u.includes('/api/stats')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                usuarios: 10,
                digitales: 5,
                fisicas: 3,
                resultado: [],
                porTema: [],
                porGenero: [],
                porDia: [],
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          )
        }

        if (u.includes('/api/users')) {
          return Promise.resolve(
            new Response(JSON.stringify({ users: [] }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }

        if (u.includes('/api/reuniones')) {
          return Promise.resolve(
            new Response(JSON.stringify({ reuniones: [] }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }

        if (u.includes('/api/avisos')) {
          return Promise.resolve(
            new Response(JSON.stringify({ avisos: [] }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }

        if (u.includes('/api/poel')) {
          return Promise.resolve(
            new Response(JSON.stringify({ sesiones: [] }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }

        if (u.includes('/api/participations/1')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 1,
                folio: 'PRT-2026-0001',
                nombre: 'Ana López',
                origen: 'digital',
                created_at: new Date().toISOString(),
                attachments: [],
              }),
              { status: 200, headers: { 'content-type': 'application/json' } },
            ),
          )
        }

        if (u.includes('/api/participations')) {
          return Promise.resolve(
            new Response(JSON.stringify({ items: [] }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }

        if (u.includes('/api/settings/theme')) {
          return Promise.resolve(
            new Response(JSON.stringify({ theme: {} }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }

        if (u.includes('/api/settings/audit')) {
          return Promise.resolve(
            new Response(JSON.stringify({ logs: [] }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }

        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      })
    })

    const adminPages = [
      { path: '/ordena/admin', name: 'Vista General' },
      { path: '/ordena/admin/reuniones', name: 'Reuniones' },
      { path: '/ordena/admin/exportar', name: 'Exportar' },
      { path: '/ordena/admin/participaciones', name: 'Participaciones' },
      { path: '/ordena/admin/participaciones/nueva', name: 'Nueva Participación' },
      { path: '/ordena/admin/participaciones/1', name: 'Detalle de Participación' },
      { path: '/ordena/admin/avisos', name: 'Avisos' },
      { path: '/ordena/admin/poel', name: 'POEL' },
      { path: '/ordena/admin/estadisticas', name: 'Estadísticas' },
      { path: '/ordena/admin/cuenta', name: 'Cuenta' },
      { path: '/ordena/admin/personalizacion', name: 'Personalización' },
    ]

    for (const page of adminPages) {
      it(`renders 200 OK for admin on ${page.name} (${page.path})`, async () => {
        const response = await router.fetch(new Request(`http://localhost${page.path}`))
        expect(response?.status).toBe(200)
      })
    }
  })
})
