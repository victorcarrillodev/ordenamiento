import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as publicas from '../services/publicas.ts'
import { rutasPublicas } from './publicas.ts'
import type { ContextoRuta } from './ruta.ts'

const PDF = Buffer.from('%PDF-1.4\n%%EOF\n')
const DIR = join(process.cwd(), 'uploads')
const ARCHIVO = join(DIR, 'prueba-publicas-ruta.pdf')

let consultas: Array<Record<string, unknown>>
let publicados: Record<string, { ruta: string; nombre: string } | null>
let restore: Array<() => void> = []

beforeAll(async () => {
  await mkdir(DIR, { recursive: true })
  await writeFile(ARCHIVO, PDF)
})
afterAll(() => rm(ARCHIVO, { force: true }))

beforeEach(() => {
  consultas = []
  publicados = {
    'SPAGU-DGTPU-E-0018:version_publica': { ruta: ARCHIVO, nombre: 'participacion.pdf' },
    'SPAGU-DGTPU-E-0018:oficio_publico': { ruta: ARCHIVO, nombre: 'oficio.pdf' },
  }
  const listar = spyOn(publicas, 'listarPublicas').mockImplementation((async (
    opciones: Record<string, unknown>,
  ) => {
    consultas.push(opciones)
    return {
      items: [
        {
          folio: 'SPAGU-DGTPU-E-0018',
          fecha: '2026-09-24',
          oficio: { numero: 'DGTPU/1', fecha: '2026-10-05' },
        },
        { folio: 'SPAGU-DGTPU-E-0017', fecha: '2026-09-23', oficio: null },
      ],
      total: 2,
      page: 1,
      limit: 10,
    }
  }) as never)
  const documento = spyOn(publicas, 'documentoPublicado').mockImplementation(
    (async (folio: string, tipo: string) => publicados[`${folio}:${tipo}`] ?? null) as never,
  )
  restore = [() => listar.mockRestore(), () => documento.mockRestore()]
})
afterEach(() => restore.forEach((r) => r()))

let ip = 0
function pedir(ruta: string, method = 'GET') {
  const url = new URL(`http://backend${ruta}`)
  // Cada prueba usa una IP distinta para no chocar con el límite de consultas.
  const request = new Request(url, { method, headers: { 'x-forwarded-for': `10.0.0.${++ip}` } })
  return rutasPublicas({ request, url, method, user: null } as ContextoRuta)
}

describe('el listado público', () => {
  it('es público (sin sesión) y entrega solo folio, fecha y el oficio publicado', async () => {
    const res = await pedir('/api/participaciones-publicas')
    expect(res?.status).toBe(200)
    const cuerpo = (await res?.json()) as { items: Array<Record<string, unknown>> }
    expect(cuerpo.items).toHaveLength(2)
    for (const item of cuerpo.items) {
      expect(Object.keys(item).sort()).toEqual(['fecha', 'folio', 'oficio'])
    }
    expect(cuerpo.items[0].oficio).toEqual({ numero: 'DGTPU/1', fecha: '2026-10-05' })
    expect(cuerpo.items[1].oficio).toBeNull()
  })

  it('pasa el folio buscado y la página, acotados', async () => {
    await pedir(`/api/participaciones-publicas?folio=${'9'.repeat(100)}&page=3&limit=500`)
    expect(consultas[0]).toMatchObject({ page: 3, limit: 50 })
    expect(String(consultas[0].folio).length).toBeLessThanOrEqual(40)
  })

  it('una página o un límite que no son números válidos toman su valor por omisión', async () => {
    await pedir('/api/participaciones-publicas?page=-4&limit=abc')
    expect(consultas[0]).toMatchObject({ page: 1, limit: 10 })
  })

  it('limita las consultas por IP', async () => {
    const url = new URL('http://backend/api/participaciones-publicas')
    const llamar = () =>
      rutasPublicas({
        request: new Request(url, { headers: { 'x-forwarded-for': '10.9.9.9' } }),
        url,
        method: 'GET',
        user: null,
      } as ContextoRuta)
    process.env.TRUST_PROXY = 'true'
    let ultimo: Response | null = null
    for (let i = 0; i < 610; i++) ultimo = await llamar()
    delete process.env.TRUST_PROXY
    expect(ultimo?.status).toBe(429)
  })
})

describe('los PDF publicados', () => {
  it('la participación y el oficio se ven en el visor y se descargan', async () => {
    for (const documento of ['participacion', 'oficio']) {
      const ver = await pedir(`/api/participaciones-publicas/SPAGU-DGTPU-E-0018/${documento}`)
      expect(ver?.status, documento).toBe(200)
      expect(ver?.headers.get('content-type')).toBe('application/pdf')
      expect(ver?.headers.get('content-disposition')).toMatch(/^inline/)
      expect(ver?.headers.get('cache-control')).toBe('no-store')
      const bajar = await pedir(
        `/api/participaciones-publicas/SPAGU-DGTPU-E-0018/${documento}?download=1`,
      )
      expect(bajar?.headers.get('content-disposition')).toMatch(/^attachment/)
    }
  })

  it('lo que no está publicado da el mismo 404 que un folio inexistente', async () => {
    delete publicados['SPAGU-DGTPU-E-0018:oficio_publico']
    expect((await pedir('/api/participaciones-publicas/SPAGU-DGTPU-E-0018/oficio'))?.status).toBe(
      404,
    )
    expect(
      (await pedir('/api/participaciones-publicas/SPAGU-DGTPU-E-9999/participacion'))?.status,
    ).toBe(404)
  })

  it('los documentos internos no salen por aquí, sea cual sea el nombre que se pida', async () => {
    for (const documento of [
      'formato',
      'formato_escaneado',
      'oficio_integro',
      'version_publica',
      'oficio_publico',
      'x',
    ]) {
      expect(
        (await pedir(`/api/participaciones-publicas/SPAGU-DGTPU-E-0018/${documento}`))?.status,
        documento,
      ).toBe(404)
    }
  })

  it('un folio con caracteres raros se rechaza antes de buscar', async () => {
    const antes = spyOn(publicas, 'documentoPublicado')
    const res = await pedir(
      `/api/participaciones-publicas/${encodeURIComponent("X' OR 1=1 --")}/participacion`,
    )
    expect(res?.status).toBe(404)
    expect(antes).not.toHaveBeenCalledWith("X' OR 1=1 --", expect.anything())
  })
})

describe('el módulo no toca lo que no es suyo', () => {
  it('devuelve null para otras rutas y métodos', async () => {
    expect(await pedir('/api/otra')).toBeNull()
    expect(await pedir('/api/participaciones-publicas', 'POST')).toBeNull()
    expect(await pedir('/api/participaciones-publicas/SPAGU-DGTPU-E-0018', 'GET')).toBeNull()
  })
})
