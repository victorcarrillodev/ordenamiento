import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'
import { MAX_FILE_BYTES } from '../../utils/uploads.ts'

const NUEVA_URL = 'http://localhost/ordena/admin/participaciones/nueva'

function mockAuth() {
  return vi.fn().mockImplementation((url: string | URL | Request) => {
    const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
    if (u.includes('/api/auth/me')) {
      return Promise.resolve(
        new Response(JSON.stringify({ user: { id: 1, name: 'Admin Root', role: 'admin' } }), {
          status: 200,
        }),
      )
    }
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
  })
}

describe('Admin · preservación de valores tras error', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = originalFetch))

  it('un rechazo del backend repinta lo capturado y reenvía los nombres del backend', async () => {
    let captured: FormData | null = null
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string | URL | Request, init?: RequestInit) => {
        const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
        if (u.includes('/api/auth/me')) {
          return Promise.resolve(
            new Response(JSON.stringify({ user: { id: 1, name: 'Admin', role: 'admin' } }), {
              status: 200,
            }),
          )
        }
        if (u.includes('/api/participations')) {
          captured = init?.body as FormData
          // simula 422 del backend para forzar repintado con values
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'validación backend' }), { status: 422 }),
          )
        }
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      }) as unknown as typeof fetch

    const fd = new FormData()
    fd.set('nombre', 'Capturista Test')
    fd.set('email', 'test@admin.mx')
    fd.set('domicilio', 'Calle 123')
    fd.set('municipio_participante', 'Guadalajara')
    fd.set('alcance_ubicacion', 'especifico')
    fd.set('colonia', 'Centro')
    fd.set('calle', 'Calle 123')
    fd.set('cp', '44100')
    fd.set('observacion', 'Obs válida larga')
    const r = await router.fetch(new Request(NUEVA_URL, { method: 'POST', body: fd }))
    expect(r?.status).toBe(422)
    const html = await r?.text()
    expect(html).toContain('Capturista Test')
    expect(html).toContain('Calle 123')
    expect(html).toContain('Guadalajara')
    expect(html).toContain('validación backend')
    // El backend recibió el municipio único y el alcance elegido.
    expect((captured as unknown as FormData)?.get('municipio')).toBe('San Pedro Tlaquepaque')
    expect((captured as unknown as FormData)?.get('alcance_ubicacion')).toBe('especifico')
    expect((captured as unknown as FormData)?.get('municipio_participante')).toBe('Guadalajara')
  })

  it('todos los campos se repintan tras 502 (backend caído)', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      if (u.includes('/api/auth/me'))
        return Promise.resolve(
          new Response(JSON.stringify({ user: { id: 1, name: 'Admin', role: 'admin' } }), {
            status: 200,
          }),
        )
      if (u.includes('/api/participations'))
        return Promise.resolve(new Response(JSON.stringify({ error: 'caído' }), { status: 502 }))
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }) as unknown as typeof fetch

    const fd = new FormData()
    fd.set('nombre', 'Nombre Largo')
    fd.set('email', 'correo@ejemplo.com')
    fd.set('domicilio', 'Domicilio Part')
    fd.set('municipio_participante', 'Zapopan')
    fd.set('alcance_ubicacion', 'especifico')
    fd.set('calle', 'Calle Aporte')
    fd.set('colonia', 'Colonia Aporte')
    fd.set('cp', '45400')
    fd.set('fuente', 'Empresa')
    fd.set('genero', 'Mujer')
    fd.set('tematica', 'Otra')
    fd.set('tematica_otra', 'Arbolado urbano')
    fd.set('institucion', 'Inst X')
    fd.set('ocupacion', 'Ingeniero')
    fd.set('observacion', 'Observación detallada que supera mínimo')
    fd.set('direccion_origen', 'manual')

    const r = await router.fetch(new Request(NUEVA_URL, { method: 'POST', body: fd }))
    expect(r?.status).toBe(502)
    const html = await r?.text()
    for (const val of [
      'Nombre Largo',
      'correo@ejemplo.com',
      'Domicilio Part',
      'Zapopan',
      'Calle Aporte',
      'Colonia Aporte',
      '45400',
      'Inst X',
      'Ingeniero',
      'Arbolado urbano',
      'Observación detallada',
    ]) {
      expect(html).toContain(val)
    }
    // selects preservados
    expect(html).toContain('value="Empresa" selected')
    expect(html).toContain('value="Mujer" selected')
    expect(html).toContain('value="Otra" selected')
  })

  it('PDF que excede el límite → 413 vacío (sin repintado, intencional)', async () => {
    globalThis.fetch = mockAuth() as unknown as typeof fetch
    const fd = new FormData()
    fd.set('nombre', 'Con PDF grande')
    fd.set('email', 'a@b.com')
    fd.set('alcance_ubicacion', 'municipio')
    fd.set('observacion', 'obs larga válida')
    fd.append(
      'archivos',
      new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'huge.pdf', { type: 'application/pdf' }),
    )
    const r = await router.fetch(new Request(NUEVA_URL, { method: 'POST', body: fd }))
    expect(r?.status).toBe(413)
    const html = await r?.text()
    expect(html).not.toContain('Con PDF grande')
  })
})
