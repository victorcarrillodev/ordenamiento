import { describe, expect, it } from 'vitest'
import * as s from 'remix/data-schema'
import { errorMap, participationSchema, toFormErrors } from './schema.ts'

describe('participation schema', () => {
  it('valida exitosamente un formulario correcto', () => {
    const formData = new FormData()
    formData.set('nombre', 'María González')
    formData.set('email', 'maria@ejemplo.com')
    formData.set('calle', 'Av. Hidalgo 123')
    formData.set('colonia', 'Centro')
    formData.set('municipio', 'San Pedro Tlaquepaque')
    formData.set('cp', '45500')
    formData.set('observacion', 'Propuesta técnica detallada para el área protegida.')
    formData.set('consentimiento', '1')

    const res = s.parseSafe(participationSchema, formData, { errorMap })
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.value.nombre).toBe('María González')
      expect(res.value.colonia).toBe('Centro')
      expect(res.value.consentimiento).toBe('1')
      expect(res.value.direccion_origen).toBe('manual')
    }
  })

  it('rechaza si falta el consentimiento de privacidad', () => {
    const formData = new FormData()
    formData.set('nombre', 'María González')
    formData.set('email', 'maria@ejemplo.com')
    formData.set('colonia', 'Centro')
    formData.set('municipio', 'San Pedro Tlaquepaque')
    formData.set('observacion', 'Observación técnica válida con más de 10 caracteres')
    formData.set('consentimiento', '')

    const res = s.parseSafe(participationSchema, formData, { errorMap })
    expect(res.success).toBe(false)
    if (!res.success) {
      const errors = toFormErrors(res.issues)
      expect(errors.consentimiento).toContain('aviso de privacidad')
    }
  })

  it('rechaza nombres u observaciones muy cortas', () => {
    const formData = new FormData()
    formData.set('nombre', 'M')
    formData.set('email', 'invalido')
    formData.set('colonia', 'C')
    formData.set('municipio', 'M')
    formData.set('observacion', 'Corta')
    formData.set('consentimiento', '1')

    const res = s.parseSafe(participationSchema, formData, { errorMap })
    expect(res.success).toBe(false)
    if (!res.success) {
      const errors = toFormErrors(res.issues)
      expect(errors.nombre).toBe('El nombre debe tener al menos 2 caracteres')
      expect(errors.email).toBe('Ingresa un correo electrónico válido')
      expect(errors.observacion).toBe('La observación debe tener al menos 10 caracteres')
    }
  })

  it('toFormErrors flattens issues and keeps the first one per field', () => {
    const issues: s.Issue[] = [
      { path: ['nombre'], message: 'Error 1' },
      { path: ['nombre'], message: 'Error 2' },
      { path: ['email'], message: 'Email error' },
    ]
    const errors = toFormErrors(issues)
    expect(errors.nombre).toBe('Error 1')
    expect(errors.email).toBe('Email error')
  })
})
