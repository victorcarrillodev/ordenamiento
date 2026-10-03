import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_BYTES, MAX_FILES } from '../../utils/uploads.ts'
import { formularioBase, mockBackend, postNueva } from './nueva-fixtures.ts'

describe('Admin · nueva participación', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('mismos campos y reglas que el formulario ciudadano', () => {
    it('reenvía al backend la participación presencial con los nombres del backend', async () => {
      const captured = mockBackend()

      const response = await postNueva(formularioBase())
      expect(response?.status).toBe(302)
      expect(response?.headers.get('location')).toContain('registrado=FIS-2026-009')

      const body = captured.body as FormData
      expect(body.get('origen')).toBe('fisica')
      expect(body.get('correo')).toBe('fisico@ejemplo.com')
      expect(body.get('alcance_ubicacion')).toBe('especifico')
      expect(body.get('calle')).toBe('Prolongación Colón 500')
      expect(body.get('colonia')).toBe('Santa Anita')
      expect(body.get('municipio')).toBe('San Pedro Tlaquepaque')
      // El formulario lo captura como «cp» y el backend solo lee `codigo_postal`.
      expect(body.get('codigo_postal')).toBe('45640')
      // El domicilio y el municipio de quien participa viajan aparte de la ubicación.
      expect(body.get('domicilio')).toBe('Av. Juárez 100, Centro')
      expect(body.get('municipio_participante')).toBe('Guadalajara')
    })

    it('«Todo el municipio» no exige la ubicación', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('alcance_ubicacion', 'municipio')
      fd.set('calle', '')
      fd.set('colonia', '')

      const response = await postNueva(fd)
      expect(response?.status).toBe(302)
      expect((captured.body as FormData).get('alcance_ubicacion')).toBe('municipio')
    })

    it('«Lugar o predio específico» sin domicilio ni colonia se rechaza y repinta lo escrito', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('calle', '')
      fd.set('colonia', '')

      const response = await postNueva(fd)
      expect(response?.status).toBe(422)
      expect(captured.body).toBeNull()
      const html = (await response?.text()) ?? ''
      expect(html).toContain('Indica el domicilio o una referencia')
      expect(html).toContain('Indica la colonia o zona')
      expect(html).toContain('Ciudadano Físico')
    })

    it('aplica los mismos límites: la propuesta admite 500 caracteres', async () => {
      const captured = mockBackend()
      const fd = formularioBase()
      fd.set('observacion', 'x'.repeat(501))

      const response = await postNueva(fd)
      expect(response?.status).toBe(422)
      expect(captured.body).toBeNull()
      expect(await response?.text()).toContain('500 caracteres')
    })

    it('no pide aviso de privacidad: la persona está en ventanilla', async () => {
      mockBackend()
      const response = await postNueva(formularioBase())
      expect(response?.status).toBe(302)
    })
  })

  describe('límites de subida: los mismos que en el formulario ciudadano', () => {
    it('rechaza un archivo que excede el límite de tamaño', async () => {
      mockBackend()

      const fd = formularioBase()
      fd.append(
        'archivos',
        new File([new Uint8Array(MAX_FILE_BYTES + 1024)], 'expediente.pdf', {
          type: 'application/pdf',
        }),
      )

      const response = await postNueva(fd)
      expect(response?.status).toBe(413)
      expect(await response?.text()).toContain('pesar hasta')
    })

    it(`rechaza más de ${MAX_FILES} adjuntos`, async () => {
      mockBackend()

      const fd = formularioBase()
      for (let i = 0; i <= MAX_FILES; i++) {
        fd.append('archivos', new File(['contenido'], `doc${i}.pdf`, { type: 'application/pdf' }))
      }

      const response = await postNueva(fd)
      expect(response?.status).toBe(413)
      expect(await response?.text()).toContain(`Máximo ${MAX_FILES} archivos`)
    })

    it('acepta el máximo de adjuntos y los reenvía todos', async () => {
      const captured = mockBackend()

      const fd = formularioBase()
      for (let i = 0; i < MAX_FILES; i++) {
        fd.append('archivos', new File([`doc ${i}`], `doc${i}.pdf`, { type: 'application/pdf' }))
      }

      const response = await postNueva(fd)
      expect(response?.status).toBe(302)
      expect((captured.body as FormData).getAll('archivos')).toHaveLength(MAX_FILES)
    })
  })
})
