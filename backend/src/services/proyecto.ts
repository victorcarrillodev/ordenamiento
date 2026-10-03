/**
 * Documentos del Proyecto del Programa: el documento técnico y los documentos
 * gráficos, en PDF. El área responsable los carga, les pone nombre y decide el
 * orden en que se presentan. Se pueden preparar antes de que inicie la consulta;
 * el portal los muestra solo con la consulta abierta o concluida.
 */
import { rm } from 'node:fs/promises'

import { sql, type Db } from '../db/pool.ts'
import { rutaEnUploads } from './actividades.ts'
import { linea } from './texto.ts'

export const SECCIONES_PROYECTO = ['tecnico', 'grafico'] as const
export type SeccionProyecto = (typeof SECCIONES_PROYECTO)[number]

export const esSeccionProyecto = (valor: unknown): valor is SeccionProyecto =>
  typeof valor === 'string' && (SECCIONES_PROYECTO as readonly string[]).includes(valor)

export const ETIQUETA_SECCION: Record<SeccionProyecto, string> = {
  tecnico: 'Documento técnico',
  grafico: 'Documentos gráficos',
}

/** Máximo de caracteres del nombre con que se presenta un documento. */
export const MAX_TITULO_PROYECTO = 150
/** Documentos que se pueden cargar en un solo envío. */
export const MAX_DOCUMENTOS_POR_ENVIO = 10
/** Tope de documentos por sección: evita que un error de carga llene el portal. */
export const MAX_DOCUMENTOS_POR_SECCION = 100

export interface DocumentoProyecto {
  id: string
  seccion: SeccionProyecto
  titulo: string
  nombre_original: string
  size: number
  orden: number
  created_at: string
}

interface Fila extends Omit<DocumentoProyecto, 'created_at'> {
  created_at: Date
  ruta_local: string
}

const COLUMNAS = `id::text AS id, seccion, titulo, nombre_original, size::int AS size, orden, ruta_local, created_at`

const aDocumento = ({ ruta_local: _ruta, created_at, ...resto }: Fila): DocumentoProyecto => ({
  ...resto,
  created_at: new Date(created_at).toISOString(),
})

/** El nombre con que se presenta un documento: una línea, sin pasarse del límite. */
export function limpiarTitulo(texto: string): string {
  return Array.from(linea(texto)).slice(0, MAX_TITULO_PROYECTO).join('')
}

/** Un título a partir del nombre del archivo: sin extensión y con espacios en vez de guiones bajos. */
export function tituloDeArchivo(nombre: string): string {
  const sinExtension = nombre.replace(/\.pdf$/i, '')
  return limpiarTitulo(sinExtension.replace(/[_]+/g, ' ')) || 'Documento'
}

/** Todos los documentos, de las dos secciones, en su orden de presentación. */
export async function listarProyecto(db: Db = sql): Promise<DocumentoProyecto[]> {
  const filas = await db.unsafe<Fila[]>(
    `SELECT ${COLUMNAS} FROM proyecto_documentos ORDER BY seccion, orden, created_at`,
  )
  return filas.map(aDocumento)
}

/** El documento con su ruta en disco, solo para servirlo. */
export async function obtenerArchivoProyecto(
  id: string,
): Promise<{ ruta: string; nombre: string } | null> {
  const filas = await sql<Array<{ ruta_local: string; titulo: string; nombre_original: string }>>`
    SELECT ruta_local, titulo, nombre_original FROM proyecto_documentos WHERE id = ${id}
  `
  return filas[0] ? { ruta: filas[0].ruta_local, nombre: filas[0].nombre_original } : null
}

export async function contarSeccion(seccion: SeccionProyecto, db: Db = sql): Promise<number> {
  const filas = await db<{ n: string }[]>`
    SELECT count(*)::text AS n FROM proyecto_documentos WHERE seccion = ${seccion}
  `
  return Number(filas[0].n)
}

export interface NuevoDocumentoProyecto {
  seccion: SeccionProyecto
  titulo: string
  nombreOriginal: string
  size: number
  rutaLocal: string
  subidoPor: string
}

/** Agrega documentos al final de su sección, en el orden dado. */
export async function agregarDocumentos(
  db: Db,
  documentos: NuevoDocumentoProyecto[],
): Promise<DocumentoProyecto[]> {
  const creados: DocumentoProyecto[] = []
  for (const d of documentos) {
    const filas = await db.unsafe<Fila[]>(
      `INSERT INTO proyecto_documentos (seccion, titulo, nombre_original, size, ruta_local, orden, subido_por)
       VALUES ($1, $2, $3, $4, $5,
               (SELECT COALESCE(MAX(orden), 0) + 1 FROM proyecto_documentos WHERE seccion = $1), $6)
       RETURNING ${COLUMNAS}`,
      [d.seccion, d.titulo, d.nombreOriginal, d.size, d.rutaLocal, d.subidoPor],
    )
    creados.push(aDocumento(filas[0]))
  }
  return creados
}

/** Cambia el nombre con que se presenta un documento. */
export async function renombrarDocumento(id: string, titulo: string): Promise<boolean> {
  const filas = await sql<{ id: string }[]>`
    UPDATE proyecto_documentos SET titulo = ${titulo}, updated_at = now()
    WHERE id = ${id} RETURNING id::text AS id
  `
  return filas.length > 0
}

/**
 * Sube o baja un documento un lugar dentro de su sección. El orden se recalcula
 * de 1 a n en cada cambio: así nunca hay huecos ni empates que hagan que
 * «subir» no mueva nada.
 */
export async function moverDocumento(id: string, direccion: 'arriba' | 'abajo'): Promise<boolean> {
  return sql.begin(async (tx) => {
    const actual = await tx<{ seccion: SeccionProyecto }[]>`
      SELECT seccion FROM proyecto_documentos WHERE id = ${id}
    `
    if (actual.length === 0) return false
    const { seccion } = actual[0]

    const filas = await tx<{ id: string }[]>`
      SELECT id::text AS id FROM proyecto_documentos
      WHERE seccion = ${seccion} ORDER BY orden, created_at FOR UPDATE
    `
    const ids = filas.map((f) => f.id)
    const i = ids.indexOf(id)
    const j = direccion === 'arriba' ? i - 1 : i + 1
    if (j >= 0 && j < ids.length) [ids[i], ids[j]] = [ids[j], ids[i]]
    for (const [posicion, docId] of ids.entries()) {
      await tx`UPDATE proyecto_documentos SET orden = ${posicion + 1} WHERE id = ${docId}`
    }
    return true
  })
}

/** Quita un documento (registro y archivo) y reordena su sección. */
export async function eliminarDocumentoProyecto(id: string): Promise<boolean> {
  const filas = await sql<{ ruta_local: string; seccion: SeccionProyecto }[]>`
    DELETE FROM proyecto_documentos WHERE id = ${id} RETURNING ruta_local, seccion
  `
  if (filas.length === 0) return false
  const segura = rutaEnUploads(filas[0].ruta_local)
  if (segura) await rm(segura, { force: true }).catch(() => {})
  return true
}
