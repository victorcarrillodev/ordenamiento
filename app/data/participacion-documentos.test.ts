import { describe, expect, it } from 'vitest'

import {
  documentoDeTipo,
  esTipoDocumento,
  fechaHoraMx,
  pesoLegible,
} from './participacion-documentos.ts'

describe('fechaHoraMx', () => {
  it('escribe fecha, hora con segundos y «p. m.» en la hora de la Ciudad de México', () => {
    expect(fechaHoraMx('2026-10-05T21:30:15.000Z')).toBe('5 de octubre de 2026, 3:30:15 p. m.')
  })

  it('la mañana lleva «a. m.»', () => {
    expect(fechaHoraMx('2026-01-05T15:03:09.000Z')).toBe('5 de enero de 2026, 9:03:09 a. m.')
  })

  it('un valor que no es fecha se muestra tal cual, sin romper', () => {
    expect(fechaHoraMx('no es fecha')).toBe('no es fecha')
  })
})

describe('pesoLegible', () => {
  it('KB y MB', () => {
    expect(pesoLegible(0)).toBe('—')
    expect(pesoLegible(500)).toBe('500 B')
    expect(pesoLegible(2048)).toBe('2 KB')
    expect(pesoLegible(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })
})

describe('tipos de documento', () => {
  it('reconoce solo los cuatro tipos', () => {
    for (const tipo of ['formato_escaneado', 'version_publica', 'oficio', 'oficio_publico']) {
      expect(esTipoDocumento(tipo)).toBe(true)
    }
    for (const raro of ['', 'otro', null, 1]) expect(esTipoDocumento(raro)).toBe(false)
  })

  it('busca el documento de un tipo', () => {
    const docs = [{ tipo: 'oficio' }, { tipo: 'version_publica' }] as never[]
    expect(documentoDeTipo(docs, 'oficio')).toBe(docs[0])
    expect(documentoDeTipo(docs, 'oficio_publico')).toBeUndefined()
  })
})
