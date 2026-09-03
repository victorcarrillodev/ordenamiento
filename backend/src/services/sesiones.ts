import { sql } from '../db/pool.ts'

/**
 * Bitácora de sesiones: quién entró, cuándo, desde dónde y cuánto tiempo
 * estuvo dentro. La consulta el administrador desde el panel.
 *
 * No se guarda el token, solo su marca de emisión (`issued_at`), que ya viaja
 * dentro de la cookie firmada y basta para distinguir una sesión de otra sin
 * almacenar nada que sirva para suplantarla.
 */

/**
 * Cada cuánto se refresca `last_seen_at`. Sin esta ventana habría un UPDATE
 * por petición: el panel dispara varias por pantalla y la bitácora acabaría
 * costando más que lo que registra. Un minuto de resolución sobra para medir
 * tiempo de conexión.
 */
const LATIDO_MS = 60_000

/** Último refresco escrito por sesión, para no repetir el UPDATE. */
const ultimoLatido = new Map<string, number>()

function clave(userId: string, issuedAt: number): string {
  return `${userId}.${issuedAt}`
}

export interface DatosCliente {
  ip: string
  userAgent: string
}

/**
 * Abre (o reabre) la fila de la sesión. Es idempotente: si el usuario vuelve a
 * autenticarse con la misma cookie, se actualiza en vez de duplicar.
 */
export async function registrarInicioSesion(
  userId: string,
  issuedAt: number,
  cliente: DatosCliente,
): Promise<void> {
  const inicio = new Date(issuedAt)
  await sql`--sql
    INSERT INTO user_sessions (user_id, issued_at, started_at, last_seen_at, ip, user_agent)
    VALUES (${userId}, ${inicio}, ${inicio}, now(), ${cliente.ip}, ${cliente.userAgent})
    ON CONFLICT (user_id, issued_at) DO UPDATE
      SET last_seen_at = now(),
          ended_at = NULL,
          ip = EXCLUDED.ip,
          user_agent = EXCLUDED.user_agent
  `
  ultimoLatido.set(clave(userId, issuedAt), Date.now())
}

/**
 * Marca actividad. Solo escribe si pasó la ventana del latido, así una ráfaga
 * de peticiones del panel no se traduce en una ráfaga de UPDATEs.
 */
export async function registrarActividad(userId: string, issuedAt: number): Promise<void> {
  const k = clave(userId, issuedAt)
  const previo = ultimoLatido.get(k) ?? 0
  const ahora = Date.now()
  if (ahora - previo < LATIDO_MS) return
  ultimoLatido.set(k, ahora)

  await sql`--sql
    UPDATE user_sessions SET last_seen_at = now()
    WHERE user_id = ${userId} AND issued_at = ${new Date(issuedAt)} AND ended_at IS NULL
  `
}

/** Cierra la sesión al pulsar «Cerrar sesión». */
export async function registrarCierreSesion(userId: string, issuedAt: number): Promise<void> {
  ultimoLatido.delete(clave(userId, issuedAt))
  await sql`--sql
    UPDATE user_sessions SET ended_at = now(), last_seen_at = now()
    WHERE user_id = ${userId} AND issued_at = ${new Date(issuedAt)} AND ended_at IS NULL
  `
}

export interface SesionRegistrada {
  id: string
  user_id: string
  nombre: string
  email: string
  rol: string
  inicio: string
  fin: string | null
  ultima_actividad: string
  /** Segundos entre el inicio y el cierre (o la última señal de vida). */
  duracion_segundos: number
  activa: boolean
  ip: string
  user_agent: string
}

export interface ResumenSesiones {
  /** Usuarios distintos con al menos una sesión en el periodo listado. */
  usuarios: number
  sesiones: number
  activas: number
  segundos_totales: number
}

/**
 * Página de la bitácora, de la más reciente a la más antigua.
 * `usuarioId` acota a una sola cuenta; sin él se listan todas.
 */
export async function listarSesiones(opciones: {
  usuarioId?: string
  limit: number
  page: number
}): Promise<{ items: SesionRegistrada[]; total: number }> {
  const limit = Math.min(Math.max(1, opciones.limit), 200)
  const page = Math.max(1, opciones.page)
  const offset = (page - 1) * limit
  const filtro = opciones.usuarioId ?? null

  const items = await sql<SesionRegistrada[]>`--sql
    SELECT s.id::text                AS id,
           s.user_id::text           AS user_id,
           u.name                    AS nombre,
           u.email                   AS email,
           u.role                    AS rol,
           s.started_at::text        AS inicio,
           s.ended_at::text          AS fin,
           s.last_seen_at::text      AS ultima_actividad,
           GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(s.ended_at, s.last_seen_at) - s.started_at)))::int
                                     AS duracion_segundos,
           (s.ended_at IS NULL)      AS activa,
           s.ip                      AS ip,
           s.user_agent              AS user_agent
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE ${filtro}::uuid IS NULL OR s.user_id = ${filtro}::uuid
    ORDER BY s.started_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const totales = await sql<{ total: string }[]>`--sql
    SELECT COUNT(*)::text AS total FROM user_sessions s
    WHERE ${filtro}::uuid IS NULL OR s.user_id = ${filtro}::uuid
  `

  return { items, total: Number(totales[0]?.total ?? 0) }
}

/** Totales del periodo completo, para las tarjetas de resumen del panel. */
export async function resumenSesiones(usuarioId?: string): Promise<ResumenSesiones> {
  const filtro = usuarioId ?? null
  const filas = await sql<
    Array<{ usuarios: string; sesiones: string; activas: string; segundos: string }>
  >`--sql
    SELECT COUNT(DISTINCT s.user_id)::text AS usuarios,
           COUNT(*)::text                  AS sesiones,
           COUNT(*) FILTER (WHERE s.ended_at IS NULL)::text AS activas,
           COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(s.ended_at, s.last_seen_at) - s.started_at)))), 0)::text
                                           AS segundos
    FROM user_sessions s
    WHERE ${filtro}::uuid IS NULL OR s.user_id = ${filtro}::uuid
  `
  const f = filas[0]
  return {
    usuarios: Number(f?.usuarios ?? 0),
    sesiones: Number(f?.sesiones ?? 0),
    activas: Number(f?.activas ?? 0),
    segundos_totales: Number(f?.segundos ?? 0),
  }
}

/** Solo para pruebas: la ventana de latido es estado en memoria del proceso. */
export function _limpiarLatidos(): void {
  ultimoLatido.clear()
}
