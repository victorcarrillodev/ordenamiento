import { expect, it } from 'bun:test'
import type { Db } from '../db/pool.ts'
import { formatoDeFolio, nextFolio } from './folio.ts'

it('cada medio consume únicamente su secuencia y mantiene el prefijo correspondiente', async () => {
  const consultas: string[] = []
  const numeros = { digital: 52, presencial: 0 }
  const db = ((partes: TemplateStringsArray) => {
    const consulta = partes.join('')
    consultas.push(consulta)
    const clave = consulta.includes('_presencial') ? 'presencial' : 'digital'
    return Promise.resolve([{ n: String(++numeros[clave]) }])
  }) as unknown as Db
  expect(await nextFolio(db)).toBe('SPAGU-DGTPU-E-0053')
  expect(await nextFolio(db, 'fisica')).toBe('SPAGU-DGTPU-P-0001')
  expect(await nextFolio(db, 'fisica')).toBe('SPAGU-DGTPU-P-0002')
  expect(await nextFolio(db)).toBe('SPAGU-DGTPU-E-0054')
  expect(consultas[0]).toContain("nextval('folios_participacion')")
  expect(consultas[1]).toContain("nextval('folios_participacion_presencial')")
  expect(formatoDeFolio(10000, 'fisica')).toBe('SPAGU-DGTPU-P-10000')
})
