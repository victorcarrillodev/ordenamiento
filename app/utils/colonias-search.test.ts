import { describe, expect, it } from 'vitest'
import { type EntradaCatalogo, parseSepomex } from './catalogo-sepomex.ts'
import { buscarColonias, buscarMunicipios } from './colonias-search.ts'

describe('colonias-search', () => {
  const catalogo: EntradaCatalogo[] = parseSepomex(
    [
      '45500|Centro|Colonia|San Pedro Tlaquepaque|Jalisco',
      '45560|San Antonio|Colonia|San Pedro Tlaquepaque|Jalisco',
      '44100|Americana|Colonia|Guadalajara|Jalisco',
      '44270|San Antonio|Colonia|Guadalajara|Jalisco',
      '45000|San Antonio|Colonia|Zapopan|Jalisco',
      '45640|Santa Anita|Colonia|Tlajomulco de Zúñiga|Jalisco',
      '45600|Las Juntas|Colonia|San Pedro Tlaquepaque|Jalisco',
    ].join('\n'),
  )

  it('devuelve array vacío si q tiene menos de 2 caracteres', () => {
    expect(buscarColonias(catalogo, { q: '' })).toEqual([])
    expect(buscarColonias(catalogo, { q: 'a' })).toEqual([])
  })

  it('búsqueda por 5 dígitos hace coincidencia exacta de CP', () => {
    const res = buscarColonias(catalogo, { q: '45500' })
    expect(res).toHaveLength(1)
    expect(res[0].colonia).toBe('Centro')
    expect(res[0].cp).toBe('45500')
  })

  it('encuentra todas las colonias homónimas en distintos municipios', () => {
    const res = buscarColonias(catalogo, { q: 'san antonio' })
    expect(res.length).toBeGreaterThanOrEqual(3)
    const municipios = res.map((r) => r.municipio)
    expect(municipios).toContain('San Pedro Tlaquepaque')
    expect(municipios).toContain('Guadalajara')
    expect(municipios).toContain('Zapopan')
  })

  it('prefijo en colonia tiene prioridad sobre coincidencia interna', () => {
    const res = buscarColonias(catalogo, { q: 'san' })
    expect(res.length).toBeGreaterThan(0)
    // "San Antonio" o "Santa Anita" empiezan con "san"
    expect(res[0].colonia.toLowerCase().startsWith('san')).toBe(true)
  })

  it('filtra por municipio si se especifica', () => {
    const res = buscarColonias(catalogo, { q: 'san antonio', municipio: 'San Pedro Tlaquepaque' })
    expect(res).toHaveLength(1)
    expect(res[0].municipio).toBe('San Pedro Tlaquepaque')
    expect(res[0].colonia).toBe('San Antonio')
  })

  it('respeta el límite de resultados cortando después de ordenar', () => {
    const res = buscarColonias(catalogo, { q: 'san', limite: 2 })
    expect(res).toHaveLength(2)
  })

  it('buscarMunicipios encuentra municipios únicos de Jalisco y cuenta colonias', () => {
    const res = buscarMunicipios(catalogo, 'San Pedro')
    expect(res).toHaveLength(1)
    expect(res[0].municipio).toBe('San Pedro Tlaquepaque')
    expect(res[0].coloniasCount).toBe(3)

    const gdl = buscarMunicipios(catalogo, 'guada')
    expect(gdl).toHaveLength(1)
    expect(gdl[0].municipio).toBe('Guadalajara')
  })
})
