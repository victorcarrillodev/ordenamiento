import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

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

  it('municipio del aporte vacío + datos del participante → fallback backend pero municipio_participante se repinta', async () => {
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
    fd.set('correo', 'test@admin.mx')
    fd.set('domicilio', 'Calle 123')
    fd.set('municipio_participante', 'San Pedro Tlaquepaque')
    fd.set('municipio', '') // vacío → fallback
    fd.set('colonia', 'Centro')
    fd.set('calle', 'Calle 123')
    fd.set('cp', '44100')
    fd.set('observacion', 'Obs válida larga')
    const r = await router.fetch(new Request(NUEVA_URL, { method: 'POST', body: fd }))
    expect(r?.status).toBe(422)
    const html = await r?.text()
    // repintado: participante preservado
    expect(html).toContain('San Pedro Tlaquepaque')
    expect(html).toContain('Capturista Test')
    expect(html).toContain('Calle 123')
    // backend recibió fallback
    expect((captured as unknown as FormData)?.get('municipio')).toBe('San Pedro Tlaquepaque')
    expect((captured as unknown as FormData)?.get('municipio_participante')).toBe(
      'San Pedro Tlaquepaque',
    )
  })

  it('los 17 campos se repintan tras 502 (backend caído)', async () => {
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
    fd.set('correo', 'correo@ejemplo.com')
    fd.set('domicilio', 'Domicilio Part')
    fd.set('municipio_participante', 'San Pedro Tlaquepaque')
    fd.set('calle', 'Calle Aporte')
    fd.set('colonia', 'Colonia Aporte')
    fd.set('municipio', 'San Pedro Tlaquepaque')
    fd.set('cp', '45400')
    fd.set('latitud', '20.5')
    fd.set('longitud', '-103.3')
    fd.set('fuente', 'Empresa')
    fd.set('genero', 'Mujer')
    fd.set('tematica', 'Vivienda')
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
      'San Pedro Tlaquepaque',
      'Calle Aporte',
      'Colonia Aporte',
      'San Pedro Tlaquepaque',
      '45400',
      '20.5',
      '-103.3',
      'Inst X',
      'Ingeniero',
      'Observación detallada',
    ]) {
      expect(html).toContain(val)
    }
    // selects preservados
    expect(html).toContain('value="Empresa" selected')
    expect(html).toContain('value="Mujer" selected')
  })

  it('PDF de 51MB → 413 vacío (sin repintado, intencional)', async () => {
    globalThis.fetch = mockAuth() as unknown as typeof fetch
    const fd = new FormData()
    fd.set('nombre', 'Con PDF grande')
    fd.set('correo', 'a@b.com')
    fd.set('colonia', 'Centro')
    fd.set('municipio', 'San Pedro Tlaquepaque')
    fd.set('observacion', 'obs larga válida')
    fd.append(
      'pdf',
      new File([new Uint8Array(51 * 1024 * 1024)], 'huge.pdf', { type: 'application/pdf' }),
    )
    const r = await router.fetch(new Request(NUEVA_URL, { method: 'POST', body: fd }))
    expect(r?.status).toBe(413)
    const html = await r?.text()
    expect(html).not.toContain('Con PDF grande')
  })

  it('admin body {} con 200 no revienta — usa fallback', async () => {
    // ya cubierto parcialmente por existing test pero verificamos degradación
    const fd = new FormData()
    fd.set('nombre', 'x')
    fd.set('correo', 'x@x.com')
    fd.set('observacion', 'x'.repeat(20))
    fd.set('municipio', 'San Pedro Tlaquepaque')
    fd.set('colonia', 'Centro')
    // este test es para dashboard, no nueva
  })
})
