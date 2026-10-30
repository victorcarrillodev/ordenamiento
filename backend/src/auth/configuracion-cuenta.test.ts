import { describe, expect, it } from 'bun:test'

import {
  INVITACION_TTL_DIAS,
  NOMBRE_MAX,
  validarDatosDeConfiguracion,
  vigenciaDeInvitacion,
} from './configuracion-cuenta.ts'

const BUENOS = {
  nombres: 'Ana María',
  apellidos: 'López Pérez',
  password: 'mi-clave-nueva-2026',
  confirmacion: 'mi-clave-nueva-2026',
}

describe('validarDatosDeConfiguracion', () => {
  it('acepta nombre(s), apellidos y una contraseña confirmada', () => {
    const r = validarDatosDeConfiguracion(BUENOS)
    expect(r).toEqual({
      ok: true,
      datos: { nombres: 'Ana María', apellidos: 'López Pérez', password: 'mi-clave-nueva-2026' },
    })
  })

  it('limpia espacios de los extremos y los repetidos en los nombres', () => {
    const r = validarDatosDeConfiguracion({
      ...BUENOS,
      nombres: '   José   Luis ',
      apellidos: '\tde la   Cruz\n',
    })
    expect(r.ok && r.datos.nombres).toBe('José Luis')
    expect(r.ok && r.datos.apellidos).toBe('de la Cruz')
  })

  it('admite nombres con acentos, ñ, guiones, apóstrofos y puntos', () => {
    for (const nombre of ['Ma. Guadalupe', "O'Brien", 'Jean-Luc', 'Ñandú', 'Zoë']) {
      expect(validarDatosDeConfiguracion({ ...BUENOS, nombres: nombre }).ok, nombre).toBe(true)
    }
  })

  it('exige nombre(s) y apellidos, cada uno con su error', () => {
    const r = validarDatosDeConfiguracion({ ...BUENOS, nombres: '', apellidos: ' ' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.campos).sort()).toEqual(['apellidos', 'nombres'])
      expect(r.campos.nombres).toContain('El nombre')
      expect(r.campos.apellidos).toContain('Los apellidos')
    }
  })

  it('acota el largo: juntos caben en los 120 caracteres del nombre de la cuenta', () => {
    expect(NOMBRE_MAX * 2 + 1).toBeLessThanOrEqual(120)
    const justo = validarDatosDeConfiguracion({
      ...BUENOS,
      nombres: 'a'.repeat(NOMBRE_MAX),
      apellidos: 'b'.repeat(NOMBRE_MAX),
    })
    expect(justo.ok).toBe(true)
    const largo = validarDatosDeConfiguracion({ ...BUENOS, nombres: 'a'.repeat(NOMBRE_MAX + 1) })
    expect(largo.ok).toBe(false)
    expect(validarDatosDeConfiguracion({ ...BUENOS, nombres: 'A' }).ok).toBe(false)
  })

  it('rechaza ángulos y caracteres de control en los nombres', () => {
    for (const malo of ['<script>', 'Ana>', 'Ana\u0000', 'Ana\u0007María', 'Ana\u007f']) {
      expect(
        validarDatosDeConfiguracion({ ...BUENOS, apellidos: malo }).ok,
        JSON.stringify(malo),
      ).toBe(false)
    }
  })

  it('la contraseña debe tener entre 8 y 128 caracteres', () => {
    for (const mala of ['', 'corta', 'x'.repeat(129)]) {
      const r = validarDatosDeConfiguracion({ ...BUENOS, password: mala, confirmacion: mala })
      expect(r.ok, mala.slice(0, 10)).toBe(false)
      if (!r.ok) expect(r.campos.password).toContain('entre 8 y 128')
    }
    for (const buena of ['12345678', 'x'.repeat(128)]) {
      expect(
        validarDatosDeConfiguracion({ ...BUENOS, password: buena, confirmacion: buena }).ok,
      ).toBe(true)
    }
  })

  it('la confirmación debe ser idéntica', () => {
    const r = validarDatosDeConfiguracion({ ...BUENOS, confirmacion: 'mi-clave-nueva-2027' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.campos).toEqual({ confirmacion: 'Las contraseñas no coinciden.' })
    // Las mayúsculas cuentan, y los espacios también.
    expect(validarDatosDeConfiguracion({ ...BUENOS, confirmacion: 'MI-CLAVE-NUEVA-2026' }).ok).toBe(
      false,
    )
    expect(
      validarDatosDeConfiguracion({ ...BUENOS, confirmacion: 'mi-clave-nueva-2026 ' }).ok,
    ).toBe(false)
  })

  it('la contraseña no se recorta: lo escrito es lo que se guarda', () => {
    const r = validarDatosDeConfiguracion({
      ...BUENOS,
      password: '  con espacios  ',
      confirmacion: '  con espacios  ',
    })
    expect(r.ok && r.datos.password).toBe('  con espacios  ')
  })

  it('lo que no es texto se trata como vacío, sin lanzar', () => {
    const r = validarDatosDeConfiguracion({
      nombres: null,
      apellidos: undefined,
      password: 12345678,
      confirmacion: {},
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.campos).sort()).toEqual(['apellidos', 'nombres', 'password'])
  })

  it('reporta todos los errores a la vez, para corregirlos de una sola vez', () => {
    const r = validarDatosDeConfiguracion({
      nombres: '',
      apellidos: '',
      password: 'corta',
      confirmacion: 'otra',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.campos).sort()).toEqual(['apellidos', 'nombres', 'password'])
  })
})

describe('vigenciaDeInvitacion', () => {
  it('son 7 días desde ahora', () => {
    expect(INVITACION_TTL_DIAS).toBe(7)
    const ahora = Date.UTC(2026, 9, 9, 12, 0, 0)
    expect(vigenciaDeInvitacion(ahora).toISOString()).toBe('2026-10-16T12:00:00.000Z')
  })
})
