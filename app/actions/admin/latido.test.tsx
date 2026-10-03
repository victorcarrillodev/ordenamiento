import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'remix/ui/server'

import { router } from '../../router.ts'
import { adminRoutes } from '../../routes.ts'
import { AdminLayout } from '../../ui/admin/admin-layout.tsx'

/**
 * Aviso de presencia del panel (`public/presencia.js` → esta ruta → el backend).
 * Lo que interesa: que cruce la sesión de la cookie, que un aviso perdido no sea
 * un error para quien usa el panel, y que solo un 401 haga callar al script.
 */
const original = globalThis.fetch

function aviso(init: RequestInit = {}) {
  return router.fetch(
    new Request('http://localhost/ordena/admin/api/sesion/latido', {
      method: 'POST',
      headers: { cookie: 'ordenamiento_session=la-cookie' },
      ...init,
    }),
  )
}

function backendResponde(status: number) {
  globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status }))
  return globalThis.fetch as unknown as ReturnType<typeof vi.fn>
}

describe('POST /admin/api/sesion/latido', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = original))

  it('lo pasa al backend con la cookie de la persona y responde 204 sin cuerpo', async () => {
    const fetchMock = backendResponde(204)
    const res = await aviso()

    expect(res?.status).toBe(204)
    expect(await res?.text()).toBe('')
    expect(res?.headers.get('cache-control')).toBe('no-store')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toContain('/api/sessions/ping')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('cookie')).toBe('ordenamiento_session=la-cookie')
  })

  it('con la sesión terminada responde 401, para que el script deje de avisar', async () => {
    backendResponde(401)
    const res = await aviso()
    expect(res?.status).toBe(401)
    expect(await res?.text()).toBe('')
  })

  it('un aviso perdido no es un error: si el backend falla, 204 igual', async () => {
    backendResponde(500)
    expect((await aviso())?.status).toBe(204)
    backendResponde(503)
    expect((await aviso())?.status).toBe(204)
  })

  it('sin backend alcanzable tampoco: 204', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    expect((await aviso())?.status).toBe(204)
  })

  it('la ruta cuelga de /api/: server.ts solo deja pasar tal cual los errores de las rutas /api/', async () => {
    // Sin eso, el 401 se convertiría en la página de error y el script no sabría que
    // la sesión terminó: seguiría avisando cada 30 segundos con una sesión inválida.
    expect(adminRoutes.latido.href()).toContain('/api/')
  })

  it('solo se responde a POST', async () => {
    backendResponde(204)
    const res = await router.fetch(new Request('http://localhost/ordena/admin/api/sesion/latido'))
    expect(res?.status).not.toBe(204)
  })
})

describe('la plantilla del panel prepara la presencia', () => {
  const pantalla = () =>
    renderToString(
      <AdminLayout user={{ name: 'Ana', role: 'admin' }} active="general" title="Vista general">
        <p>Contenido</p>
      </AdminLayout>,
    )

  it('carga el script de presencia junto a los demás del panel', async () => {
    const html = await pantalla()
    expect(html).toContain('/presencia.js')
    expect(html).toMatch(/<script[^>]*src="[^"]*\/presencia\.js"[^>]*defer/)
  })

  it('marca la pantalla con la dirección del aviso, en el contenido y no en el head', async () => {
    const html = await pantalla()
    const marca = html.match(/<div[^>]*class="admin"[^>]*>/)?.[0] ?? ''
    expect(marca).toContain('data-latido="/ordena/admin/api/sesion/latido"')
    // Remix cambia el contenido sin recargar el documento: la marca tiene que viajar con él.
    expect(html.indexOf('data-latido')).toBeGreaterThan(html.indexOf('</head>'))
  })
})
