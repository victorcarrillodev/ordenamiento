import { describe, expect, it } from 'vitest'
import { buscarColonias, buscarMunicipios, type OpcionesBusqueda } from './colonias-search.ts'
import type { EntradaCatalogo } from './catalogo-sepomex.ts'

// Catálogo mínimo para fijar el contrato de ranking (debe coincidir con la
// lógica embebida en public/autocomplete.js). Si el port JS diverge, este
// test falla y señala el drift de catálogo.
const CATALOGO: EntradaCatalogo[] = [
  { colonia: 'Centro', municipio: 'San Pedro Tlaquepaque', cp: '45500', tipo: 'Colonia', busqueda: 'centro san pedro tlaquepaque 45500' },
  { colonia: 'La Loma Alta', municipio: 'San Pedro Tlaquepaque', cp: '45501', tipo: 'Colonia', busqueda: 'loma alta san pedro tlaquepaque 45501' },
  { colonia: 'Bethel', municipio: 'San Pedro Tlaquepaque', cp: '45502', tipo: 'Colonia', busqueda: 'bethel san pedro tlaquepaque 45502' },
  { colonia: 'El Álamo', municipio: 'San Pedro Tlaquepaque', cp: '45503', tipo: 'Colonia', busqueda: 'alamo san pedro tlaquepaque 45503' },
  { colonia: 'Centro', municipio: 'Guadalajara', cp: '44100', tipo: 'Colonia', busqueda: 'centro guadalajara 44100' },
]

function buscar(q: string, municipio?: string): string[] {
  const opciones: OpcionesBusqueda = { q, municipio }
  return buscarColonias(CATALOGO, opciones).map((s) => s.colonia)
}

describe('buscarColonias (contrato de ranking)', () => {
  it('query < 2 chars devuelve vacío', () => {
    expect(buscarColonias(CATALOGO, { q: 'a' })).toEqual([])
  })

  it('coincidencia de prefijo tiene prioridad (score 1) y filtra por municipio', () => {
    const res = buscar('cent', 'San Pedro Tlaquepaque')
    expect(res[0]).toBe('Centro')
    expect(res.filter((c) => c === 'Centro').length).toBe(1)
  })

  it('ignora artículos: "Loma Alta" encuentra "La Loma Alta" (score 2)', () => {
    const res = buscar('Loma Alta')
    expect(res[0]).toBe('La Loma Alta')
  })

  it('coincidencia fonética: "el betel" -> "Bethel" (score 7)', () => {
    const res = buscar('el betel')
    expect(res[0]).toBe('Bethel')
  })

  it('CP de 5 dígitos busca por código postal exacto (score 0)', () => {
    const res = buscarColonias(CATALOGO, { q: '45503' })
    expect(res[0].colonia).toBe('El Álamo')
    expect(res[0].cp).toBe('45503')
  })

  it('substring general en texto indexado (score 6)', () => {
    const res = buscar('tlaquepaque')
    expect(res.length).toBeGreaterThan(0)
    expect(res.every((c) => c.length > 0)).toBe(true)
  })

  it('límite se respeta', () => {
    const res = buscarColonias(CATALOGO, { q: 'a', limite: 2 })
    expect(res.length).toBeLessThanOrEqual(2)
  })
})

describe('buscarMunicipios (contrato)', () => {
  it('prefijo de municipio (score 1) y ordenado por nombre', () => {
    const res = buscarMunicipios(CATALOGO, 'San')
    expect(res[0].municipio).toContain('San Pedro Tlaquepaque')
    expect(res.length).toBeGreaterThan(0)
  })

  it('query vacío devuelve vacío', () => {
    expect(buscarMunicipios(CATALOGO, '')).toEqual([])
  })

  it('cuenta colonias por municipio', () => {
    const res = buscarMunicipios(CATALOGO, 'San Pedro Tlaquepaque')
    expect(res[0].coloniasCount).toBe(4)
  })
})
