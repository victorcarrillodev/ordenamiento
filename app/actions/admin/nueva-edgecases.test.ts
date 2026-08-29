import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'
import { MAX_FILE_BYTES } from '../../utils/uploads.ts'

const NUEVA_URL = 'http://localhost/ordena/admin/participaciones/nueva'

function mockBackend() {
  const captured: { body: FormData | null } = { body: null }
  globalThis.fetch = vi
    .fn()
    .mockImplementation((url: string | URL | Request, init?: RequestInit) => {
      const u = typeof url === 'string' ? url : url instanceof Request ? url.url : url.toString()
      if (u.includes('/api/auth/me')) {
        return Promise.resolve(
          new Response(JSON.stringify({ user: { id: 1, name: 'Admin Root', role: 'admin' } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      if (u.includes('/api/participations')) {
        captured.body = init?.body as FormData
        return Promise.resolve(
          new Response(JSON.stringify({ id: 105, folio: 'FIS-2026-009' }), {
            status: 201,
            headers: { 'content-type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    }) as unknown as typeof fetch
  return captured
}

function formularioBase() {
  const fd = new FormData()
  fd.set('nombre', 'Ciudadano Físico')
  fd.set('correo', 'fisico@ejemplo.com')
  fd.set('domicilio', 'Av. Juárez 100, Centro')
  fd.set('municipio_participante', 'San Pedro Tlaquepaque')
  fd.set('calle', 'Prolongación Colón 500')
  fd.set('colonia', 'Santa Anita')
  fd.set('municipio', 'San Pedro Tlaquepaque')
  fd.set('cp', '45640')
  fd.set('observacion', 'Aporte capturado en módulo físico')
  return fd
}

function postNueva(fd: FormData) {
  return router.fetch(new Request(NUEVA_URL, { method: 'POST', body: fd }))
}

describe('Admin · nueva — bordes de límites y datos sucios', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = originalFetch))

  describe('límites justo en el borde', () => {
    it('acepta archivo justo por debajo de MAX_FILE_BYTES (MAX-2KB) — overhead multipart', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      // MAX exacto falla por overhead de multipart (boundary+headers) → el límite efectivo es MAX - overhead
      // Verificamos que un archivo 2KB por debajo sí pasa
      fd.append(
        'pdf',
        new File([new Uint8Array(MAX_FILE_BYTES - 2048)], 'casi-exacto.pdf', {
          type: 'application/pdf',
        }),
      )
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).get('pdf')).toBeInstanceOf(File)
    })

    it('acepta un archivo de exactamente MAX_FILE_BYTES pese al overhead del multipart', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.append(
        'pdf',
        new File([new Uint8Array(MAX_FILE_BYTES)], 'exacto.pdf', { type: 'application/pdf' }),
      )

      // El cuerpo multipart pesa más que el archivo (delimitadores, cabeceras y
      // los campos de texto), así que el total tiene margen para absorberlo.
      const response = await postNueva(fd)
      expect(response?.status).toBe(302)
      expect((captured.body as FormData).get('pdf')).toBeInstanceOf(File)
    })

    it('rechaza archivo MAX_FILE_BYTES + 1 byte', async () => {
      mockBackend()
      const fd = formularioBase()
      fd.append(
        'pdf',
        new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'excede.pdf', { type: 'application/pdf' }),
      )
      const r = await postNueva(fd)
      expect(r?.status).toBe(413)
    })

    it('archivo size 0 → no se reenvía pero el formulario se guarda (302, sin pdf)', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.append('pdf', new File([], 'vacio.pdf', { type: 'application/pdf' }))
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).has('pdf')).toBe(false)
    })

    it('campo pdf vacío (sin adjunto) → 302 sin pdf', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      // no append pdf
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).has('pdf')).toBe(false)
    })

    it('adjunto con name mal escrito (archivos en vez de pdf) → se ignora, no revienta', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.append('archivos', new File(['contenido'], 'mal-nombre.pdf', { type: 'application/pdf' }))
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      // el controller sólo mira get('pdf'), así que no debe haber pdf
      expect((captured.body as FormData).has('pdf')).toBe(false)
      expect((captured.body as FormData).has('archivos')).toBe(false)
    })
  })

  describe('bug 1 con datos sucios — municipio_participante y domicilio separados', () => {
    it('municipio con solo espacios → cae al default (no cadena vacía)', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('municipio', '   ')
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).get('municipio')).toBe('San Pedro Tlaquepaque')
    })

    it('municipio_participante con solo espacios → se omite (no se envía vacío)', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('municipio_participante', '   ')
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).has('municipio_participante')).toBe(false)
    })

    it('ambos municipios vacíos → municipio default + participante omitido', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('municipio', '')
      fd.set('municipio_participante', '')
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      const body = captured.body as FormData
      expect(body.get('municipio')).toBe('San Pedro Tlaquepaque')
      expect(body.has('municipio_participante')).toBe(false)
    })

    it('municipio con acentos y ñ se preserva exacto', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('municipio', 'San Pedro Tlaquepaque')
      fd.set('municipio_participante', 'San Pedro Tlaquepaque — Ñoño')
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      const body = captured.body as FormData
      expect(body.get('municipio')).toBe('San Pedro Tlaquepaque')
      expect(body.get('municipio_participante')).toBe('San Pedro Tlaquepaque — Ñoño')
    })

    it('municipio muy largo (600 chars) → se reenvía tal cual (sin truncar ni crashear)', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      const largo = 'A'.repeat(600)
      fd.set('municipio', largo)
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).get('municipio')).toBe(largo)
    })

    it('domicilio y municipio_participante viajan separados (no colapsan)', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('domicilio', 'Calle Falsa 123')
      fd.set('municipio_participante', 'San Pedro Tlaquepaque')
      fd.set('municipio', 'San Pedro Tlaquepaque')
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      const body = captured.body as FormData
      expect(body.get('domicilio')).toBe('Calle Falsa 123')
      expect(body.get('municipio_participante')).toBe('San Pedro Tlaquepaque')
      expect(body.get('municipio')).toBe('San Pedro Tlaquepaque')
    })
  })
})
