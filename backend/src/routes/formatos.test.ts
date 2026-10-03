import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import pdfParse from 'pdf-parse'

import type { SessionUser } from '../auth/auth.ts'
import * as consulta from '../services/consulta.ts'
import * as formatos from '../services/formatos.ts'
import { rutasFormatos } from './formatos.ts'
import type { ContextoRuta } from './ruta.ts'

const ADMIN = { id: 'a1', name: 'Admin', email: 'a@x.mx', role: 'admin' } as SessionUser
const CIUDADANO = { id: 'u', name: 'Ciudadano', email: 'u@x.mx', role: 'user' } as SessionUser
const ID = '11111111-2222-4333-8444-555555555555'

const formato = (cambios: Partial<formatos.Formato> = {}): formatos.Formato => ({
  id: ID,
  folio: 'SPAGU-DGTPU-E-0021',
  created_at: '2026-10-02T00:00:00Z',
  generado_por: 'Admin',
  participation_id: null,
  recibido_en: null,
  pendiente: true,
  ...cambios,
})

let restore: Array<() => void> = []
let etapa: 'pendiente' | 'abierta' | 'concluida'
let creados: string[]
let pedidoPendientes: boolean[]

beforeEach(() => {
  etapa = 'abierta'
  creados = []
  pedidoPendientes = []
  const estado = spyOn(consulta, 'leerEstadoConsulta').mockImplementation((async () => ({
    etapa,
    inicio: null,
    cierre: null,
  })) as never)
  const crear = spyOn(formatos, 'crearFormato').mockImplementation((async (userId: string) => {
    creados.push(userId)
    return formato()
  }) as never)
  const obtener = spyOn(formatos, 'obtenerFormato').mockImplementation((async (id: string) =>
    id === ID ? formato() : null) as never)
  const listar = spyOn(formatos, 'listarFormatos').mockImplementation((async (
    soloPendientes: boolean,
  ) => {
    pedidoPendientes.push(soloPendientes)
    return [formato()]
  }) as never)
  restore = [
    () => estado.mockRestore(),
    () => crear.mockRestore(),
    () => obtener.mockRestore(),
    () => listar.mockRestore(),
  ]
})
afterEach(() => restore.forEach((r) => r()))

function pedir(method: string, ruta: string, user: SessionUser | null = ADMIN) {
  const url = new URL(`http://backend${ruta}`)
  return rutasFormatos({ request: new Request(url, { method }), url, method, user } as ContextoRuta)
}

describe('POST /api/formatos: generar un formato', () => {
  it('reserva un folio para quien lo genera', async () => {
    const res = await pedir('POST', '/api/formatos')
    expect(res?.status).toBe(201)
    expect(await res?.json()).toMatchObject({ folio: 'SPAGU-DGTPU-E-0021', pendiente: true })
    expect(creados).toEqual(['a1'])
  })

  it('solo con la consulta abierta: antes de iniciar o al concluir no se generan', async () => {
    for (const e of ['pendiente', 'concluida'] as const) {
      etapa = e
      const res = await pedir('POST', '/api/formatos')
      expect(res?.status, e).toBe(403)
      expect(await res?.json()).toMatchObject({ codigo: 'consulta_no_abierta', etapa: e })
    }
    expect(creados).toEqual([])
  })

  it('solo el personal del panel', async () => {
    expect((await pedir('POST', '/api/formatos', null))?.status).toBe(403)
    expect((await pedir('POST', '/api/formatos', CIUDADANO))?.status).toBe(403)
    expect(creados).toEqual([])
  })
})

describe('GET /api/formatos', () => {
  it('lista los formatos y filtra los pendientes de recepción', async () => {
    const todos = await pedir('GET', '/api/formatos')
    expect(((await todos?.json()) as { formatos: unknown[] }).formatos).toHaveLength(1)
    await pedir('GET', '/api/formatos?estado=pendiente')
    expect(pedidoPendientes).toEqual([false, true])
  })

  it('solo para el personal del panel', async () => {
    expect((await pedir('GET', '/api/formatos', CIUDADANO))?.status).toBe(403)
    expect((await pedir('GET', '/api/formatos', null))?.status).toBe(403)
  })
})

describe('GET /api/formatos/:id/pdf', () => {
  it('descarga el formato en blanco con su folio, en una hoja', async () => {
    const res = await pedir('GET', `/api/formatos/${ID}/pdf`)
    expect(res?.status).toBe(200)
    expect(res?.headers.get('content-type')).toBe('application/pdf')
    expect(res?.headers.get('content-disposition')).toContain('attachment')
    expect(res?.headers.get('content-disposition')).toContain('Formato de participaci')
    const datos = await pdfParse(Buffer.from(await res!.arrayBuffer()))
    expect(datos.numpages).toBe(1)
    expect(datos.text).toContain('SPAGU-DGTPU-E-0021')
  })

  it('se puede volver a descargar aunque la consulta haya concluido', async () => {
    etapa = 'concluida'
    expect((await pedir('GET', `/api/formatos/${ID}/pdf`))?.status).toBe(200)
  })

  it('un id inválido es 400, uno inexistente 404 y sin permiso 403', async () => {
    expect((await pedir('GET', '/api/formatos/no-es-uuid/pdf'))?.status).toBe(400)
    expect(
      (await pedir('GET', '/api/formatos/99999999-2222-4333-8444-555555555555/pdf'))?.status,
    ).toBe(404)
    expect((await pedir('GET', `/api/formatos/${ID}/pdf`, CIUDADANO))?.status).toBe(403)
  })
})

describe('el módulo no toca lo que no es suyo', () => {
  it('devuelve null para otras rutas y métodos', async () => {
    expect(await pedir('GET', '/api/participations')).toBeNull()
    expect(await pedir('DELETE', '/api/formatos')).toBeNull()
    expect(await pedir('POST', `/api/formatos/${ID}/pdf`)).toBeNull()
  })
})
