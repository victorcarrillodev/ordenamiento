import { describe, expect, it } from 'vitest'

import {
  enlaceUbicacion,
  nombreDeArchivo,
  pesoLegible,
  separarArchivos,
  TIPOS_DOCUMENTO,
  type ArchivoActividad,
} from './programa.ts'

function archivo(tipo: ArchivoActividad['tipo'], titulo = ''): ArchivoActividad {
  return {
    id: `${tipo}-${titulo}`,
    actividad_id: 'a1',
    tipo,
    titulo,
    nombre_original: 'archivo.pdf',
    mime: 'application/pdf',
    size: 2048,
    created_at: '2026-09-01',
  }
}

describe('programa', () => {
  it('las fotografías tienen su propio campo: no son un tipo de documento', () => {
    expect(TIPOS_DOCUMENTO).not.toContain('Fotografía')
    expect(TIPOS_DOCUMENTO).toContain('Lista de asistencia')
  })

  it('separa la galería de la lista de documentos', () => {
    const { fotos, documentos } = separarArchivos([
      archivo('Fotografía'),
      archivo('Acta'),
      archivo('Convocatoria'),
    ])
    expect(fotos).toHaveLength(1)
    expect(documentos.map((d) => d.tipo)).toEqual(['Acta', 'Convocatoria'])
    expect(separarArchivos(undefined)).toEqual({ fotos: [], documentos: [] })
  })

  it('nombre visible y peso', () => {
    expect(nombreDeArchivo(archivo('Acta'))).toBe('archivo.pdf')
    expect(nombreDeArchivo(archivo('Acta', 'Acta de la sesión'))).toBe('Acta de la sesión')
    expect(pesoLegible(2048)).toBe('2 KB')
    expect(pesoLegible(3 * 1024 * 1024)).toBe('3.0 MB')
    expect(pesoLegible(0)).toBe('')
  })

  describe('enlaceUbicacion («Cómo llegar»)', () => {
    const base = { latitud: '', longitud: '', direccion: '', lugar: '' }

    it('las coordenadas mandan', () => {
      expect(enlaceUbicacion({ ...base, latitud: '20.64', longitud: '-103.31' })).toBe(
        'https://www.google.com/maps/search/?api=1&query=20.64,-103.31',
      )
    })

    it('un enlace de Maps pegado se usa tal cual', () => {
      const maps = 'https://maps.app.goo.gl/abc123'
      expect(enlaceUbicacion({ ...base, direccion: maps })).toBe(maps)
    })

    it('un esquema peligroso nunca llega a un href', () => {
      const enlace = enlaceUbicacion({ ...base, direccion: 'javascript:alert(1)' })
      expect(enlace).toBe('https://www.google.com/maps/search/?api=1&query=javascript%3Aalert(1)')
    })

    it('la dirección escrita se busca en el mapa; sin datos no hay enlace', () => {
      expect(enlaceUbicacion({ ...base, lugar: 'Salón de Cabildo', direccion: 'Centro' })).toBe(
        'https://www.google.com/maps/search/?api=1&query=Sal%C3%B3n%20de%20Cabildo%2C%20Centro',
      )
      expect(enlaceUbicacion(base)).toBeNull()
    })
  })
})
