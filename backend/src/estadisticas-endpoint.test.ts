/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { handleRequest } from './app.ts'
import * as auth from './auth/auth.ts'
import { createSessionToken } from './auth/auth.ts'
import * as pool from './db/pool.ts'
import * as actividades from './services/actividades.ts'
import * as estadisticas from './services/estadisticas.ts'

/**
 * GET /api/stats: lo que alimenta las gráficas de la vista general y de
 * Estadísticas. Las cifras las arma services/estadisticas.ts (ver su prueba);
 * aquí se cuida quién puede pedirlas, el filtro de origen y la forma de la
 * respuesta, que es la que espera el panel.
 */
const UID = '550e8400-e29b-41d4-a716-4466554400d1'

const PARTICIPACIONES = {
  digitales: 5,
  fisicas: 2,
  resultado: [
    { estado: 'Procedente', total: 3 },
    { estado: 'En proceso', total: 2 },
    { estado: 'No procedente', total: 2 },
  ],
  fuente: [['Dependencia', 2]] as Array<[string, number]>,
  genero: [['Mujer', 3]] as Array<[string, number]>,
  tematica: [['Equipamiento', 1]] as Array<[string, number]>,
  participacionesPorMes: [
    { mes: '2026-09', total: 0 },
    { mes: '2026-10', total: 7 },
  ],
}

const RESUMEN = {
  total: 6,
  proximas: 3,
  realizadas: 2,
  borradores: 1,
  avisosVigentes: 1,
  proxima: null,
  avisos: [],
}

let rol = 'admin'
let spies: Array<{ mockRestore: () => void }> = []
let servicio: any

beforeEach(() => {
  rol = 'admin'
  spies = [
    spyOn(auth as any, 'getUserById').mockImplementation(async () => ({
      id: UID,
      name: 'Ana',
      email: 'ana@x.mx',
      role: rol,
      sessionsValidFrom: 0,
    })),
    // Los conteos de cuentas e indicadores: `SELECT count(*) ... FROM users|indicadores`.
    spyOn(pool as any, 'sql').mockImplementation((primero: any) => {
      const texto = Array.isArray(primero) ? primero.join(' ') : ''
      return Promise.resolve([{ n: texto.includes('FROM users') ? '4' : '9' }])
    }),
    spyOn(actividades as any, 'resumenActividades').mockResolvedValue(RESUMEN as never),
  ]
  servicio = spyOn(estadisticas as any, 'estadisticasDeParticipaciones').mockResolvedValue(
    PARTICIPACIONES,
  )
  spies.push(servicio)
})

afterEach(() => spies.forEach((s) => s.mockRestore()))

async function pedir(ruta: string, conSesion = true) {
  const token = await createSessionToken(UID)
  return handleRequest(
    new Request(`http://localhost${ruta}`, {
      headers: conSesion ? { cookie: `ordenamiento_session=${encodeURIComponent(token)}` } : {},
    }),
  )
}

describe('GET /api/stats', () => {
  it('responde con la forma que espera el panel', async () => {
    const res = await pedir('/api/stats')
    const cuerpo = (await res.json()) as any

    expect(res.status).toBe(200)
    expect(cuerpo).toEqual({
      usuarios: 4,
      digitales: 5,
      fisicas: 2,
      resultado: PARTICIPACIONES.resultado,
      fuente: PARTICIPACIONES.fuente,
      genero: PARTICIPACIONES.genero,
      tematica: PARTICIPACIONES.tematica,
      contenido: {
        actividades: 6,
        proximas: 3,
        realizadas: 2,
        borradores: 1,
        avisosVigentes: 1,
        indicadores: 9,
      },
      participacionesPorMes: PARTICIPACIONES.participacionesPorMes,
      proximaActividad: null,
      avisos: [],
    })
  })

  it('sin origen pide todas las participaciones', async () => {
    await pedir('/api/stats')
    expect(servicio).toHaveBeenCalledTimes(1)
    expect(servicio.mock.calls[0][0]).toBeNull()
  })

  it('con ?origen=digital o fisica se lo pasa al servicio', async () => {
    await pedir('/api/stats?origen=digital')
    await pedir('/api/stats?origen=fisica')
    expect(servicio.mock.calls.map((c: any[]) => c[0])).toEqual(['digital', 'fisica'])
  })

  it('un origen inventado responde 400 y no consulta nada', async () => {
    const res = await pedir('/api/stats?origen=todas')
    expect(res.status).toBe(400)
    expect(((await res.json()) as any).error).toContain('origen')
    expect(servicio).not.toHaveBeenCalled()
  })

  it('un origen con intento de inyección tampoco llega al servicio', async () => {
    const res = await pedir(`/api/stats?origen=${encodeURIComponent("digital' OR '1'='1")}`)
    expect(res.status).toBe(400)
    expect(servicio).not.toHaveBeenCalled()
  })

  it('es solo para quien entra al panel', async () => {
    expect((await pedir('/api/stats', false)).status).toBe(403)
    rol = 'user'
    expect((await pedir('/api/stats')).status).toBe(403)
    expect(servicio).not.toHaveBeenCalled()
    rol = 'root'
    expect((await pedir('/api/stats')).status).toBe(200)
  })
})
