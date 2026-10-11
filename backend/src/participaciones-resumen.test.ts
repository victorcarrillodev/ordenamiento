/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { handleRequest } from './app.ts'
import * as auth from './auth/auth.ts'
import { createSessionToken } from './auth/auth.ts'
import * as pool from './db/pool.ts'
import { resumenParticipaciones } from './services/participations.ts'
import * as participaciones from './services/participations.ts'

/**
 * Totales del listado del panel: los números de las etiquetas de los filtros
 * («En proceso 3», «Terminada 2», «Datos enviados 0»…). Salen de una sola
 * consulta, con las mismas condiciones por etapa que usa el filtro del listado.
 */
const UID = '550e8400-e29b-41d4-a716-4466554400e1'

const FILA = {
  total: '47',
  en_proceso: '16',
  dictaminada: '20',
  notificada: '11',
  procedente: '16',
  estado_en_proceso: '16',
  no_procedente: '15',
}

describe('resumenParticipaciones', () => {
  let unsafe: any
  beforeEach(() => {
    unsafe = spyOn(pool.sql as any, 'unsafe').mockResolvedValue([FILA] as never)
  })
  afterEach(() => unsafe.mockRestore())

  it('convierte los totales a números, por etapa y por dictamen', async () => {
    expect(await resumenParticipaciones('digital')).toEqual({
      total: 47,
      etapas: { 'En proceso': 16, Dictaminada: 20, Notificada: 11 },
      estados: { Procedente: 16, 'En proceso': 16, 'No procedente': 15 },
    })
  })

  it('el origen va como parámetro, nunca dentro del texto de la consulta', async () => {
    await resumenParticipaciones('fisica')
    const [texto, parametros] = unsafe.mock.calls[0]
    expect(parametros).toEqual(['fisica'])
    expect(texto).not.toContain('fisica')
    expect(texto).toContain('$1')
  })

  it('sin origen cuenta todas (el parámetro es null)', async () => {
    await resumenParticipaciones()
    expect(unsafe.mock.calls[0][1]).toEqual([null])
  })

  it('usa las mismas condiciones por etapa que el filtro del listado', async () => {
    await resumenParticipaciones()
    const texto = unsafe.mock.calls[0][0] as string
    expect(texto).toContain("estado = 'En proceso' AND notificado_en IS NULL")
    expect(texto).toContain("estado <> 'En proceso' AND notificado_en IS NULL")
    expect(texto).toContain('notificado_en IS NOT NULL')
  })

  it('sin participaciones devuelve ceros, no NaN', async () => {
    unsafe.mockResolvedValue([] as never)
    expect(await resumenParticipaciones()).toEqual({
      total: 0,
      etapas: { 'En proceso': 0, Dictaminada: 0, Notificada: 0 },
      estados: { Procedente: 0, 'En proceso': 0, 'No procedente': 0 },
    })
  })
})

describe('GET /api/participations/resumen', () => {
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
    ]
    servicio = spyOn(participaciones as any, 'resumenParticipaciones').mockResolvedValue({
      total: 3,
      etapas: { 'En proceso': 1, Dictaminada: 1, Notificada: 1 },
      estados: { Procedente: 1, 'En proceso': 1, 'No procedente': 1 },
    })
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

  it('responde con los totales (y no se confunde con el detalle de una participación)', async () => {
    const res = await pedir('/api/participations/resumen?origen=digital')
    expect(res.status).toBe(200)
    expect(((await res.json()) as any).total).toBe(3)
    expect(servicio.mock.calls[0][0]).toBe('digital')
  })

  it('sin origen cuenta todas', async () => {
    await pedir('/api/participations/resumen')
    expect(servicio.mock.calls[0][0]).toBeUndefined()
  })

  it('un origen inventado responde 400 y no consulta', async () => {
    const res = await pedir('/api/participations/resumen?origen=todas')
    expect(res.status).toBe(400)
    expect(servicio).not.toHaveBeenCalled()
  })

  it('es solo para quien entra al panel', async () => {
    expect((await pedir('/api/participations/resumen', false)).status).toBe(403)
    rol = 'user'
    expect((await pedir('/api/participations/resumen')).status).toBe(403)
    expect(servicio).not.toHaveBeenCalled()
  })
})
