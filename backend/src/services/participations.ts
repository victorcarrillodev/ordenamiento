import { sql, type Db } from '../db/pool.ts'

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
  codigo_postal?: string
  direccion_origen?: string
  /** Domicilio de quien participa, distinto del lugar del aporte que describen calle/colonia/municipio. */
  domicilio?: string
  municipio_participante?: string
  consentimiento_en?: Date | string | null
  consentimiento_version?: string
  institucion?: string
  ocupacion?: string
  latitud?: string
  longitud?: string
  observacion?: string
  estado?: Estado
  fuente?: string
  genero?: string
  tematica?: string
  creadoPor?: number
}

export interface CreateResult {
  participationId: number
  folio: string
}

export async function createParticipation(
  dbOrInput: Db | ParticipationInput,
  inputOrFolio: ParticipationInput | string,
  maybeFolio?: string,
): Promise<CreateResult> {
  const isDb = typeof dbOrInput === 'function' && 'unsafe' in dbOrInput
  const db: Db = isDb ? (dbOrInput as Db) : sql
  const input = isDb ? (inputOrFolio as ParticipationInput) : (dbOrInput as ParticipationInput)
  const folio = isDb ? (maybeFolio as string) : (inputOrFolio as string)

  const rows = await db<{ id: number }[]>`--sql
    INSERT INTO participations (
      folio, origen, nombre, correo, calle, numero, colonia, municipio,
      codigo_postal, direccion_origen, domicilio, municipio_participante,
      consentimiento_en, consentimiento_version,
      institucion, ocupacion, latitud, longitud, observacion, estado,
      fuente, genero, tematica, creado_por
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
      ${input.codigo_postal ?? ''},
      ${input.direccion_origen ?? ''},
      ${input.domicilio ?? ''},
      ${input.municipio_participante ?? ''},
      ${input.consentimiento_en ?? null},
      ${input.consentimiento_version ?? ''},
      ${input.institucion ?? ''},
      ${input.ocupacion ?? ''},
      ${input.latitud ?? ''},
      ${input.longitud ?? ''},
      ${input.observacion ?? ''},
      ${input.estado ?? 'En proceso'},
      ${input.fuente ?? ''},
      ${input.genero ?? ''},
      ${input.tematica ?? ''},
      ${input.creadoPor ?? null}
    )
    RETURNING id
  `
  return { participationId: rows[0].id, folio }
}

export interface ListFilters {
  origen?: Origen
  estado?: Estado
  etapa?: Etapa
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
  // La etapa es derivada, así que se traduce a condiciones. El valor NUNCA se
  // interpola: solo se elige un literal fijo de este switch.
  if (filters.etapa === 'En proceso') {
    where.push("p.estado = 'En proceso' AND p.notificado_en IS NULL")
  } else if (filters.etapa === 'Dictaminada') {
    where.push("p.estado <> 'En proceso' AND p.notificado_en IS NULL")
  } else if (filters.etapa === 'Notificada') {
    where.push('p.notificado_en IS NOT NULL')
  }
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
        p.observacion, p.estado, p.created_at AS fecha,
        p.resolucion_en, p.notificado_en, p.notificado_a,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'nombre_original', a.nombre_original,
              'mime', a.mime,
              'size', a.size
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'::json
        ) AS adjuntos
      FROM participations p
      LEFT JOIN attachments a ON a.participation_id = p.id
      ${whereSql}
      GROUP BY p.id
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

/**
 * Etapa del trámite tal como la ve el ciudadano y el panel. Es DERIVADA, no
 * una columna: `estado` dice el sentido del dictamen y `notificado_en` dice si
 * ya se le avisó. Se deriva en vez de guardarse para que no puedan quedar en
 * desacuerdo (una participación "Notificada" sin correo enviado, por ejemplo).
 */
export type Etapa = 'En proceso' | 'Dictaminada' | 'Notificada'

export function etapaDe(p: { estado?: unknown; notificado_en?: unknown }): Etapa {
  if (p.notificado_en) return 'Notificada'
  if (p.estado === 'Procedente' || p.estado === 'No procedente') return 'Dictaminada'
  return 'En proceso'
}

export interface ResolucionInput {
  estado: Estado
  motivo: string
  direccion: string
  cita: string
  resueltoPor?: number
}

/**
 * Registra el dictamen del admin. No envía nada: notificar es un paso aparte
 * (`marcarNotificada`) para que un fallo de SMTP no deje el dictamen perdido.
 */
export async function registrarResolucion(id: number, input: ResolucionInput): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`--sql
    UPDATE participations SET
      estado               = ${input.estado},
      resolucion_motivo    = ${input.motivo},
      resolucion_direccion = ${input.direccion},
      resolucion_cita      = ${input.cita},
      resolucion_en        = now(),
      resuelto_por         = ${input.resueltoPor ?? null},
      updated_at           = now()
    WHERE id = ${id}
    RETURNING id
  `
  return rows.length > 0
}

/** Sella la participación como notificada al ciudadano. */
export async function marcarNotificada(id: number, para: string): Promise<void> {
  await sql`--sql
    UPDATE participations
    SET notificado_en = now(), notificado_a = ${para}, updated_at = now()
    WHERE id = ${id}
  `
}

export async function deleteParticipation(id: number): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`--sql
    DELETE FROM participations WHERE id = ${id} RETURNING id
  `
  return rows.length > 0
}
