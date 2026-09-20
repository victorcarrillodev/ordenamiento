/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'

import { handleRequest } from './app.ts'
import * as auth from './auth/auth.ts'
import * as pool from './db/pool.ts'
import * as actividades from './services/actividades.ts'
import * as indicadores from './services/indicadores.ts'

/**
 * Indicadores (Seguimiento y evaluación). El documento de respaldo es ahora un
 * archivo de alguna actividad del Programa: debe existir, o la llave foránea
 * convertiría el alta en un 500.
 */

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440041'
const espias: Array<{ mockRestore: () => void }> = []

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

function alta(body: unknown, admin = true) {
  return new Request('http://localhost/api/indicadores', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(admin ? { cookie: 'ordenamiento_session=token-admin' } : {}),
    },
    body: JSON.stringify(body),
  })
}

function edicion(body: unknown) {
  return new Request(`http://localhost/api/indicadores/${ADMIN_ID}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: 'ordenamiento_session=token-admin',
    },
    body: JSON.stringify(body),
  })
}

describe('indicadores', () => {
  it('GET /api/indicadores es público', async () => {
    espias.push(spyOn(pool, 'sql').mockImplementation((() => Promise.resolve([])) as never))
    const res = await handleRequest(new Request('http://localhost/api/indicadores'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ indicadores: [] })
  })

  it('POST sin sesión de admin → 403', async () => {
    expect((await handleRequest(alta({ nombre: 'x' }, false))).status).toBe(403)
  })

  it('un respaldo con id inválido o que no existe → 400', async () => {
    const existe = spyOn(actividades as any, 'existeArchivo').mockResolvedValue(false)
    espias.push(existe)
    const invalido = await handleRequest(alta({ nombre: 'x', documento_respaldo_id: 'abc' }))
    expect(invalido.status).toBe(400)
    expect(existe).not.toHaveBeenCalled()

    const inexistente = await handleRequest(
      alta({ nombre: 'x', documento_respaldo_id: '550e8400-e29b-41d4-a716-446655440099' }),
    )
    expect(inexistente.status).toBe(400)
    expect(((await inexistente.json()) as { error: string }).error).toContain('respaldo')
  })

  // El archivo se borra entre la comprobación y el guardado: la llave foránea
  // lo detecta y la respuesta debe seguir siendo un 400, no un error interno.
  it('un respaldo borrado mientras se guardaba → 400', async () => {
    const llaveForanea = Object.assign(new Error('violates foreign key constraint'), {
      code: '23503',
      constraint_name: 'indicadores_documento_respaldo_id_fkey',
    })
    espias.push(
      spyOn(actividades as any, 'existeArchivo').mockResolvedValue(true),
      spyOn(pool.sql as any, 'begin').mockImplementation(async (cb: any) => cb(pool.sql)),
      spyOn(indicadores as any, 'createIndicador').mockRejectedValue(llaveForanea),
      spyOn(indicadores as any, 'updateIndicador').mockRejectedValue(llaveForanea),
    )
    const RESPALDO = '550e8400-e29b-41d4-a716-446655440099'

    const nuevo = await handleRequest(alta({ nombre: 'x', documento_respaldo_id: RESPALDO }))
    expect(nuevo.status).toBe(400)

    const editado = await handleRequest(edicion({ documento_respaldo_id: RESPALDO }))
    expect(editado.status).toBe(400)
    expect(((await editado.json()) as { error: string }).error).toContain('respaldo')
  })

  // Regresión (Testing): lo que llega por la API y no por el formulario podía
  // acabar en la base sin revisar (la meta y los valores van a columnas
  // NUMERIC, y las mediciones se recorren como lista) y la petición terminaba
  // en 500 en vez de explicar qué venía mal.
  it('un dato mal formado se explica con un 400, sin tocar la base', async () => {
    const crear = spyOn(indicadores as any, 'createIndicador').mockResolvedValue({ id: 'x' })
    espias.push(crear, spyOn(actividades as any, 'existeArchivo').mockResolvedValue(true))

    for (const cuerpo of [
      { nombre: 'x', meta: 'no-es-numero' },
      { nombre: 'x', mediciones: 'no-es-una-lista' },
      { nombre: 'x', mediciones: [null] },
      { nombre: 'x', mediciones: [{ periodo: '2026-T1' }] },
      { nombre: 'x', documento_respaldo_id: 12345 },
      { nombre: 12345 },
      // Cada medición es un INSERT: un envío enorme ocuparía la conexión.
      {
        nombre: 'x',
        mediciones: Array.from({ length: 501 }, (_, i) => ({ periodo: `P${i}`, valor: i })),
      },
    ]) {
      const res = await handleRequest(alta(cuerpo))
      expect(res.status).toBe(400)
    }
    expect(crear).not.toHaveBeenCalled()
  })

  it('los campos que llegan en blanco vacían la columna, no la ponen a cero', async () => {
    const crear = spyOn(indicadores as any, 'createIndicador').mockResolvedValue({ id: 'i1' })
    espias.push(
      crear,
      spyOn(pool.sql as any, 'begin').mockImplementation(async (cb: any) => cb(pool.sql)),
    )
    const res = await handleRequest(
      alta({ nombre: 'Superficie', documento_respaldo_id: '', meta: '5000', mediciones: [] }),
    )
    expect(res.status).toBe(201)
    const [, datos] = crear.mock.calls[0] as [
      unknown,
      { documento_respaldo_id: unknown; meta: unknown },
    ]
    expect(datos.documento_respaldo_id).toBeNull()
    expect(datos.meta).toBe(5000)

    // Regresión (Testing): `Number('  ')` es 0, y la meta quedaba en cero.
    crear.mockClear()
    expect((await handleRequest(alta({ nombre: 'Superficie', meta: '   ' }))).status).toBe(201)
    const [, enBlanco] = crear.mock.calls[0] as [unknown, { meta: unknown }]
    expect(enBlanco.meta).toBeNull()
  })

  // Regresión (Testing): validar el tipo no basta. Un byte nulo no cabe en una
  // columna `text` de Postgres y `nombre` está indexado, así que uno larguísimo
  // rompe el índice: los dos acababan en 500.
  it('el texto se sanea y el nombre tiene tope, en vez de reventar en la base', async () => {
    const crear = spyOn(indicadores as any, 'createIndicador').mockResolvedValue({ id: 'i1' })
    espias.push(
      crear,
      spyOn(pool.sql as any, 'begin').mockImplementation(async (cb: any) => cb(pool.sql)),
    )

    const conNulo = `Superficie${String.fromCharCode(0)} total`
    const res = await handleRequest(
      alta({
        nombre: conNulo,
        descripcion: conNulo,
        unidad: conNulo,
        fecha_evaluacion: conNulo,
        resultado_texto: conNulo,
        mediciones: [{ periodo: conNulo, valor: 1 }],
      }),
    )
    expect(res.status).toBe(201)
    const [, datos, mediciones] = crear.mock.calls[0] as [
      unknown,
      Record<string, string>,
      Array<{ periodo: string }>,
    ]
    for (const campo of [
      'nombre',
      'descripcion',
      'unidad',
      'fecha_evaluacion',
      'resultado_texto',
    ]) {
      expect(datos[campo]).not.toContain(String.fromCharCode(0))
    }
    expect(mediciones[0].periodo).not.toContain(String.fromCharCode(0))

    crear.mockClear()
    const largo = await handleRequest(alta({ nombre: 'a'.repeat(3000) }))
    expect(largo.status).toBe(400)
    expect(((await largo.json()) as { error: string }).error).toContain('300 caracteres')
    // Editar tampoco puede dejar al indicador sin nombre.
    expect((await handleRequest(edicion({ nombre: '   ' }))).status).toBe(400)
    expect(crear).not.toHaveBeenCalled()
  })

  // Regresión (Testing): editar reemplaza las mediciones borrándolas antes de
  // volver a insertarlas. Sin transacción, un fallo a media faena dejaba al
  // indicador sin las que tenía mientras la respuesta decía «error interno».
  it('la edición corre dentro de una transacción', async () => {
    const actualizar = spyOn(indicadores as any, 'updateIndicador').mockResolvedValue(true)
    const transaccion = { es: 'transacción' }
    const begin = spyOn(pool.sql as any, 'begin').mockImplementation(async (cb: any) =>
      cb(transaccion),
    )
    espias.push(actualizar, begin)

    const res = await handleRequest(edicion({ mediciones: [{ periodo: '2026-T1', valor: 5 }] }))
    expect(res.status).toBe(200)
    expect(begin).toHaveBeenCalled()
    expect(actualizar.mock.calls[0][0]).toBe(transaccion)
  })
})
