import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import * as pool from '../db/pool.ts'

const { isExportable, exportTableToXlsx } = await import('./export.ts')

describe('export · lista blanca (anti-inyección de tabla)', () => {
  it('acepta solo tablas exportables', () => {
    expect(isExportable('reuniones')).toBe(true)
    expect(isExportable('participaciones')).toBe(true)
    expect(isExportable('usuarios')).toBe(true)
  })
  it('rechaza tablas no exportables (nunca interpola SQL con el nombre de URL)', () => {
    expect(isExportable('users; DROP TABLE participations')).toBe(false)
    expect(isExportable('participations WHERE 1=1')).toBe(false)
    expect(isExportable('passwords')).toBe(false)
    expect(isExportable('')).toBe(false)
  })
})

describe('exportTableToXlsx', () => {
  let sqlMock: ReturnType<typeof spyOn> | undefined

  beforeEach(() => {
    sqlMock = spyOn(pool, 'sql')
  })
  afterEach(() => {
    sqlMock?.mockRestore()
  })

  it('genera un xlsx válido a partir de filas de participaciones', async () => {
    sqlMock!.mockImplementation(async (strings: TemplateStringsArray) => {
      const sql = strings.join('')
      if (sql.includes('FROM participations')) {
        return [
          { id: '1', folio: 'POE-1', origen: 'digital', nombre: 'Ana', correo: 'a@b.com', estado: 'En proceso', created_at: '2026-01-01' },
          { id: '2', folio: 'POE-2', origen: 'fisica', nombre: 'Beto', correo: 'b@b.com', estado: 'Procedente', created_at: '2026-01-02' },
        ] as Array<Record<string, unknown>>
      }
      return [] as Array<Record<string, unknown>>
    })

    const buf = await exportTableToXlsx('participaciones')
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(0)
    // Firma de archivo ZIP/XLSX (PK\x03\x04)
    expect(buf[0]).toBe(0x50)
    expect(buf[1]).toBe(0x4b)
  })

  it('no rompe con cero filas (usa fila marcador)', async () => {
    sqlMock!.mockImplementation(async () => [] as Array<Record<string, unknown>>)
    const buf = await exportTableToXlsx('reuniones')
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.length).toBeGreaterThan(0)
  })
})
