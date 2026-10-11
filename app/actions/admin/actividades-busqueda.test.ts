import { describe, expect, it } from 'vitest'

import {
  buscarActividades,
  MIN_BUSQUEDA,
  normalizar,
  terminoDeBusqueda,
} from './actividades-busqueda.ts'

const a = (
  titulo: string,
  extra: Partial<Parameters<typeof buscarActividades>[0][number]> = {},
) => ({
  titulo,
  tipo: 'Otra' as const,
  fase: 'Formulación' as const,
  lugar: '',
  direccion: '',
  ...extra,
})

describe('normalizar', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizar('Sesión del COMITÉ')).toBe('sesion del comite')
    expect(normalizar('Ñandú')).toBe('nandu')
  })
})

describe('terminoDeBusqueda', () => {
  it('recorta, acota y descarta lo demasiado corto', () => {
    expect(terminoDeBusqueda('  foro ')).toBe('foro')
    expect(terminoDeBusqueda('a')).toBe('')
    expect(terminoDeBusqueda(' a ')).toBe('')
    expect(terminoDeBusqueda(null)).toBe('')
    expect(terminoDeBusqueda(undefined)).toBe('')
    expect(terminoDeBusqueda('x'.repeat(200))).toHaveLength(80)
    expect(MIN_BUSQUEDA).toBe(2)
  })
})

describe('buscarActividades', () => {
  const lista = [
    a('Foro de consulta pública', { tipo: 'Foro', lugar: 'Casa de la Cultura' }),
    a('Sesión de Cabildo para la aprobación del Programa', { tipo: 'Sesión de Cabildo' }),
    a('Taller sectorial de diagnóstico', {
      tipo: 'Taller',
      fase: 'Ejecución',
      direccion: 'Av. Niños Héroes 100',
    }),
  ]

  it('sin término devuelve la lista tal cual', () => {
    expect(buscarActividades(lista, '')).toBe(lista)
    expect(buscarActividades(lista, '   ')).toBe(lista)
  })

  it('no distingue acentos ni mayúsculas', () => {
    expect(buscarActividades(lista, 'SESION').map((x) => x.titulo)).toEqual([
      'Sesión de Cabildo para la aprobación del Programa',
    ])
    expect(buscarActividades(lista, 'diagnostico')).toHaveLength(1)
    expect(buscarActividades(lista, 'aprobacion')).toHaveLength(1)
  })

  it('exige todas las palabras, en cualquier orden', () => {
    expect(buscarActividades(lista, 'consulta foro')).toHaveLength(1)
    expect(buscarActividades(lista, 'foro cabildo')).toHaveLength(0)
  })

  it('busca también en el tipo, la fase, el lugar y la dirección', () => {
    expect(buscarActividades(lista, 'cultura')).toHaveLength(1) // lugar
    expect(buscarActividades(lista, 'heroes')).toHaveLength(1) // dirección
    expect(buscarActividades(lista, 'ejecucion')).toHaveLength(1) // fase
    expect(buscarActividades(lista, 'taller')).toHaveLength(1) // tipo y título
  })

  it('un texto sin coincidencias da una lista vacía, no un error', () => {
    expect(buscarActividades(lista, 'zzzz')).toEqual([])
    expect(buscarActividades([], 'foro')).toEqual([])
  })

  it('no interpreta el texto como expresión regular', () => {
    expect(buscarActividades(lista, '.*')).toEqual([])
    expect(buscarActividades(lista, '(')).toEqual([])
  })
})
