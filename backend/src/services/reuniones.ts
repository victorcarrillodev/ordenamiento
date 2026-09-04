import { sql } from '../db/pool.ts'

/**
 * Servicio de reuniones (bitácora administrativa).
 * Política vs IO: aquí vive el CRUD; la serialización a Excel vive en
 * `services/export.ts`.
 */

export interface Reunion {
  id: string
  titulo: string
  fecha: string
  hora_inicio: string
  hora_fin: string
}

export async function listReuniones(): Promise<Reunion[]> {
  return sql<Reunion[]>`
    SELECT id::text AS id, titulo, fecha::text AS fecha, hora_inicio, hora_fin
    FROM reuniones
    ORDER BY fecha DESC, id DESC
  `
}

export async function createReunion(input: {
  titulo: string
  fecha: string
  horaInicio?: string
  horaFin?: string
  creadoPor?: string
}): Promise<Reunion> {
  const rows = await sql<Reunion[]>`
    INSERT INTO reuniones (titulo, fecha, hora_inicio, hora_fin, creado_por)
    VALUES (${input.titulo}, ${input.fecha}, ${input.horaInicio ?? ''}, ${input.horaFin ?? ''}, ${input.creadoPor ?? null})
    RETURNING id::text AS id, titulo, fecha::text AS fecha, hora_inicio, hora_fin
  `
  return rows[0]
}

export async function deleteReunion(id: string): Promise<boolean> {
  const rows = await sql`
    DELETE FROM reuniones WHERE id = ${id} RETURNING id
  `
  return rows.length > 0
}

export async function getProximaReunion(): Promise<Reunion | null> {
  const rows = await sql<Reunion[]>`
    SELECT id::text AS id, titulo, fecha::text AS fecha, hora_inicio, hora_fin
    FROM reuniones WHERE fecha >= CURRENT_DATE ORDER BY fecha ASC, id ASC LIMIT 1
  `
  return rows[0] ?? null
}

/**
 * Reuniones futuras (fecha >= hoy) para el calendario público, en orden
 * cronológico. Mismo shape que `listReuniones`: no hay campos sensibles.
 */
export async function listReunionesActivas(): Promise<Reunion[]> {
  return sql<Reunion[]>`
    SELECT id::text AS id, titulo, fecha::text AS fecha, hora_inicio, hora_fin
    FROM reuniones
    WHERE fecha >= CURRENT_DATE
    ORDER BY fecha ASC, id ASC
  `
}
