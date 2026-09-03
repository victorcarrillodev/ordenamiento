import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * /admin/usuarios: pantalla propia, separada de la vista general.
 *
 * El backend se simula con `fetch`: `/api/auth/me` decide la sesión y
 * `/api/users` el resultado del alta.
 */

const originalFetch = globalThis.fetch

const ADMIN = { id: '1', name: 'Admin', role: 'admin', email: 'admin@tlaquepaque.gob.mx' }

const USUARIOS = [
  {
    id: '1',
    email: 'admin@tlaquepaque.gob.mx',
    name: 'Ada Root',
    role: 'admin',
    created_at: '2026-01-05T10:00:00Z',
  },
  {
    id: '2',
    email: 'juan@ejemplo.com',
    name: 'Juan Pérez',
    role: 'user',
    created_at: '2026-02-10T10:00:00Z',
  },
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** `altaStatus` es el status con el que responde POST /api/users. */
function backendConSesionAdmin(altaStatus = 201) {
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
    if (url.includes('/api/users') && init?.method === 'POST') {
      return Promise.resolve(json(altaStatus < 400 ? { ok: true } : { error: 'x' }, altaStatus))
    }
    if (url.includes('/api/users')) return Promise.resolve(json({ users: USUARIOS }))
    return Promise.resolve(json({}))
  })
}

function get(path: string) {
  return router.fetch(new Request(`http://localhost${path}`))
}

function crearUsuario(campos: Record<string, string>) {
  return router.fetch(
    new Request('http://localhost/ordena/admin/usuarios', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(campos),
    }),
  )
}

const DATOS_VALIDOS = {
  name: 'Nueva Cuenta',
  email: 'nueva@ejemplo.com',
  password: 'contrasena-larga',
  role: 'user',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Separación entre vista general y usuarios', () => {
  it('/admin/usuarios es su propia ruta y lista las cuentas', async () => {
    backendConSesionAdmin()

    const response = await get('/ordena/admin/usuarios')

    expect(response?.status).toBe(200)
    const html = await response!.text()
    expect(html).toContain('Cuentas registradas')
    expect(html).toContain('juan@ejemplo.com')
  })

  it('la vista general no administra cuentas: solo enlaza a /admin/usuarios', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
      return Promise.resolve(json({ usuarios: 2, digitales: 0, fisicas: 0, resultado: [] }))
    })

    const html = await (await get('/ordena/admin'))!.text()

    expect(html).toContain('/ordena/admin/usuarios')
    // El formulario de alta vive solo en su pantalla.
    expect(html).not.toContain('＋ Crear usuario')
  })
})

describe('Alta de usuario', () => {
  it('cuenta el total, los administradores y los ciudadanos', async () => {
    backendConSesionAdmin()

    const html = await (await get('/ordena/admin/usuarios'))!.text()

    expect(html).toContain('Administradores')
    expect(html).toContain('Ciudadanos')
  })

  it('rechaza datos incompletos sin llamar al alta', async () => {
    backendConSesionAdmin()

    const response = await crearUsuario({ ...DATOS_VALIDOS, password: 'corta' })

    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=datos')
  })

  it('confirma el alta correcta', async () => {
    backendConSesionAdmin(201)

    const response = await crearUsuario(DATOS_VALIDOS)

    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=ok')
  })

  it('avisa cuando el correo ya existe en vez de fingir que se creó', async () => {
    backendConSesionAdmin(409)

    const response = await crearUsuario(DATOS_VALIDOS)

    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=duplicado')
  })

  it('avisa cuando el backend no responde', async () => {
    backendConSesionAdmin(503)

    const response = await crearUsuario(DATOS_VALIDOS)

    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=backend')
  })

  it('muestra el acuse de éxito al volver con ?estado=ok', async () => {
    backendConSesionAdmin()

    const html = await (await get('/ordena/admin/usuarios?estado=ok'))!.text()

    expect(html).toContain('La cuenta se creó correctamente')
  })

  it('muestra el motivo real cuando el correo estaba repetido', async () => {
    backendConSesionAdmin()

    const html = await (await get('/ordena/admin/usuarios?estado=duplicado'))!.text()

    expect(html).toContain('Ese correo ya tiene una cuenta')
  })

  it('ignora un ?estado= inventado en la URL', async () => {
    backendConSesionAdmin()

    const html = await (await get('/ordena/admin/usuarios?estado=<script>'))!.text()

    expect(html).not.toContain('admin-alert')
  })
})

describe('Datos hostiles del backend', () => {
  it('escapa nombre y correo en la celda y en el atributo de búsqueda', async () => {
    const venenoso = {
      id: '9',
      name: '"><img src=x onerror=alert(1)>',
      email: 'a@b.mx" onmouseover="alert(2)',
      role: 'user',
      created_at: '2026-04-01T10:00:00Z',
    }
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
      return Promise.resolve(json({ users: [venenoso] }))
    })

    const html = await (await get('/ordena/admin/usuarios'))!.text()

    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).not.toContain('onmouseover="alert(2)"')
    expect(html).toContain('&lt;img')
  })

  it('no revienta con una fecha de registro inválida', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
      return Promise.resolve(
        json({
          users: [
            {
              id: '9',
              name: 'Sin fecha',
              email: 'a@b.mx',
              role: 'user',
              created_at: 'no-es-fecha',
            },
          ],
        }),
      )
    })

    const response = await get('/ordena/admin/usuarios')

    expect(response?.status).toBe(200)
    const html = await response!.text()
    expect(html).toContain('Sin fecha')
    expect(html).not.toContain('Invalid Date')
  })

  it('tolera que el backend no devuelva la lista', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
      return Promise.resolve(json({ error: 'boom' }, 500))
    })

    const response = await get('/ordena/admin/usuarios')

    expect(response?.status).toBe(200)
    expect(await response!.text()).toContain('Todavía no hay cuentas registradas')
  })
})
