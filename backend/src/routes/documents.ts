import { sql } from '../db/pool.ts'

export async function listDocuments(): Promise<
  Array<{
    id: number
    folio: string
    nombre: string
    descripcion: string
    estado: string
    esFisico: boolean
    fecha: string
  }>
> {
  const rows = await sql<
    Array<{
      id: number
      folio: string
      nombre: string
      descripcion: string
      estado: string
      es_fisico: boolean
      created_at: Date
    }>
  >`--sql
    SELECT id, folio, nombre, descripcion, estado, es_fisico, created_at
    FROM documents
    ORDER BY created_at DESC
  `

  return rows.map((r) => ({
    id: r.id,
    folio: r.folio,
    nombre: r.nombre,
    descripcion: r.descripcion,
    estado: r.estado,
    esFisico: r.es_fisico,
    fecha: r.created_at?.toISOString?.() ?? String(r.created_at),
  }))
}
