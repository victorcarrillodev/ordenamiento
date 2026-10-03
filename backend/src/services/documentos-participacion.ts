/**
 * Documentos PDF de una participación: el formato llenado a mano y escaneado, la
 * versión pública de la participación, el oficio de respuesta y su versión
 * pública. Cada tipo existe una sola vez por folio; cargar otro lo sustituye.
 *
 * Los PDF los prepara y carga el área responsable. Lo que se publica en el
 * portal es solo `version_publica` y `oficio_publico`, y solo después de que
 * alguien lo revisa y lo marca como publicado; el resto es interno.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { sql, type Db } from '../db/pool.ts'
import { validarAdjunto } from '../files/limits.ts'
import { acortarNombre, nombreEnDisco, sanitizarNombre } from '../files/nombres.ts'
import { rutaEnUploads } from './actividades.ts'
import { validateUpload } from './upload-guard.ts'

export const TIPOS_DOCUMENTO = [
  'formato_escaneado',
  'version_publica',
  'oficio',
  'oficio_publico',
] as const
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

/** Los únicos que pueden verse en el portal, y solo publicados. */
export const TIPOS_PUBLICABLES = ['version_publica', 'oficio_publico'] as const

export const esTipoDocumento = (valor: unknown): valor is TipoDocumento =>
  typeof valor === 'string' && (TIPOS_DOCUMENTO as readonly string[]).includes(valor)

export const esTipoPublicable = (tipo: TipoDocumento): boolean =>
  (TIPOS_PUBLICABLES as readonly string[]).includes(tipo)

export const ETIQUETA_DOCUMENTO: Record<TipoDocumento, string> = {
  formato_escaneado: 'Formato escaneado',
  version_publica: 'Versión pública de la participación',
  oficio: 'Oficio de respuesta',
  oficio_publico: 'Versión pública del oficio de respuesta',
}

export interface DocumentoParticipacion {
  id: string
  participation_id: string
  tipo: TipoDocumento
  nombre_original: string
  mime: string
  size: number
  ruta_local: string
  numero_oficio: string
  fecha_oficio: string | null
  publicado: boolean
  publicado_en: string | null
  created_at: string
}

const COLUMNAS = `id::text AS id, participation_id::text AS participation_id, tipo, nombre_original,
  mime, size::int AS size, ruta_local, numero_oficio, fecha_oficio::text AS fecha_oficio, publicado,
  publicado_en, created_at`

/** Lo que devuelve la base: las marcas de tiempo llegan como Date y se exponen en ISO 8601. */
type FilaDocumento = Omit<DocumentoParticipacion, 'publicado_en' | 'created_at'> & {
  publicado_en: Date | null
  created_at: Date
}

const aDocumento = (f: FilaDocumento): DocumentoParticipacion => ({
  ...f,
  publicado_en: f.publicado_en ? new Date(f.publicado_en).toISOString() : null,
  created_at: new Date(f.created_at).toISOString(),
})

const UPLOAD_DIR = join(process.cwd(), 'uploads')

export type ResultadoPdf =
  { ok: true; buffer: Buffer; nombre: string } | { ok: false; error: string; status: number }

/**
 * Comprueba que un archivo subido es un PDF de verdad: extensión, tamaño y firma
 * binaria (con la misma guarda que los adjuntos). Un `.pdf` que no lo es, o un
 * archivo de otro formato, se rechaza con un mensaje claro.
 */
export async function validarPdf(file: File): Promise<ResultadoPdf> {
  const nombre = sanitizarNombre(file.name)
  if (!/\.pdf$/i.test(nombre)) {
    return { ok: false, error: 'El documento debe ser un archivo PDF', status: 415 }
  }
  const limite = validarAdjunto({ size: file.size, name: file.name }, 1)
  if (!limite.ok) {
    return { ok: false, error: limite.reason ?? 'Archivo rechazado', status: limite.codigo ?? 400 }
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const veredicto = validateUpload({ filename: file.name, buffer })
  if (!veredicto.ok || veredicto.safeMime !== 'application/pdf') {
    return {
      ok: false,
      error: `El archivo no es un PDF válido${veredicto.reason ? `: ${veredicto.reason}` : ''}`,
      status: 415,
    }
  }
  return { ok: true, buffer, nombre: acortarNombre(nombre) }
}

/** Escribe el PDF a disco con nombre único y devuelve su ruta. */
export async function escribirPdf(buffer: Buffer, nombre: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const ruta = join(UPLOAD_DIR, nombreEnDisco(nombre))
  await writeFile(ruta, buffer)
  return ruta
}

export async function obtenerDocumento(
  participationId: string,
  tipo: TipoDocumento,
  db: Db = sql,
): Promise<DocumentoParticipacion | null> {
  const filas = await db.unsafe<FilaDocumento[]>(
    `SELECT ${COLUMNAS} FROM participacion_documentos WHERE participation_id = $1 AND tipo = $2`,
    [participationId, tipo],
  )
  return filas[0] ? aDocumento(filas[0]) : null
}

export async function listarDocumentos(
  participationId: string,
  db: Db = sql,
): Promise<DocumentoParticipacion[]> {
  const filas = await db.unsafe<FilaDocumento[]>(
    `SELECT ${COLUMNAS} FROM participacion_documentos WHERE participation_id = $1 ORDER BY created_at`,
    [participationId],
  )
  return filas.map(aDocumento)
}

export interface DatosDocumento {
  nombreOriginal: string
  size: number
  rutaLocal: string
  numeroOficio?: string
  fechaOficio?: string | null
  subidoPor?: string
}

/**
 * Guarda el documento de un tipo; si ya había uno, lo sustituye (y deja de estar
 * publicado: el archivo nuevo hay que revisarlo otra vez). Devuelve la ruta del
 * archivo anterior para que quien llama la borre de disco una vez confirmada la
 * transacción, o null si no había.
 */
export async function guardarDocumento(
  db: Db,
  participationId: string,
  tipo: TipoDocumento,
  datos: DatosDocumento,
): Promise<{ documento: DocumentoParticipacion; rutaAnterior: string | null }> {
  const previo = await obtenerDocumento(participationId, tipo, db)
  const filas = await db.unsafe<FilaDocumento[]>(
    `INSERT INTO participacion_documentos
       (participation_id, tipo, nombre_original, mime, size, ruta_local, numero_oficio, fecha_oficio, subido_por)
     VALUES ($1, $2, $3, 'application/pdf', $4, $5, $6, $7, $8)
     ON CONFLICT (participation_id, tipo) DO UPDATE SET
       nombre_original = EXCLUDED.nombre_original,
       size = EXCLUDED.size,
       ruta_local = EXCLUDED.ruta_local,
       numero_oficio = EXCLUDED.numero_oficio,
       fecha_oficio = EXCLUDED.fecha_oficio,
       subido_por = EXCLUDED.subido_por,
       publicado = false,
       publicado_en = NULL,
       updated_at = now()
     RETURNING ${COLUMNAS}`,
    [
      participationId,
      tipo,
      datos.nombreOriginal,
      datos.size,
      datos.rutaLocal,
      datos.numeroOficio ?? '',
      datos.fechaOficio ?? null,
      datos.subidoPor ?? null,
    ],
  )
  return { documento: aDocumento(filas[0]), rutaAnterior: previo?.ruta_local ?? null }
}

/** Borra de disco un archivo que ya ningún documento usa. Falla en silencio: es limpieza. */
export async function borrarArchivoDeDisco(ruta: string | null): Promise<void> {
  if (!ruta) return
  const segura = rutaEnUploads(ruta)
  if (segura) await rm(segura, { force: true }).catch(() => {})
}

/**
 * Publica o retira del portal un documento. Solo se publican los tipos
 * publicables. Retirar no borra nada: el documento sigue en el registro interno.
 */
export async function fijarPublicacion(
  participationId: string,
  tipo: TipoDocumento,
  publicado: boolean,
): Promise<DocumentoParticipacion | null> {
  if (!esTipoPublicable(tipo)) return null
  const filas = await sql.unsafe<FilaDocumento[]>(
    `UPDATE participacion_documentos
        SET publicado = $3, publicado_en = CASE WHEN $3 THEN now() ELSE NULL END, updated_at = now()
      WHERE participation_id = $1 AND tipo = $2
      RETURNING ${COLUMNAS}`,
    [participationId, tipo, publicado],
  )
  return filas[0] ? aDocumento(filas[0]) : null
}

/** Actualiza el número y la fecha del oficio de un documento ya cargado. */
export async function actualizarDatosOficio(
  participationId: string,
  tipo: TipoDocumento,
  numero: string,
  fecha: string | null,
): Promise<DocumentoParticipacion | null> {
  const filas = await sql.unsafe<FilaDocumento[]>(
    `UPDATE participacion_documentos SET numero_oficio = $3, fecha_oficio = $4, updated_at = now()
      WHERE participation_id = $1 AND tipo = $2 RETURNING ${COLUMNAS}`,
    [participationId, tipo, numero, fecha],
  )
  return filas[0] ? aDocumento(filas[0]) : null
}

/** Quita un documento (registro y archivo). */
export async function eliminarDocumento(
  participationId: string,
  tipo: TipoDocumento,
): Promise<boolean> {
  const filas = await sql<{ ruta_local: string }[]>`
    DELETE FROM participacion_documentos
    WHERE participation_id = ${participationId} AND tipo = ${tipo}
    RETURNING ruta_local
  `
  if (filas.length === 0) return false
  await borrarArchivoDeDisco(filas[0].ruta_local)
  return true
}
