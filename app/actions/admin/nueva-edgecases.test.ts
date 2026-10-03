import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_BYTES } from '../../utils/uploads.ts'
import { formularioBase, mockBackend, postNueva } from './nueva-fixtures.ts'

describe('Admin · nueva — bordes de límites y datos sucios', () => {
  const originalFetch = globalThis.fetch
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => (globalThis.fetch = originalFetch))

  describe('límites justo en el borde', () => {
    it('acepta archivo justo por debajo de MAX_FILE_BYTES (MAX-2KB) — overhead multipart', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.append(
        'archivos',
        new File([new Uint8Array(MAX_FILE_BYTES - 2048)], 'casi-exacto.pdf', {
          type: 'application/pdf',
        }),
      )
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).get('archivos')).toBeInstanceOf(File)
    })

    it('acepta un archivo de exactamente MAX_FILE_BYTES pese al overhead del multipart', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.append(
        'archivos',
        new File([new Uint8Array(MAX_FILE_BYTES)], 'exacto.pdf', { type: 'application/pdf' }),
      )

      // El cuerpo multipart pesa más que el archivo (delimitadores, cabeceras y
      // los campos de texto), así que el total tiene margen para absorberlo.
      const response = await postNueva(fd)
      expect(response?.status).toBe(302)
      expect((captured.body as FormData).get('archivos')).toBeInstanceOf(File)
    })

    it('rechaza archivo MAX_FILE_BYTES + 1 byte', async () => {
      mockBackend()
      const fd = formularioBase()
      fd.append(
        'archivos',
        new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'excede.pdf', { type: 'application/pdf' }),
      )
      const r = await postNueva(fd)
      expect(r?.status).toBe(413)
    })

    it('archivo size 0 → no se reenvía pero el formulario se guarda', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.append('archivos', new File([], 'vacio.pdf', { type: 'application/pdf' }))
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).has('archivos')).toBe(false)
    })

    it('sin adjunto → 302 y no se reenvía ningún archivo', async () => {
      const captured = mockBackend()
      const r = await postNueva(formularioBase())
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).has('archivos')).toBe(false)
    })
  })

  describe('datos sucios', () => {
    it('espacios de sobra se recortan antes de reenviar', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('nombre', '   Ciudadano Físico   ')
      fd.set('colonia', '  Santa Anita ')
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      const body = captured.body as FormData
      expect(body.get('nombre')).toBe('Ciudadano Físico')
      expect(body.get('colonia')).toBe('Santa Anita')
    })

    it('acentos y ñ se preservan exactos', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('municipio_participante', 'Cañadas de Ñoño')
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).get('municipio_participante')).toBe('Cañadas de Ñoño')
    })

    it('un municipio de residencia de más de 100 caracteres se rechaza, no se trunca', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('municipio_participante', 'A'.repeat(101))
      const r = await postNueva(fd)
      expect(r?.status).toBe(422)
      expect(captured.body).toBeNull()
    })

    it('los saltos CRLF del navegador cuentan como un carácter en la propuesta', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      // 250 saltos CRLF = 250 caracteres para quien escribe, no 500.
      fd.set('observacion', 'Línea\r\n'.repeat(80))
      const r = await postNueva(fd)
      expect(r?.status).toBe(302)
      expect((captured.body as FormData).get('observacion')).toBe('Línea\n'.repeat(80).trim())
    })
  })
})
