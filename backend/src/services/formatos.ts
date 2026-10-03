/**
 * Formatos de participación para llenar a mano.
 *
 * Generar un formato reserva un folio. El formato queda «Pendiente de
 * recepción» hasta que se registra la participación efectivamente recibida, con
 * ese mismo folio (ver `routes/participations.ts`); entonces `participation_id`
 * deja de ser nulo y el formato pasa a «Recibido».
 */
import { sql, type Db } from '../db/pool.ts'
import { nextFolio } from './folio.ts'

export interface Formato {
  id: string
  folio: string
  created_at: string
  /** Quién lo generó; vacío si esa cuenta ya no existe. */
  generado_por: string
  participation_id: string | null
  recibido_en: string | null
  pendiente: boolean
}

interface Fila {
  id: string
  folio: string
  created_at: Date
  generado_por: string | null
  participation_id: string | null
  recibido_en: Date | null
}

/** Las fechas viajan en ISO 8601, como en el resto de la API. */
const aFormato = (f: Fila): Formato => ({
  id: f.id,
  folio: f.folio,
  created_at: new Date(f.created_at).toISOString(),
  generado_por: f.generado_por ?? '',
  participation_id: f.participation_id,
  recibido_en: f.recibido_en ? new Date(f.recibido_en).toISOString() : null,
  pendiente: f.participation_id === null,
})

const SELECT = `SELECT f.id::text AS id, f.folio, f.created_at, u.name AS generado_por,
       f.participation_id::text AS participation_id, f.recibido_en
  FROM formatos_presenciales f LEFT JOIN users u ON u.id = f.generado_por`

/** Reserva el siguiente folio para un formato nuevo. */
export async function crearFormato(generadoPor: string): Promise<Formato> {
  return sql.begin(async (tx) => {
    const folio = await nextFolio(tx)
    const filas = await tx<{ id: string }[]>`
      INSERT INTO formatos_presenciales (folio, generado_por) VALUES (${folio}, ${generadoPor})
      RETURNING id::text AS id
    `
    return (await obtenerFormato(filas[0].id, tx))!
  })
}

export async function obtenerFormato(id: string, db: Db = sql): Promise<Formato | null> {
  const filas = await db.unsafe<Fila[]>(`${SELECT} WHERE f.id = $1`, [id])
  return filas[0] ? aFormato(filas[0]) : null
}

/** Los formatos, los más recientes primero; con `soloPendientes`, solo los que no han regresado. */
export async function listarFormatos(soloPendientes: boolean): Promise<Formato[]> {
  const filas = await sql.unsafe<Fila[]>(
    `${SELECT} ${soloPendientes ? 'WHERE f.participation_id IS NULL' : ''} ORDER BY f.created_at DESC LIMIT 500`,
  )
  return filas.map(aFormato)
}

/**
 * Marca el formato como recibido, ligado a su participación. Devuelve false si ya
 * estaba recibido (o no existe): así dos capturas simultáneas del mismo formato no
 * pueden crear dos participaciones con el mismo folio.
 */
export async function marcarFormatoRecibido(
  db: Db,
  formatoId: string,
  participationId: string,
): Promise<boolean> {
  const filas = await db<{ id: string }[]>`
    UPDATE formatos_presenciales
       SET participation_id = ${participationId}, recibido_en = now()
     WHERE id = ${formatoId} AND participation_id IS NULL
     RETURNING id::text AS id
  `
  return filas.length > 0
}
