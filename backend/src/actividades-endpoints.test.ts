/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { handleRequest } from './app.ts'
import * as auth from './auth/auth.ts'
import * as pool from './db/pool.ts'
import * as actividades from './services/actividades.ts'

/**
 * Contrato HTTP del módulo «Actividades y avances del Programa».
 * Los servicios se sustituyen con spies: aquí se prueba quién puede llamar a
 * cada ruta, qué se valida antes de tocar la base y qué forma sale.
 */

const UUID = '550e8400-e29b-41d4-a716-446655440001'
const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440041'

const espias: Array<{ mockRestore: () => void }> = []
function espiar<K extends keyof typeof actividades>(nombre: K) {
  const espia = spyOn(actividades as any, nombre as string)
  espias.push(espia)
  return espia
}

function peticion(ruta: string, init: RequestInit & { admin?: boolean } = {}) {
  const headers = new Headers(init.headers)
  if (init.admin) headers.set('cookie', 'ordenamiento_session=token-admin')
  return new Request(`http://localhost${ruta}`, { ...init, headers })
}

function formularioValido(extra: Record<string, string> = {}): FormData {
  const fd = new FormData()
  const campos: Record<string, string> = {
    titulo: 'Sesión de Cabildo para la aprobación del Programa',
    fase: 'Expedición',
    tipo: 'Sesión de Cabildo',
    estado: 'programada',
    fecha: '2030-01-15',
    publicacion: 'publicado',
    ...extra,
  }
  for (const [k, v] of Object.entries(campos)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  espias.push(
    spyOn(auth as any, 'verifySessionToken').mockImplementation(async (t: string) =>
      t === 'token-admin' ? ADMIN_ID : null,
    ),
    spyOn(auth as any, 'getUserById').mockImplementation(async () => ({
      id: ADMIN_ID,
      name: 'Admin',
      role: 'admin',
      email: 'admin@test.mx',
    })),
  )
})

afterEach(() => {
  while (espias.length) espias.pop()!.mockRestore()
})

describe('vistas públicas (sin sesión)', () => {
  it('próximas: 200 y el límite se acota a 50', async () => {
    const lista = espiar('listarProximas').mockResolvedValue([])
    expect((await handleRequest(peticion('/api/actividades?vista=proximas'))).status).toBe(200)
    expect(lista).toHaveBeenLastCalledWith(undefined)
    await handleRequest(peticion('/api/actividades?vista=proximas&limite=3'))
    expect(lista).toHaveBeenLastCalledWith(3)
    await handleRequest(peticion('/api/actividades?vista=proximas&limite=100000'))
    expect(lista).toHaveBeenLastCalledWith(50)
    await handleRequest(peticion('/api/actividades?vista=proximas&limite=-4'))
    expect(lista).toHaveBeenLastCalledWith(undefined)
  })

  it('avances: filtra por fase válida y rechaza la inventada', async () => {
    const lista = espiar('listarAvances').mockResolvedValue([])
    const ok = await handleRequest(peticion('/api/actividades?vista=avances&fase=Evaluaci%C3%B3n'))
    expect(ok.status).toBe(200)
    expect(lista).toHaveBeenLastCalledWith('Evaluación')
    const mala = await handleRequest(peticion('/api/actividades?vista=avances&fase=Otra'))
    expect(mala.status).toBe(400)
  })

  it('calendario: exige un mes YYYY-MM', async () => {
    const lista = espiar('listarCalendario').mockResolvedValue([])
    expect(
      (await handleRequest(peticion('/api/actividades?vista=calendario&mes=2026-09'))).status,
    ).toBe(200)
    expect(lista).toHaveBeenLastCalledWith('2026-09')
    lista.mockRestore()
    const mala = await handleRequest(peticion('/api/actividades?vista=calendario&mes=2026-9'))
    expect(mala.status).toBe(400)
  })

  it('sin vista o con una inventada: 400', async () => {
    expect((await handleRequest(peticion('/api/actividades'))).status).toBe(400)
    expect((await handleRequest(peticion('/api/actividades?vista=todas'))).status).toBe(400)
  })

  it('aviso de la portada', async () => {
    const aviso = {
      actividad_id: UUID,
      titulo: 'Apertura de la consulta pública',
      descripcion: 'Participa',
      inicio: '2026-09-01',
      fin: '2026-09-30',
    }
    espiar('obtenerAvisoVigente').mockResolvedValue(aviso)
    const res = await handleRequest(peticion('/api/actividades/aviso'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ aviso })
  })

  it('repositorio: valida tipo y fase antes de consultar', async () => {
    const lista = espiar('listarDocumentosPublicos').mockResolvedValue([])
    const ok = await handleRequest(peticion('/api/actividades/documentos?tipo=Acta'))
    expect(ok.status).toBe(200)
    expect(lista).toHaveBeenLastCalledWith({ tipo: 'Acta', fase: undefined })
    expect((await handleRequest(peticion('/api/actividades/documentos?tipo=Fotos'))).status).toBe(
      400,
    )
    expect((await handleRequest(peticion('/api/actividades/documentos?fase=X'))).status).toBe(400)
  })

  it('ficha: 404 si no está publicada, 400 con id inválido', async () => {
    espiar('obtenerActividadPublica').mockResolvedValue(null)
    expect((await handleRequest(peticion(`/api/actividades/${UUID}`))).status).toBe(404)
    expect((await handleRequest(peticion('/api/actividades/123'))).status).toBe(400)
  })
})

describe('rutas del panel: sin sesión de admin → 403', () => {
  const casos: Array<[string, string]> = [
    ['GET', '/api/actividades/gestion'],
    ['GET', `/api/actividades/gestion/${UUID}`],
    ['POST', '/api/actividades'],
    ['PUT', `/api/actividades/${UUID}`],
    ['DELETE', `/api/actividades/${UUID}`],
    ['PATCH', `/api/actividades/archivos/${UUID}`],
    ['DELETE', `/api/actividades/archivos/${UUID}`],
    ['POST', `/api/actividades/${UUID}/aviso/enviar`],
  ]
  for (const [method, ruta] of casos) {
    it(`${method} ${ruta}`, async () => {
      const res = await handleRequest(
        peticion(ruta, { method, body: method === 'GET' ? undefined : '{}' }),
      )
      expect(res.status).toBe(403)
    })
  }

  it('un usuario sin rol de panel tampoco pasa', async () => {
    espias.push(
      spyOn(auth as any, 'getUserById').mockImplementation(async () => ({
        id: ADMIN_ID,
        name: 'Ciudadano',
        role: 'user',
        email: 'c@test.mx',
      })),
    )
    const res = await handleRequest(peticion('/api/actividades/gestion', { admin: true }))
    expect(res.status).toBe(403)
  })
})

describe('panel · listado y ficha de gestión', () => {
  it('valida los filtros y los pasa al servicio', async () => {
    const lista = espiar('listarGestion').mockResolvedValue([])
    espiar('resumenActividades').mockResolvedValue({
      total: 0,
      proximas: 0,
      realizadas: 0,
      borradores: 0,
      avisosVigentes: 0,
      proxima: null,
      avisos: [],
    })
    const ok = await handleRequest(
      peticion('/api/actividades/gestion?estado=realizada&publicacion=borrador&mes=2026-09', {
        admin: true,
      }),
    )
    expect(ok.status).toBe(200)
    expect(lista).toHaveBeenLastCalledWith({
      estado: 'realizada',
      publicacion: 'borrador',
      fase: undefined,
      mes: '2026-09',
    })
    for (const q of ['estado=proxima', 'publicacion=x', 'fase=y', 'mes=2026-13']) {
      const res = await handleRequest(peticion(`/api/actividades/gestion?${q}`, { admin: true }))
      expect(res.status, q).toBe(400)
    }
  })

  it('gestion/:id con id inválido → 400 y sin existir → 404', async () => {
    espiar('obtenerActividadGestion').mockResolvedValue(null)
    expect(
      (await handleRequest(peticion('/api/actividades/gestion/abc', { admin: true }))).status,
    ).toBe(400)
    expect(
      (await handleRequest(peticion(`/api/actividades/gestion/${UUID}`, { admin: true }))).status,
    ).toBe(404)
  })
})

describe('panel · alta y edición del mismo registro', () => {
  it('un formulario inválido no toca la base y explica el error', async () => {
    const crear = espiar('crearActividad')
    const res = await handleRequest(
      peticion('/api/actividades', {
        method: 'POST',
        admin: true,
        body: formularioValido({ titulo: '' }),
      }),
    )
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toContain('nombre')
    expect(crear).not.toHaveBeenCalled()
  })

  it('una «fotografía» que no es imagen web se rechaza con 415', async () => {
    const fd = formularioValido()
    fd.append('archivo', new File(['%PDF-1.4'], 'acta.pdf', { type: 'application/pdf' }))
    fd.append('archivo_tipo', 'Fotografía')
    const res = await handleRequest(
      peticion('/api/actividades', { method: 'POST', admin: true, body: fd }),
    )
    expect(res.status).toBe(415)
  })

  it('cada archivo debe llegar con su tipo, y el tipo debe existir', async () => {
    const sinTipo = formularioValido()
    sinTipo.append('archivo', new File(['hola'], 'nota.txt', { type: 'text/plain' }))
    const res = await handleRequest(
      peticion('/api/actividades', { method: 'POST', admin: true, body: sinTipo }),
    )
    expect(res.status).toBe(400)

    const tipoInventado = formularioValido()
    tipoInventado.append('archivo', new File(['hola'], 'nota.txt', { type: 'text/plain' }))
    tipoInventado.append('archivo_tipo', 'Meme')
    const res2 = await handleRequest(
      peticion('/api/actividades', { method: 'POST', admin: true, body: tipoInventado }),
    )
    expect(res2.status).toBe(400)
  })

  it('más archivos de los permitidos por envío → 400', async () => {
    const fd = formularioValido()
    for (let i = 0; i <= actividades.MAX_ARCHIVOS_POR_ENVIO; i++) {
      fd.append('archivo', new File(['hola'], `nota-${i}.txt`, { type: 'text/plain' }))
      fd.append('archivo_tipo', 'Otro')
    }
    const res = await handleRequest(
      peticion('/api/actividades', { method: 'POST', admin: true, body: fd }),
    )
    expect(res.status).toBe(400)
  })

  it('alta válida: crea en una transacción y devuelve el id', async () => {
    espias.push(spyOn(pool.sql as any, 'begin').mockImplementation(async (cb: any) => cb(pool.sql)))
    const crear = espiar('crearActividad').mockResolvedValue(UUID)
    const res = await handleRequest(
      peticion('/api/actividades', { method: 'POST', admin: true, body: formularioValido() }),
    )
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true, id: UUID })
    const [, datos, archivos, creadoPor] = crear.mock.calls[0] as any[]
    expect(datos.tipo).toBe('Sesión de Cabildo')
    expect(datos.fase).toBe('Expedición')
    expect(archivos).toEqual([])
    expect(creadoPor).toBe(ADMIN_ID)
  })

  it('editar una actividad que no existe → 404', async () => {
    espias.push(spyOn(pool.sql as any, 'begin').mockImplementation(async (cb: any) => cb(pool.sql)))
    espiar('actualizarActividad').mockResolvedValue(false)
    const res = await handleRequest(
      peticion(`/api/actividades/${UUID}`, {
        method: 'PUT',
        admin: true,
        body: formularioValido(),
      }),
    )
    expect(res.status).toBe(404)
  })

  it('borrar con id inválido → 400; inexistente → 404', async () => {
    espiar('eliminarActividad').mockResolvedValue(false)
    expect(
      (await handleRequest(peticion('/api/actividades/1', { method: 'DELETE', admin: true })))
        .status,
    ).toBe(400)
    expect(
      (await handleRequest(peticion(`/api/actividades/${UUID}`, { method: 'DELETE', admin: true })))
        .status,
    ).toBe(404)
  })
})

describe('panel · archivos y aviso por correo', () => {
  it('corregir el tipo de un archivo', async () => {
    const editar = espiar('actualizarArchivo').mockResolvedValue('ok')
    const ruta = `/api/actividades/archivos/${UUID}`
    const json = (body: unknown) => ({
      method: 'PATCH',
      admin: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect(
      (await handleRequest(peticion(ruta, json({ tipo: 'Acta', titulo: 'Acta 1' })))).status,
    ).toBe(200)
    expect(editar).toHaveBeenLastCalledWith(UUID, { tipo: 'Acta', titulo: 'Acta 1' })
    expect((await handleRequest(peticion(ruta, json({ tipo: 'Meme' })))).status).toBe(400)
    editar.mockResolvedValue('no_es_foto')
    expect((await handleRequest(peticion(ruta, json({ tipo: 'Fotografía' })))).status).toBe(415)
    editar.mockResolvedValue('no_encontrado')
    expect((await handleRequest(peticion(ruta, json({ tipo: 'Acta' })))).status).toBe(404)
  })

  it('el destino del aviso no admite inyección de cabeceras', async () => {
    const ruta = `/api/actividades/${UUID}/aviso/enviar`
    for (const para of ['x@y.mx\r\nBcc: z@w.mx', 'no-es-correo', '<a@b.mx>', '']) {
      const res = await handleRequest(
        peticion(ruta, {
          method: 'POST',
          admin: true,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ para }),
        }),
      )
      expect(res.status, JSON.stringify(para)).toBe(400)
    }
  })
})

describe('servir archivos', () => {
  const dir = join(process.cwd(), 'uploads')
  const ruta = join(dir, `prueba-actividades-${process.pid}.pdf`)

  beforeAll(async () => {
    await mkdir(dir, { recursive: true })
    await writeFile(ruta, '%PDF-1.4 prueba')
  })
  afterAll(async () => {
    await rm(ruta, { force: true })
  })

  it('el público solo pide archivos publicados; el panel, todos', async () => {
    const obtener = espiar('obtenerArchivo').mockResolvedValue(null)
    expect((await handleRequest(peticion(`/api/actividades/archivos/${UUID}`))).status).toBe(404)
    expect(obtener).toHaveBeenLastCalledWith(UUID, { incluirNoPublicados: false })
    await handleRequest(peticion(`/api/actividades/archivos/${UUID}`, { admin: true }))
    expect(obtener).toHaveBeenLastCalledWith(UUID, { incluirNoPublicados: true })
  })

  it('PDF publicado: en línea, cacheable; con ?download=1 se descarga', async () => {
    espiar('obtenerArchivo').mockResolvedValue({ ruta, nombre: 'acta.pdf', publicado: true })
    const res = await handleRequest(peticion(`/api/actividades/archivos/${UUID}`))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toStartWith('inline')
    expect(res.headers.get('cache-control')).toContain('public')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')

    const descarga = await handleRequest(peticion(`/api/actividades/archivos/${UUID}?download=1`))
    expect(descarga.headers.get('content-disposition')).toStartWith('attachment')
  })

  it('el archivo de un borrador no se guarda en cachés compartidos', async () => {
    espiar('obtenerArchivo').mockResolvedValue({ ruta, nombre: 'acta.pdf', publicado: false })
    const res = await handleRequest(peticion(`/api/actividades/archivos/${UUID}`, { admin: true }))
    expect(res.headers.get('cache-control')).toBe('private, no-store')
  })

  it('una ruta guardada fuera de uploads/ no se sirve', async () => {
    espiar('obtenerArchivo').mockResolvedValue({
      ruta: '/etc/passwd',
      nombre: 'passwd.txt',
      publicado: true,
    })
    expect((await handleRequest(peticion(`/api/actividades/archivos/${UUID}`))).status).toBe(403)
  })
})
