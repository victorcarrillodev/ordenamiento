import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { SessionUser } from '../auth/auth.ts'
import * as pool from '../db/pool.ts'
import * as consulta from '../services/consulta.ts'
import * as documentos from '../services/documentos-participacion.ts'
import * as proyecto from '../services/proyecto.ts'
import { rutasProyecto } from './proyecto.ts'
import type { ContextoRuta } from './ruta.ts'

const ADMIN = { id: 'a1', name: 'Admin', email: 'a@x.mx', role: 'admin' } as SessionUser
const CIUDADANO = { id: 'u', name: 'Ciudadano', email: 'u@x.mx', role: 'user' } as SessionUser
const ID = '11111111-2222-4333-8444-555555555555'
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n',
)
const DIR = join(process.cwd(), 'uploads')
const ARCHIVO = join(DIR, 'prueba-proyecto-ruta.pdf')

const doc = (cambios: Partial<proyecto.DocumentoProyecto> = {}): proyecto.DocumentoProyecto => ({
  id: ID,
  seccion: 'tecnico',
  titulo: 'Documento técnico',
  nombre_original: 'tecnico.pdf',
  size: 1000,
  orden: 1,
  created_at: '2026-10-01T00:00:00.000Z',
  ...cambios,
})

let etapa: 'pendiente' | 'abierta' | 'concluida'
let almacen: proyecto.DocumentoProyecto[]
let llamadas: Record<string, unknown[]>
let restore: Array<() => void> = []

beforeAll(async () => {
  await mkdir(DIR, { recursive: true })
  await writeFile(ARCHIVO, PDF)
})
afterAll(() => rm(ARCHIVO, { force: true }))

beforeEach(() => {
  etapa = 'abierta'
  almacen = [
    doc(),
    doc({ id: 'g1', seccion: 'grafico', titulo: 'Mapa de zonificación', orden: 1 }),
    doc({ id: 'g2', seccion: 'grafico', titulo: 'Mapa de riesgos', orden: 2 }),
  ]
  llamadas = { agregar: [], renombrar: [], mover: [], eliminar: [], escribir: [], borrar: [] }
  const s = <T extends object, K extends keyof T>(m: T, n: K, impl: unknown) => {
    const e = spyOn(m, n as never).mockImplementation(impl as never)
    restore.push(() => e.mockRestore())
  }
  s(consulta, 'leerEstadoConsulta', async () => ({ etapa, inicio: null, cierre: null }))
  s(proyecto, 'listarProyecto', async () => almacen)
  s(proyecto, 'obtenerArchivoProyecto', async (id: string) =>
    almacen.some((d) => d.id === id) ? { ruta: ARCHIVO, nombre: 'tecnico.pdf' } : null,
  )
  s(
    proyecto,
    'contarSeccion',
    async (sec: string) => almacen.filter((d) => d.seccion === sec).length,
  )
  s(proyecto, 'agregarDocumentos', async (_db: unknown, nuevos: unknown[]) => {
    llamadas.agregar.push(nuevos)
    return nuevos.map((n, i) => doc({ id: `nuevo-${i}`, titulo: (n as { titulo: string }).titulo }))
  })
  s(proyecto, 'renombrarDocumento', async (id: string, titulo: string) => {
    llamadas.renombrar.push([id, titulo])
    return almacen.some((d) => d.id === id)
  })
  s(proyecto, 'moverDocumento', async (id: string, dir: string) => {
    llamadas.mover.push([id, dir])
    return almacen.some((d) => d.id === id)
  })
  s(proyecto, 'eliminarDocumentoProyecto', async (id: string) => {
    llamadas.eliminar.push(id)
    return almacen.some((d) => d.id === id)
  })
  s(documentos, 'escribirPdf', async (_b: Buffer, nombre: string) => {
    llamadas.escribir.push(nombre)
    return ARCHIVO
  })
  s(documentos, 'borrarArchivoDeDisco', async (r: string | null) => void llamadas.borrar.push(r))
  s(pool.sql, 'begin', async (trabajo: (tx: unknown) => Promise<unknown>) => trabajo({}))
})
afterEach(() => {
  restore.forEach((r) => r())
  restore = []
})

function pedir(
  method: string,
  ruta: string,
  user: SessionUser | null = null,
  cuerpo?: BodyInit | object,
) {
  const url = new URL(`http://backend${ruta}`)
  const body =
    cuerpo === undefined
      ? undefined
      : cuerpo instanceof FormData || typeof cuerpo === 'string'
        ? cuerpo
        : JSON.stringify(cuerpo)
  return rutasProyecto({
    request: new Request(url, { method, body }),
    url,
    method,
    user,
  } as ContextoRuta)
}

const pdf = (nombre = 'documento.pdf') => new File([PDF], nombre, { type: 'application/pdf' })
const subida = (seccion: string | null, archivos: File[], titulos: string[] = []) => {
  const fd = new FormData()
  if (seccion) fd.set('seccion', seccion)
  for (const a of archivos) fd.append('archivo', a)
  for (const t of titulos) fd.append('titulo', t)
  return fd
}

describe('lo que ve el público: GET /api/proyecto', () => {
  it('con la consulta abierta entrega los documentos de las dos secciones, en su orden', async () => {
    const cuerpo = (await (await pedir('GET', '/api/proyecto'))?.json()) as {
      visible: boolean
      tecnico: Array<{ titulo: string }>
      grafico: Array<{ titulo: string }>
    }
    expect(cuerpo.visible).toBe(true)
    expect(cuerpo.tecnico.map((d) => d.titulo)).toEqual(['Documento técnico'])
    expect(cuerpo.grafico.map((d) => d.titulo)).toEqual(['Mapa de zonificación', 'Mapa de riesgos'])
  })

  it('con la consulta concluida sigue disponible', async () => {
    etapa = 'concluida'
    expect(
      ((await (await pedir('GET', '/api/proyecto'))?.json()) as { visible: boolean }).visible,
    ).toBe(true)
  })

  it('antes de iniciar el apartado está oculto: ni siquiera se entregan los títulos', async () => {
    etapa = 'pendiente'
    const cuerpo = await (await pedir('GET', '/api/proyecto'))?.json()
    expect(cuerpo).toEqual({ visible: false, etapa: 'pendiente', tecnico: [], grafico: [] })
  })

  it('no expone la ruta interna del archivo', async () => {
    const texto = JSON.stringify(await (await pedir('GET', '/api/proyecto'))?.json())
    expect(texto).not.toContain('ruta')
    expect(texto).not.toContain('uploads')
  })
})

describe('el PDF', () => {
  it('con la consulta abierta cualquiera lo ve en el visor y lo descarga', async () => {
    const ver = await pedir('GET', `/api/proyecto/documentos/${ID}/archivo`)
    expect(ver?.status).toBe(200)
    expect(ver?.headers.get('content-type')).toBe('application/pdf')
    expect(ver?.headers.get('content-disposition')).toMatch(/^inline/)
    const bajar = await pedir('GET', `/api/proyecto/documentos/${ID}/archivo?download=1`)
    expect(bajar?.headers.get('content-disposition')).toMatch(/^attachment/)
  })

  it('antes de iniciar el público no puede abrirlo, aunque conozca la dirección', async () => {
    etapa = 'pendiente'
    expect((await pedir('GET', `/api/proyecto/documentos/${ID}/archivo`))?.status).toBe(404)
    expect((await pedir('GET', `/api/proyecto/documentos/${ID}/archivo`, CIUDADANO))?.status).toBe(
      404,
    )
  })

  it('pero el panel sí, para revisarlo antes de iniciar', async () => {
    etapa = 'pendiente'
    expect((await pedir('GET', `/api/proyecto/documentos/${ID}/archivo`, ADMIN))?.status).toBe(200)
  })

  it('un id inválido es 400 y uno inexistente 404', async () => {
    expect((await pedir('GET', '/api/proyecto/documentos/x/archivo'))?.status).toBe(400)
    expect(
      (await pedir('GET', '/api/proyecto/documentos/99999999-2222-4333-8444-555555555555/archivo'))
        ?.status,
    ).toBe(404)
  })
})

describe('gestión (solo el panel)', () => {
  it('el listado de gestión muestra todo aunque el apartado esté oculto', async () => {
    etapa = 'pendiente'
    const cuerpo = (await (await pedir('GET', '/api/proyecto/gestion', ADMIN))?.json()) as {
      visible: boolean
      tecnico: unknown[]
      grafico: unknown[]
    }
    expect(cuerpo.visible).toBe(false)
    expect(cuerpo.tecnico).toHaveLength(1)
    expect(cuerpo.grafico).toHaveLength(2)
  })

  it('todo lo que modifica exige sesión del panel', async () => {
    for (const [method, ruta] of [
      ['GET', '/api/proyecto/gestion'],
      ['POST', '/api/proyecto/documentos'],
      ['PATCH', `/api/proyecto/documentos/${ID}`],
      ['POST', `/api/proyecto/documentos/${ID}/mover`],
      ['DELETE', `/api/proyecto/documentos/${ID}`],
    ] as const) {
      expect((await pedir(method, ruta, null))?.status, `${method} ${ruta} sin sesión`).toBe(403)
      expect((await pedir(method, ruta, CIUDADANO))?.status, `${method} ${ruta} ciudadano`).toBe(
        403,
      )
    }
    expect(llamadas.agregar).toEqual([])
    expect(llamadas.eliminar).toEqual([])
  })
})

describe('cargar varios PDF', () => {
  it('guarda todos, cada uno con su nombre, al final de su sección', async () => {
    const res = await pedir(
      'POST',
      '/api/proyecto/documentos',
      ADMIN,
      subida('grafico', [pdf('mapa_uno.pdf'), pdf('mapa_dos.pdf')], ['Mapa de vialidades', '']),
    )
    expect(res?.status).toBe(201)
    const guardados = llamadas.agregar[0] as Array<{
      seccion: string
      titulo: string
      nombreOriginal: string
    }>
    expect(guardados.map((g) => g.titulo)).toEqual(['Mapa de vialidades', 'mapa dos'])
    expect(guardados.every((g) => g.seccion === 'grafico')).toBe(true)
  })

  it('sin título usa el nombre del archivo, sin extensión y con espacios', async () => {
    await pedir(
      'POST',
      '/api/proyecto/documentos',
      ADMIN,
      subida('tecnico', [pdf('Programa_final_v2.pdf')]),
    )
    expect((llamadas.agregar[0] as Array<{ titulo: string }>)[0].titulo).toBe('Programa final v2')
  })

  it('si uno de los archivos no es PDF no se guarda ninguno', async () => {
    const res = await pedir(
      'POST',
      '/api/proyecto/documentos',
      ADMIN,
      subida('tecnico', [pdf('bueno.pdf'), new File(['x'], 'malo.docx')]),
    )
    expect(res?.status).toBe(415)
    expect(llamadas.agregar).toEqual([])
    expect(llamadas.escribir).toEqual([])
  })

  it('exige la sección y al menos un archivo, y limita el envío', async () => {
    expect(
      (await pedir('POST', '/api/proyecto/documentos', ADMIN, subida(null, [pdf()])))?.status,
    ).toBe(400)
    expect(
      (await pedir('POST', '/api/proyecto/documentos', ADMIN, subida('otra', [pdf()])))?.status,
    ).toBe(400)
    expect(
      (await pedir('POST', '/api/proyecto/documentos', ADMIN, subida('tecnico', [])))?.status,
    ).toBe(422)
    const muchos = Array.from({ length: proyecto.MAX_DOCUMENTOS_POR_ENVIO + 1 }, (_, i) =>
      pdf(`d${i}.pdf`),
    )
    expect(
      (await pedir('POST', '/api/proyecto/documentos', ADMIN, subida('tecnico', muchos)))?.status,
    ).toBe(400)
    expect(llamadas.agregar).toEqual([])
  })

  it('cada sección tiene un tope de documentos', async () => {
    spyOn(proyecto, 'contarSeccion').mockResolvedValue(proyecto.MAX_DOCUMENTOS_POR_SECCION)
    expect(
      (await pedir('POST', '/api/proyecto/documentos', ADMIN, subida('tecnico', [pdf()])))?.status,
    ).toBe(409)
  })

  it('cargar es posible antes de iniciar la consulta: se prepara de antemano', async () => {
    etapa = 'pendiente'
    expect(
      (await pedir('POST', '/api/proyecto/documentos', ADMIN, subida('tecnico', [pdf()])))?.status,
    ).toBe(201)
  })
})

describe('nombrar, ordenar y quitar', () => {
  it('cambia el nombre con que se presenta, saneado', async () => {
    const res = await pedir('PATCH', `/api/proyecto/documentos/${ID}`, ADMIN, {
      titulo: '  Documento\ntécnico final  ',
    })
    expect(res?.status).toBe(200)
    expect(llamadas.renombrar).toEqual([[ID, 'Documento técnico final']])
    expect(
      (await pedir('PATCH', `/api/proyecto/documentos/${ID}`, ADMIN, { titulo: '   ' }))?.status,
    ).toBe(422)
    expect((await pedir('PATCH', `/api/proyecto/documentos/${ID}`, ADMIN, {}))?.status).toBe(422)
  })

  it('el nombre no pasa de 150 caracteres', async () => {
    await pedir('PATCH', `/api/proyecto/documentos/${ID}`, ADMIN, { titulo: 'x'.repeat(400) })
    expect(Array.from((llamadas.renombrar[0] as [string, string])[1])).toHaveLength(150)
  })

  it('sube o baja un lugar; otra dirección no vale', async () => {
    expect(
      (await pedir('POST', `/api/proyecto/documentos/${ID}/mover`, ADMIN, { direccion: 'arriba' }))
        ?.status,
    ).toBe(200)
    expect(
      (await pedir('POST', `/api/proyecto/documentos/${ID}/mover`, ADMIN, { direccion: 'abajo' }))
        ?.status,
    ).toBe(200)
    expect(llamadas.mover).toEqual([
      [ID, 'arriba'],
      [ID, 'abajo'],
    ])
    expect(
      (
        await pedir('POST', `/api/proyecto/documentos/${ID}/mover`, ADMIN, {
          direccion: 'izquierda',
        })
      )?.status,
    ).toBe(400)
  })

  it('quita un documento; uno inexistente es 404', async () => {
    expect((await pedir('DELETE', `/api/proyecto/documentos/${ID}`, ADMIN))?.status).toBe(200)
    expect(
      (
        await pedir(
          'DELETE',
          '/api/proyecto/documentos/99999999-2222-4333-8444-555555555555',
          ADMIN,
        )
      )?.status,
    ).toBe(404)
  })
})

describe('el módulo no toca lo que no es suyo', () => {
  it('devuelve null para otras rutas y métodos', async () => {
    expect(await pedir('GET', '/api/otra', ADMIN)).toBeNull()
    expect(await pedir('PUT', '/api/proyecto', ADMIN)).toBeNull()
    expect(await pedir('GET', `/api/proyecto/documentos/${ID}`, ADMIN)).toBeNull()
  })
})
