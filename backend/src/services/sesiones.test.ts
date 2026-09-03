/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'

import * as pool from '../db/pool.ts'
import {
  _limpiarLatidos,
  registrarActividad,
  registrarCierreSesion,
  registrarInicioSesion,
} from './sesiones.ts'

const USUARIO = '550e8400-e29b-41d4-a716-446655440077'
const CLIENTE = { ip: '189.203.44.10', userAgent: 'Chrome/140' }

let consultas: Array<{ sql: string; valores: unknown[] }>
let sqlMock: any

beforeEach(() => {
  consultas = []
  _limpiarLatidos()
  sqlMock = spyOn(pool as any, 'sql').mockImplementation(
    async (strings: TemplateStringsArray, ...valores: unknown[]) => {
      consultas.push({ sql: strings.join('?'), valores })
      return []
    },
  )
})

afterEach(() => {
  sqlMock.mockRestore()
  _limpiarLatidos()
})

describe('registrarInicioSesion', () => {
  it('inserta la sesión con la marca del token, la IP y el navegador', async () => {
    const emitido = Date.now()
    await registrarInicioSesion(USUARIO, emitido, CLIENTE)

    const insert = consultas.find((c) => c.sql.includes('INSERT INTO user_sessions'))
    expect(insert).toBeDefined()
    const [userId, momento, , ip, ua] = insert!.valores as [string, Date, Date, string, string]
    expect(userId).toBe(USUARIO)
    expect(momento.getTime()).toBe(emitido)
    expect(ip).toBe(CLIENTE.ip)
    expect(ua).toBe(CLIENTE.userAgent)
  })

  it('es idempotente: reautenticarse con la misma cookie no duplica la fila', async () => {
    await registrarInicioSesion(USUARIO, Date.now(), CLIENTE)
    const insert = consultas.find((c) => c.sql.includes('INSERT INTO user_sessions'))
    expect(insert!.sql).toContain('ON CONFLICT (user_id, issued_at) DO UPDATE')
  })
})

describe('registrarActividad', () => {
  it('escribe la primera vez', async () => {
    await registrarActividad(USUARIO, Date.now())
    expect(consultas.filter((c) => c.sql.includes('UPDATE user_sessions'))).toHaveLength(1)
  })

  it('no repite el UPDATE dentro de la ventana del latido', async () => {
    // El panel dispara varias peticiones por pantalla; sin la ventana, la
    // bitácora costaría más escrituras que lo que registra.
    const emitido = Date.now()
    for (let i = 0; i < 8; i++) await registrarActividad(USUARIO, emitido)
    expect(consultas.filter((c) => c.sql.includes('UPDATE user_sessions'))).toHaveLength(1)
  })

  it('cada sesión lleva su propia ventana', async () => {
    await registrarActividad(USUARIO, 1_000_000)
    await registrarActividad(USUARIO, 2_000_000)
    expect(consultas.filter((c) => c.sql.includes('UPDATE user_sessions'))).toHaveLength(2)
  })

  it('solo toca sesiones abiertas', async () => {
    await registrarActividad(USUARIO, Date.now())
    const update = consultas.find((c) => c.sql.includes('UPDATE user_sessions'))
    expect(update!.sql).toContain('ended_at IS NULL')
  })
})

describe('registrarCierreSesion', () => {
  it('cierra la fila de esa sesión concreta', async () => {
    const emitido = Date.now()
    await registrarCierreSesion(USUARIO, emitido)

    const cierre = consultas.find((c) => c.sql.includes('ended_at = now()'))
    expect(cierre).toBeDefined()
    const [userId, momento] = cierre!.valores as [string, Date]
    expect(userId).toBe(USUARIO)
    expect(momento.getTime()).toBe(emitido)
  })

  it('olvida el latido para que una sesión nueva vuelva a escribir', async () => {
    const emitido = Date.now()
    await registrarActividad(USUARIO, emitido)
    await registrarCierreSesion(USUARIO, emitido)
    consultas.length = 0

    await registrarActividad(USUARIO, emitido)

    expect(consultas.filter((c) => c.sql.includes('UPDATE user_sessions'))).toHaveLength(1)
  })
})
