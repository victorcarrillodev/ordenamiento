import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * El registro de sesiones —quién entró, cuándo y desde dónde— es solo de root.
 * Aquí se comprueba lo que ve cada rango: la pantalla, el menú y los botones que
 * llevan a ella. El backend lo vuelve a decidir en GET /api/sessions (ver
 * backend/src/sesiones-endpoints.test.ts): esto solo evita ofrecer lo que se va
 * a rechazar y enseñar una pantalla vacía.
 */

const originalFetch = globalThis.fetch

const CUENTAS = {
  root: { id: 'r1', name: 'Dueña del sistema', role: 'root', email: 'root@tlaquepaque.gob.mx' },
  admin: { id: 'a1', name: 'Admin Operativo', role: 'admin', email: 'admin@tlaquepaque.gob.mx' },
  user: { id: 'c1', name: 'Ciudadana', role: 'user', email: 'ciudadana@correo.mx' },
} as const

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Backend simulado: contesta como `rol` y deja registro de a qué se llamó. */
function backendComo(rol: keyof typeof CUENTAS | null) {
  const llamadas: string[] = []
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    llamadas.push(url)
    if (url.includes('/api/auth/me')) {
      return Promise.resolve(rol ? json({ user: CUENTAS[rol] }) : json({ user: null }, 401))
    }
    if (url.includes('/api/sessions')) {
      return Promise.resolve(
        json({
          items: [],
          total: 0,
          page: 1,
          limit: 25,
          resumen: { usuarios: 0, sesiones: 0, en_linea: 0, medidas: 0, segundos_totales: 0 },
        }),
      )
    }
    if (url.includes('/api/users')) return Promise.resolve(json({ users: [] }))
    if (url.includes('/api/stats')) return Promise.resolve(json({}))
    if (url.includes('/api/actividades')) {
      return Promise.resolve(
        json({
          actividades: [],
          resumen: {
            total: 0,
            proximas: 0,
            realizadas: 0,
            borradores: 0,
            avisosVigentes: 0,
            avisos: [],
          },
        }),
      )
    }
    return Promise.resolve(json({ ok: true, items: [], theme: {} }))
  })
  return llamadas
}

const get = (path: string) => router.fetch(new Request(`http://localhost${path}`))

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GET /admin/sesiones', () => {
  it('sin sesión lleva al inicio de sesión', async () => {
    backendComo(null)
    const res = await get('/ordena/admin/sesiones')
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('/login')
  })

  it('a la ciudadanía la lleva al inicio de sesión: no entra al panel', async () => {
    backendComo('user')
    const res = await get('/ordena/admin/sesiones')
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toContain('/login')
  })

  it('a un administrador le dice que es solo de root, con 403, y no consulta la bitácora', async () => {
    const llamadas = backendComo('admin')
    const res = await get('/ordena/admin/sesiones')
    expect(res?.status).toBe(403)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('Acceso restringido')
    expect(html).toContain('solo lo puede ver una cuenta root')
    expect(html).toContain('Volver a la vista general')
    // No hay datos de otras cuentas en la página ni se pidieron al backend.
    expect(llamadas.some((u) => /\/api\/sessions(\?|$)/.test(u))).toBe(false)
    expect(html).not.toContain('sesiones-tbody')
  })

  it('a una cuenta root le muestra la bitácora', async () => {
    const llamadas = backendComo('root')
    const res = await get('/ordena/admin/sesiones')
    expect(res?.status).toBe(200)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('sesiones-tbody')
    expect(llamadas.some((u) => /\/api\/sessions\?/.test(u))).toBe(true)
  })
})

describe('lo que ofrece el panel a cada rango', () => {
  const ENLACE = 'href="/ordena/admin/sesiones"'
  const PANTALLAS = [
    '/ordena/admin',
    '/ordena/admin/usuarios',
    '/ordena/admin/cuenta',
    '/ordena/admin/estadisticas',
  ]

  it('un administrador no ve «Registro de sesiones» en ninguna pantalla: ni menú ni botones', async () => {
    backendComo('admin')
    for (const ruta of PANTALLAS) {
      const html = (await (await get(ruta))?.text()) ?? ''
      expect(html, ruta).not.toContain(ENLACE)
      expect(html, ruta).not.toContain('Registro de sesiones')
    }
  })

  it('una cuenta root lo ve en el menú de cada pantalla', async () => {
    backendComo('root')
    for (const ruta of PANTALLAS) {
      const html = (await (await get(ruta))?.text()) ?? ''
      expect(html, ruta).toContain(ENLACE)
      expect(html, ruta).toContain('Registro de sesiones')
    }
  })

  it('el panel de accesos rápidos y el encabezado de Usuarios traen el botón solo para root', async () => {
    backendComo('root')
    const inicio = (await (await get('/ordena/admin'))?.text()) ?? ''
    expect(inicio).toContain('acciones-rapidas')
    expect(inicio.match(/href="\/ordena\/admin\/sesiones"/g)?.length).toBe(2) // menú + botón
    const usuarios = (await (await get('/ordena/admin/usuarios'))?.text()) ?? ''
    expect(usuarios.match(/href="\/ordena\/admin\/sesiones"/g)?.length).toBe(2)
  })
})
