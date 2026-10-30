import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * Primer acceso de una cuenta dada de alta por un root.
 *
 * El backend decide qué sirve (ver backend/src/auth/configuracion-cuenta.ts y
 * backend/src/cuentas-nuevas-endpoints.test.ts); aquí se comprueba lo que ve la
 * persona: el formulario solo con un enlace que sirve, los errores junto a cada
 * campo sin perder lo escrito, y a dónde la lleva el éxito.
 */

const originalFetch = globalThis.fetch
const TOKEN = 'T'.repeat(43)
const CUENTA = { name: 'Nueva Admin', email: 'nueva@tlaquepaque.gob.mx', rol: 'admin' }

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

interface Llamada {
  url: string
  method: string
  body?: unknown
  headers?: Headers
}

/**
 * Backend simulado. `consulta` responde a GET /api/auth/account-setup y `envio` a
 * POST /api/auth/account-setup; devuelve las llamadas hechas.
 */
function backend(opciones: {
  consulta?: Response | (() => Response)
  envio?: Response | (() => Response)
}) {
  const llamadas: Llamada[] = []
  globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    llamadas.push({
      url,
      method: init?.method ?? 'GET',
      body: init?.body,
      headers: new Headers(init?.headers),
    })
    if (url.includes('/api/auth/account-setup')) {
      const respuesta = init?.method === 'POST' ? opciones.envio : opciones.consulta
      const r =
        typeof respuesta === 'function'
          ? respuesta()
          : (respuesta ?? json({ valido: true, usuario: CUENTA }))
      return Promise.resolve(r.clone())
    }
    return Promise.resolve(json({}))
  })
  return llamadas
}

const get = (path: string) => router.fetch(new Request(`http://localhost${path}`))

function formulario(extra: Record<string, string | Blob | null> = {}) {
  const f = new FormData()
  f.set('token', TOKEN)
  f.set('nombres', 'Ana María')
  f.set('apellidos', 'López Pérez')
  f.set('password', 'mi-clave-nueva-2026')
  f.set('confirmacion', 'mi-clave-nueva-2026')
  for (const [k, v] of Object.entries(extra)) {
    if (v === null) f.delete(k)
    else f.set(k, v)
  }
  return f
}

const enviar = (f: FormData) =>
  router.fetch(
    new Request('http://localhost/ordena/configurar-cuenta', {
      method: 'POST',
      body: f,
      headers: { 'user-agent': 'Prueba/1.0', 'x-forwarded-for': '203.0.113.7' },
    }),
  )

beforeEach(() => vi.restoreAllMocks())
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GET /configurar-cuenta', () => {
  it('con un enlace que sirve muestra el formulario con todo lo que se pide', async () => {
    backend({})
    const res = await get(`/ordena/configurar-cuenta?token=${TOKEN}`)
    expect(res?.status).toBe(200)
    const html = (await res?.text()) ?? ''

    expect(html).toContain('Configura tu cuenta')
    // Nombre(s), apellidos, contraseña con confirmación y foto.
    for (const campo of ['nombres', 'apellidos', 'password', 'confirmacion']) {
      expect(html, campo).toMatch(new RegExp(`<input[^>]*name="${campo}"`))
    }
    expect(html).toMatch(
      /<input[^>]*type="file"[^>]*name="avatar"|<input[^>]*name="avatar"[^>]*type="file"/,
    )
    expect(html).toContain('Foto de perfil')
    expect(html).toContain('(opcional)')
    expect(html).toContain('Confirma la contraseña')
    // Con foto: el formulario debe ir como multipart, y como documento nuevo (rmx-document).
    const form = html.match(/<form[^>]*class="login__form"[^>]*>/)?.[0] ?? ''
    expect(form).toContain('enctype="multipart/form-data"')
    expect(form).toMatch(/\brmx-document\b/)
    expect(form).toContain('method="POST"')
    // El enlace viaja en el formulario, no en el texto.
    expect(html).toContain(`name="token" value="${TOKEN}"`)
    // Quién es la cuenta que se está configurando.
    expect(html).toContain('nueva@tlaquepaque.gob.mx')
    expect(html).toContain('Administrador')
  })

  it('solo la foto es opcional: el resto lleva `required` para el navegador', async () => {
    backend({})
    const html = (await (await get(`/ordena/configurar-cuenta?token=${TOKEN}`))!.text()) ?? ''
    expect(html).toMatch(
      /<input[^>]*name="nombres"[^>]*required|<input[^>]*required[^>]*name="nombres"/,
    )
    expect(html).not.toMatch(/<input[^>]*name="avatar"[^>]*required/)
  })

  it('consultar el enlace no lo gasta: solo hace un GET al backend', async () => {
    const llamadas = backend({})
    await get(`/ordena/configurar-cuenta?token=${TOKEN}`)
    expect(llamadas.filter((l) => l.method === 'POST')).toHaveLength(0)
    expect(llamadas[0].url).toContain(`/api/auth/account-setup?token=${TOKEN}`)
  })

  it('sin token responde 400 y no muestra el formulario', async () => {
    const llamadas = backend({})
    const res = await get('/ordena/configurar-cuenta')
    expect(res?.status).toBe(400)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('Enlace no válido')
    expect(html).not.toContain('name="password"')
    expect(llamadas).toHaveLength(0)
  })

  it('con un enlace vencido dice que venció y que pidan reenviar la invitación', async () => {
    backend({ consulta: json({ valido: false, motivo: 'expirado' }, 410) })
    const res = await get(`/ordena/configurar-cuenta?token=${TOKEN}`)
    expect(res?.status).toBe(410)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('Este enlace venció')
    expect(html).toContain('reenvíe la invitación')
    expect(html).not.toContain('name="password"')
  })

  it('con un enlace ya usado o inventado, el mensaje genérico y la salida a iniciar sesión', async () => {
    backend({ consulta: json({ valido: false, motivo: 'invalido' }, 410) })
    const res = await get(`/ordena/configurar-cuenta?token=${TOKEN}`)
    expect(res?.status).toBe(410)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('no es válido o ya venció')
    expect(html).toContain('href="/ordena/login"')
    expect(html).not.toContain('name="password"')
  })

  it('un backend caído no se hace pasar por un enlace vencido', async () => {
    backend({ consulta: json({ error: 'caído' }, 503) })
    const res = await get(`/ordena/configurar-cuenta?token=${TOKEN}`)
    expect(res?.status).toBe(410)
    expect(await res?.text()).not.toContain('Este enlace venció')
  })

  it('lo que trae la cuenta se escapa al pintarlo', async () => {
    backend({
      consulta: json({
        valido: true,
        usuario: { name: 'x', email: '<img src=x onerror=alert(1)>@x.mx', rol: 'admin' },
      }),
    })
    const html = (await (await get(`/ordena/configurar-cuenta?token=${TOKEN}`))!.text()) ?? ''
    expect(html).not.toContain('<img src=x onerror=alert(1)>')
    expect(html).toContain('&lt;img')
  })
})

describe('POST /configurar-cuenta', () => {
  it('con todo bien entra al panel y deja la cookie de sesión que abrió el backend', async () => {
    const llamadas = backend({
      envio: json(
        { ok: true, user: { id: '1', name: 'Ana María López Pérez', role: 'admin' } },
        200,
        {
          'set-cookie': 'ordenamiento_session=abc; HttpOnly; Path=/',
        },
      ),
    })
    const res = await enviar(formulario())

    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe('/ordena/admin')
    expect(res?.headers.get('set-cookie')).toContain('ordenamiento_session=abc')

    // Lo que se mandó al backend: multipart con los cinco datos, sin foto.
    const envio = llamadas.find((l) => l.method === 'POST')!
    expect(envio.url).toContain('/api/auth/account-setup')
    const datos = envio.body as FormData
    expect(datos.get('token')).toBe(TOKEN)
    expect(datos.get('nombres')).toBe('Ana María')
    expect(datos.get('apellidos')).toBe('López Pérez')
    expect(datos.get('password')).toBe('mi-clave-nueva-2026')
    expect(datos.get('confirmacion')).toBe('mi-clave-nueva-2026')
    expect(datos.has('avatar')).toBe(false)
    // La bitácora de sesiones sabe desde dónde entró, igual que en el inicio de sesión.
    expect(envio.headers?.get('user-agent')).toBe('Prueba/1.0')
    expect(envio.headers?.get('x-forwarded-for')).toBe('203.0.113.7')
    // Todavía no hay sesión: no se reenvía ninguna cookie.
    expect(envio.headers?.get('cookie')).toBeNull()
  })

  it('una cuenta de ciudadanía va al portal, no al panel', async () => {
    backend({
      envio: json({ ok: true, user: { id: '2', name: 'Cora Ciudadana', role: 'user' } }, 200, {
        'set-cookie': 'ordenamiento_session=def; HttpOnly; Path=/',
      }),
    })
    const res = await enviar(formulario())
    expect(res?.status).toBe(302)
    expect(res?.headers.get('location')).toBe('/ordena/participation')
  })

  it('con foto la manda al backend junto con lo demás', async () => {
    const llamadas = backend({
      envio: json({ ok: true, user: { id: '1', name: 'A B', role: 'admin' } }),
    })
    const foto = new File([new Uint8Array([137, 80, 78, 71])], 'mi-foto.png', { type: 'image/png' })
    await enviar(formulario({ avatar: foto }))

    const datos = llamadas.find((l) => l.method === 'POST')!.body as FormData
    const enviada = datos.get('avatar') as File
    expect(enviada).toBeInstanceOf(File)
    expect(enviada.name).toBe('mi-foto.png')
    expect(enviada.size).toBe(4)
  })

  it('un campo de foto vacío (no eligió ninguna) no manda nada', async () => {
    const llamadas = backend({
      envio: json({ ok: true, user: { id: '1', name: 'A B', role: 'admin' } }),
    })
    await enviar(formulario({ avatar: new File([], '') }))
    expect((llamadas.find((l) => l.method === 'POST')!.body as FormData).has('avatar')).toBe(false)
  })

  it('un dato que no sirve vuelve al formulario con el error junto al campo y lo escrito intacto', async () => {
    backend({
      envio: json(
        {
          error: 'Revisa los datos marcados',
          motivo: 'datos',
          campos: {
            confirmacion: 'Las contraseñas no coinciden.',
            apellidos: 'Los apellidos debe tener entre 2 y 50 caracteres.',
          },
        },
        422,
      ),
    })
    const res = await enviar(formulario({ apellidos: 'X', confirmacion: 'otra-distinta-123' }))

    expect(res?.status).toBe(422)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('Las contraseñas no coinciden.')
    expect(html).toContain('Los apellidos debe tener entre 2 y 50 caracteres.')
    expect(html).toContain('Revisa los datos marcados e inténtalo de nuevo.')
    // Se conserva lo que sí estaba bien y lo escrito; el enlace sigue en el formulario.
    expect(html).toMatch(
      /name="nombres"[^>]*value="Ana María"|value="Ana María"[^>]*name="nombres"/,
    )
    expect(html).toMatch(/name="apellidos"[^>]*value="X"|value="X"[^>]*name="apellidos"/)
    expect(html).toContain(`name="token" value="${TOKEN}"`)
    // Las contraseñas nunca se devuelven al navegador.
    expect(html).not.toContain('mi-clave-nueva-2026')
    expect(html).not.toContain('otra-distinta-123')
  })

  it('una foto rechazada se explica junto a su campo', async () => {
    backend({
      envio: json(
        {
          error: 'El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)',
          motivo: 'avatar',
          campos: { avatar: 'El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)' },
        },
        415,
      ),
    })
    const res = await enviar(formulario({ avatar: new File([new Uint8Array([1])], 'doc.pdf') }))
    expect(res?.status).toBe(415)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('El archivo debe ser una imagen (JPG, PNG, WEBP o GIF)')
    expect(html).toContain('login__file login__input--error')
  })

  it('la contraseña igual a la provisional se explica junto al campo de la contraseña', async () => {
    backend({
      envio: json(
        {
          error: 'Revisa los datos marcados',
          campos: { password: 'La contraseña nueva debe ser distinta de la provisional.' },
        },
        422,
      ),
    })
    const html = (await (await enviar(formulario()))!.text()) ?? ''
    expect(html).toContain('La contraseña nueva debe ser distinta de la provisional.')
  })

  it('un enlace que se gastó o venció mientras tanto lleva a la pantalla de enlace no válido', async () => {
    backend({
      envio: json(
        { error: 'El enlace de configuración no es válido o ya se usó.', motivo: 'invalido' },
        410,
      ),
    })
    const res = await enviar(formulario())
    expect(res?.status).toBe(410)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('Enlace no válido')
    expect(html).not.toContain('name="password"')
  })

  it('demasiados intentos se avisa como advertencia y el formulario sigue ahí', async () => {
    backend({
      envio: json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }, 429),
    })
    const res = await enviar(formulario())
    expect(res?.status).toBe(429)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('login__alert--warning')
    expect(html).toContain('Demasiados intentos')
    expect(html).toContain('name="password"')
  })

  it('un backend caído muestra el error sin perder lo escrito', async () => {
    backend({ envio: json({ error: 'El servicio no está disponible. Intenta más tarde.' }, 503) })
    const res = await enviar(formulario())
    expect(res?.status).toBe(503)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('El servicio no está disponible')
    expect(html).toMatch(/value="Ana María"/)
  })

  it('sin token no llama al backend', async () => {
    const llamadas = backend({})
    const res = await enviar(formulario({ token: null }))
    expect(res?.status).toBe(400)
    expect(llamadas).toHaveLength(0)
  })
})

describe('Iniciar sesión con la contraseña provisional', () => {
  const entrar = () =>
    router.fetch(
      new Request('http://localhost/ordena/login', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          email: 'nueva@tlaquepaque.gob.mx',
          password: 'provisional-2026',
        }),
      }),
    )

  it('no abre sesión: lleva a configurar la cuenta, con el enlace en el formulario y no en la URL', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/auth/login')) {
        return Promise.resolve(json({ configurar: true, token: TOKEN, user: null }))
      }
      return Promise.resolve(json({}))
    })

    const res = await entrar()

    expect(res?.status).toBe(200)
    expect(res?.headers.get('location')).toBeNull()
    expect(res?.headers.get('set-cookie')).toBeNull()
    const html = (await res?.text()) ?? ''
    expect(html).toContain('Configura tu cuenta')
    expect(html).toContain('Antes de entrar debes configurar tu cuenta')
    expect(html).toContain(`name="token" value="${TOKEN}"`)
    expect(html).toMatch(/<input[^>]*name="apellidos"/)
    // El formulario de configuración manda al panel de configuración, no al inicio de sesión.
    expect(html).toContain('action="/ordena/configurar-cuenta"')
  })

  it('con la contraseña provisional vencida avisa qué hacer, sin decir que la contraseña está mal', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/auth/login')) {
        return Promise.resolve(
          json(
            {
              error:
                'Tu acceso provisional venció. Pide a quien administra el portal que te reenvíe la invitación.',
              motivo: 'invitacion_vencida',
            },
            403,
          ),
        )
      }
      return Promise.resolve(json({}))
    })

    const res = await entrar()

    expect(res?.status).toBe(403)
    const html = (await res?.text()) ?? ''
    expect(html).toContain('Tu acceso provisional venció')
    expect(html).toContain('login__alert--warning')
    expect(html).not.toContain('Correo o contraseña incorrectos')
  })
})
