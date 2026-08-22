import { sql } from '../db/pool.ts'

export type Origen = 'digital' | 'fisica'
export type Estado = 'En proceso' | 'Procedente' | 'No procedente'

export interface ParticipationInput {
  folio?: string
  origen?: Origen
  nombre: string
  correo: string
  calle?: string
  numero?: string
  colonia?: string
  municipio?: string
  institucion?: string
  ocupacion?: string
  latitud?: string
  longitud?: string
  observacion?: string
  estado?: Estado
  creadoPor?: number
}

export interface CreateResult {
  participationId: number
  folio: string
}

export async function createParticipation(
  input: ParticipationInput,
  folio: string,
): Promise<CreateResult> {
  const rows = await sql<{ id: number }[]>`--sql
    INSERT INTO participations (
      folio, origen, nombre, correo, calle, numero, colonia, municipio,
      institucion, ocupacion, latitud, longitud, observacion, estado, creado_por
    )
    VALUES (
      ${folio},
      ${input.origen ?? 'digital'},
      ${input.nombre},
      ${input.correo},
      ${input.calle ?? ''},
      ${input.numero ?? ''},
      ${input.colonia ?? ''},
      ${input.municipio ?? ''},
      ${input.institucion ?? ''},
      ${input.ocupacion ?? ''},
      ${input.latitud ?? ''},
      ${input.longitud ?? ''},
      ${input.observacion ?? ''},
      ${input.estado ?? 'En proceso'},
      ${input.creadoPor ?? null}
    )
    RETURNING id
  `
  return { participationId: rows[0].id, folio }
}

export interface ListFilters {
  origen?: Origen
  estado?: Estado
  folio?: string
  nombre?: string
  colonia?: string
  desde?: string
  hasta?: string
  page: number
  limit: number
  q?: string
}

export interface ListResult {
  items: Array<Record<string, unknown>>
  total: number
  page: number
  limit: number
}

export async function listParticipations(filters: ListFilters): Promise<ListResult> {
  const where: string[] = []
  const params: Array<string | number> = []

  const push = (clause: string, value: string | number) => {
    params.push(value)
    where.push(clause.replace('?', `$${params.length}`))
  }

  if (filters.origen) push('p.origen = ?', filters.origen)
  if (filters.estado) push('p.estado = ?', filters.estado)
  if (filters.folio) push('p.folio ILIKE ?', `%${filters.folio}%`)
  if (filters.nombre) push('p.nombre ILIKE ?', `%${filters.nombre}%`)
  if (filters.colonia) push('p.colonia ILIKE ?', `%${filters.colonia}%`)
  if (filters.desde) push('p.created_at >= ?::timestamptz', filters.desde)
  if (filters.hasta) push('p.created_at <= ?::timestamptz', filters.hasta)

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countRows = await sql.unsafe<Array<{ n: string }>>(
    `SELECT count(*)::text AS n FROM participations p ${whereSql}`,
    params,
  )
  const total = Number(countRows[0].n)

  const offset = (filters.page - 1) * filters.limit
  const limitParams = [...params, filters.limit, offset]
  const limitSql = `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`

  const items = await sql.unsafe<Array<Record<string, unknown>>>(
    `SELECT
        p.id, p.folio, p.origen, p.nombre, p.correo, p.calle, p.numero,
        p.colonia, p.municipio, p.institucion, p.ocupacion, p.latitud, p.longitud,
        p.observacion, p.estado, p.created_at AS fecha
      FROM participations p
      ${whereSql}
      ORDER BY p.created_at DESC
      ${limitSql}`,
    limitParams,
  )

  return { items, total, page: filters.page, limit: filters.limit }
}

export async function getParticipation(id: number): Promise<Record<string, unknown> | null> {
  const rows = await sql.unsafe<Array<Record<string, unknown>>>(
    `--sql
      SELECT * FROM participations WHERE id = $1
    `,
    [id],
  )
  if (rows.length === 0) return null

  const attachments = await sql.unsafe<Array<Record<string, unknown>>>(
    `--sql
      SELECT id, nombre_original, mime, size FROM attachments WHERE participation_id = $1 ORDER BY created_at
    `,
    [id],
  )
  return { ...rows[0], attachments }
}

export async function updateEstado(id: number, estado: Estado): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`--sql
    UPDATE participations SET estado = ${estado}, updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `
  return rows.length > 0
}

export async function deleteParticipation(id: number): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`--sql
    DELETE FROM participations WHERE id = ${id} RETURNING id
  `
  return rows.length > 0
}
