import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import * as front from './participacion.ts'

/**
 * El frontend no puede importar del backend (el Dockerfile de la web no lo
 * copia), así que las listas y los límites del formulario viven en los dos
 * lados. Esta prueba lee el fuente del backend y exige que coincidan: si uno
 * cambia solo, el formulario ofrecería una opción que el backend rechaza.
 */
const BACKEND = readFileSync(
  new URL('../../backend/src/services/participacion-campos.ts', import.meta.url),
  'utf8',
)

/** Cadenas de un `export const NOMBRE = [ ... ] as const` del backend. */
function lista(nombre: string): string[] {
  const bloque = BACKEND.match(new RegExp(`export const ${nombre} = \\[([\\s\\S]*?)\\] as const`))
  expect(bloque, `no se encontró ${nombre} en el backend`).not.toBeNull()
  return [...bloque![1].matchAll(/'([^']+)'|\b(OTRA)\b/g)].map((m) => m[1] ?? 'Otra')
}

describe('catálogos del formulario: frontend y backend coinciden', () => {
  it('temáticas', () => expect([...front.TEMATICAS]).toEqual(lista('TEMATICAS')))
  it('tipos de participante', () =>
    expect([...front.TIPOS_PARTICIPANTE]).toEqual(lista('TIPOS_PARTICIPANTE')))
  it('géneros', () => expect([...front.GENEROS]).toEqual(lista('GENEROS')))
  it('alcances de la ubicación', () => expect([...front.ALCANCES]).toEqual(lista('ALCANCES')))

  it('etiquetas de los alcances', () => {
    for (const [clave, etiqueta] of Object.entries(front.ETIQUETA_ALCANCE)) {
      expect(BACKEND).toContain(`${clave}: '${etiqueta}'`)
    }
  })

  it('el tope de saltos de línea de la propuesta', () => {
    expect(BACKEND).toContain(`MAX_SALTOS_OBSERVACION = ${front.MAX_SALTOS_OBSERVACION}`)
  })

  it('el municipio único', () => {
    expect(BACKEND).toContain(`MUNICIPIO = '${front.MUNICIPIO}'`)
  })

  it('los límites de cada campo', () => {
    const equivalencias: Record<string, string> = { email: 'correo', cp: 'codigo_postal' }
    for (const [campo, tope] of Object.entries(front.LIMITES)) {
      const enBackend = equivalencias[campo] ?? campo
      expect(BACKEND, `límite de ${campo}`).toMatch(new RegExp(`\\b${enBackend}: ${tope},`))
    }
  })
})
