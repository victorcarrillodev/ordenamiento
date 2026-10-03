import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import type { SessionUser } from '../auth/auth.ts'
import * as customizations from '../services/customizations.ts'
import { rutasConsulta } from './consulta.ts'
import type { ContextoRuta } from './ruta.ts'

const ADMIN = { id: 'a', name: 'Admin', email: 'a@x.mx', role: 'admin' } as SessionUser
const CIUDADANO = { id: 'u', name: 'Ciudadano', email: 'u@x.mx', role: 'user' } as SessionUser

let etapaGuardada: string | null = null
let restore: Array<() => void> = []

beforeEach(() => {
  etapaGuardada = null
  restore = []
  const leer = spyOn(customizations, 'getCustomizations').mockResolvedValue({
    ...customizations.DEFAULT_THEME_CONFIG,
    programa: { ...customizations.DEFAULT_THEME_CONFIG.programa, consulta: 'pendiente' },
  } as never)
  const guardar = spyOn(customizations, 'saveCustomizations').mockImplementation((async (p: {
    config: { programa: { consulta: string } }
  }) => {
    etapaGuardada = p.config.programa.consulta
    return customizations.DEFAULT_THEME_CONFIG
  }) as never)
  restore.push(
    () => leer.mockRestore(),
    () => guardar.mockRestore(),
  )
})
afterEach(() => restore.forEach((r) => r()))

function pedir(method: string, user: SessionUser | null, cuerpo?: unknown, ruta = '/api/consulta') {
  const url = new URL(`http://backend${ruta}`)
  const request = new Request(url, {
    method,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    headers: { 'content-type': 'application/json' },
  })
  return rutasConsulta({ request, url, method, user } as ContextoRuta)
}

describe('GET /api/consulta', () => {
  it('es pública y dice la etapa', async () => {
    const res = await pedir('GET', null)
    expect(res?.status).toBe(200)
    expect(await res?.json()).toEqual({ etapa: 'pendiente', inicio: null, cierre: null })
  })
})

describe('PUT /api/consulta', () => {
  it('un admin inicia la consulta', async () => {
    const res = await pedir('PUT', ADMIN, { etapa: 'abierta' })
    expect(res?.status).toBe(200)
    expect(etapaGuardada).toBe('abierta')
    expect((await res?.json()) as { etapa: string }).toMatchObject({ etapa: 'abierta' })
  })

  it('sin sesión o como ciudadano es 403 y no cambia nada', async () => {
    expect((await pedir('PUT', null, { etapa: 'abierta' }))?.status).toBe(403)
    expect((await pedir('PUT', CIUDADANO, { etapa: 'abierta' }))?.status).toBe(403)
    expect(etapaGuardada).toBeNull()
  })

  it('una etapa inventada es 400', async () => {
    for (const cuerpo of [{ etapa: 'cerrada' }, { etapa: 1 }, {}, { etapa: null }]) {
      expect((await pedir('PUT', ADMIN, cuerpo))?.status).toBe(400)
    }
    expect(etapaGuardada).toBeNull()
  })

  it('un JSON roto es 400, no un error interno', async () => {
    const url = new URL('http://backend/api/consulta')
    const request = new Request(url, { method: 'PUT', body: '{no es json' })
    const res = await rutasConsulta({ request, url, method: 'PUT', user: ADMIN } as ContextoRuta)
    expect(res?.status).toBe(400)
  })

  it('una transición no permitida es 409', async () => {
    const res = await pedir('PUT', ADMIN, { etapa: 'concluida' }) // desde «pendiente»
    expect(res?.status).toBe(409)
    expect(etapaGuardada).toBeNull()
  })
})

describe('el módulo no toca lo que no es suyo', () => {
  it('devuelve null para otras rutas y métodos', async () => {
    expect(await pedir('GET', null, undefined, '/api/otra')).toBeNull()
    expect(await pedir('DELETE', ADMIN)).toBeNull()
    expect(await pedir('POST', ADMIN, { etapa: 'abierta' })).toBeNull()
  })
})
