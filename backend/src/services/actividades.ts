import { rm } from 'node:fs/promises'

import { sql, type Db } from '../db/pool.ts'

export type EstadoActividad = 'proxima' | 'realizada' | 'cancelada'

const ESTADOS_VALIDOS: EstadoActividad[] = ['proxima', 'realizada', 'cancelada']

function isEstadoActividad(v: string): v is EstadoActividad {
  return (ESTADOS_VALIDOS as string[]).includes(v)
}

/** Normaliza query param estado -> valor de BD. Default 'proxima'. */
export function normalizarEstadoFiltro(raw: string | null | undefined): EstadoActividad {
  if (!raw) return 'proxima'
  const v = raw.trim().toLowerCase()
  if (v === 'proximas' || v === 'proxima') return 'proxima'
  if (v === 'realizadas' || v === 'realizada') return 'realizada'
  if (v === 'canceladas' || v === 'cancelada') return 'cancelada'
  // fallback: si ya es valido en singular
  if (isEstadoActividad(v)) return v as EstadoActividad
  throw Object.assign(new Error(`estado inválido: ${raw}`), { status: 400 })
}

export interface Actividad {
  id: string
  titulo: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  lugar: string
  descripcion: string
  estado: string
  resultados: string
  creado_por: string | null
  created_at: string
  updated_at: string
  fotos: Array<{ id: string; nombre_original: string; mime: string }>
  documentos: Array<{ id: string; titulo: string; tipo: string }>
}

export async function listActividades(filters: { estado?: string | null }): Promise<Actividad[]> {
  const estado = normalizarEstadoFiltro(filters.estado ?? null)
  const rows = await sql<
    Array<{
      id: string
      titulo: string
      fecha: string
      hora_inicio: string
      hora_fin: string
      lugar: string
      descripcion: string
      estado: string
      resultados: string
      creado_por: string | null
      created_at: string
      updated_at: string
    }>
  >`--sql
    SELECT id::text AS id, titulo, fecha::text AS fecha, hora_inicio, hora_fin, lugar, descripcion, estado, resultados,
           creado_por::text AS creado_por, created_at::text, updated_at::text
    FROM actividades WHERE estado = ${estado} ORDER BY fecha DESC, created_at DESC
  `
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const fotos = await sql<
    Array<{ actividad_id: string; id: string; nombre_original: string; mime: string }>
  >`--sql
    SELECT actividad_id::text AS actividad_id, id::text AS id, nombre_original, mime
    FROM actividad_fotos WHERE actividad_id IN ${sql(ids)} ORDER BY created_at
  `
  const docs = await sql<
    Array<{ actividad_id: string; id: string; titulo: string; tipo: string }>
  >`--sql
    SELECT ad.actividad_id::text AS actividad_id, d.id::text AS id, d.titulo, d.tipo
    FROM actividad_documentos ad JOIN documentos d ON d.id = ad.documento_id
    WHERE ad.actividad_id IN ${sql(ids)}
  `
  const fotosByAct = new Map<string, Array<{ actividad_id: string; id: string; nombre_original: string; mime: string }>>()
  for (const f of fotos) {
    const arr = fotosByAct.get(f.actividad_id) ?? []
    arr.push(f as { actividad_id: string; id: string; nombre_original: string; mime: string })
    fotosByAct.set(f.actividad_id, arr)
  }
  const docsByAct = new Map<string, Array<{ actividad_id: string; id: string; titulo: string; tipo: string }>>()
  for (const d of docs) {
    const arr = docsByAct.get(d.actividad_id) ?? []
    arr.push(d as { actividad_id: string; id: string; titulo: string; tipo: string })
    docsByAct.set(d.actividad_id, arr)
  }
  return rows.map((r) => ({
    ...r,
    fotos: (fotosByAct.get(r.id) ?? []).map((f) => ({ id: f.id, nombre_original: f.nombre_original, mime: f.mime })),
    documentos: (docsByAct.get(r.id) ?? []).map((d) => ({ id: d.id, titulo: d.titulo, tipo: d.tipo })),
  }))
}

export async function getActividad(id: string): Promise<Actividad | null> {
  const rows = await sql<
    Array<{
      id: string
      titulo: string
      fecha: string
      hora_inicio: string
      hora_fin: string
      lugar: string
      descripcion: string
      estado: string
      resultados: string
      creado_por: string | null
      created_at: string
      updated_at: string
    }>
  >`--sql
    SELECT id::text AS id, titulo, fecha::text AS fecha, hora_inicio, hora_fin, lugar, descripcion, estado, resultados,
           creado_por::text AS creado_por, created_at::text, updated_at::text
    FROM actividades WHERE id = ${id}
  `
  if (rows.length === 0) return null
  const r = rows[0]
  const fotos = await sql<
    Array<{ id: string; nombre_original: string; mime: string }>
  >`SELECT id::text AS id, nombre_original, mime FROM actividad_fotos WHERE actividad_id = ${id} ORDER BY created_at`
  const docs = await sql<
    Array<{ id: string; titulo: string; tipo: string }>
  >`SELECT d.id::text AS id, d.titulo, d.tipo FROM actividad_documentos ad JOIN documentos d ON d.id = ad.documento_id WHERE ad.actividad_id = ${id}`
  return { ...r, fotos, documentos: docs }
}

export async function createActividad(
  db: Db,
  input: {
    titulo: string
    fecha: string
    hora_inicio?: string
    hora_fin?: string
    lugar?: string
    descripcion?: string
    estado?: string
    resultados?: string
    creadoPor?: string
  },
  fotos: Array<{ nombreOriginal: string; mime: string; size: number; rutaLocal: string }>,
  documentoIds: string[],
): Promise<{ id: string }> {
  if (input.estado && !isEstadoActividad(input.estado)) {
    throw Object.assign(new Error(`estado inválido: ${input.estado}`), { status: 400 })
  }
  const rows = await db<{ id: string }[]>`--sql
    INSERT INTO actividades (titulo, fecha, hora_inicio, hora_fin, lugar, descripcion, estado, resultados, creado_por)
    VALUES (${input.titulo}, ${input.fecha}, ${input.hora_inicio ?? ''}, ${input.hora_fin ?? ''},
            ${input.lugar ?? ''}, ${input.descripcion ?? ''}, ${input.estado ?? 'proxima'}, ${input.resultados ?? ''},
            ${input.creadoPor ?? null})
    RETURNING id::text AS id
  `
  const actividadId = rows[0].id
  for (const f of fotos) {
    await db`INSERT INTO actividad_fotos (actividad_id, nombre_original, mime, size, ruta_local)
             VALUES (${actividadId}, ${f.nombreOriginal}, ${f.mime}, ${f.size}, ${f.rutaLocal})`
  }
  for (const docId of documentoIds) {
    await db`INSERT INTO actividad_documentos (actividad_id, documento_id) VALUES (${actividadId}, ${docId}) ON CONFLICT DO NOTHING`
  }
  return { id: actividadId }
}

export async function updateActividad(
  id: string,
  input: {
    titulo?: string
    fecha?: string
    hora_inicio?: string
    hora_fin?: string
    lugar?: string
    descripcion?: string
    estado?: string
    resultados?: string
  },
  fotos?: Array<{ nombreOriginal: string; mime: string; size: number; rutaLocal: string }>,
  documentoIds?: string[],
): Promise<boolean> {
  if (input.estado && !isEstadoActividad(input.estado)) {
    throw Object.assign(new Error(`estado inválido: ${input.estado}`), { status: 400 })
  }
  const fields: string[] = []
  const params: unknown[] = []
  const push = (col: string, val: unknown) => {
    params.push(val)
    fields.push(`${col} = $${params.length}`)
  }
  if (input.titulo !== undefined) push('titulo', input.titulo)
  if (input.fecha !== undefined) push('fecha', input.fecha)
  if (input.hora_inicio !== undefined) push('hora_inicio', input.hora_inicio)
  if (input.hora_fin !== undefined) push('hora_fin', input.hora_fin)
  if (input.lugar !== undefined) push('lugar', input.lugar)
  if (input.descripcion !== undefined) push('descripcion', input.descripcion)
  if (input.estado !== undefined) push('estado', input.estado)
  if (input.resultados !== undefined) push('resultados', input.resultados)
  if (fields.length > 0) {
    fields.push('updated_at = now()')
    params.push(id)
    const rows = await sql.unsafe<{ id: string }[]>(
      `UPDATE actividades SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id`,
      params as string[],
    )
    if (rows.length === 0) return false
  } else {
    const exists = await sql<{ id: string }[]>`SELECT id FROM actividades WHERE id = ${id}`
    if (exists.length === 0) return false
  }
  if (fotos && fotos.length > 0) {
    // Reemplazo (no acumulación): las fotos nuevas sustituyen a las previas.
    const previas = await sql<{ ruta_local: string }[]>`
      SELECT ruta_local FROM actividad_fotos WHERE actividad_id = ${id}`
    await sql`DELETE FROM actividad_fotos WHERE actividad_id = ${id}`
    for (const f of fotos) {
      await sql`INSERT INTO actividad_fotos (actividad_id, nombre_original, mime, size, ruta_local)
               VALUES (${id}, ${f.nombreOriginal}, ${f.mime}, ${f.size}, ${f.rutaLocal})`
    }
    await Promise.allSettled(previas.map((f) => rm(f.ruta_local, { force: true })))
  }
  if (documentoIds !== undefined) {
    await sql`DELETE FROM actividad_documentos WHERE actividad_id = ${id}`
    for (const docId of documentoIds) {
      await sql`INSERT INTO actividad_documentos (actividad_id, documento_id) VALUES (${id}, ${docId}) ON CONFLICT DO NOTHING`
    }
  }
  return true
}

export async function deleteActividad(id: string): Promise<boolean> {
  const fotos = await sql<{ ruta_local: string }[]>`SELECT ruta_local FROM actividad_fotos WHERE actividad_id = ${id}`
  const deleted = await sql<{ id: string }[]>`DELETE FROM actividades WHERE id = ${id} RETURNING id`
  if (deleted.length === 0) return false
  await Promise.allSettled(fotos.map((f) => rm(f.ruta_local, { force: true })))
  return true
}
