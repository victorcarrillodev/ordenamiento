/**
 * Lo que el acuse y el correo de confirmación necesitan saber de una
 * participación: el acuse en PDF usa un subconjunto (el modelo aprobado) y el
 * correo suma los datos complementarios, que se conservan en el sistema aunque
 * no aparezcan en el modelo.
 */
import { sql } from '../db/pool.ts'
import type { DatosAcuse } from './acuse.ts'

export interface DatosParticipacion extends DatosAcuse {
  id: string
  estado: string
  fuente: string
  fuente_otra: string
  genero: string
  domicilio: string
  municipio_participante: string
  ocupacion: string
}

interface Fila {
  id: string
  folio: string
  origen: string
  nombre: string
  correo: string
  created_at: Date
  alcance_ubicacion: string
  calle: string
  colonia: string
  codigo_postal: string
  institucion: string
  tematica: string
  tematica_otra: string
  observacion: string
  estado: string
  fuente: string
  fuente_otra: string
  genero: string
  domicilio: string
  municipio_participante: string
  ocupacion: string
}

const COLUMNAS = `id::text AS id, folio, origen, nombre, correo, created_at, alcance_ubicacion,
  calle, colonia, codigo_postal, institucion, tematica, tematica_otra, observacion, estado,
  fuente, fuente_otra, genero, domicilio, municipio_participante, ocupacion`

/** Busca por `id` o por `folio` (los dos son únicos) y trae los nombres de sus archivos. */
export async function datosDeParticipacion(
  clave: { id: string } | { folio: string },
): Promise<DatosParticipacion | null> {
  const [donde, valor] = 'id' in clave ? ['id = $1', clave.id] : ['folio = $1', clave.folio]
  const filas = await sql.unsafe<Fila[]>(`SELECT ${COLUMNAS} FROM participations WHERE ${donde}`, [
    valor,
  ])
  const p = filas[0]
  if (!p) return null

  const archivos = await sql<Array<{ nombre_original: string }>>`
    SELECT nombre_original FROM attachments WHERE participation_id = ${p.id} ORDER BY created_at
  `

  return {
    id: p.id,
    folio: p.folio,
    origen: p.origen,
    nombre: p.nombre,
    correo: p.correo,
    fechaRecepcion: new Date(p.created_at),
    alcance_ubicacion: p.alcance_ubicacion,
    calle: p.calle,
    colonia: p.colonia,
    codigo_postal: p.codigo_postal,
    institucion: p.institucion,
    tematica: p.tematica,
    tematica_otra: p.tematica_otra,
    observacion: p.observacion,
    adjuntos: archivos.map((a) => a.nombre_original),
    estado: p.estado,
    fuente: p.fuente,
    fuente_otra: p.fuente_otra,
    genero: p.genero,
    domicilio: p.domicilio,
    municipio_participante: p.municipio_participante,
    ocupacion: p.ocupacion,
  }
}
