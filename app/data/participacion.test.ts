import { describe, expect, it } from 'vitest'

import {
  cuerpoParaBackend,
  LIMITES,
  validarParticipacion,
  valoresDeFormulario,
} from './participacion.ts'

/** Formulario ciudadano válido y mínimo: «todo el municipio», sin ubicación. */
function formulario(campos: Record<string, string> = {}) {
  const fd = new FormData()
  const base: Record<string, string> = {
    nombre: 'María González',
    email: 'maria@ejemplo.com',
    alcance_ubicacion: 'municipio',
    observacion: 'Propuesta técnica detallada para el área protegida.',
    consentimiento: '1',
    ...campos,
  }
  for (const [clave, valor] of Object.entries(base)) fd.set(clave, valor)
  return fd
}

const errores = (campos: Record<string, string> = {}, exigirConsentimiento = true) =>
  validarParticipacion(formulario(campos), { exigirConsentimiento }).errores

describe('validarParticipacion', () => {
  it('acepta el formulario mínimo: nombre, correo, alcance y propuesta', () => {
    expect(errores()).toEqual({})
  })

  it('nombre y correo siguen siendo obligatorios', () => {
    expect(errores({ nombre: 'M' }).nombre).toBe('El nombre debe tener al menos 2 caracteres')
    expect(errores({ nombre: '' }).nombre).toBeDefined()
    expect(errores({ email: 'invalido' }).email).toBe('Ingresa un correo electrónico válido')
    expect(errores({ email: '' }).email).toBeDefined()
  })

  it('el consentimiento solo se exige donde hay aviso de privacidad', () => {
    expect(errores({ consentimiento: '' }).consentimiento).toContain('aviso de privacidad')
    expect(errores({ consentimiento: '' }, false).consentimiento).toBeUndefined()
  })

  describe('ubicación de la propuesta', () => {
    it('sin elegir el alcance se pide elegirlo', () => {
      const fd = formulario()
      fd.delete('alcance_ubicacion')
      expect(validarParticipacion(fd).errores.alcance_ubicacion).toContain('todo el municipio')
      expect(errores({ alcance_ubicacion: 'otro' }).alcance_ubicacion).toBeDefined()
    })

    it('«Todo el municipio»: los datos de ubicación son opcionales', () => {
      const e = errores({ alcance_ubicacion: 'municipio', calle: '', colonia: '', cp: '' })
      expect(e.calle).toBeUndefined()
      expect(e.colonia).toBeUndefined()
    })

    it('«Lugar o predio específico»: exige domicilio o referencia y colonia o zona', () => {
      const e = errores({ alcance_ubicacion: 'especifico' })
      expect(e.calle).toContain('domicilio o una referencia')
      expect(e.colonia).toBe('Indica la colonia o zona')
      expect(
        errores({ alcance_ubicacion: 'especifico', calle: 'Junto al puente', colonia: 'Centro' }),
      ).toEqual({})
    })

    it('una referencia de solo espacios cuenta como vacía', () => {
      const e = errores({ alcance_ubicacion: 'especifico', calle: '    ', colonia: 'Centro' })
      expect(e.calle).toBeDefined()
    })

    it('el código postal, si se da, son 5 dígitos', () => {
      expect(errores({ cp: '45500' }).cp).toBeUndefined()
      for (const malo of ['4550', '455001', 'abcde']) {
        expect(errores({ cp: malo }).cp).toBe('El código postal debe tener 5 dígitos')
      }
    })
  })

  describe('límites de lo que llega al acuse', () => {
    it('la propuesta admite 500 caracteres con todo y espacios, y mínimo 10', () => {
      expect(errores({ observacion: 'x'.repeat(500) }).observacion).toBeUndefined()
      expect(errores({ observacion: 'x'.repeat(501) }).observacion).toContain('500 caracteres')
      expect(errores({ observacion: 'Corta' }).observacion).toBe(
        'La observación debe tener al menos 10 caracteres',
      )
    })

    it('cuenta caracteres y no unidades UTF-16: 500 emojis caben', () => {
      expect(errores({ observacion: '😀'.repeat(500) }).observacion).toBeUndefined()
    })

    it('un salto de línea CRLF del navegador cuenta como un solo carácter', () => {
      // El navegador envía los saltos como CRLF (2 caracteres), pero quien escribe y
      // el contador los cuentan como uno: 249 + salto + 250 son 500 caracteres.
      const enElTope = 'x'.repeat(249) + '\r\n' + 'y'.repeat(250)
      expect(errores({ observacion: enElTope }).observacion).toBeUndefined()
      const unoDeMas = 'x'.repeat(250) + '\r\n' + 'y'.repeat(250)
      expect(errores({ observacion: unoDeMas }).observacion).toContain('500')
    })

    it('la propuesta admite hasta 8 saltos de línea: cada uno es un renglón del acuse', () => {
      const conSaltos = (n: number) => Array.from({ length: n + 1 }, () => 'renglón').join('\r\n')
      expect(errores({ observacion: conSaltos(8) }).observacion).toBeUndefined()
      expect(errores({ observacion: conSaltos(9) }).observacion).toContain('8 saltos de línea')
    })

    it('cada campo respeta su tope', () => {
      const casos: Array<[string, number]> = [
        ['nombre', LIMITES.nombre],
        ['calle', LIMITES.calle],
        ['colonia', LIMITES.colonia],
        ['institucion', LIMITES.institucion],
        ['domicilio', LIMITES.domicilio],
        ['municipio_participante', LIMITES.municipio_participante],
        ['ocupacion', LIMITES.ocupacion],
      ]
      for (const [campo, tope] of casos) {
        expect(
          errores({ [campo]: 'a'.repeat(tope) })[campo as 'nombre'],
          `${campo} en el tope`,
        ).toBeUndefined()
        expect(
          errores({ [campo]: 'a'.repeat(tope + 1) })[campo as 'nombre'],
          `${campo} excede`,
        ).toBeDefined()
      }
    })
  })

  describe('listas con «Otra»', () => {
    it('acepta las opciones del catálogo y rechaza las que no lo son', () => {
      expect(errores({ tematica: 'Movilidad', fuente: 'Empresa', genero: 'No binario' })).toEqual(
        {},
      )
      expect(errores({ tematica: 'Servicios Ambientales' }).tematica).toBeDefined()
      expect(errores({ fuente: 'Dependencia' }).fuente).toBeDefined()
      expect(errores({ genero: 'Otro' }).genero).toBeDefined()
    })

    it('las listas se pueden dejar sin contestar', () => {
      expect(errores({ tematica: '', fuente: '', genero: '' })).toEqual({})
    })

    it('«Otra» admite especificarla, con tope; con otra opción se descarta', () => {
      expect(
        errores({ tematica: 'Otra', tematica_otra: 'x'.repeat(60) }).tematica_otra,
      ).toBeUndefined()
      expect(
        errores({ tematica: 'Otra', tematica_otra: 'x'.repeat(61) }).tematica_otra,
      ).toBeDefined()
      expect(errores({ fuente: 'Otra', fuente_otra: 'x'.repeat(61) }).fuente_otra).toBeDefined()

      const { valores } = validarParticipacion(
        formulario({ tematica: 'Vivienda', tematica_otra: 'sobra' }),
      )
      expect(valores.tematica_otra).toBeUndefined()
    })
  })
})

describe('valoresDeFormulario', () => {
  it('rescata lo escrito, sin los saltos CRLF, para repintar', () => {
    const valores = valoresDeFormulario(formulario({ observacion: 'Línea 1\r\nLínea 2' }))
    expect(valores.observacion).toBe('Línea 1\nLínea 2')
    expect(valores.consentimiento).toBe(true)
  })

  it('no inventa valores para lo que no llegó', () => {
    const valores = valoresDeFormulario(formulario())
    expect(valores.colonia).toBeUndefined()
    expect(valores.tematica).toBeUndefined()
  })
})

describe('cuerpoParaBackend', () => {
  it('usa los nombres del backend y fija el municipio único', () => {
    const { valores } = validarParticipacion(
      formulario({
        alcance_ubicacion: 'especifico',
        calle: 'Av. Juárez 100',
        colonia: 'Centro',
        cp: '45500',
      }),
    )
    const cuerpo = cuerpoParaBackend(valores)
    expect(cuerpo.get('correo')).toBe('maria@ejemplo.com')
    expect(cuerpo.get('codigo_postal')).toBe('45500')
    expect(cuerpo.get('alcance_ubicacion')).toBe('especifico')
    expect(cuerpo.get('municipio')).toBe('San Pedro Tlaquepaque')
    expect(cuerpo.get('direccion_origen')).toBe('manual')
    expect(cuerpo.has('email')).toBe(false)
  })
})
