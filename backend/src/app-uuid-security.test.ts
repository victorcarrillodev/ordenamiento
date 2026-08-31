/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'
import { handleRequest } from './app.ts'
import * as pool from './db/pool.ts'
import * as auth from './auth/auth.ts'

function req(path: string, method = 'GET', body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { cookie: 'ordenamiento_session=valid-token', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

let verifySpy: ReturnType<typeof spyOn>
let userSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  verifySpy = spyOn(auth as any, 'verifySessionToken').mockImplementation(async (tok: string) => (tok === 'valid-token' ? '550e8400-e29b-41d4-a716-446655440041' : null))
  userSpy = spyOn(auth as any, 'getUserById').mockImplementation(async () => ({ id: '550e8400-e29b-41d4-a716-446655440041', name: 'Admin', role: 'admin', email: 'admin@test.mx' } as any))
})
afterEach(() => {
  verifySpy.mockRestore()
  userSpy.mockRestore()
})

describe('H1 · UUID isUuid + IDOR/enumerabilidad', () => {
  it('id secuencial viejo 123 → 400, no 500 ni 200, no toca DB', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/123'))
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/id inválido/i)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('id 1000 → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/1000'))
    expect(res.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('UUID nil válido pero inexistente → 404, no 500 ni datos ajenos', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/00000000-0000-0000-0000-000000000000'))
    expect(res.status).toBe(404)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('UUID válido existente → 200', async () => {
    const fakeRow = { id: '550e8400-e29b-41d4-a716-446655440042', folio: 'F-1', nombre: 'Test' }
    const spy = spyOn(pool.sql as any, 'unsafe')
      .mockResolvedValueOnce([fakeRow] as any)
      .mockResolvedValueOnce([] as any)
    const res = await handleRequest(req('/api/participations/550e8400-e29b-41d4-a716-446655440042'))
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.folio).toBe('F-1')
    spy.mockRestore()
  })
})

describe('H1 · Inyección / cast en :id', () => {
  const inyecciones = [
    '1; DROP TABLE participations;--',
    '1 OR 1=1',
    '<script>alert(1)</script>',
    'a\r\nX-Injected: 1',
    'a\nBcc: victim@evil.com',
    '../../etc/passwd',
    '550e8400-e29b-41d4-a716-446655440042%0D%0Aevil',
  ]
  for (const payload of inyecciones) {
    it(`rechaza inyección '${payload.slice(0, 20)}...' con 400 y no toca DB`, async () => {
      const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
      const res = await handleRequest(req(`/api/participations/${encodeURIComponent(payload)}`))
      expect(res.status).toBe(400)
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })
  }

  it('rechaza CRLF en aid de attachments', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/550e8400-e29b-41d4-a716-446655440042/attachments/a\r\nb'))
    expect(res.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('H1 · Formato UUID', () => {
  it('truncado 550e8400-e29b-41d4-a716 → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/550e8400-e29b-41d4-a716'))
    expect(res.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
  it('char extra 550e8400-e29b-41d4-a716-446655440042x → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/550e8400-e29b-41d4-a716-446655440042x'))
    expect(res.status).toBe(400)
    spy.mockRestore()
  })
  it('mayúsculas mixtas 550E8400-E29B-41D4-A716-446655440042 → aceptado (200 o 404, no 400)', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/550E8400-E29B-41D4-A716-446655440042'))
    expect(res.status).not.toBe(400)
    expect([200, 404]).toContain(res.status)
    spy.mockRestore()
  })
  it('UUID sin guiones → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/550e8400e29b41d4a716446655440042'))
    expect(res.status).toBe(400)
    spy.mockRestore()
  })
})

describe('H1 · Otros endpoints con :id usan isUuid', () => {
  it('DELETE con id inválido → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/123', 'DELETE'))
    expect(res.status).toBe(400)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
  it('GET /word con id inválido → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/123/word'))
    expect(res.status).toBe(400)
    spy.mockRestore()
  })
  it('GET attachments con participation id inválido → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/123/attachments/550e8400-e29b-41d4-a716-446655440042'))
    expect(res.status).toBe(400)
    spy.mockRestore()
  })
  it('GET attachments con aid inválido → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/550e8400-e29b-41d4-a716-446655440042/attachments/invalid'))
    expect(res.status).toBe(400)
    spy.mockRestore()
  })
  it('DELETE reuniones con id numérico → 400', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/reuniones/123', 'DELETE'))
    expect(res.status).toBe(400)
    spy.mockRestore()
  })
  it('POST /api/participations/enviar con id numérico → 400 (no 500)', async () => {
    const spy = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([] as any)
    const res = await handleRequest(req('/api/participations/enviar', 'POST', { id: '123', para: 'a@b.com' }))
    expect(res.status).toBe(400)
    spy.mockRestore()
  })
})
