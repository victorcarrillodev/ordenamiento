/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import * as pool from '../db/pool.ts'
import { listParticipations } from './participations.ts'

describe('H4 · count cache TTL 30s', () => {
  let now = 1_700_000_000_000
  let dateSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    now = 1_700_000_000_000 + Math.floor(Math.random() * 1_000_000)
    dateSpy = spyOn(Date as any, 'now').mockImplementation(() => now)
  })
  afterEach(() => dateSpy.mockRestore())

  it('segundo list con mismos filtros dentro de TTL usa cache (no re-query COUNT)', async () => {
    const unsafeMock = spyOn(pool.sql as any, 'unsafe')
    unsafeMock.mockResolvedValueOnce([{ n: '5' }] as any).mockResolvedValueOnce([{ id: 'a', folio: 'F' }] as any)
    unsafeMock.mockResolvedValueOnce([{ id: 'b', folio: 'F2' }] as any)

    const filters = { page: 1, limit: 10, folio: 'cache-hit-a' }
    const r1 = await listParticipations(filters as any)
    expect(r1.total).toBe(5)
    expect(unsafeMock).toHaveBeenCalledTimes(2)

    const r2 = await listParticipations(filters as any)
    expect(r2.total).toBe(5)
    expect(unsafeMock).toHaveBeenCalledTimes(3)
    unsafeMock.mockRestore()
  })

  it('tras TTL 30s, COUNT se re-ejecuta y refleja nuevo total', async () => {
    const unsafeMock = spyOn(pool.sql as any, 'unsafe')
    unsafeMock.mockResolvedValueOnce([{ n: '5' }] as any).mockResolvedValueOnce([] as any)
    await listParticipations({ page: 1, limit: 10, folio: 'cache-ttl-b' } as any)
    expect(unsafeMock).toHaveBeenCalledTimes(2)

    now += 31_000
    unsafeMock.mockResolvedValueOnce([{ n: '6' }] as any).mockResolvedValueOnce([] as any)
    const r2 = await listParticipations({ page: 1, limit: 10, folio: 'cache-ttl-b' } as any)
    expect(r2.total).toBe(6)
    expect(unsafeMock).toHaveBeenCalledTimes(4)
    unsafeMock.mockRestore()
  })

  it('inserción + list inmediato puede dar total viejo por TTL (documentado, aceptable)', async () => {
    const unsafeMock = spyOn(pool.sql as any, 'unsafe')
    unsafeMock.mockResolvedValueOnce([{ n: '5' }] as any).mockResolvedValueOnce([] as any)
    await listParticipations({ page: 1, limit: 10, folio: 'cache-stale-c' } as any)
    unsafeMock.mockResolvedValueOnce([] as any)
    const r = await listParticipations({ page: 1, limit: 10, folio: 'cache-stale-c' } as any)
    expect(r.total).toBe(5)
    unsafeMock.mockRestore()
  })

  it('filtros distintos no comparten cache', async () => {
    const unsafeMock = spyOn(pool.sql as any, 'unsafe')
    unsafeMock.mockResolvedValueOnce([{ n: '5' }] as any).mockResolvedValueOnce([] as any)
    await listParticipations({ page: 1, limit: 10, folio: 'cache-diff-d1' } as any)
    unsafeMock.mockResolvedValueOnce([{ n: '2' }] as any).mockResolvedValueOnce([] as any)
    const r = await listParticipations({ page: 1, limit: 10, folio: 'cache-diff-d2' } as any)
    expect(r.total).toBe(2)
    expect(unsafeMock).toHaveBeenCalledTimes(4)
    unsafeMock.mockRestore()
  })
})
