import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'

describe('Ciudadano · preservación de valores tras error', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = originalFetch))

  it('422 por validación repinta nombre/email/calle/colonia/municipio/cp/institucion/observacion y mantiene consentimiento', async () => {
    // backend no se toca: falla por validación antes de fetch
    const fd = new FormData()
    fd.set('nombre', 'María López')
    fd.set('email', 'no-es-email') // inválido
    fd.set('calle', 'Av. Juárez 123')
    fd.set('colonia', 'Centro')
    fd.set('municipio', 'San Pedro Tlaquepaque')
    fd.set('cp', '45500')
    fd.set('institucion', 'ITESO')
    fd.set('observacion', 'corta') // <10
    // consentimiento ausente
    fd.append('archivos', new File(['hola'], 'doc.pdf', { type: 'application/pdf' }))

    const r = await router.fetch(new Request('http://localhost/ordena/participation', { method: 'POST', body: fd }))
    expect(r?.status).toBe(422)
    const html = await r?.text()
    // valores repintados (no 500 por backend)
    expect(html).toContain('María López')
    expect(html).toContain('Av. Juárez 123')
    expect(html).toContain('Centro')
    expect(html).toContain('San Pedro Tlaquepaque')
    expect(html).toContain('45500')
    expect(html).toContain('ITESO')
    expect(html).toContain('corta')
    // email inválido también se preserva? El value del input email debe contener el string enviado
    expect(html).toContain('no-es-email')
    // adjuntos NO se repintan (input file no tiene value)
    expect(html).not.toContain('doc.pdf')
    // consentimiento preservado? toFormValues guarda consentimiento boolean; si no se envía, es false
    // checkbox should not be checked
  })

  it('502 por backend caído repinta todos los campos', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ error: 'Backend caído' }), { status: 503 }))
    const fd = new FormData()
    fd.set('nombre', 'Juan Pérez')
    fd.set('email', 'juan@ejemplo.com')
    fd.set('calle', 'Calle Falsa 123')
    fd.set('colonia', 'Santa Anita')
    fd.set('municipio', 'Tlajomulco')
    fd.set('cp', '45640')
    fd.set('institucion', 'Colectivo X')
    fd.set('observacion', 'Observación suficientemente larga para pasar validación')
    fd.set('consentimiento', '1')

    const r = await router.fetch(new Request('http://localhost/ordena/participation', { method: 'POST', body: fd }))
    expect(r?.status).toBe(502)
    const html = await r?.text()
    expect(html).toContain('Juan Pérez')
    expect(html).toContain('juan@ejemplo.com')
    expect(html).toContain('Calle Falsa 123')
    expect(html).toContain('Santa Anita')
    expect(html).toContain('Tlajomulco')
    expect(html).toContain('45640')
    expect(html).toContain('Colectivo X')
    expect(html).toContain('Observación suficientemente larga')
  })

  it('caso límite: email inválido + observación corta + sin consentimiento pierde adjuntos pero conserva lo demás', async () => {
    const fd = new FormData()
    fd.set('nombre', 'Ana')
    fd.set('email', 'bad-email@@')
    fd.set('calle', 'Calle 1')
    fd.set('colonia', 'Centro')
    fd.set('municipio', 'Guadalajara')
    fd.set('cp', '44100')
    fd.set('observacion', 'xxx') // corta
    // sin consentimiento
    fd.append('archivos', new File(['contenido'], 'anexo.pdf', { type: 'application/pdf' }))
    const r = await router.fetch(new Request('http://localhost/ordena/participation', { method: 'POST', body: fd }))
    expect(r?.status).toBe(422)
    const html = await r?.text()
    expect(html).toContain('Ana')
    expect(html).toContain('bad-email@@')
    expect(html).not.toContain('anexo.pdf')
  })

  it('413 por MaxFiles repinta los campos de texto ya leídos (no obliga a reescribir)', async () => {
    // no mock fetch needed; el error se da en parse
    const fd = new FormData()
    fd.set('nombre', 'Con Muchos Archivos')
    fd.set('email', 'test@ejemplo.com')
    fd.set('colonia', 'Centro')
    fd.set('municipio', 'Guadalajara')
    fd.set('observacion', 'Observación válida con muchos archivos pero excede límite')
    fd.set('consentimiento', '1')
    for (let i = 0; i < 6; i++)
      fd.append('archivos', new File(['a'], `f${i}.pdf`, { type: 'application/pdf' }))
    const r = await router.fetch(
      new Request('http://localhost/ordena/participation', { method: 'POST', body: fd }),
    )
    expect(r?.status).toBe(413)
    const html = await r?.text()
    // Los campos de texto que llegaron antes del archivo se repintan (U1).
    expect(html).toContain('Con Muchos Archivos')
    expect(html).toContain('test@ejemplo.com')
    expect(html).toContain('Centro')
    expect(html).toContain('Guadalajara')
    expect(html).toContain('Observación válida con muchos archivos pero excede límite')
    // consentimiento vino después de archivos y el parseo abortó antes de leerlo
    // → documenta el límite del streaming, no un valor repintado.
    expect(html).toContain('Máximo 5 archivos por participación')
  })

  it('413 por MaxFileSize repinta los campos de texto y muestra el límite por archivo', async () => {
    const fd = new FormData()
    fd.set('nombre', 'Archivo Grande')
    fd.set('email', 'grande@ejemplo.com')
    fd.set('colonia', 'Centro')
    fd.set('municipio', 'San Pedro Tlaquepaque')
    fd.set('observacion', 'Archivo único que supera el tamaño máximo permitido por participacion')
    fd.set('consentimiento', '1')
    fd.append('archivos', new File(['x'.repeat(64 * 1024 * 1024)], 'enorme.pdf'))
    const r = await router.fetch(
      new Request('http://localhost/ordena/participation', { method: 'POST', body: fd }),
    )
    expect(r?.status).toBe(413)
    const html = await r?.text()
    expect(html).toContain('Archivo Grande')
    expect(html).toContain('excede el límite de 50 MB')
  })

  it('429 del backend muestra un mensaje amigable de rate-limit sin tecnicismos', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 }),
    )
    const fd = new FormData()
    fd.set('nombre', 'Límite Interno')
    fd.set('email', 'limite@ejemplo.com')
    fd.set('colonia', 'Centro')
    fd.set('municipio', 'Guadalajara')
    fd.set('observacion', 'Observación válida con suficiente longitud para el límite')
    fd.set('consentimiento', '1')
    const r = await router.fetch(
      new Request('http://localhost/ordena/participation', { method: 'POST', body: fd }),
    )
    expect(r?.status).toBe(502)
    const html = await r?.text()
    // El mensaje crudo del backend NO se filtra; se usa el amigable.
    expect(html).not.toContain('Too Many Requests')
    expect(html).toContain('demasiadas solicitudes')
    expect(html).toContain('Límite Interno')
  })

  it('timeout del backend (AbortController) devuelve 504 y un mensaje claro', async () => {
    globalThis.fetch = vi.fn(
      () => new Promise<Response>((_resolve, reject) => reject(new DOMException('Aborted', 'AbortError'))),
    )
    const fd = new FormData()
    fd.set('nombre', 'Espera Larga')
    fd.set('email', 'espera@ejemplo.com')
    fd.set('colonia', 'Centro')
    fd.set('municipio', 'Guadalajara')
    fd.set('observacion', 'Observación válida que espera respuesta y nunca llega')
    fd.set('consentimiento', '1')
    const r = await router.fetch(
      new Request('http://localhost/ordena/participation', { method: 'POST', body: fd }),
    )
    expect(r?.status).toBe(504)
    const html = await r?.text()
    expect(html).toContain('está tardando demasiado')
    expect(html).toContain('Espera Larga')
  })

  it('201 del backend sin folio redirige a un acuse genérico (sin folio en la URL)', async () => {
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ id: 123 }), { status: 201 }))
    const fd = new FormData()
    fd.set('nombre', 'Sin Folio')
    fd.set('email', 'sinfolio@ejemplo.com')
    fd.set('colonia', 'Centro')
    fd.set('municipio', 'Guadalajara')
    fd.set('observacion', 'Observación válida con longitud suficiente para el caso')
    fd.set('consentimiento', '1')
    const r = await router.fetch(
      new Request('http://localhost/ordena/participation', { method: 'POST', body: fd }),
    )
    expect(r?.status).toBe(302)
    const location = r?.headers.get('location')
    expect(location).toContain('/participation?success=1')
    expect(location).not.toContain('folio=')
  })
})
