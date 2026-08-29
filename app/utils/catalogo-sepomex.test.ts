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

  it('parseSepomex filtra por municipio cuando se indica', () => {
    const fixture = [
      'd_codigo|d_asenta|d_tipo_asenta|D_mnpio|d_estado',
      '45500|Centro|Colonia|San Pedro Tlaquepaque|Jalisco',
      '45560|San Antonio|Colonia|San Pedro Tlaquepaque|Jalisco',
      '44100|Americana|Colonia|Guadalajara|Jalisco',
    ].join('\n')

    const resultado = parseSepomex(fixture, 'Jalisco', 'San Pedro Tlaquepaque')
    expect(resultado).toHaveLength(2)
    expect(resultado.every((r) => r.municipio === 'San Pedro Tlaquepaque')).toBe(true)
    expect(resultado.find((r) => r.colonia === 'Americana')).toBeUndefined()
  })

  it('parseSepomex es insensible a mayúsculas/acentos en el filtro de municipio', () => {
    const fixture = [
      'd_codigo|d_asenta|d_tipo_asenta|D_mnpio|d_estado',
      '45500|Centro|Colonia|San Pedro Tlaquepaque|Jalisco',
    ].join('\n')

    expect(parseSepomex(fixture, 'Jalisco', 'SAN PEDRO TLAQUEPAQUE').length).toBe(1)
    expect(parseSepomex(fixture, 'Jalisco', 'san pedro tlaquepaque').length).toBe(1)
    expect(parseSepomex(fixture, 'Jalisco', 'Guadalajara').length).toBe(0)
  })
})

describe('catálogo embebido de navegador (public/colonias-data.js)', () => {
  it('contiene únicamente colonias de San Pedro Tlaquepaque', async () => {
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const raw = await fs.readFile(
      path.resolve(process.cwd(), 'public/colonias-data.js'),
      'utf-8',
    )
    const json = raw.replace(/^window\.__COLONIAS__\s*=\s*/, '').replace(/;\s*$/, '')
    const catalogo = JSON.parse(json)
    expect(catalogo.length).toBeGreaterThan(0)
    expect(catalogo.every((e: { municipio: string }) => e.municipio === 'San Pedro Tlaquepaque')).toBe(
      true,
    )
  })
})
