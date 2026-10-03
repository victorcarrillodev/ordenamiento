/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, spyOn, beforeEach, afterEach } from 'bun:test'

import { DURACION_SESION_S } from '../auth/sesion-duracion.ts'
import * as pool from '../db/pool.ts'
import {
  _avisosRecordados,
  _limpiarAvisos,
  EN_LINEA_S,
  HUECO_MAXIMO_S,
  listarSesiones,
  registrarCierreSesion,
  registrarInicioSesion,
  registrarPresencia,
  resumenSesiones,
} from './sesiones.ts'

const USUARIO = '550e8400-e29b-41d4-a716-446655440077'
const CLIENTE = { ip: '189.203.44.10', userAgent: 'Chrome/140' }

let consultas: Array<{ sql: string; valores: unknown[] }>
let respuestas: unknown[][]
let sqlMock: any
let relojMs: number
let relojMock: any

/** Avanza el reloj de la aplicación (el que usa la ventana entre avisos). */
const pasan = (segundos: number) => {
  relojMs += segundos * 1000
}

beforeEach(() => {
  consultas = []
  respuestas = []
  relojMs = 1_800_000_000_000
  _limpiarAvisos()
  relojMock = spyOn(Date, 'now').mockImplementation(() => relojMs)
  // Toda la bitácora habla con la base por `sql.unsafe`: se espía el método y no el
  // módulo, para no perder el resto del objeto `sql`.
  sqlMock = spyOn(pool.sql as any, 'unsafe').mockImplementation(
    async (texto: string, valores: unknown[] = []) => {
      consultas.push({ sql: texto, valores })
      return respuestas.shift() ?? []
    },
  )
})

afterEach(() => {
  sqlMock.mockRestore()
  relojMock.mockRestore()
  _limpiarAvisos()
})

const actualizaciones = () => consultas.filter((c) => c.sql.includes('UPDATE user_sessions'))

describe('registrarInicioSesion', () => {
  it('inserta la sesión con la marca del token, la IP y el navegador', async () => {
    const emitido = relojMs
    await registrarInicioSesion(USUARIO, emitido, CLIENTE)

    const insert = consultas.find((c) => c.sql.includes('INSERT INTO user_sessions'))
    expect(insert).toBeDefined()
    const [userId, momento, ip, ua] = insert!.valores as [string, Date, string, string]
    expect(userId).toBe(USUARIO)
    expect(momento.getTime()).toBe(emitido)
    expect(ip).toBe(CLIENTE.ip)
    expect(ua).toBe(CLIENTE.userAgent)
  })

  it('la sesión nace con el tiempo de uso en 0: es una sesión que sí se mide', async () => {
    await registrarInicioSesion(USUARIO, relojMs, CLIENTE)
    const insert = consultas.find((c) => c.sql.includes('INSERT INTO user_sessions'))!
    expect(insert.sql).toMatch(/active_seconds/)
    expect(insert.sql).toMatch(/now\(\), 0, \$3, \$4/)
  })

  it('es idempotente: reautenticarse con la misma cookie no duplica la fila ni borra el tiempo', async () => {
    await registrarInicioSesion(USUARIO, relojMs, CLIENTE)
    const insert = consultas.find((c) => c.sql.includes('INSERT INTO user_sessions'))!
    expect(insert.sql).toContain('ON CONFLICT (user_id, issued_at) DO UPDATE')
    const alConflicto = insert.sql.split('DO UPDATE')[1]
    expect(alConflicto).not.toContain('active_seconds')
  })
})

describe('registrarPresencia', () => {
  it('escribe el primer aviso', async () => {
    await registrarPresencia(USUARIO, relojMs)
    expect(actualizaciones()).toHaveLength(1)
  })

  it('suma el tiempo desde el último aviso y avisa a la base el hueco máximo', async () => {
    const emitido = relojMs
    await registrarPresencia(USUARIO, emitido)
    const [consulta] = actualizaciones()
    expect(consulta.valores).toEqual([USUARIO, new Date(emitido), HUECO_MAXIMO_S])
    // La cuenta la hace la base con su propio reloj, no el navegador ni la aplicación.
    expect(consulta.sql).toContain('now() - last_seen_at')
    expect(consulta.sql).toContain('make_interval(secs => $3::float8)')
    expect(consulta.sql).toContain('last_seen_at = now()')
  })

  it('un hueco largo no suma: es una ausencia', async () => {
    await registrarPresencia(USUARIO, relojMs)
    const sql = actualizaciones()[0].sql
    // Dentro del hueco máximo suma lo transcurrido; fuera, deja el total como estaba.
    expect(sql).toMatch(
      /<= make_interval\(secs => \$3::float8\)\s+THEN active_seconds \+ GREATEST\(0, EXTRACT\(EPOCH FROM \(now\(\) - last_seen_at\)\)\)\s+ELSE active_seconds/,
    )
  })

  it('una sesión sin medición (anterior a esta función) se queda sin medir', async () => {
    await registrarPresencia(USUARIO, relojMs)
    expect(actualizaciones()[0].sql).toMatch(/WHEN active_seconds IS NULL THEN NULL/)
  })

  it('no repite el UPDATE dentro de la ventana mínima entre avisos', async () => {
    // El panel dispara un aviso por pantalla; sin la ventana, la bitácora costaría
    // más escrituras que lo que registra.
    const emitido = relojMs
    for (let i = 0; i < 8; i++) {
      await registrarPresencia(USUARIO, emitido)
      pasan(1)
    }
    expect(actualizaciones()).toHaveLength(1)
  })

  it('después de la ventana vuelve a escribir, y el tiempo ignorado no se pierde', async () => {
    const emitido = relojMs
    await registrarPresencia(USUARIO, emitido)
    pasan(4)
    await registrarPresencia(USUARIO, emitido) // ignorado
    pasan(26) // 30 s desde el último escrito
    await registrarPresencia(USUARIO, emitido)
    expect(actualizaciones()).toHaveLength(2)
    // La suma se hace en la base contra `last_seen_at` (el último aviso ESCRITO), así
    // que el segundo UPDATE cubre los 30 s completos, no solo los últimos 26.
    expect(actualizaciones()[1].sql).toContain('now() - last_seen_at')
  })

  it('cada sesión lleva su propia ventana', async () => {
    await registrarPresencia(USUARIO, 1_000_000)
    await registrarPresencia(USUARIO, 2_000_000)
    expect(actualizaciones()).toHaveLength(2)
  })

  it('solo toca sesiones abiertas', async () => {
    await registrarPresencia(USUARIO, relojMs)
    expect(actualizaciones()[0].sql).toContain('ended_at IS NULL')
  })

  it('no deja crecer sin límite la memoria de sesiones recordadas', async () => {
    for (let i = 0; i < 700; i++) {
      await registrarPresencia(USUARIO, 1_000_000 + i)
      pasan(HUECO_MAXIMO_S + 1) // cada una queda sin avisar mucho antes de la siguiente
    }
    // Las que ya no avisan se olvidan: la memoria no crece con cada sesión que haya habido.
    expect(_avisosRecordados()).toBeLessThan(550)
  })
})

describe('registrarCierreSesion', () => {
  it('cierra la fila de esa sesión concreta', async () => {
    const emitido = relojMs
    await registrarCierreSesion(USUARIO, emitido)

    const cierre = consultas.find((c) => c.sql.includes('ended_at = now()'))
    expect(cierre).toBeDefined()
    expect(cierre!.valores).toEqual([USUARIO, new Date(emitido), HUECO_MAXIMO_S])
  })

  it('cuenta lo último que estuvo: pulsar «Cerrar sesión» también es presencia', async () => {
    await registrarCierreSesion(USUARIO, relojMs)
    const cierre = actualizaciones()[0]
    expect(cierre.sql).toContain('make_interval(secs => $3::float8)')
    expect(cierre.sql).toMatch(/WHEN active_seconds IS NULL THEN NULL/)
    expect(cierre.sql).toContain('ended_at IS NULL')
  })

  it('olvida el aviso para que una sesión nueva vuelva a escribir', async () => {
    const emitido = relojMs
    await registrarPresencia(USUARIO, emitido)
    await registrarCierreSesion(USUARIO, emitido)
    consultas.length = 0

    await registrarPresencia(USUARIO, emitido)

    expect(actualizaciones()).toHaveLength(1)
  })
})

describe('listarSesiones', () => {
  const fila = (extra: Record<string, unknown> = {}) => ({
    id: 's1',
    user_id: USUARIO,
    nombre: 'Ana',
    email: 'ana@tlaquepaque.gob.mx',
    rol: 'admin',
    inicio: '2026-10-02 10:00:00+00',
    fin: null,
    ultima_actividad: '2026-10-02 10:05:00+00',
    uso_segundos: 300,
    estado: 'en_linea',
    ip: '1.2.3.4',
    user_agent: 'Chrome',
    ...extra,
  })

  it('calcula el estado al consultar, con la duración de la sesión y la ventana «en línea»', async () => {
    respuestas = [[fila()], [{ total: '1' }]]
    await listarSesiones({ limit: 25, page: 1 })

    const consulta = consultas[0]
    expect(consulta.valores.slice(0, 2)).toEqual([DURACION_SESION_S, EN_LINEA_S])
    for (const estado of ['cerrada', 'revocada', 'expirada', 'en_linea', 'inactiva']) {
      expect(consulta.sql, estado).toContain(`'${estado}'`)
    }
    // Cerrada manda sobre todo; en línea solo si no está revocada ni expirada.
    const posiciones = ['cerrada', 'revocada', 'expirada', 'en_linea', 'inactiva'].map((e) =>
      consulta.sql.indexOf(`'${e}'`),
    )
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones)
  })

  it('el tiempo de uso es el medido, no el que va de inicio a último movimiento', async () => {
    respuestas = [[fila()], [{ total: '1' }]]
    await listarSesiones({ limit: 25, page: 1 })
    const texto = consultas[0].sql
    expect(texto).toContain('s.active_seconds')
    expect(texto).not.toMatch(/COALESCE\(s\.ended_at, s\.last_seen_at\)/)
    expect(texto).not.toMatch(/- s\.started_at/)
  })

  it('una sesión sin medición conserva su null: no se inventa un tiempo', async () => {
    respuestas = [[fila({ uso_segundos: null, estado: 'inactiva' })], [{ total: '1' }]]
    const { items } = await listarSesiones({ limit: 25, page: 1 })
    expect(items[0].uso_segundos).toBeNull()
  })

  it('`activa` es solo «en línea»: una sesión sin cerrar pero abandonada ya no lo es', async () => {
    respuestas = [
      [
        fila({ id: 'a', estado: 'en_linea' }),
        fila({ id: 'b', estado: 'inactiva' }),
        fila({ id: 'c', estado: 'cerrada', fin: '2026-10-02 11:00:00+00' }),
        fila({ id: 'd', estado: 'expirada' }),
        fila({ id: 'e', estado: 'revocada' }),
      ],
      [{ total: '5' }],
    ]
    const { items, total } = await listarSesiones({ limit: 25, page: 1 })
    expect(items.map((s) => [s.id, s.activa])).toEqual([
      ['a', true],
      ['b', false],
      ['c', false],
      ['d', false],
      ['e', false],
    ])
    expect(total).toBe(5)
  })

  it('acota el tamaño de página y calcula el desplazamiento', async () => {
    respuestas = [[], [{ total: '0' }]]
    await listarSesiones({ limit: 5000, page: 3 })
    expect(consultas[0].valores.slice(2)).toEqual([null, 200, 400])
  })

  it('filtra por cuenta cuando se pide, y en el total también', async () => {
    respuestas = [[], [{ total: '0' }]]
    await listarSesiones({ usuarioId: USUARIO, limit: 10, page: 1 })
    expect(consultas[0].valores[2]).toBe(USUARIO)
    expect(consultas[1].valores).toEqual([USUARIO])
  })
})

describe('resumenSesiones', () => {
  it('cuenta las sesiones en línea con el mismo estado que el listado', async () => {
    respuestas = [
      [{ usuarios: '2', sesiones: '9', en_linea: '1', medidas: '4', segundos: '5400.4' }],
    ]
    const resumen = await resumenSesiones()

    expect(resumen).toEqual({
      usuarios: 2,
      sesiones: 9,
      en_linea: 1,
      medidas: 4,
      segundos_totales: 5400,
    })
    const consulta = consultas[0]
    expect(consulta.valores).toEqual([DURACION_SESION_S, EN_LINEA_S, null])
    expect(consulta.sql).toMatch(/FILTER \(WHERE CASE[\s\S]*END = 'en_linea'\)/)
  })

  it('suma solo el tiempo medido y cuenta aparte las sesiones medidas', async () => {
    respuestas = [[{ usuarios: '1', sesiones: '3', en_linea: '0', medidas: '1', segundos: '120' }]]
    await resumenSesiones()
    const texto = consultas[0].sql
    expect(texto).toContain('COUNT(s.active_seconds)')
    expect(texto).toContain('SUM(s.active_seconds)')
  })

  it('sin sesiones, todo en cero', async () => {
    respuestas = [[]]
    expect(await resumenSesiones()).toEqual({
      usuarios: 0,
      sesiones: 0,
      en_linea: 0,
      medidas: 0,
      segundos_totales: 0,
    })
  })

  it('acota a una cuenta si se pide', async () => {
    respuestas = [[]]
    await resumenSesiones(USUARIO)
    expect(consultas[0].valores[2]).toBe(USUARIO)
  })
})
