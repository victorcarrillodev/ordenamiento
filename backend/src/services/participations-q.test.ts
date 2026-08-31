/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn } from 'bun:test'
import * as pool from '../db/pool.ts'
import { listParticipations } from './participations.ts'

/** Captura los parámetros ($1, $2...) pasados a sql.unsafe por listParticipations. */
async function capturarParams(filters: any): Promise<unknown[]> {
  const params: unknown[] = []
  const unsafeMock = spyOn(pool.sql as any, 'unsafe')
  unsafeMock.mockImplementation(async (sqlStr: string, args?: unknown[]) => {
    if (args) params.push(...args)
    return sqlStr.includes('count') ? ([{ n: '0' }] as any) : ([] as any)
  })
  try {
    await listParticipations(filters)
  } finally {
    unsafeMock.mockRestore()
  }
  return params
}

describe('participations · listParticipations filtro q y escape', () => {
  it('aplica el filtro q como OR de ILIKE sobre campos clave', async () => {
    const sqlCapturado: string[] = []
    const unsafeMock = spyOn(pool.sql as any, 'unsafe')
    unsafeMock.mockImplementation(async (sqlStr: string) => {
      sqlCapturado.push(sqlStr)
      return sqlStr.includes('count') ? ([{ n: '0' }] as any) : ([] as any)
    })
    try {
      await listParticipations({ page: 1, limit: 10, q: 'centro' })
    } finally {
      unsafeMock.mockRestore()
    }
    const select = sqlCapturado.find((s) => !s.includes('count')) ?? ''
    expect(select).toContain('p.nombre ILIKE')
    expect(select).toContain('p.colonia ILIKE')
    expect(select).toContain('p.calle ILIKE')
    expect(select).toContain('p.folio ILIKE')
    expect(select).toContain('p.observacion ILIKE')
    expect(select).toContain('ESCAPE')
  })

  it('q corto (<2) no genera condición de búsqueda', async () => {
    const sqlCapturado: string[] = []
    const unsafeMock = spyOn(pool.sql as any, 'unsafe')
    unsafeMock.mockImplementation(async (sqlStr: string) => {
      sqlCapturado.push(sqlStr)
      return sqlStr.includes('count') ? ([{ n: '0' }] as any) : ([] as any)
    })
    try {
      await listParticipations({ page: 1, limit: 10, q: 'a' })
    } finally {
      unsafeMock.mockRestore()
    }
    const select = sqlCapturado.find((s) => !s.includes('count')) ?? ''
    expect(select).not.toContain('ILIKE')
  })

  it('escapa comodines % y _ en búsquedas para evitar full scan', async () => {
    const params = await capturarParams({ page: 1, limit: 10, folio: '100%' })
    // El valor del parámetro debe tener el % escapado como \%
    expect(params.some((p) => typeof p === 'string' && p.includes('100\\%'))).toBe(true)
  })

  it('escapa comodines en q', async () => {
    const params = await capturarParams({ page: 1, limit: 10, q: 'a_b%c' })
    expect(params.some((p) => typeof p === 'string' && p.includes('a\\_b\\%c'))).toBe(true)
  })
})
