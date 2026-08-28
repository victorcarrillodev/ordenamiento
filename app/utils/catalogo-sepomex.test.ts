import { describe, expect, it } from 'vitest'
import { indexar, normalizar, parseSepomex } from './catalogo-sepomex.ts'

describe('catalogo-sepomex', () => {
  it('normalizar elimina acentos y pasa a minúsculas', () => {
    expect(normalizar('San Pedro Tlaquepaque')).toBe('san pedro tlaquepaque')
    expect(normalizar('Martín del Valle Árbol')).toBe('martin del valle arbol')
    expect(normalizar('   ZAPOPAN   ')).toBe('zapopan')
  })

  it('parseSepomex parsea lineas con pipe y filtra por estado', () => {
    const fixture = [
      'd_codigo|d_asenta|d_tipo_asenta|D_mnpio|d_estado|d_ciudad',
      '45500|Centro|Colonia|San Pedro Tlaquepaque|Jalisco|Tlaquepaque',
      '45560|San Antonio|Colonia|San Pedro Tlaquepaque|Jalisco|Tlaquepaque',
      '44100|Americana|Colonia|Guadalajara|Jalisco|Guadalajara',
      '01000|San Ángel|Colonia|Álvaro Obregón|Ciudad de México|Ciudad de México',
    ].join('\n')

    const resultado = parseSepomex(fixture, 'Jalisco')
    expect(resultado).toHaveLength(3)
    expect(resultado.map((r) => r.colonia)).toEqual(
      expect.arrayContaining(['Americana', 'Centro', 'San Antonio']),
    )
    expect(resultado.find((r) => r.colonia === 'San Ángel')).toBeUndefined()
  })

  it('parseSepomex deduplica entradas idénticas', () => {
    const fixture = [
      '45500|Centro|Colonia|San Pedro Tlaquepaque|Jalisco',
      '45500|Centro|Colonia|San Pedro Tlaquepaque|Jalisco',
    ].join('\n')

    const resultado = parseSepomex(fixture, 'Jalisco')
    expect(resultado).toHaveLength(1)
  })

  it('indexar ordena reproduciblemente por municipio, colonia y CP', () => {
    const entradas = [
      {
        colonia: 'Miramar',
        municipio: 'Zapopan',
        cp: '45060',
        tipo: 'Colonia',
        busqueda: 'miramar zapopan 45060',
      },
      {
        colonia: 'Centro',
        municipio: 'Guadalajara',
        cp: '44100',
        tipo: 'Colonia',
        busqueda: 'centro guadalajara 44100',
      },
      {
        colonia: 'Alcalde Barranquitas',
        municipio: 'Guadalajara',
        cp: '44270',
        tipo: 'Colonia',
        busqueda: 'alcalde barranquitas guadalajara 44270',
      },
    ]

    const ordenado = indexar(entradas)
    expect(ordenado[0].colonia).toBe('Alcalde Barranquitas')
    expect(ordenado[1].colonia).toBe('Centro')
    expect(ordenado[2].colonia).toBe('Miramar')
  })
})
