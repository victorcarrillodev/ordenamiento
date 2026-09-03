import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * Flujo público de recuperación de contraseña.
 *
 * El backend se sustituye por un `fetch` falso: lo que se comprueba aquí es el
 * contrato de las páginas (qué se muestra, qué status se devuelve, a dónde se
 * redirige), no la lógica del token — esa vive en
 * backend/src/auth/password-reset.test.ts.
 */

const originalFetch = globalThis.fetch

/** Respuesta JSON del backend simulado, con el status que se quiera probar. */
function backendResponde(status: number, body: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  )
}

function get(path: string) {
  return router.fetch(new Request(`http://localhost${path}`))
}

function post(path: string, campos: Record<string, string>) {
  const body = new URLSearchParams(campos)
  return router.fetch(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    }),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GET /ordena/recuperar', () => {
  it('muestra el formulario para pedir el enlace', async () => {
    const response = await get('/ordena/recuperar')
    expect(response?.status).toBe(200)
    const html = await response!.text()
    expect(html).toContain('Recuperar contraseña')
    expect(html).toContain('name="email"')
  })

  it('enlaza de vuelta al inicio de sesión', async () => {
    const html = await (await get('/ordena/recuperar'))!.text()
    expect(html).toContain('/ordena/login')
  })
})

describe('POST /ordena/recuperar', () => {
  it('rechaza un correo mal formado sin llamar al backend', async () => {
    const spy = vi.fn()
    globalThis.fetch = spy

    const response = await post('/ordena/recuperar', { email: 'no-es-un-correo' })

    expect(response?.status).toBe(422)
    expect(spy).not.toHaveBeenCalled()
    expect(await response!.text()).toContain('Ingresa un correo electrónico válido')
  })

  it('muestra el acuse cuando el backend acepta la solicitud', async () => {
    backendResponde(200, { ok: true, expiraMinutos: 60 })

    const response = await post('/ordena/recuperar', { email: 'ana@ejemplo.com' })

    expect(response?.status).toBe(200)
    const html = await response!.text()
    expect(html).toContain('Revisa tu correo')
    expect(html).toContain('ana@ejemplo.com')
  })

  it('da el mismo acuse exista o no la cuenta (no enumera correos)', async () => {
    backendResponde(200, { ok: true, expiraMinutos: 60 })
    const existente = await (await post('/ordena/recuperar', { email: 'ana@ejemplo.com' }))!.text()

    backendResponde(200, { ok: true, expiraMinutos: 60 })
    const inexistente = await (await post('/ordena/recuperar', {
      email: 'ana@ejemplo.com',
    }))!.text()

    expect(existente).toBe(inexistente)
  })

  it('avisa cuando se piden demasiados enlaces seguidos', async () => {
    backendResponde(429, { error: 'Demasiadas solicitudes.' })

    const response = await post('/ordena/recuperar', { email: 'ana@ejemplo.com' })

    expect(response?.status).toBe(429)
    expect(await response!.text()).toContain('Espera unos minutos')
  })

  it('avisa cuando el servidor no tiene correo configurado', async () => {
    backendResponde(503, { error: 'El envío de correo no está configurado en el servidor' })

    const response = await post('/ordena/recuperar', { email: 'ana@ejemplo.com' })

    expect(response?.status).toBe(503)
    expect(await response!.text()).toContain('administrador del portal')
  })
})

describe('GET /ordena/restablecer', () => {
  it('sin token muestra el aviso de enlace inválido, no el formulario', async () => {
    const response = await get('/ordena/restablecer')

    expect(response?.status).toBe(400)
    const html = await response!.text()
    expect(html).toContain('Enlace no válido')
    expect(html).not.toContain('name="confirmacion"')
  })

  it('con token vencido ofrece pedir uno nuevo', async () => {
    backendResponde(410, { valido: false, motivo: 'expirado' })

    const response = await get('/ordena/restablecer?token=' + 'a'.repeat(43))

    expect(response?.status).toBe(410)
    const html = await response!.text()
    expect(html).toContain('Este enlace venció')
    expect(html).toContain('/ordena/recuperar')
  })

  it('con token vigente muestra el formulario de contraseña nueva', async () => {
    backendResponde(200, { valido: true, usuario: { id: '1', name: 'Ana', email: 'a@b.mx' } })

    const response = await get('/ordena/restablecer?token=' + 'b'.repeat(43))

    expect(response?.status).toBe(200)
    const html = await response!.text()
    expect(html).toContain('name="password"')
    expect(html).toContain('name="confirmacion"')
    expect(html).toContain('name="token"')
  })
})

describe('POST /ordena/restablecer', () => {
  const token = 'c'.repeat(43)

  it('rechaza una contraseña corta sin llamar al backend', async () => {
    const spy = vi.fn()
    globalThis.fetch = spy

    const response = await post('/ordena/restablecer', {
      token,
      password: 'corta',
      confirmacion: 'corta',
    })

    expect(response?.status).toBe(422)
    expect(spy).not.toHaveBeenCalled()
    expect(await response!.text()).toContain('al menos 8 caracteres')
  })

  it('rechaza cuando la confirmación no coincide', async () => {
    const spy = vi.fn()
    globalThis.fetch = spy

    const response = await post('/ordena/restablecer', {
      token,
      password: 'contrasena-larga',
      confirmacion: 'otra-contrasena',
    })

    expect(response?.status).toBe(422)
    expect(spy).not.toHaveBeenCalled()
    expect(await response!.text()).toContain('no coinciden')
  })

  it('sin token no llega al backend', async () => {
    const spy = vi.fn()
    globalThis.fetch = spy

    const response = await post('/ordena/restablecer', {
      token: '',
      password: 'contrasena-larga',
      confirmacion: 'contrasena-larga',
    })

    expect(response?.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
  })

  it('al cambiarla redirige a /ordena/login sin iniciar sesión', async () => {
    backendResponde(200, { ok: true, email: 'ana@ejemplo.com' })

    const response = await post('/ordena/restablecer', {
      token,
      password: 'contrasena-larga',
      confirmacion: 'contrasena-larga',
    })

    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toBe('/ordena/login?reset=ok')
    // Restablecer no debe autenticar: sin cookie de sesión en la respuesta.
    expect(response?.headers.get('set-cookie')).toBeNull()
  })

  it('si el enlace caducó entre el GET y el POST no reofrece el formulario', async () => {
    backendResponde(410, { error: 'El enlace de recuperación ya venció.', motivo: 'expirado' })

    const response = await post('/ordena/restablecer', {
      token,
      password: 'contrasena-larga',
      confirmacion: 'contrasena-larga',
    })

    expect(response?.status).toBe(410)
    const html = await response!.text()
    expect(html).toContain('Enlace no válido')
    expect(html).not.toContain('name="confirmacion"')
  })
})

describe('Acuse en /ordena/login', () => {
  it('confirma el cambio cuando se llega con ?reset=ok', async () => {
    const html = await (await get('/ordena/login?reset=ok'))!.text()
    expect(html).toContain('Tu contraseña se actualizó')
  })

  it('no muestra el acuse en una visita normal', async () => {
    const html = await (await get('/ordena/login'))!.text()
    expect(html).not.toContain('Tu contraseña se actualizó')
  })

  it('el enlace «¿Olvidaste tu contraseña?» ya apunta a /ordena/recuperar', async () => {
    const html = await (await get('/ordena/login'))!.text()
    expect(html).toContain('href="/ordena/recuperar"')
  })
})
