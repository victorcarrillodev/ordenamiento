import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import { isTipoDocumento, isEtapaDoc, TIPOS_DOCUMENTO } from './documentos.ts'
import { normalizarEstadoFiltro } from './actividades.ts'
import { handleRequest } from '../app.ts'
import * as pool from '../db/pool.ts'
import * as auth from '../auth/auth.ts'

describe('portal · validación tipo documento', () => {
  it('rechaza tipo inválido', () => {
    expect(isTipoDocumento('Fotos')).toBe(false)
    expect(isTipoDocumento('invalido')).toBe(false)
  })
  it('acepta los 8 tipos válidos', () => {
    expect(TIPOS_DOCUMENTO).toHaveLength(8)
    for (const t of TIPOS_DOCUMENTO) {
      expect(isTipoDocumento(t)).toBe(true)
    }
  })
  it('rechaza etapa inválida y acepta válidas', () => {
    expect(isEtapaDoc('En proceso')).toBe(true)
    expect(isEtapaDoc('Dictaminada')).toBe(true)
    expect(isEtapaDoc('Notificada')).toBe(true)
    expect(isEtapaDoc('Pendiente')).toBe(false)
  })
})

describe('portal · filtro estado actividades', () => {
  it('mapea proximas/realizadas y singular', () => {
    expect(normalizarEstadoFiltro('proximas')).toBe('proxima')
    expect(normalizarEstadoFiltro('proxima')).toBe('proxima')
    expect(normalizarEstadoFiltro('realizadas')).toBe('realizada')
    expect(normalizarEstadoFiltro('realizada')).toBe('realizada')
    expect(normalizarEstadoFiltro(null)).toBe('proxima')
    expect(normalizarEstadoFiltro(undefined)).toBe('proxima')
    expect(normalizarEstadoFiltro('canceladas')).toBe('cancelada')
  })
  it('lanza 400 para estado desconocido', () => {
    expect(() => normalizarEstadoFiltro('invalido')).toThrow()
    try {
      normalizarEstadoFiltro('invalido')
    } catch (e) {
      expect((e as { status?: number }).status).toBe(400)
    }
  })
})

describe('portal · rutas públicas no requieren auth', () => {
  let verifySpy: ReturnType<typeof spyOn>
  let userSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    // Sin sesión válida → currentUser null
    verifySpy = spyOn(auth, 'verifySessionToken').mockImplementation((async () => null) as never)
    userSpy = spyOn(auth, 'getUserById').mockImplementation((async () => null) as never)
  })
  afterEach(() => {
    verifySpy.mockRestore()
    userSpy.mockRestore()
  })

  it('GET /api/actividades sin auth → 200 (público)', async () => {
    const sqlSpy = spyOn(pool.sql, 'unsafe').mockImplementation((async () => []) as never)
    // listActividades usa sql`` tag también para fotos/docs si hay rows, pero con 0 rows no llega ahí.
    // Hacer spy genérico en sql (function) para el primer query
    spyOn(pool.sql as never, 'call' as never)
    // Simpler: mockeamos listActividades vía sql tag: interceptamos sql`` call?
    // En su lugar mockeamos el pool.sql directamente: sql is function, so spy on it
    const fnSpy = spyOn(pool as { sql: typeof pool.sql }, 'sql').mockImplementation((() => Promise.resolve([])) as never)

    const res = await handleRequest(new Request('http://localhost/api/actividades'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { actividades: unknown[] }
    expect(Array.isArray(body.actividades)).toBe(true)

    fnSpy.mockRestore()
    sqlSpy.mockRestore()
  })

  it('GET /api/documentos sin auth → 200 (público)', async () => {
    const origUnsafe = (pool.sql as unknown as { unsafe: (...a: unknown[]) => Promise<unknown> }).unsafe
    ;(pool.sql as unknown as { unsafe: unknown }).unsafe = (() => Promise.resolve([])) as never
    const res = await handleRequest(new Request('http://localhost/api/documentos'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { documentos: unknown[] }
    expect(Array.isArray(body.documentos)).toBe(true)
    ;(pool.sql as unknown as { unsafe: unknown }).unsafe = origUnsafe as never
  })

  it('GET /api/indicadores sin auth → 200 (público)', async () => {
    const fnSpy = spyOn(pool as { sql: typeof pool.sql }, 'sql').mockImplementation((() => Promise.resolve([])) as never)
    const res = await handleRequest(new Request('http://localhost/api/indicadores'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { indicadores: unknown[] }
    expect(Array.isArray(body.indicadores)).toBe(true)
    fnSpy.mockRestore()
  })

  it('POST /api/actividades sin auth → 403 (requiere admin)', async () => {
    const res = await handleRequest(
      new Request('http://localhost/api/actividades', { method: 'POST', body: JSON.stringify({}) }),
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/documentos sin auth → 403', async () => {
    const res = await handleRequest(
      new Request('http://localhost/api/documentos', { method: 'POST', body: JSON.stringify({}) }),
    )
    expect(res.status).toBe(403)
  })

  it('POST /api/indicadores sin auth → 403', async () => {
    const res = await handleRequest(
      new Request('http://localhost/api/indicadores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nombre: 'x' }) }),
    )
    expect(res.status).toBe(403)
  })

  it('GET /api/documentos?tipo=invalido → 400', async () => {
    const res = await handleRequest(new Request('http://localhost/api/documentos?tipo=invalido'))
    expect(res.status).toBe(400)
  })
  it('GET /api/actividades?estado=invalido → 400', async () => {
    // mock sql to avoid DB
    const fnSpy = spyOn(pool as { sql: typeof pool.sql }, 'sql').mockImplementation((() => Promise.resolve([])) as never)
    const res = await handleRequest(new Request('http://localhost/api/actividades?estado=invalido'))
    expect(res.status).toBe(400)
    fnSpy.mockRestore()
  })
})
