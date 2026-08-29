import { sql } from '../db/pool.ts'

/**
 * Sesiones del Programa de Ordenamiento Ecológico (POEL).
 */
export interface PoelSesion {
  id: string
  categoria: string
  orden: number
  titulo: string
  descripcion: string
  fecha: string | null
  ubicacion: string
  activo: boolean
}

export async function listPoel(): Promise<PoelSesion[]> {
  return sql<PoelSesion[]>`
    SELECT id::text AS id, categoria, orden, titulo, descripcion,
           fecha::text AS fecha, ubicacion, activo
    FROM poel_sesiones
    ORDER BY orden ASC, id ASC
  `
}

export async function createPoelSesion(input: {
  categoria: string
  orden: number
  titulo: string
  descripcion?: string
  fecha?: string | null
  ubicacion?: string
}): Promise<PoelSesion> {
  const rows = await sql<PoelSesion[]>`
    INSERT INTO poel_sesiones (categoria, orden, titulo, descripcion, fecha, ubicacion)
    VALUES (${input.categoria}, ${input.orden}, ${input.titulo}, ${input.descripcion ?? ''}, ${input.fecha ?? null}, ${input.ubicacion ?? ''})
    RETURNING id::text AS id, categoria, orden, titulo, descripcion, fecha::text AS fecha, ubicacion, activo
  `
  return rows[0]
}

export async function deletePoelSesion(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM poel_sesiones WHERE id = ${id} RETURNING id`
  return rows.length > 0
}
