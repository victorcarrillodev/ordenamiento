import { describe, expect, it } from 'vitest'
import { sugerirColonias, sugerirMunicipios } from './colonias.ts'
import type { Sugerencia } from '../utils/colonias-search.ts'

describe('data/colonias · memoización de sugerencias', () => {
  it('devuelve exactamente el mismo resultado ante la misma búsqueda', async () => {
    const primera = await sugerirColonias('centro', undefined, 12)
    const segunda = await sugerirColonias('centro', undefined, 12)

    // Identidad referencial: si recomputara, serían arrays distintos.
    expect(segunda).toBe(primera)
  })

  it('entrega resultados inmutables para que un consumidor no corrompa la caché', async () => {
    const items = await sugerirColonias('centro', undefined, 12)

    // Todos los que pidan esta búsqueda comparten la misma instancia.
    expect(Object.isFrozen(items)).toBe(true)
    expect(() => (items as Sugerencia[]).push({} as Sugerencia)).toThrow()

    const otraVez = await sugerirColonias('centro', undefined, 12)
    expect(otraVez).toHaveLength(items.length)
  })

  it('no confunde búsquedas que sólo difieren en el municipio', async () => {
    const sinMunicipio = await sugerirColonias('centro', undefined, 12)
    const conMunicipio = await sugerirColonias('centro', 'Guadalajara', 12)

    expect(conMunicipio).not.toBe(sinMunicipio)
  })

  it('no confunde búsquedas que sólo difieren en el límite', async () => {
    const doce = await sugerirColonias('centro', undefined, 12)
    const cinco = await sugerirColonias('centro', undefined, 5)

    expect(cinco).not.toBe(doce)
  })

  it('ignora diferencias de mayúsculas al reutilizar el resultado', async () => {
    const minusculas = await sugerirColonias('tlaquepaque', undefined, 12)
    const mayusculas = await sugerirColonias('TLAQUEPAQUE', undefined, 12)

    expect(mayusculas).toBe(minusculas)
  })

  it('mantiene separados los resultados de colonias y de municipios', async () => {
    const colonias = await sugerirColonias('guadalajara', undefined, 12)
    const municipios = await sugerirMunicipios('guadalajara', 12)

    expect(municipios).not.toBe(colonias)
    // Cada uno conserva su forma propia.
    if (municipios.length > 0) expect(municipios[0]).toHaveProperty('coloniasCount')
    if (colonias.length > 0) expect(colonias[0]).toHaveProperty('colonia')
  })

  it('sigue respondiendo cuando se superan las búsquedas memorizadas', async () => {
    // El caché está acotado para que una query string pública no lo haga crecer
    // sin límite. Al desbordarlo tiene que seguir devolviendo resultados
    // correctos, no vaciarse ni fallar.
    //
    // Se varía el límite en vez del texto: cada combinación es una clave nueva,
    // pero una query de un solo carácter corta antes del scoring y mantiene el
    // test rápido.
    for (let limite = 1; limite <= 520; limite++) {
      await sugerirColonias('a', undefined, limite)
    }

    const items = await sugerirColonias('centro', undefined, 12)
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)
  })
})
