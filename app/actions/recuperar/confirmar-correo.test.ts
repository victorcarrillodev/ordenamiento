import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { router } from '../../router.ts'

/**
 * Confirmación del correo nuevo. Lo que se comprueba aquí es que el GET NO
 * consuma el enlace: los antivirus y previsualizadores de los clientes de
 * correo visitan las URL de los mensajes, y si el GET lo gastara, el enlace
 * llegaría muerto a la persona.
 */

const originalFetch = globalThis.fetch

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function get(path: string) {
  return router.fetch(new Request(`http://localhost${path}`))
}

function post(campos: Record<string, string>) {
  return router.fetch(
    new Request('http://localhost/ordena/confirmar-correo', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(campos),
    }),
  )
}

const TOKEN = 'a'.repeat(43)

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('GET /ordena/confirmar-correo', () => {
  it('no consume el enlace: solo muestra el botón', async () => {
    const spy = vi.fn()
    globalThis.fetch = spy

    const res = await get(`/ordena/confirmar-correo?token=${TOKEN}`)

    expect(res?.status).toBe(200)
    expect(spy).not.toHaveBeenCalled()
    const html = await res!.text()
    expect(html).toContain('Confirmar mi correo nuevo')
    expect(html).toContain('name="token"')
  })

  it('sin token muestra el aviso de enlace inválido', async () => {
    const res = await get('/ordena/confirmar-correo')
    expect(res?.status).toBe(400)
    const html = await res!.text()
    expect(html).toContain('Enlace no válido')
    expect(html).not.toContain('Confirmar mi correo nuevo')
  })
})

describe('POST /ordena/confirmar-correo', () => {
  it('aplica el cambio y ofrece iniciar sesión con la dirección nueva', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(json({ ok: true, email: 'nueva@ejemplo.com' }))

    const res = await post({ token: TOKEN })

    expect(res?.status).toBe(200)
    const html = await res!.text()
    expect(html).toContain('Correo confirmado')
    expect(html).toContain('nueva@ejemplo.com')
    // Confirmar el correo no inicia sesión.
    expect(res?.headers.get('set-cookie')).toBeNull()
  })

  it('con enlace vencido ofrece la salida, no otro intento', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(json({ error: 'El enlace ya venció.', motivo: 'expirado' }, 410))

    const res = await post({ token: TOKEN })

    expect(res?.status).toBe(410)
    const html = await res!.text()
    expect(html).toContain('Enlace no válido')
    expect(html).not.toContain('name="token"')
  })

  it('si la dirección quedó ocupada mantiene el botón para reintentar', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(json({ error: 'Ese correo quedó registrado por otra cuenta.' }, 409))

    const res = await post({ token: TOKEN })

    expect(res?.status).toBe(409)
    expect(await res!.text()).toContain('otra cuenta')
  })

  it('sin token no llega al backend', async () => {
    const spy = vi.fn()
    globalThis.fetch = spy

    const res = await post({ token: '' })

    expect(res?.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
  })
})
