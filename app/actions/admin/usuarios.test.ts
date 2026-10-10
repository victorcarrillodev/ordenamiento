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
const ROOT = { id: '9', name: 'Dueña', role: 'root', email: 'root@tlaquepaque.gob.mx' }
const ID_PENDIENTE = '550e8400-e29b-41d4-a716-4466554400aa'

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
  {
    id: ID_PENDIENTE,
    email: 'pendiente@ejemplo.com',
    name: 'Pablo Pendiente',
    role: 'admin',
    created_at: '2026-10-01T10:00:00Z',
    setup_pending: true,
    setup_vencida: false,
  },
  {
    id: '550e8400-e29b-41d4-a716-4466554400bb',
    email: 'vencida@ejemplo.com',
    name: 'Vera Vencida',
    role: 'user',
    created_at: '2026-09-01T10:00:00Z',
    setup_pending: true,
    setup_vencida: true,
  },
]

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * Backend simulado. `altaStatus` es el status con el que responde POST /api/users y
 * `altaCuerpo` lo que trae (por omisión, el alta con el correo de bienvenida enviado).
 * Devuelve las llamadas hechas, para comprobar qué se le pidió al backend.
 */
function backendConSesion(
  quien: typeof ADMIN | typeof ROOT,
  altaStatus = 201,
  altaCuerpo: unknown = { ok: true, id: 'nuevo', correo: { enviado: true } },
) {
  const llamadas: Array<{ url: string; method: string; body?: string }> = []
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    llamadas.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })
    if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: quien }))
    if (url.includes('/api/users') && init?.method === 'POST') {
      return Promise.resolve(json(altaStatus < 400 ? altaCuerpo : { error: 'x' }, altaStatus))
    }
    if (url.includes('/api/users')) return Promise.resolve(json({ users: USUARIOS }))
    return Promise.resolve(json({}))
  })
  return llamadas
}

/** La sesión de siempre en estas pruebas: una cuenta root (la única que da de alta). */
const backendConSesionAdmin = (altaStatus = 201, altaCuerpo?: unknown) =>
  backendConSesion(ROOT, altaStatus, altaCuerpo)

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
    expect(html).not.toContain('＋ Crear cuenta')
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

  it('muestra el acuse de éxito al volver con ?estado=ok, y recuerda que la contraseña va por otro medio', async () => {
    backendConSesionAdmin()

    const html = await (await get('/ordena/admin/usuarios?estado=ok'))!.text()

    expect(html).toContain('La cuenta se creó y se le envió el correo de bienvenida')
    expect(html).toContain('contraseña provisional')
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

describe('Solo el root da de alta cuentas', () => {
  it('a una cuenta root le muestra el formulario con la contraseña provisional', async () => {
    backendConSesion(ROOT)

    const html = await (await get('/ordena/admin/usuarios'))!.text()

    expect(html).toContain('id="usuarios-nuevo"')
    expect(html).toContain('Contraseña provisional')
    expect(html).toContain('＋ Crear cuenta y enviar correo')
    expect(html).toContain('name="intent" value="crear"')
    // La escribe quien da de alta y se la entrega a la persona: se ve, no se oculta.
    expect(html).toMatch(
      /<input[^>]*id="u-pass"[^>]*type="text"|<input[^>]*type="text"[^>]*id="u-pass"/,
    )
    expect(html).toContain('no viaja en el correo')
    // Un root puede dar de alta cualquier rango.
    expect(html).toContain('<option value="root">Root</option>')
  })

  it('a un administrador no le ofrece el formulario: dice que solo root da de alta', async () => {
    backendConSesion(ADMIN)

    const html = await (await get('/ordena/admin/usuarios'))!.text()

    expect(html).not.toContain('name="intent" value="crear"')
    expect(html).not.toContain('id="u-pass"')
    expect(html).not.toContain('Crear cuenta y enviar correo')
    expect(html).toContain('puede')
    expect(html).toContain('dar de alta cuentas nuevas')
  })

  it('si un administrador manda el alta a mano, el backend la rechaza y se le explica', async () => {
    const llamadas = backendConSesion(ADMIN, 403)
    // Simula la respuesta real del backend para un administrador.
    globalThis.fetch = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
        if (url.includes('/api/users') && init?.method === 'POST') {
          return Promise.resolve(
            json(
              {
                error: 'Solo una cuenta root puede crear cuentas',
                motivo: 'solo_root_crea_cuentas',
              },
              403,
            ),
          )
        }
        return Promise.resolve(json({ users: USUARIOS }))
      })
    void llamadas

    const response = await crearUsuario(DATOS_VALIDOS)

    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=solo-root-crea')
    const html = await (await get('/ordena/admin/usuarios?estado=solo-root-crea'))!.text()
    expect(html).toContain('Solo una cuenta root puede dar de alta cuentas')
  })

  it('manda al backend nombre, correo, contraseña provisional y rango tal como se escribieron', async () => {
    const llamadas = backendConSesion(ROOT)

    await crearUsuario({ ...DATOS_VALIDOS, name: '  Nueva Cuenta ', role: 'admin' })

    const alta = llamadas.find((l) => l.method === 'POST' && l.url.endsWith('/api/users'))
    expect(JSON.parse(alta!.body!)).toEqual({
      name: 'Nueva Cuenta',
      email: 'nueva@ejemplo.com',
      password: 'contrasena-larga',
      role: 'admin',
    })
  })
})

describe('Acuse del alta según el correo de bienvenida', () => {
  it('sin SMTP configurado la cuenta se creó pero se avisa de que no hubo correo', async () => {
    backendConSesion(ROOT, 201, {
      ok: true,
      id: 'n',
      correo: { enviado: false, motivo: 'smtp_no_configurado' },
    })

    const response = await crearUsuario(DATOS_VALIDOS)
    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=ok-sin-smtp')

    const html = await (await get('/ordena/admin/usuarios?estado=ok-sin-smtp'))!.text()
    expect(html).toContain('admin-alert--warning')
    expect(html).toContain('el correo no está configurado')
    expect(html).toContain('Reenviar invitación')
  })

  it('si el correo falló la cuenta queda creada y se ofrece reintentar', async () => {
    backendConSesion(ROOT, 201, {
      ok: true,
      id: 'n',
      correo: { enviado: false, motivo: 'envio_fallido' },
    })

    const response = await crearUsuario(DATOS_VALIDOS)
    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=ok-envio-fallido')

    const html = await (await get('/ordena/admin/usuarios?estado=ok-envio-fallido'))!.text()
    expect(html).toContain('no se pudo enviar el correo de bienvenida')
  })

  it('un backend que no dice nada del correo se trata como alta con correo enviado', async () => {
    backendConSesion(ROOT, 201, { ok: true })
    const response = await crearUsuario(DATOS_VALIDOS)
    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=ok')
  })
})

describe('Cuentas por configurar en la lista', () => {
  it('marca las que aún no configuran su cuenta y las de invitación vencida', async () => {
    backendConSesion(ROOT)

    const html = await (await get('/ordena/admin/usuarios'))!.text()

    expect(html).toContain('Pendiente de configurar')
    expect(html).toContain('Invitación vencida')
    // Las cuentas ya configuradas no llevan ninguna marca.
    const fila = html.match(/<tr[^>]*data-search="[^"]*Juan Pérez[^"]*"[\s\S]*?<\/tr>/)![0]
    expect(fila).not.toContain('Pendiente de configurar')
    expect(fila).not.toContain('Reenviar invitación')
  })

  it('a root le ofrece reenviar la invitación solo en las cuentas pendientes', async () => {
    backendConSesion(ROOT)

    const html = await (await get('/ordena/admin/usuarios'))!.text()

    // Dos pendientes (una vencida): dos botones; ninguno en las demás.
    expect(html.match(/name="intent" value="invitacion"/g)).toHaveLength(2)
    expect(html).toContain(`name="id" value="${ID_PENDIENTE}"`)
    // En esas filas, la contraseña se llama provisional.
    expect(html).toContain('Contraseña provisional nueva')
  })

  it('a un administrador no le ofrece reenviar invitaciones, aunque vea el estado', async () => {
    backendConSesion(ADMIN)

    const html = await (await get('/ordena/admin/usuarios'))!.text()

    expect(html).toContain('Pendiente de configurar')
    expect(html).not.toContain('name="intent" value="invitacion"')
    expect(html).not.toContain('Reenviar invitación')
  })
})

describe('Reenviar la invitación', () => {
  const reenviar = (id: string) =>
    router.fetch(
      new Request('http://localhost/ordena/admin/usuarios', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ intent: 'invitacion', id }),
      }),
    )

  /** Backend que responde `status`/`cuerpo` a POST /api/users/:id/invitation. */
  function conRespuesta(status: number, cuerpo: unknown) {
    const llamadas: Array<{ url: string; method: string }> = []
    globalThis.fetch = vi
      .fn()
      .mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        llamadas.push({ url, method: init?.method ?? 'GET' })
        if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ROOT }))
        if (url.includes('/invitation')) return Promise.resolve(json(cuerpo, status))
        return Promise.resolve(json({ users: USUARIOS }))
      })
    return llamadas
  }

  it('pide al backend la invitación de ESA cuenta y confirma', async () => {
    const llamadas = conRespuesta(200, { ok: true, email: 'pendiente@ejemplo.com' })

    const response = await reenviar(ID_PENDIENTE)

    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=invitacion-ok')
    const peticion = llamadas.find((l) => l.url.includes('/invitation'))
    expect(peticion).toMatchObject({
      method: 'POST',
      url: expect.stringContaining(`/api/users/${ID_PENDIENTE}/invitation`),
    })
    const html = await (await get('/ordena/admin/usuarios?estado=invitacion-ok'))!.text()
    expect(html).toContain('Se reenvió la invitación')
  })

  it('si la cuenta ya se configuró, lo dice', async () => {
    conRespuesta(409, { error: 'x', motivo: 'no_pendiente' })
    const response = await reenviar(ID_PENDIENTE)
    expect(response?.headers.get('location')).toBe(
      '/ordena/admin/usuarios?estado=invitacion-no-pendiente',
    )
  })

  it('sin correo configurado en el servidor, lo dice y aclara que no se cambió nada', async () => {
    conRespuesta(503, { error: 'sin smtp' })
    const response = await reenviar(ID_PENDIENTE)
    expect(response?.headers.get('location')).toBe(
      '/ordena/admin/usuarios?estado=invitacion-sin-smtp',
    )
    const html = await (await get('/ordena/admin/usuarios?estado=invitacion-sin-smtp'))!.text()
    expect(html).toContain('No se cambió nada')
  })

  it('si el envío falla, ofrece reintentar', async () => {
    conRespuesta(502, { error: 'smtp', motivo: 'envio_fallido' })
    const response = await reenviar(ID_PENDIENTE)
    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=invitacion-error')
  })

  it('un administrador recibe el rechazo del backend traducido', async () => {
    conRespuesta(403, { error: 'Requiere rol root' })
    const response = await reenviar(ID_PENDIENTE)
    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=permiso')
  })

  it('exige un id con forma de UUID antes de llamar al backend', async () => {
    const llamadas = conRespuesta(200, { ok: true })
    const response = await reenviar('no-es-un-uuid')
    expect(response?.headers.get('location')).toBe('/ordena/admin/usuarios?estado=error')
    expect(llamadas.some((l) => l.url.includes('/invitation'))).toBe(false)
  })
})
