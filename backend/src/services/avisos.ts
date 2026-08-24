import { sql } from '../db/pool.ts'

/**
 * Avisos de la bitácora.
 */
export interface Aviso {
  id: number
  titulo: string
  descripcion: string
  activo: boolean
}

export async function listAvisos(): Promise<Aviso[]> {
  return sql<Aviso[]>`
    SELECT id, titulo, descripcion, activo FROM avisos ORDER BY id DESC
  `
}

export async function createAviso(input: { titulo: string; descripcion?: string; creadoPor?: number }): Promise<Aviso> {
  const rows = await sql<Aviso[]>`
    INSERT INTO avisos (titulo, descripcion, creado_por)
    VALUES (${input.titulo}, ${input.descripcion ?? ''}, ${input.creadoPor ?? null})
    RETURNING id, titulo, descripcion, activo
  `
  return rows[0]
}

export async function deleteAviso(id: number): Promise<boolean> {
  const rows = await sql`DELETE FROM avisos WHERE id = ${id} RETURNING id`
  return rows.length > 0
}
