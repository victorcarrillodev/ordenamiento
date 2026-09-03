import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * Pantalla de acceso.
 *
 * Ya no hay alta de cuenta: participar en la consulta no requiere cuenta y las
 * del panel las crea un administrador. Estas pruebas fijan esa decisión, para
 * que el formulario no vuelva por descuido.
 */

const originalFetch = globalThis.fetch

function get(path: string) {
  return router.fetch(new Request(`http://localhost${path}`))
}

function post(campos: Record<string, string>) {
  return router.fetch(
    new Request('http://localhost/ordena/login', {
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

describe('El login no ofrece crear cuenta', () => {
  it('no muestra el formulario de registro', async () => {
    const html = await (await get('/ordena/login'))!.text()

    expect(html).not.toContain('¿Necesitas una cuenta?')
    expect(html).not.toContain('Crear cuenta')
    expect(html).not.toContain('value="registro"')
    // Y sin campo de nombre, que solo servía para el alta.
    expect(html).not.toContain('name="name"')
  })

  it('sí deja la salida para quien no puede entrar', async () => {
    const html = await (await get('/ordena/login'))!.text()

    expect(html).toContain('¿Problemas para entrar?')
    expect(html).toContain('href="/ordena/recuperar"')
  })

  it('un POST con intent=registro se trata como un intento de acceso, no como alta', async () => {
    // Quitar el formulario no basta: hay que comprobar que el servidor tampoco
    // acepta la petición si alguien la envía a mano.
    const llamadas: string[] = []
    globalThis.fetch = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      llamadas.push(String(input))
      return Promise.resolve(
        new Response(JSON.stringify({ error: 'Credenciales inválidas' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )
    })

    const res = await post({
      intent: 'registro',
      name: 'Intruso',
      email: 'intruso@ejemplo.com',
      password: 'contrasena-larga',
    })

    expect(llamadas.some((u) => u.includes('/api/auth/register'))).toBe(false)
    // Cae en el camino normal de login y falla por credenciales.
    expect(res?.status).toBe(401)
    expect(res?.headers.get('set-cookie')).toBeNull()
  })
})
