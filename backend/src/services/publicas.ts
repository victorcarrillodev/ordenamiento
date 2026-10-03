/**
 * «Participaciones y respuestas» del portal: las versiones públicas de las
 * participaciones recibidas y de los oficios de respuesta que el área
 * responsable decidió publicar.
 *
 * Lo público es lo mínimo: el folio, la fecha de recepción y, cuando existe, el
 * número y la fecha del oficio. Ningún dato personal, ni la temática, ni los
 * anexos, ni el oficio íntegro: solo los dos PDF que alguien revisó y publicó.
 */
import { sql } from '../db/pool.ts'
import type { TipoDocumento } from './documentos-participacion.ts'

export interface RegistroPublico {
  folio: string
  /** Fecha de recepción, `AAAA-MM-DD` en la hora de la Ciudad de México. */
  fecha: string
  /** El oficio de respuesta publicado; null mientras no lo esté. */
  oficio: { numero: string; fecha: string | null } | null
}

export interface PaginaPublica {
  items: RegistroPublico[]
  total: number
  page: number
  limit: number
}

/** Escapa los comodines de LIKE para que lo que se escribe en el buscador sea texto, no patrón. */
const escaparLike = (valor: string) =>
  valor.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')

export const MAX_LARGO_BUSQUEDA = 40
export const LIMITE_POR_PAGINA = 10
export const LIMITE_MAXIMO = 50

interface Fila {
  folio: string
  fecha: string
  numero_oficio: string | null
  fecha_oficio: string | null
  oficio_publicado: boolean | null
}

const DESDE = `
  FROM participations p
  JOIN participacion_documentos v
    ON v.participation_id = p.id AND v.tipo = 'version_publica' AND v.publicado
  LEFT JOIN participacion_documentos o
    ON o.participation_id = p.id AND o.tipo = 'oficio_publico' AND o.publicado
  WHERE p.folio ILIKE $1 ESCAPE '\\'`

/** Las participaciones con versión pública publicada, las más recientes primero; `folio` filtra por coincidencia. */
export async function listarPublicas(opciones: {
  folio?: string
  page?: number
  limit?: number
}): Promise<PaginaPublica> {
  const busqueda = (opciones.folio ?? '').trim().slice(0, MAX_LARGO_BUSQUEDA)
  const limit = Math.min(Math.max(opciones.limit ?? LIMITE_POR_PAGINA, 1), LIMITE_MAXIMO)
  const page = Math.max(opciones.page ?? 1, 1)
  const patron = `%${escaparLike(busqueda)}%`

  const [{ n }] = await sql.unsafe<Array<{ n: string }>>(`SELECT count(*)::text AS n ${DESDE}`, [
    patron,
  ])
  const filas = await sql.unsafe<Fila[]>(
    `SELECT p.folio,
            to_char(p.created_at AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD') AS fecha,
            o.numero_oficio, o.fecha_oficio::text AS fecha_oficio, o.publicado AS oficio_publicado
       ${DESDE}
      ORDER BY p.created_at DESC, p.folio DESC
      LIMIT $2 OFFSET $3`,
    [patron, limit, (page - 1) * limit],
  )

  return {
    items: filas.map((f) => ({
      folio: f.folio,
      fecha: f.fecha,
      oficio: f.oficio_publicado ? { numero: f.numero_oficio ?? '', fecha: f.fecha_oficio } : null,
    })),
    total: Number(n),
    page,
    limit,
  }
}

/**
 * La ruta y el nombre del PDF publicado de un folio, o null si no existe o no
 * está publicado. Solo atiende los dos tipos públicos: el resto nunca sale por
 * aquí, sea cual sea el folio.
 */
export async function documentoPublicado(
  folio: string,
  tipo: Extract<TipoDocumento, 'version_publica' | 'oficio_publico'>,
): Promise<{ ruta: string; nombre: string } | null> {
  const filas = await sql<Array<{ ruta_local: string; nombre_original: string }>>`
    SELECT d.ruta_local, d.nombre_original
      FROM participacion_documentos d
      JOIN participations p ON p.id = d.participation_id
     WHERE p.folio = ${folio} AND d.tipo = ${tipo} AND d.publicado
  `
  return filas[0] ? { ruta: filas[0].ruta_local, nombre: filas[0].nombre_original } : null
}
