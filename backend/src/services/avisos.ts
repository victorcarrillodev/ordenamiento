import { sql } from '../db/pool.ts'

/**
 * Avisos de la bitácora.
 */
export interface Aviso {
  id: string
  titulo: string
  descripcion: string
  activo: boolean
  /** Fecha de publicación (ISO). El calendario la usa para ubicar el aviso. */
  fecha?: string
}

export async function listAvisos(): Promise<Aviso[]> {
  // `created_at` se expone como `fecha`: sin ella el calendario no sabía en qué
  // día poner cada aviso y los repartía por su posición en la lista, es decir,
  // en días inventados que cambiaban al publicar cualquier otro aviso.
  return sql<Aviso[]>`
    SELECT id::text AS id, titulo, descripcion, activo, created_at AS fecha
    FROM avisos
    ORDER BY created_at DESC, id DESC
  `
}

export async function createAviso(input: {
  titulo: string
  descripcion?: string
  creadoPor?: string
}): Promise<Aviso> {
  const rows = await sql<Aviso[]>`
    INSERT INTO avisos (titulo, descripcion, creado_por)
    VALUES (${input.titulo}, ${input.descripcion ?? ''}, ${input.creadoPor ?? null})
    RETURNING id::text AS id, titulo, descripcion, activo
  `
  return rows[0]
}

export async function deleteAviso(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM avisos WHERE id = ${id} RETURNING id`
  return rows.length > 0
}
