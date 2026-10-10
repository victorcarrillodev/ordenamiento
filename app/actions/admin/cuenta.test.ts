import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * Mi cuenta: foto, nombre y correo.
 *
 * El cambio de correo es el que tiene reglas propias — pide contraseña y no
 * aplica nada hasta que se confirma la dirección nueva — así que la mayoría
 * de los casos son suyos.
 */

const originalFetch = globalThis.fetch

const ADMIN = { id: 'u1', name: 'Ada Root', role: 'admin', email: 'ada@tlaquepaque.gob.mx' }
const PERFIL = {
  id: 'u1',
  name: 'Ada Root',
  email: 'ada@tlaquepaque.gob.mx',
  role: 'admin',
  created_at: '2026-01-05T10:00:00Z',
  avatar_ruta: '',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** `respuestas` sobrescribe lo que contesta el backend para rutas concretas. */
function backend(respuestas: Record<string, Response | (() => Response)> = {}) {
  const llamadas: Array<{ url: string; method: string; body?: string }> = []
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    llamadas.push({ url, method: init?.method ?? 'GET', body: init?.body as string | undefined })

    for (const [clave, valor] of Object.entries(respuestas)) {
      if (url.includes(clave)) {
        const r = typeof valor === 'function' ? valor() : valor
        return Promise.resolve(r.clone())
      }
    }
    if (url.includes('/api/auth/me')) return Promise.resolve(json({ user: ADMIN }))
    if (url.includes('/api/users/me/sessions')) return Promise.resolve(json({ items: [] }))
    if (url.includes('/api/users/me')) return Promise.resolve(json({ user: PERFIL }))
    return Promise.resolve(json({ ok: true }))
  })
  return llamadas
}

function get(path: string) {
  return router.fetch(new Request(`http://localhost${path}`))
}

function post(campos: Record<string, string>) {
  return router.fetch(
    new Request('http://localhost/ordena/admin/cuenta', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(campos),
    }),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Pantalla de Mi cuenta', () => {
  it('ofrece las tres acciones: foto, nombre y correo', async () => {
    backend()
    const html = await (await get('/ordena/admin/cuenta'))!.text()
    expect(html).toContain('value="avatar"')
    expect(html).toContain('value="nombre"')
    expect(html).toContain('value="correo"')
  })

  it('pide la contraseña actual para cambiar el correo', async () => {
    backend()
    const html = await (await get('/ordena/admin/cuenta'))!.text()
    expect(html).toContain('name="password"')
    expect(html).toContain('con la sesión abierta no basta')
  })

  it('muestra las sesiones que entrega el endpoint de la propia cuenta, no la bitácora general', async () => {
    const llamadas = backend({
      '/api/users/me/sessions': json({
        items: [
          {
            id: 's1',
            user_id: 'u1',
            nombre: 'Ada Root',
            email: 'ada@x.mx',
            rol: 'admin',
            inicio: '2026-09-01T10:00:00Z',
            fin: null,
            ultima_actividad: '2026-09-01T11:00:00Z',
            uso_segundos: 3600,
            estado: 'en_linea',
            activa: true,
            ip: '',
            user_agent: '',
          },
        ],
      }),
    })

    const html = await (await get('/ordena/admin/cuenta'))!.text()

    expect(html).toContain('● En línea')
    // Pide las suyas (acotadas por el servidor a la cuenta con sesión) y nunca la bitácora de todas.
    const urls = llamadas.map((l) => l.url)
    expect(urls.some((u) => u.includes('/api/users/me/sessions?limit=5'))).toBe(true)
    expect(urls.some((u) => /\/api\/sessions(\?|$)/.test(u))).toBe(false)
  })

  it('un administrador no ve el enlace al registro completo, que es solo de root', async () => {
    backend()
    const html = await (await get('/ordena/admin/cuenta'))!.text()
    expect(html).toContain('Tus últimas sesiones')
    expect(html).not.toContain('Ver el registro completo')
    expect(html).not.toContain('/ordena/admin/sesiones')
  })

  it('una cuenta root sí ve el enlace al registro completo, y su rango como Root', async () => {
    backend({
      '/api/auth/me': json({ user: { ...ADMIN, role: 'root' } }),
      '/api/users/me/sessions': json({ items: [] }),
      '/api/users/me': json({ user: { ...PERFIL, role: 'root' } }),
    })
    const html = await (await get('/ordena/admin/cuenta'))!.text()
    expect(html).toContain('Ver el registro completo')
    expect(html).toContain('href="/ordena/admin/sesiones"')
    expect(html).toContain('badge badge--root')
    expect(html).not.toContain('>Ciudadano<')
  })

  it('«Mi cuenta» dice a la persona cómo se mide su tiempo de uso, y qué no se guarda', async () => {
    backend()
    const html = await (await get('/ordena/admin/cuenta'))!.text()
    expect(html).toContain('solo mientras tienes el panel a la vista y haces algo')
    expect(html).toContain('pausas de más de 2 minutos')
    expect(html).toContain('no qué hiciste')
  })

  it('en «Mi cuenta» una sesión abandonada no se muestra como en curso y una sin medir lo dice', async () => {
    const sesion = (extra: Record<string, unknown>) => ({
      id: 's1',
      user_id: 'u1',
      nombre: 'Ada Root',
      email: 'ada@x.mx',
      rol: 'admin',
      inicio: '2026-09-01T10:00:00Z',
      fin: null,
      ultima_actividad: '2026-09-01T11:00:00Z',
      ip: '',
      user_agent: '',
      ...extra,
    })
    backend({
      '/api/users/me/sessions': json({
        items: [
          sesion({ id: 'a', uso_segundos: 600, estado: 'inactiva', activa: false }),
          sesion({ id: 'b', uso_segundos: null, estado: 'inactiva', activa: false }),
        ],
      }),
    })

    const html = await (await get('/ordena/admin/cuenta'))!.text()

    expect(html).not.toContain('En línea')
    expect(html).not.toContain('En curso')
    expect(html).toContain('Sin cerrar: dejó de usarla')
    expect(html).toContain('10 min')
    expect(html).toContain('Sin medir')
    expect(html).toContain('Tiempo de uso')
  })
})

describe('Cambio de nombre', () => {
  it('rechaza un nombre de una letra sin llamar al backend', async () => {
    const llamadas = backend()
    const res = await post({ intent: 'nombre', name: 'A' })

    expect(res?.headers.get('location')).toBe('/ordena/admin/cuenta?estado=nombre-corto')
    expect(llamadas.some((l) => l.method === 'POST' && l.url.includes('/api/users/me'))).toBe(false)
  })

  it('guarda un nombre válido y lo confirma', async () => {
    backend({ '/api/users/me': json({ ok: true, name: 'Ada Lovelace' }) })
    const res = await post({ intent: 'nombre', name: 'Ada Lovelace' })
    expect(res?.headers.get('location')).toBe('/ordena/admin/cuenta?estado=nombre-ok')
  })
})

describe('Cambio de correo', () => {
  const DATOS = { intent: 'correo', email: 'nueva@tlaquepaque.gob.mx', password: 'secreta-larga' }

  it('no llama al backend si el correo está mal escrito', async () => {
    const llamadas = backend()
    const res = await post({ ...DATOS, email: 'arroba-perdida' })

    expect(res?.headers.get('location')).toBe('/ordena/admin/cuenta?estado=correo-invalido')
    expect(llamadas.some((l) => l.url.includes('/api/users/me/email'))).toBe(false)
  })

  it('no llama al backend si falta la contraseña', async () => {
    const llamadas = backend()
    const res = await post({ ...DATOS, password: '' })

    expect(res?.headers.get('location')).toBe('/ordena/admin/cuenta?estado=correo-password')
    expect(llamadas.some((l) => l.url.includes('/api/users/me/email'))).toBe(false)
  })

  it('manda la verificación y avisa a qué dirección fue', async () => {
    backend({ '/api/users/me/email': json({ ok: true, pendiente: DATOS.email }) })
    const res = await post(DATOS)

    expect(res?.headers.get('location')).toBe(
      '/ordena/admin/cuenta?estado=correo-enviado&a=nueva%40tlaquepaque.gob.mx',
    )
  })

  it('traduce cada motivo del backend a su propio aviso', async () => {
    const casos: Array<[number, string, string]> = [
      [401, 'password_incorrecta', 'correo-password'],
      [422, 'email_ocupado', 'correo-ocupado'],
      [422, 'email_igual', 'correo-igual'],
      [429, '', 'correo-limite'],
      [503, '', 'correo-sinmail'],
    ]
    for (const [status, motivo, esperado] of casos) {
      backend({ '/api/users/me/email': json({ error: 'x', motivo }, status) })
      const res = await post(DATOS)
      expect(res?.headers.get('location')).toBe(`/ordena/admin/cuenta?estado=${esperado}`)
    }
  })

  it('el acuse dice que el correo actual sigue vigente hasta confirmar', async () => {
    backend()
    const html = await (await get(
      '/ordena/admin/cuenta?estado=correo-enviado&a=nueva%40tlaquepaque.gob.mx',
    ))!.text()

    expect(html).toContain('nueva@tlaquepaque.gob.mx')
    expect(html).toContain('seguirá siendo el actual')
  })

  it('ignora un parámetro `a` que no sea un correo', async () => {
    backend()
    const html = await (await get(
      '/ordena/admin/cuenta?estado=correo-enviado&a=<script>alert(1)</script>',
    ))!.text()

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).not.toContain('Enviamos un enlace de confirmación a')
  })
})

describe('Foto de perfil', () => {
  it('avisa cuando no se eligió archivo', async () => {
    backend()
    const res = await post({ intent: 'avatar' })
    expect(res?.headers.get('location')).toBe('/ordena/admin/cuenta?estado=avatar-vacio')
  })

  it('reporta el fallo del backend en vez de fingir que se guardó', async () => {
    backend({ '/api/users/me/avatar': json({ error: 'muy grande' }, 413) })
    const form = new FormData()
    form.append('intent', 'avatar')
    form.append('avatar', new File(['x'.repeat(100)], 'foto.png', { type: 'image/png' }))

    const res = await router.fetch(
      new Request('http://localhost/ordena/admin/cuenta', { method: 'POST', body: form }),
    )

    expect(res?.headers.get('location')).toBe('/ordena/admin/cuenta?estado=avatar-error')
  })
})
