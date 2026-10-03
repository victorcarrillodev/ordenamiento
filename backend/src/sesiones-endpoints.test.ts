/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { handleRequest } from './app.ts'
import * as auth from './auth/auth.ts'
import { createSessionToken, sessionIssuedAt } from './auth/auth.ts'
import * as sesiones from './services/sesiones.ts'

/**
 * Contrato HTTP de la presencia en el panel. Lo que importa de afuera: solo el
 * aviso explícito suma tiempo de uso, y quien no tiene sesión válida no puede
 * ni sumarlo ni leer la bitácora.
 */
const UID = '550e8400-e29b-41d4-a716-446655440077'

const cuenta = (extra: Record<string, unknown> = {}) => ({
  id: UID,
  name: 'Ana',
  email: 'ana@tlaquepaque.gob.mx',
  role: 'admin',
  sessionsValidFrom: 0,
  ...extra,
})

function peticion(path: string, method: string, token?: string) {
  return new Request(`http://localhost${path}`, {
    method,
    headers: token ? { cookie: `ordenamiento_session=${encodeURIComponent(token)}` } : undefined,
  })
}

let usuarioSpy: any
let presenciaSpy: any
let cierreSpy: any

beforeEach(() => {
  usuarioSpy = spyOn(auth as any, 'getUserById').mockResolvedValue(cuenta())
  presenciaSpy = spyOn(sesiones as any, 'registrarPresencia').mockResolvedValue(undefined)
  cierreSpy = spyOn(sesiones as any, 'registrarCierreSesion').mockResolvedValue(undefined)
})

afterEach(() => {
  usuarioSpy.mockRestore()
  presenciaSpy.mockRestore()
  cierreSpy.mockRestore()
})

describe('POST /api/sessions/ping', () => {
  it('sin sesión responde 401 y no anota nada', async () => {
    const res = await handleRequest(peticion('/api/sessions/ping', 'POST'))
    expect(res.status).toBe(401)
    expect(presenciaSpy).not.toHaveBeenCalled()
  })

  it('con una cookie falsificada responde 401 y no anota nada', async () => {
    const token = await createSessionToken(UID)
    const falsa = `${token.slice(0, -4)}AAAA`
    const res = await handleRequest(peticion('/api/sessions/ping', 'POST', falsa))
    expect(res.status).toBe(401)
    expect(presenciaSpy).not.toHaveBeenCalled()
  })

  it('con sesión válida responde 204 sin cuerpo y anota la presencia de ESA sesión', async () => {
    const token = await createSessionToken(UID)
    const res = await handleRequest(peticion('/api/sessions/ping', 'POST', token))

    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(presenciaSpy).toHaveBeenCalledTimes(1)
    expect(presenciaSpy).toHaveBeenCalledWith(UID, sessionIssuedAt(token))
  })

  it('una sesión anterior a un cambio de contraseña ya no puede sumar tiempo', async () => {
    usuarioSpy.mockResolvedValue(cuenta({ sessionsValidFrom: Date.now() + 1000 }))
    const token = await createSessionToken(UID)
    const res = await handleRequest(peticion('/api/sessions/ping', 'POST', token))
    expect(res.status).toBe(401)
    expect(presenciaSpy).not.toHaveBeenCalled()
  })

  it('un fallo al escribir no rompe la respuesta: la bitácora nunca frena el panel', async () => {
    presenciaSpy.mockRejectedValue(new Error('base caída'))
    const token = await createSessionToken(UID)
    const res = await handleRequest(peticion('/api/sessions/ping', 'POST', token))
    expect(res.status).toBe(204)
  })

  it('solo acepta POST', async () => {
    const token = await createSessionToken(UID)
    const res = await handleRequest(peticion('/api/sessions/ping', 'GET', token))
    expect(res.status).not.toBe(204)
    expect(presenciaSpy).not.toHaveBeenCalled()
  })
})

describe('las demás peticiones ya no cuentan como presencia', () => {
  it('consultar /api/auth/me con la sesión abierta no anota actividad', async () => {
    const token = await createSessionToken(UID)
    const res = await handleRequest(peticion('/api/auth/me', 'GET', token))
    expect(((await res.json()) as any).user?.id).toBe(UID)
    expect(presenciaSpy).not.toHaveBeenCalled()
  })

  it('tampoco una petición autenticada cualquiera (por ejemplo, el listado de la bitácora)', async () => {
    const listarSpy = spyOn(sesiones as any, 'listarSesiones').mockResolvedValue({
      items: [],
      total: 0,
    })
    const resumenSpy = spyOn(sesiones as any, 'resumenSesiones').mockResolvedValue({
      usuarios: 0,
      sesiones: 0,
      en_linea: 0,
      medidas: 0,
      segundos_totales: 0,
    })
    try {
      const token = await createSessionToken(UID)
      const res = await handleRequest(peticion('/api/sessions', 'GET', token))
      expect(res.status).toBe(200)
      expect(presenciaSpy).not.toHaveBeenCalled()
    } finally {
      listarSpy.mockRestore()
      resumenSpy.mockRestore()
    }
  })
})

describe('GET /api/sessions', () => {
  it('lo ven solo las cuentas con rol de administración', async () => {
    usuarioSpy.mockResolvedValue(cuenta({ role: 'user' }))
    const token = await createSessionToken(UID)
    const res = await handleRequest(peticion('/api/sessions', 'GET', token))
    expect(res.status).toBe(403)
  })

  it('entrega el listado con el estado y el tiempo de uso, y el resumen', async () => {
    const item = {
      id: 's1',
      user_id: UID,
      nombre: 'Ana',
      email: 'ana@tlaquepaque.gob.mx',
      rol: 'admin',
      inicio: '2026-10-02 10:00:00+00',
      fin: null,
      ultima_actividad: '2026-10-02 10:05:00+00',
      uso_segundos: 300,
      estado: 'en_linea',
      activa: true,
      ip: '1.2.3.4',
      user_agent: 'Chrome',
    }
    const resumen = { usuarios: 1, sesiones: 1, en_linea: 1, medidas: 1, segundos_totales: 300 }
    const listarSpy = spyOn(sesiones as any, 'listarSesiones').mockResolvedValue({
      items: [item],
      total: 1,
    })
    const resumenSpy = spyOn(sesiones as any, 'resumenSesiones').mockResolvedValue(resumen)
    try {
      const token = await createSessionToken(UID)
      const res = await handleRequest(peticion('/api/sessions?limit=10&page=2', 'GET', token))
      const cuerpo = (await res.json()) as any
      expect(res.status).toBe(200)
      expect(cuerpo.items[0].estado).toBe('en_linea')
      expect(cuerpo.items[0].uso_segundos).toBe(300)
      expect(cuerpo.resumen).toEqual(resumen)
      expect(cuerpo.total).toBe(1)
      expect(listarSpy).toHaveBeenCalledWith({ usuarioId: undefined, limit: 10, page: 2 })
    } finally {
      listarSpy.mockRestore()
      resumenSpy.mockRestore()
    }
  })
})

describe('POST /api/auth/logout', () => {
  it('cierra la sesión concreta en la bitácora', async () => {
    const token = await createSessionToken(UID)
    const res = await handleRequest(peticion('/api/auth/logout', 'POST', token))
    expect(res.status).toBe(200)
    expect(cierreSpy).toHaveBeenCalledWith(UID, sessionIssuedAt(token))
  })
})
