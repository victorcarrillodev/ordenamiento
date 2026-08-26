import { afterEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('colonias API endpoint', () => {
  it('retorna sugerencias para una búsqueda válida', async () => {
    const request = new Request('http://localhost/ordena/api/colonias?q=centro')
    const response = await router.fetch(request)

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(200)
    expect(response?.headers.get('cache-control')).toContain('public')

    const data = (await response?.json()) as { items: Array<{ colonia: string }> }
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items[0].colonia.toLowerCase()).toContain('centro')
  })

  it('retorna sugerencias de municipios de Jalisco cuando tipo=municipio', async () => {
    const request = new Request('http://localhost/ordena/api/colonias?tipo=municipio&q=tlaquepaque')
    const response = await router.fetch(request)

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(200)

    const data = (await response?.json()) as {
      items: Array<{ municipio: string; coloniasCount: number }>
    }
    expect(Array.isArray(data.items)).toBe(true)
    expect(data.items.length).toBeGreaterThan(0)
    expect(data.items[0].municipio).toBe('San Pedro Tlaquepaque')
    expect(data.items[0].coloniasCount).toBeGreaterThan(0)
  })
})

describe('participation controller action', () => {
  it('valida formulario y reenvía datos estructurados al backend', async () => {
    let capturedBody: FormData | null = null
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        capturedBody = init?.body as FormData
        return new Response(JSON.stringify({ id: 99, folio: 'PP-2026-001' }), { status: 201 })
      }),
    )

    const formData = new FormData()
    formData.set('nombre', 'Ciudadano Ejemplo')
    formData.set('email', 'ciudadano@ejemplo.com')
    formData.set('calle', 'Av. Juárez 45')
    formData.set('colonia', 'Centro')
    formData.set('municipio', 'San Pedro Tlaquepaque')
    formData.set('cp', '45500')
    formData.set('direccion_origen', 'catalogo')
    formData.set('observacion', 'Observación con más de diez caracteres válidos')
    formData.set('consentimiento', '1')

    const request = new Request('http://localhost/ordena/participation', {
      method: 'POST',
      body: formData,
    })

    const response = await router.fetch(request)
    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(302)
    expect(response?.headers.get('location')).toContain('/participation?success=1')

    expect(capturedBody).not.toBeNull()
    if (capturedBody) {
      const cb = capturedBody as FormData
      expect(cb.get('nombre')).toBe('Ciudadano Ejemplo')
      expect(cb.get('correo')).toBe('ciudadano@ejemplo.com')
      expect(cb.get('colonia')).toBe('Centro')
      expect(cb.get('municipio')).toBe('San Pedro Tlaquepaque')
      expect(cb.get('codigo_postal')).toBe('45500')
      expect(cb.get('direccion_origen')).toBe('catalogo')
      expect(cb.get('consentimiento')).toBe('1')
      expect(cb.get('consentimiento_version')).toBe('lgpdppso-2026-01')
    }
  })
})
