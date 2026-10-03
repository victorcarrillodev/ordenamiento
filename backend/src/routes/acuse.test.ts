import { describe, expect, it } from 'bun:test'

import type { SessionUser } from '../auth/auth.ts'
import type { DatosParticipacion } from '../services/acuse-datos.ts'
import { firmarAcuse } from '../services/acuse-token.ts'
import { crearRutasAcuse } from './acuse.ts'
import type { ContextoRuta } from './ruta.ts'

const ID = '11111111-2222-4333-8444-555555555555'
const FOLIO = 'SPAGU-DGTPU-E-0018'

const expediente: DatosParticipacion = {
  id: ID,
  folio: FOLIO,
  origen: 'digital',
  nombre: 'María del Carmen González',
  correo: 'carmen@ejemplo.com',
  fechaRecepcion: new Date('2026-09-24T22:25:05Z'),
  alcance_ubicacion: 'municipio',
  calle: '',
  colonia: '',
  codigo_postal: '',
  institucion: '',
  tematica: 'Movilidad',
  tematica_otra: '',
  observacion: 'Propuesta de ciclovía',
  adjuntos: [],
  estado: 'En proceso',
  fuente: '',
  fuente_otra: '',
  genero: '',
  domicilio: '',
  municipio_participante: '',
  ocupacion: '',
}

const consultas: Array<Record<string, string>> = []
const rutas = crearRutasAcuse(async (clave) => {
  consultas.push(clave as Record<string, string>)
  const coincide = 'id' in clave ? clave.id === ID : clave.folio === FOLIO
  return coincide ? expediente : null
})

const ADMIN = { id: 'a', name: 'Admin', email: 'a@x.mx', role: 'admin' } as SessionUser
const CIUDADANO = { id: 'u', name: 'Ciudadano', email: 'u@x.mx', role: 'user' } as SessionUser

function pedir(ruta: string, user: SessionUser | null = null, method = 'GET') {
  const url = new URL(`http://backend${ruta}`)
  const ctx: ContextoRuta = { request: new Request(url, { method }), url, method, user }
  return rutas(ctx)
}

describe('acuse desde el panel: GET /api/participations/:id/acuse', () => {
  it('un admin descarga el PDF, identificado por su folio', async () => {
    const res = await pedir(`/api/participations/${ID}/acuse`, ADMIN)
    expect(res?.status).toBe(200)
    expect(res?.headers.get('content-type')).toBe('application/pdf')
    expect(res?.headers.get('content-disposition')).toContain('attachment')
    expect(res?.headers.get('content-disposition')).toContain(`Acuse ${FOLIO}.pdf`)
    expect(res?.headers.get('cache-control')).toBe('private, no-store')
    const cuerpo = Buffer.from(await res!.arrayBuffer())
    expect(cuerpo.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(Number(res?.headers.get('content-length'))).toBe(cuerpo.byteLength)
  })

  it('sin sesión o con rol de ciudadano es 403: el acuse lleva datos personales', async () => {
    expect((await pedir(`/api/participations/${ID}/acuse`, null))?.status).toBe(403)
    expect((await pedir(`/api/participations/${ID}/acuse`, CIUDADANO))?.status).toBe(403)
    expect(consultas).toHaveLength(1) // solo la del test anterior
  })

  it('un id que no es UUID es 400 y no llega a la base', async () => {
    const antes = consultas.length
    expect((await pedir('/api/participations/no-es-uuid/acuse', ADMIN))?.status).toBe(400)
    expect(consultas.length).toBe(antes)
  })

  it('una participación inexistente es 404', async () => {
    const res = await pedir('/api/participations/99999999-2222-4333-8444-555555555555/acuse', ADMIN)
    expect(res?.status).toBe(404)
  })
})

describe('acuse para quien participa: GET /api/acuse/:folio?t=…', () => {
  it('con el enlace firmado, descarga el PDF', async () => {
    const res = await pedir(`/api/acuse/${FOLIO}?t=${firmarAcuse(FOLIO)}`)
    expect(res?.status).toBe(200)
    expect(res?.headers.get('content-type')).toBe('application/pdf')
    expect(res?.headers.get('content-disposition')).toContain(`Acuse ${FOLIO}.pdf`)
  })

  it('sin firma, o con la de otro folio, es 404: no se puede bajar el acuse de otra persona', async () => {
    const antes = consultas.length
    expect((await pedir(`/api/acuse/${FOLIO}`))?.status).toBe(404)
    expect((await pedir(`/api/acuse/${FOLIO}?t=`))?.status).toBe(404)
    const ajena = firmarAcuse('SPAGU-DGTPU-E-0019')
    expect((await pedir(`/api/acuse/${FOLIO}?t=${ajena}`))?.status).toBe(404)
    // Con la firma mala no se toca la base: no hay forma de sondear qué folios existen.
    expect(consultas.length).toBe(antes)
  })

  it('una firma vencida es 404', async () => {
    const vieja = firmarAcuse(FOLIO, Date.now() - 49 * 3_600_000)
    expect((await pedir(`/api/acuse/${FOLIO}?t=${vieja}`))?.status).toBe(404)
  })

  it('un folio con caracteres raros se rechaza antes de buscar', async () => {
    const antes = consultas.length
    const res = await pedir(
      `/api/acuse/${encodeURIComponent("X' OR 1=1 --")}?t=${firmarAcuse(FOLIO)}`,
    )
    expect(res?.status).toBe(404)
    expect(consultas.length).toBe(antes)
  })

  it('con firma válida pero folio que ya no existe, el mismo 404 genérico', async () => {
    const folio = 'SPAGU-DGTPU-E-0777'
    const res = await pedir(`/api/acuse/${folio}?t=${firmarAcuse(folio)}`)
    expect(res?.status).toBe(404)
    expect(await res?.json()).toEqual({ error: 'El enlace del acuse no es válido o ya venció' })
  })
})

describe('el módulo no toca lo que no es suyo', () => {
  it('devuelve null para otras rutas y otros métodos', async () => {
    expect(await pedir('/api/participations')).toBeNull()
    expect(await pedir(`/api/participations/${ID}`, ADMIN)).toBeNull()
    expect(await pedir(`/api/participations/${ID}/acuse`, ADMIN, 'POST')).toBeNull()
    expect(await pedir('/api/acuse', ADMIN)).toBeNull()
  })
})
