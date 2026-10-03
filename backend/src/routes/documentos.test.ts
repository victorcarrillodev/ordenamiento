import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { SessionUser } from '../auth/auth.ts'
import * as documentos from '../services/documentos-participacion.ts'
import * as envios from '../services/envios.ts'
import * as respuestas from '../services/respuestas.ts'
import { rutasDocumentos } from './documentos.ts'
import type { ContextoRuta } from './ruta.ts'

const ADMIN = { id: 'a1', name: 'Admin', email: 'a@x.mx', role: 'admin' } as SessionUser
const CIUDADANO = { id: 'u', name: 'Ciudadano', email: 'u@x.mx', role: 'user' } as SessionUser
const ID = '11111111-2222-4333-8444-555555555555'
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n',
)

const DIR = join(process.cwd(), 'uploads')
const ARCHIVO = join(DIR, 'prueba-documentos-ruta.pdf')

const doc = (cambios: Partial<documentos.DocumentoParticipacion> = {}) =>
  ({
    id: 'd1',
    participation_id: ID,
    tipo: 'oficio',
    nombre_original: 'oficio.pdf',
    mime: 'application/pdf',
    size: PDF.length,
    ruta_local: ARCHIVO,
    numero_oficio: '',
    fecha_oficio: null,
    publicado: false,
    publicado_en: null,
    created_at: '2026-10-05T16:00:00.000Z',
    ...cambios,
  }) as documentos.DocumentoParticipacion

let almacen: Record<string, documentos.DocumentoParticipacion>
let llamadas: Record<string, unknown[]>
let restore: Array<() => void> = []

beforeAll(async () => {
  await mkdir(DIR, { recursive: true })
  await writeFile(ARCHIVO, PDF)
})
afterAll(() => rm(ARCHIVO, { force: true }))

beforeEach(() => {
  almacen = { oficio: doc() }
  llamadas = { publicar: [], guardar: [], eliminar: [], borrar: [], datos: [], enviar: [] }
  const s = <T extends object, K extends keyof T>(modulo: T, nombre: K, impl: unknown) => {
    const espia = spyOn(modulo, nombre as never).mockImplementation(impl as never)
    restore.push(() => espia.mockRestore())
  }
  s(respuestas, 'existeParticipacion', async (id: string) => id === ID)
  s(documentos, 'obtenerDocumento', async (_id: string, tipo: string) => almacen[tipo] ?? null)
  s(documentos, 'listarDocumentos', async () => Object.values(almacen))
  s(envios, 'listarEnvios', async () => [])
  s(documentos, 'escribirPdf', async () => ARCHIVO)
  s(documentos, 'borrarArchivoDeDisco', async (r: string | null) => void llamadas.borrar.push(r))
  s(
    documentos,
    'guardarDocumento',
    async (_db: unknown, _id: string, tipo: string, datos: object) => {
      llamadas.guardar.push({ tipo, datos })
      const nuevo = doc({
        tipo: tipo as never,
        nombre_original: (datos as { nombreOriginal: string }).nombreOriginal,
      })
      const anterior = almacen[tipo]?.ruta_local ?? null
      almacen[tipo] = nuevo
      return { documento: nuevo, rutaAnterior: anterior }
    },
  )
  s(documentos, 'fijarPublicacion', async (_id: string, tipo: string, publicado: boolean) => {
    llamadas.publicar.push({ tipo, publicado })
    if (!almacen[tipo]) return null
    almacen[tipo] = { ...almacen[tipo], publicado }
    return almacen[tipo]
  })
  s(
    documentos,
    'actualizarDatosOficio',
    async (_id: string, tipo: string, numero: string, fecha: string | null) => {
      llamadas.datos.push({ tipo, numero, fecha })
      return almacen[tipo] ? { ...almacen[tipo], numero_oficio: numero, fecha_oficio: fecha } : null
    },
  )
  s(documentos, 'eliminarDocumento', async (_id: string, tipo: string) => {
    llamadas.eliminar.push(tipo)
    const existia = Boolean(almacen[tipo])
    delete almacen[tipo]
    return existia
  })
  s(respuestas, 'enviarRespuesta', async (id: string, por: string) => {
    llamadas.enviar.push([id, por])
    return { ok: true, envio: { id: 'e1', resultado: 'enviado' } } as never
  })
})
afterEach(() => {
  restore.forEach((r) => r())
  restore = []
})

function pedir(
  method: string,
  ruta: string,
  user: SessionUser | null = ADMIN,
  cuerpo?: BodyInit | object,
) {
  const url = new URL(`http://backend${ruta}`)
  const body =
    cuerpo === undefined
      ? undefined
      : cuerpo instanceof FormData || typeof cuerpo === 'string'
        ? cuerpo
        : JSON.stringify(cuerpo)
  return rutasDocumentos({
    request: new Request(url, { method, body }),
    url,
    method,
    user,
  } as ContextoRuta)
}

const subida = (
  extra: Record<string, string> = {},
  archivo: File | null = new File([PDF], 'oficio.pdf'),
) => {
  const fd = new FormData()
  if (archivo) fd.set('archivo', archivo)
  for (const [k, v] of Object.entries(extra)) fd.set(k, v)
  return fd
}
const base = `/api/participations/${ID}/documentos`

describe('permisos', () => {
  it('todo es solo para el personal del panel', async () => {
    for (const [method, ruta] of [
      ['GET', base],
      ['GET', `${base}/oficio`],
      ['PUT', `${base}/oficio`],
      ['DELETE', `${base}/oficio`],
      ['POST', `${base}/version_publica/publicacion`],
      ['POST', `/api/participations/${ID}/respuesta/enviar`],
    ] as const) {
      expect((await pedir(method, ruta, null))?.status, `${method} ${ruta} sin sesión`).toBe(403)
      expect((await pedir(method, ruta, CIUDADANO))?.status, `${method} ${ruta} ciudadano`).toBe(
        403,
      )
    }
    expect(llamadas.publicar).toEqual([])
    expect(llamadas.enviar).toEqual([])
  })

  it('un id que no es UUID es 400', async () => {
    expect((await pedir('GET', '/api/participations/x/documentos'))?.status).toBe(400)
  })
})

describe('listar y ver', () => {
  it('lista los documentos sin exponer la ruta interna del archivo', async () => {
    const res = await pedir('GET', base)
    const cuerpo = (await res?.json()) as {
      documentos: Array<Record<string, unknown>>
      envios: unknown[]
    }
    expect(cuerpo.documentos).toHaveLength(1)
    expect(cuerpo.documentos[0]).not.toHaveProperty('ruta_local')
    expect(cuerpo.documentos[0].nombre_original).toBe('oficio.pdf')
    expect(cuerpo.envios).toEqual([])
  })

  it('una participación inexistente es 404', async () => {
    expect(
      (await pedir('GET', '/api/participations/99999999-2222-4333-8444-555555555555/documentos'))
        ?.status,
    ).toBe(404)
  })

  it('el PDF se ve en el visor; con ?download=1 se descarga', async () => {
    const ver = await pedir('GET', `${base}/oficio`)
    expect(ver?.status).toBe(200)
    expect(ver?.headers.get('content-type')).toBe('application/pdf')
    expect(ver?.headers.get('content-disposition')).toMatch(/^inline/)
    expect(ver?.headers.get('cache-control')).toBe('no-store')
    expect(
      Buffer.from(await ver!.arrayBuffer())
        .subarray(0, 5)
        .toString('latin1'),
    ).toBe('%PDF-')
    const bajar = await pedir('GET', `${base}/oficio?download=1`)
    expect(bajar?.headers.get('content-disposition')).toMatch(/^attachment/)
  })

  it('un documento sin cargar es 404 y un tipo inventado 400', async () => {
    expect((await pedir('GET', `${base}/version_publica`))?.status).toBe(404)
    expect((await pedir('GET', `${base}/secreto`))?.status).toBe(400)
  })
})

describe('cargar o sustituir un PDF', () => {
  it('guarda el PDF, ligado al folio, y borra el anterior de disco', async () => {
    const res = await pedir('PUT', `${base}/oficio`, ADMIN, subida())
    expect(res?.status).toBe(201)
    const cuerpo = (await res?.json()) as { documento: Record<string, unknown> }
    expect(cuerpo.documento).not.toHaveProperty('ruta_local')
    expect(llamadas.guardar).toHaveLength(1)
    expect(llamadas.borrar).toEqual([ARCHIVO]) // el anterior
  })

  it('cargar NO envía nada: el envío es un paso aparte', async () => {
    await pedir('PUT', `${base}/oficio`, ADMIN, subida())
    expect(llamadas.enviar).toEqual([])
  })

  it('rechaza lo que no es un PDF: otra extensión, un .pdf falso o sin archivo', async () => {
    expect(
      (await pedir('PUT', `${base}/oficio`, ADMIN, subida({}, new File([PDF], 'oficio.docx'))))
        ?.status,
    ).toBe(415)
    expect(
      (
        await pedir(
          'PUT',
          `${base}/oficio`,
          ADMIN,
          subida({}, new File(['no es pdf'], 'oficio.pdf')),
        )
      )?.status,
    ).toBe(415)
    expect((await pedir('PUT', `${base}/oficio`, ADMIN, subida({}, null)))?.status).toBe(422)
    expect(llamadas.guardar).toEqual([])
  })

  it('el oficio lleva su número y su fecha, validados', async () => {
    const bien = await pedir(
      'PUT',
      `${base}/oficio_publico`,
      ADMIN,
      subida({ numero_oficio: 'DGTPU/0123/2026', fecha_oficio: '2026-10-05' }),
    )
    expect(bien?.status).toBe(201)
    expect((llamadas.guardar[0] as { datos: Record<string, unknown> }).datos).toMatchObject({
      numeroOficio: 'DGTPU/0123/2026',
      fechaOficio: '2026-10-05',
    })
    for (const fecha of ['05/10/2026', '2026-02-31', '2026-13-01', 'ayer']) {
      expect(
        (await pedir('PUT', `${base}/oficio`, ADMIN, subida({ fecha_oficio: fecha })))?.status,
        fecha,
      ).toBe(422)
    }
    expect(
      (await pedir('PUT', `${base}/oficio`, ADMIN, subida({ numero_oficio: 'x'.repeat(61) })))
        ?.status,
    ).toBe(422)
  })

  it('una participación inexistente es 404', async () => {
    expect(
      (
        await pedir(
          'PUT',
          '/api/participations/99999999-2222-4333-8444-555555555555/documentos/oficio',
          ADMIN,
          subida(),
        )
      )?.status,
    ).toBe(404)
  })

  it('el número y la fecha se pueden corregir sin volver a cargar el PDF', async () => {
    almacen.oficio_publico = doc({ tipo: 'oficio_publico' })
    const res = await pedir('PATCH', `${base}/oficio_publico`, ADMIN, {
      numero_oficio: ' DGTPU/9 ',
      fecha_oficio: '2026-10-06',
    })
    expect(res?.status).toBe(200)
    expect(llamadas.datos).toEqual([
      { tipo: 'oficio_publico', numero: 'DGTPU/9', fecha: '2026-10-06' },
    ])
    expect(
      (await pedir('PATCH', `${base}/oficio_publico`, ADMIN, { fecha_oficio: 'mal' }))?.status,
    ).toBe(422)
  })
})

describe('publicar en el portal', () => {
  beforeEach(() => {
    almacen.version_publica = doc({ tipo: 'version_publica' })
    almacen.oficio_publico = doc({
      tipo: 'oficio_publico',
      numero_oficio: 'DGTPU/1',
      fecha_oficio: '2026-10-05',
    })
  })

  it('se publica y se retira la versión pública de la participación', async () => {
    expect(
      (await pedir('POST', `${base}/version_publica/publicacion`, ADMIN, { publicado: true }))
        ?.status,
    ).toBe(200)
    expect(
      (await pedir('POST', `${base}/version_publica/publicacion`, ADMIN, { publicado: false }))
        ?.status,
    ).toBe(200)
    expect(llamadas.publicar).toEqual([
      { tipo: 'version_publica', publicado: true },
      { tipo: 'version_publica', publicado: false },
    ])
  })

  it('los documentos internos (el formato escaneado, el oficio íntegro) no se publican nunca', async () => {
    for (const tipo of ['oficio', 'formato_escaneado']) {
      almacen[tipo] = doc({ tipo: tipo as never })
      expect(
        (await pedir('POST', `${base}/${tipo}/publicacion`, ADMIN, { publicado: true }))?.status,
        tipo,
      ).toBe(400)
    }
    expect(llamadas.publicar).toEqual([])
  })

  it('sin el documento cargado no hay qué publicar', async () => {
    delete almacen.version_publica
    expect(
      (await pedir('POST', `${base}/version_publica/publicacion`, ADMIN, { publicado: true }))
        ?.status,
    ).toBe(409)
  })

  it('el oficio público no se publica sin su número y su fecha: se muestran en el portal', async () => {
    almacen.oficio_publico = doc({ tipo: 'oficio_publico', numero_oficio: '', fecha_oficio: null })
    const res = await pedir('POST', `${base}/oficio_publico/publicacion`, ADMIN, {
      publicado: true,
    })
    expect(res?.status).toBe(409)
    expect(((await res?.json()) as { error: string }).error).toContain('número y su fecha')
    // retirarlo siempre se puede
    expect(
      (await pedir('POST', `${base}/oficio_publico/publicacion`, ADMIN, { publicado: false }))
        ?.status,
    ).toBe(200)
  })

  it('«publicado» debe ser verdadero o falso', async () => {
    for (const cuerpo of [{}, { publicado: 'si' }, { publicado: 1 }]) {
      expect(
        (await pedir('POST', `${base}/version_publica/publicacion`, ADMIN, cuerpo))?.status,
      ).toBe(400)
    }
  })
})

describe('quitar y enviar', () => {
  it('quita un documento', async () => {
    expect((await pedir('DELETE', `${base}/oficio`))?.status).toBe(200)
    expect((await pedir('DELETE', `${base}/oficio`))?.status).toBe(404)
  })

  it('«Enviar respuesta» manda el oficio y devuelve la constancia', async () => {
    const res = await pedir('POST', `/api/participations/${ID}/respuesta/enviar`)
    expect(res?.status).toBe(200)
    expect(llamadas.enviar).toEqual([[ID, 'a1']])
  })

  it('si el envío falla, responde con su estado y la constancia del error', async () => {
    spyOn(respuestas, 'enviarRespuesta').mockResolvedValue({
      ok: false,
      status: 502,
      error: 'No se pudo enviar el correo: buzón inexistente',
      envio: { id: 'e2', resultado: 'error' } as never,
    })
    const res = await pedir('POST', `/api/participations/${ID}/respuesta/enviar`)
    expect(res?.status).toBe(502)
    expect(await res?.json()).toMatchObject({
      error: expect.stringContaining('buzón inexistente'),
      envio: { resultado: 'error' },
    })
  })
})

describe('el módulo no toca lo que no es suyo', () => {
  it('devuelve null para otras rutas', async () => {
    expect(await pedir('GET', `/api/participations/${ID}/attachments/abc`)).toBeNull()
    expect(await pedir('GET', `/api/participations/${ID}`)).toBeNull()
    expect(await pedir('PUT', `/api/participations/${ID}/documentos`)).toBeNull()
  })
})
