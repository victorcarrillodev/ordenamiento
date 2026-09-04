/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'

import { handleRequest } from './app.ts'
import * as reuniones from './services/reuniones.ts'

/**
 * Contrato HTTP de GET /api/reuniones/activas: endpoint público (sin auth)
 * que alimenta el calendario del home. Solo devuelve reuniones futuras.
 */

const REUNION = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  titulo: 'Comité técnico de septiembre',
  fecha: '2026-09-20',
  hora_inicio: '10:00',
  hora_fin: '12:00',
}

let activasSpy: any

beforeEach(() => {
  activasSpy = spyOn(reuniones as any, 'listReunionesActivas')
})

afterEach(() => {
  activasSpy.mockRestore()
})

describe('GET /api/reuniones/activas', () => {
  it('responde 200 con las reuniones sin necesidad de sesión', async () => {
    activasSpy.mockResolvedValue([REUNION])

    const res = await handleRequest(new Request('http://localhost/api/reuniones/activas'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reuniones: [REUNION] })
  })

  it('responde con lista vacía cuando no hay reuniones futuras', async () => {
    activasSpy.mockResolvedValue([])

    const res = await handleRequest(new Request('http://localhost/api/reuniones/activas'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ reuniones: [] })
  })
})
