import { rm } from 'node:fs/promises'

import { sql, type Db } from '../db/pool.ts'

export const TIPOS_DOCUMENTO = [
  'Convenios y anexos',
  'Acuerdos',
  'Actas y minutas',
  'Convocatorias',
  'Documentos técnicos',
  'Cartografía',
  'Avances y resultados',
  'Programa',
] as const
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

export const ETAPAS = ['En proceso', 'Dictaminada', 'Notificada'] as const
export type EtapaDoc = (typeof ETAPAS)[number]

export function isTipoDocumento(v: string): v is TipoDocumento {
  return (TIPOS_DOCUMENTO as readonly string[]).includes(v)
}
export function isEtapaDoc(v: string): v is EtapaDoc {
  return (ETAPAS as readonly string[]).includes(v)
}

export interface Documento {
  id: string
  titulo: string
  tipo: string
  etapa: string
  fecha: string | null
  descripcion: string
  nombre_original: string
  mime: string
  size: number
  ruta_local: string
  creado_por: string | null
  created_at: string
  updated_at: string
}

export async function listDocumentos(filters: { tipo?: string; etapa?: string }): Promise<Documento[]> {
  if (filters.tipo && !isTipoDocumento(filters.tipo)) {
    throw Object.assign(new Error(`tipo inválido: ${filters.tipo}`), { status: 400 })
  }
  if (filters.etapa && !isEtapaDoc(filters.etapa)) {
    throw Object.assign(new Error(`etapa inválida: ${filters.etapa}`), { status: 400 })
  }

  const where: string[] = []
  const params: unknown[] = []
  if (filters.tipo) {
    params.push(filters.tipo)
    where.push(`tipo = $${params.length}`)
  }
  if (filters.etapa) {
    params.push(filters.etapa)
    where.push(`etapa = $${params.length}`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return sql.unsafe<Documento[]>(
    `SELECT id::text AS id, titulo, tipo, etapa, fecha::text AS fecha, descripcion,
            nombre_original, mime, size, ruta_local,
            creado_por::text AS creado_por, created_at::text, updated_at::text
     FROM documentos ${whereSql} ORDER BY fecha DESC NULLS LAST, created_at DESC`,
    params as string[],
  )
}

export async function getDocumento(id: string): Promise<Documento | null> {
  const rows = await sql.unsafe<Documento[]>(
    `SELECT id::text AS id, titulo, tipo, etapa, fecha::text AS fecha, descripcion,
            nombre_original, mime, size, ruta_local,
            creado_por::text AS creado_por, created_at::text, updated_at::text
     FROM documentos WHERE id = $1`,
    [id],
  )
  return rows[0] ?? null
}

export async function createDocumento(
  db: Db,
  input: { titulo: string; tipo: string; etapa?: string; fecha?: string | null; descripcion?: string; creadoPor?: string },
  archivo: { nombreOriginal: string; mime: string; size: number; rutaLocal: string },
): Promise<{ id: string }> {
  if (!isTipoDocumento(input.tipo)) {
    throw Object.assign(new Error(`tipo inválido: ${input.tipo}`), { status: 400 })
  }
  if (input.etapa && !isEtapaDoc(input.etapa)) {
    throw Object.assign(new Error(`etapa inválida: ${input.etapa}`), { status: 400 })
  }
  const rows = await db<{ id: string }[]>`--sql
    INSERT INTO documentos (titulo, tipo, etapa, fecha, descripcion, nombre_original, mime, size, ruta_local, creado_por)
    VALUES (${input.titulo}, ${input.tipo}, ${input.etapa ?? 'En proceso'}, ${input.fecha ?? null}, ${input.descripcion ?? ''},
            ${archivo.nombreOriginal}, ${archivo.mime}, ${archivo.size}, ${archivo.rutaLocal}, ${input.creadoPor ?? null})
    RETURNING id::text AS id
  `
  return { id: rows[0].id }
}

export async function updateDocumento(
  id: string,
  input: { titulo?: string; tipo?: string; etapa?: string; fecha?: string | null; descripcion?: string },
  archivo?: { nombreOriginal: string; mime: string; size: number; rutaLocal: string },
): Promise<boolean> {
  if (input.tipo && !isTipoDocumento(input.tipo)) {
    throw Object.assign(new Error(`tipo inválido: ${input.tipo}`), { status: 400 })
  }
  if (input.etapa && !isEtapaDoc(input.etapa)) {
    throw Object.assign(new Error(`etapa inválida: ${input.etapa}`), { status: 400 })
  }
  // Si hay archivo nuevo, borrar el anterior del disco tras actualizar
  let prevRuta: string | null = null
  if (archivo) {
    const prev = await sql<{ ruta_local: string }[]>`SELECT ruta_local FROM documentos WHERE id = ${id}`
    if (prev.length === 0) return false
    prevRuta = prev[0].ruta_local
  }
  const fields: string[] = []
  const params: unknown[] = []
  const push = (col: string, val: unknown) => {
    params.push(val)
    fields.push(`${col} = $${params.length}`)
  }
  if (input.titulo !== undefined) push('titulo', input.titulo)
  if (input.tipo !== undefined) push('tipo', input.tipo)
  if (input.etapa !== undefined) push('etapa', input.etapa)
  if (input.fecha !== undefined) push('fecha', input.fecha)
  if (input.descripcion !== undefined) push('descripcion', input.descripcion)
  if (archivo) {
    push('nombre_original', archivo.nombreOriginal)
    push('mime', archivo.mime)
    push('size', archivo.size)
    push('ruta_local', archivo.rutaLocal)
  }
  if (fields.length === 0) return true
  params.push(id)
  fields.push('updated_at = now()')
  const rows = await sql.unsafe<{ id: string }[]>(
    `UPDATE documentos SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id`,
    params as string[],
  )
  if (rows.length === 0) return false
  if (prevRuta) await rm(prevRuta, { force: true })
  return true
}

export async function deleteDocumento(id: string): Promise<boolean> {
  const rows = await sql<{ ruta_local: string }[]>`SELECT ruta_local FROM documentos WHERE id = ${id}`
  if (rows.length === 0) return false
  const ruta = rows[0].ruta_local
  const deleted = await sql<{ id: string }[]>`DELETE FROM documentos WHERE id = ${id} RETURNING id`
  if (deleted.length === 0) return false
  await rm(ruta, { force: true }).catch(() => {})
  return true
}
