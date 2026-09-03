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
      '/ordena/admin/sesiones',
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
      { path: '/ordena/admin/usuarios', name: 'Usuarios' },
      { path: '/ordena/admin/cuenta', name: 'Cuenta' },
      { path: '/ordena/admin/personalizacion', name: 'Personalización' },
    ]

    for (const page of adminPages) {
      it(`renders 200 OK for admin on ${page.name} (${page.path})`, async () => {
        const response = await router.fetch(new Request(`http://localhost${page.path}`))
        expect(response?.status).toBe(200)
      })
    }

    it('GET /ordena/admin/usuarios contiene "Crear usuario" y Vista General no', async () => {
      const usuariosRes = await router.fetch(new Request('http://localhost/ordena/admin/usuarios'))
      expect(usuariosRes?.status).toBe(200)
      expect(await usuariosRes?.text()).toContain('Crear cuenta')

      const indexRes = await router.fetch(new Request('http://localhost/ordena/admin'))
      expect(indexRes?.status).toBe(200)
      expect(await indexRes?.text()).not.toContain('Crear cuenta')
    })

    it('GET /ordena/admin/estadisticas ofrece las tres vistas y abre en Totales', async () => {
      const res = await router.fetch(new Request('http://localhost/ordena/admin/estadisticas'))
      expect(res?.status).toBe(200)
      const html = await res?.text()
      expect(html).toContain('>Totales<')
      expect(html).toContain('>Digitales<')
      expect(html).toContain('>Físicas<')
      // Sin `?vista=`, la pestaña activa es la de totales.
      expect(html).toContain('aria-selected="true" href="/ordena/admin/estadisticas"')
    })

    it('GET /ordena/admin/estadisticas?vista=fisica activa la vista de físicas', async () => {
      const res = await router.fetch(
        new Request('http://localhost/ordena/admin/estadisticas?vista=fisica'),
      )
      expect(res?.status).toBe(200)
      const html = await res?.text()
      expect(html).toContain('aria-selected="true" href="/ordena/admin/estadisticas?vista=fisica"')
      // La comparativa digital/física solo tiene sentido en la vista de totales.
      expect(html).not.toContain('Digitales frente a físicas')
    })

    it('GET /ordena/admin/estadisticas con ?vista= inventada cae en totales', async () => {
      const res = await router.fetch(
        new Request('http://localhost/ordena/admin/estadisticas?vista=<script>'),
      )
      expect(res?.status).toBe(200)
      expect(await res?.text()).toContain('aria-selected="true" href="/ordena/admin/estadisticas"')
    })

    it('cada pantalla del panel trae un solo título y su subtítulo', async () => {
      // El encabezado lo dibuja AdminLayout. Si una página vuelve a poner el
      // suyo, aparecen dos títulos; si olvida el subtítulo, se pierde la única
      // frase que explica para qué sirve esa pantalla.
      const rutas = [
        '/ordena/admin/estadisticas',
        '/ordena/admin/usuarios',
        '/ordena/admin/sesiones',
        '/ordena/admin/cuenta',
        '/ordena/admin/exportar',
        '/ordena/admin/reuniones',
        '/ordena/admin/avisos',
        '/ordena/admin/poel',
        '/ordena/admin/actividades',
        '/ordena/admin/documentos',
        '/ordena/admin/indicadores',
        '/ordena/admin/participaciones?origen=fisica',
        '/ordena/admin/participaciones/nueva',
        '/ordena/admin/personalizacion',
      ]

      for (const ruta of rutas) {
        const res = await router.fetch(new Request(`http://localhost${ruta}`))
        expect(res?.status, ruta).toBe(200)
        const html = (await res?.text()) ?? ''
        expect(html.match(/class="page-title"/g)?.length ?? 0, ruta).toBe(1)
        expect(html.includes('class="page-subtitle"'), ruta).toBe(true)
        // Y ningún enlace prometiendo algo que no lleva a ningún lado.
        expect(html.includes('href="#"'), ruta).toBe(false)
      }
    })

    it('GET /ordena/admin/sesiones muestra la bitácora de accesos', async () => {
      const res = await router.fetch(new Request('http://localhost/ordena/admin/sesiones'))
      expect(res?.status).toBe(200)
      const html = await res?.text()
      expect(html).toContain('Registro de sesiones')
      expect(html).toContain('Tiempo conectado')
    })

    it('POST /ordena/admin/participaciones/nueva guarda participación física y redirige con folio', async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
        const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
        if (u.includes('/api/auth/me')) {
          return Promise.resolve(
            new Response(JSON.stringify({ user: { id: 1, name: 'Admin Root', role: 'admin' } }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }
        if (u.includes('/api/participations')) {
          return Promise.resolve(
            new Response(JSON.stringify({ id: 105, folio: 'FIS-2026-009' }), {
              status: 201,
              headers: { 'content-type': 'application/json' },
            }),
          )
        }
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      })

      const fd = new FormData()
      fd.set('nombre', 'Ciudadano Físico')
      fd.set('correo', 'fisico@ejemplo.com')
      fd.set('calle', 'Juárez 50')
      fd.set('colonia', 'Centro')
      fd.set('municipio', 'San Pedro Tlaquepaque')
      fd.set('cp', '45500')
      fd.set('observacion', 'Aporte en módulo físico')

      const response = await router.fetch(
        new Request('http://localhost/ordena/admin/participaciones/nueva', {
          method: 'POST',
          body: fd,
        }),
      )
      expect(response?.status).toBe(302)
      expect(response?.headers.get('location')).toContain('registrado=FIS-2026-009')
    })
  })
})
