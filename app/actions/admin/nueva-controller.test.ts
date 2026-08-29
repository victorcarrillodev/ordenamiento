import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { router } from '../../router.ts'
import { MAX_FILE_BYTES } from '../../utils/uploads.ts'

const NUEVA_URL = 'http://localhost/ordena/admin/participaciones/nueva'

/** Mockea al backend y captura el FormData reenviado a /api/participations. */
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
    })

  return captured
}

/** Formulario admin mínimo válido, con los dos domicilios que la página captura. */
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

describe('Admin · nueva participación', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('domicilio del participante y domicilio del aporte', () => {
    it('preserva ambos municipios por separado en vez de colapsarlos', async () => {
      const captured = mockBackend()

      const response = await postNueva(formularioBase())
      expect(response?.status).toBe(302)

      const body = captured.body as FormData
      expect(body.get('municipio')).toBe('San Pedro Tlaquepaque') // el del aporte
      expect(body.get('municipio_participante')).toBe('San Pedro Tlaquepaque') // el de quien participa
      expect(body.get('domicilio')).toBe('Av. Juárez 100, Centro')
    })

    it('cae al municipio por defecto cuando el del aporte llega vacío', async () => {
      const captured = mockBackend()

      const fd = formularioBase()
      fd.set('municipio', '')

      const response = await postNueva(fd)
      expect(response?.status).toBe(302)

      // Un input vacío llega como '' y no como null: el fallback tiene que
      // cubrir la cadena vacía o nunca se alcanza.
      const body = captured.body as FormData
      expect(body.get('municipio')).toBe('San Pedro Tlaquepaque')
      expect(body.get('municipio_participante')).toBe('San Pedro Tlaquepaque')
    })

    it('omite el municipio del participante cuando no se capturó', async () => {
      const captured = mockBackend()

      const fd = formularioBase()
      fd.set('municipio_participante', '   ')

      const response = await postNueva(fd)
      expect(response?.status).toBe(302)

      const body = captured.body as FormData
      expect(body.has('municipio_participante')).toBe(false)
      expect(body.get('municipio')).toBe('San Pedro Tlaquepaque')
    })
  })

  describe('límites de subida', () => {
    it('rechaza un archivo que excede el límite de tamaño', async () => {
      mockBackend()

      const fd = formularioBase()
      fd.append(
        'pdf',
        new File([new Uint8Array(MAX_FILE_BYTES + 1024)], 'expediente.pdf', {
          type: 'application/pdf',
        }),
      )

      const response = await postNueva(fd)
      expect(response?.status).toBe(413)
      expect(await response?.text()).toContain('excede el límite')
    })

    it('rechaza más de un adjunto', async () => {
      mockBackend()

      const fd = formularioBase()
      for (const nombre of ['uno.pdf', 'dos.pdf']) {
        fd.append('pdf', new File(['contenido'], nombre, { type: 'application/pdf' }))
      }

      const response = await postNueva(fd)
      expect(response?.status).toBe(413)
    })

    it('acepta un adjunto dentro del límite', async () => {
      const captured = mockBackend()

      const fd = formularioBase()
      fd.append('pdf', new File(['expediente escaneado'], 'acta.pdf', { type: 'application/pdf' }))

      const response = await postNueva(fd)
      expect(response?.status).toBe(302)
      expect((captured.body as FormData).get('pdf')).toBeInstanceOf(File)
    })
  })
})
