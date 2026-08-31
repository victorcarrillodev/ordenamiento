/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import * as pool from '../db/pool.ts'
import { deepMerge, getCustomizations } from './customizations.ts'

describe('customizations · deepMerge', () => {
  it('fusiona objetos anidados recursivamente', () => {
    const base = { a: 1, nested: { x: 1, y: 2 } }
    const over = { b: 2, nested: { y: 20, z: 30 } }
    const result = deepMerge(base, over)
    expect(result).toEqual({ a: 1, b: 2, nested: { x: 1, y: 20, z: 30 } })
  })

  it('NO permite prototype pollution vía __proto__', () => {
    const malicious = JSON.parse('{ "nested": { "__proto__": { "polluted": true } } }')
    const result = deepMerge({ nested: {} }, malicious)
    expect(({} as any).polluted).toBeUndefined()
    expect(result.nested.polluted).toBeUndefined()
  })

  it('NO permite prototype pollution vía constructor', () => {
    const malicious = JSON.parse('{ "constructor": { "prototype": { "polluted": true } } }')
    deepMerge({}, malicious)
    expect(({} as any).polluted).toBeUndefined()
  })

  it('ignora source no objeto', () => {
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 })
    expect(deepMerge({ a: 1 }, 5 as any)).toEqual({ a: 1 })
  })
})

describe('customizations · getCustomizations', () => {
  let sqlMock: ReturnType<typeof spyOn> | null = null
  beforeEach(() => {
    // getCustomizations usa el tag `sql\`...\``, no `.unsafe`, así que espiamos sql.
    sqlMock = spyOn(pool, 'sql' as any)
  })
  afterEach(() => {
    sqlMock?.mockRestore()
  })

  it('lee la config de la BD y la fusiona con el default', async () => {
    sqlMock!.mockResolvedValueOnce([{ config: { usuario: { colores: { primario: '#123456' } } } }] as any)
    const cfg = await getCustomizations()
    expect(cfg.usuario.colores.primario).toBe('#123456')
  })

  it('retorna default si no hay fila', async () => {
    sqlMock!.mockResolvedValueOnce([] as any)
    const cfg = await getCustomizations()
    expect(cfg).toBeDefined()
    expect(Object.keys(cfg).length).toBeGreaterThan(0)
  })
})
