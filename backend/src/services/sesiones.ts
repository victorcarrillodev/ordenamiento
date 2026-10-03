import { DURACION_SESION_S } from '../auth/sesion-duracion.ts'
import { sql } from '../db/pool.ts'

/**
 * Bitácora de sesiones: quién entró, cuándo, desde dónde y cuánto tiempo estuvo
 * dentro. La consulta el administrador desde el panel.
 *
 * No se guarda el token, solo su marca de emisión (`issued_at`), que ya viaja
 * dentro de la cookie firmada y basta para distinguir una sesión de otra sin
 * almacenar nada que sirva para suplantarla.
 *
 * ## Qué se mide
 *
 * El tiempo de una sesión NO es lo que pasa entre que se abre y se cierra. Una
 * sesión sigue abierta (la cookie dura 7 días) aunque la persona cierre la
 * pestaña o se vaya, y casi nadie pulsa «Cerrar sesión»: medir así daba horas de
 * «conexión» a quien estuvo cinco minutos y dejaba «en curso», para siempre, las
 * sesiones abandonadas.
 *
 * Lo que se mide es la presencia. Mientras una pestaña del panel está a la vista
 * y la persona hace algo, el navegador avisa cada ~30 s (`public/presencia.js`,
 * `POST /api/sessions/ping`). El servidor suma el tiempo entre avisos seguidos
 * con SU reloj, y solo si no se separan más de `HUECO_MAXIMO_S`: un hueco mayor
 * es una ausencia (pestaña oculta, persona fuera, computadora dormida) y no se
 * cuenta. El navegador no manda duraciones, solo «sigo aquí»: no puede inflar el
 * tiempo más allá de lo que de verdad pasó.
 *
 * Por eso el estado no se guarda: se calcula al consultar con `ESTADO_SQL`,
 * porque cambia solo con el paso del tiempo (una sesión «en línea» deja de
 * estarlo sin que nadie escriba nada).
 */

/**
 * Hueco máximo entre dos avisos para contarlos como tiempo seguido. El navegador
 * avisa cada 30 s, así que 90 s tolera dos avisos perdidos o retrasados; más que
 * eso la persona no estaba.
 */
export const HUECO_MAXIMO_S = 90

/**
 * Una sesión está «en línea» si su último aviso tiene menos de esto. Va con el
 * mismo valor que `HUECO_MAXIMO_S` a propósito: «en línea» y «el tiempo corre»
 * son la misma condición vista desde dos lados.
 */
export const EN_LINEA_S = 90

/**
 * Los avisos más juntos que esto se ignoran. Una persona que navega rápido por el
 * panel dispara un aviso por pantalla; sin esta ventana la bitácora costaría más
 * escrituras que lo que registra. No se pierde tiempo: el siguiente aviso que sí
 * se escribe suma todo lo transcurrido desde el último escrito.
 */
const AVISO_MINIMO_MS = 10_000

/** Último aviso escrito por sesión, para no repetir el UPDATE. */
const ultimoAviso = new Map<string, number>()

/** Pasado este tamaño se descartan las sesiones que llevan mucho sin avisar. */
const MAX_SESIONES_RECORDADAS = 500

function clave(userId: string, issuedAt: number): string {
  return `${userId}.${issuedAt}`
}

/** Olvida las sesiones que ya no avisan: el mapa no debe crecer con cada sesión que haya habido. */
function podarAvisos(ahora: number): void {
  if (ultimoAviso.size <= MAX_SESIONES_RECORDADAS) return
  for (const [k, momento] of ultimoAviso) {
    if (ahora - momento > HUECO_MAXIMO_S * 1000) ultimoAviso.delete(k)
  }
}

export interface DatosCliente {
  ip: string
  userAgent: string
}

/**
 * Abre (o reabre) la fila de la sesión. Es idempotente: si el usuario vuelve a
 * autenticarse con la misma cookie, se actualiza en vez de duplicar. El tiempo
 * de uso arranca en 0: es una sesión que sí se mide.
 */
export async function registrarInicioSesion(
  userId: string,
  issuedAt: number,
  cliente: DatosCliente,
): Promise<void> {
  const inicio = new Date(issuedAt)
  await sql.unsafe(
    `--sql
    INSERT INTO user_sessions (user_id, issued_at, started_at, last_seen_at, active_seconds, ip, user_agent)
    VALUES ($1, $2, $2, now(), 0, $3, $4)
    ON CONFLICT (user_id, issued_at) DO UPDATE
      SET last_seen_at = now(),
          ended_at = NULL,
          ip = EXCLUDED.ip,
          user_agent = EXCLUDED.user_agent
  `,
    [userId, inicio, cliente.ip, cliente.userAgent],
  )
  ultimoAviso.set(clave(userId, issuedAt), Date.now())
}

/**
 * Suma al tiempo de uso lo transcurrido desde el último aviso, si no fue un
 * hueco de ausencia. Lo comparten el aviso de presencia y el cierre de sesión:
 * pulsar «Cerrar sesión» también es presencia.
 *
 * El reloj es el de Postgres (`now()` contra `last_seen_at`, que también lo puso
 * él), así que un desfase entre el reloj de la aplicación y el de la base no
 * altera la cuenta. Una sesión sin medición (NULL, anterior a esta función) se
 * queda sin medir en lugar de arrancar a medias.
 */
const ACREDITAR_SQL = `active_seconds = CASE
      WHEN active_seconds IS NULL THEN NULL
      WHEN now() - last_seen_at <= make_interval(secs => $3::float8)
        THEN active_seconds + GREATEST(0, EXTRACT(EPOCH FROM (now() - last_seen_at)))
      ELSE active_seconds
    END`

/**
 * Aviso de presencia: la persona tiene el panel a la vista y está haciendo algo.
 * Es lo único que suma tiempo de uso y mantiene a la sesión «en línea».
 */
export async function registrarPresencia(userId: string, issuedAt: number): Promise<void> {
  const k = clave(userId, issuedAt)
  const ahora = Date.now()
  if (ahora - (ultimoAviso.get(k) ?? 0) < AVISO_MINIMO_MS) return
  ultimoAviso.set(k, ahora)
  podarAvisos(ahora)

  await sql.unsafe(
    `--sql
    UPDATE user_sessions SET ${ACREDITAR_SQL}, last_seen_at = now()
    WHERE user_id = $1 AND issued_at = $2 AND ended_at IS NULL
  `,
    [userId, new Date(issuedAt), HUECO_MAXIMO_S],
  )
}

/** Cierra la sesión al pulsar «Cerrar sesión», contando lo último que estuvo. */
export async function registrarCierreSesion(userId: string, issuedAt: number): Promise<void> {
  ultimoAviso.delete(clave(userId, issuedAt))
  await sql.unsafe(
    `--sql
    UPDATE user_sessions SET ${ACREDITAR_SQL}, ended_at = now(), last_seen_at = now()
    WHERE user_id = $1 AND issued_at = $2 AND ended_at IS NULL
  `,
    [userId, new Date(issuedAt), HUECO_MAXIMO_S],
  )
}

/**
 * En qué está una sesión ahora mismo, sin guardar nada: depende de la hora.
 *
 *  · `cerrada`   la persona pulsó «Cerrar sesión».
 *  · `revocada`  se cambió la contraseña de la cuenta después de abrirla; ya no vale.
 *  · `expirada`  pasaron los 7 días de la cookie; ya no vale.
 *  · `en_linea`  hay un aviso de presencia reciente: alguien la está usando.
 *  · `inactiva`  sigue abierta (la cookie vale) pero nadie la usa: se fue sin cerrar.
 *
 * Usa `$1` (duración de la sesión) y `$2` (ventana «en línea»), y los alias
 * `s` (user_sessions) y `u` (users).
 */
const ESTADO_SQL = `CASE
    WHEN s.ended_at IS NOT NULL THEN 'cerrada'
    WHEN u.sessions_valid_from > s.issued_at THEN 'revocada'
    WHEN s.issued_at + make_interval(secs => $1::float8) <= now() THEN 'expirada'
    WHEN s.last_seen_at > now() - make_interval(secs => $2::float8) THEN 'en_linea'
    ELSE 'inactiva'
  END`

export type EstadoSesion = 'en_linea' | 'inactiva' | 'cerrada' | 'expirada' | 'revocada'

export interface SesionRegistrada {
  id: string
  user_id: string
  nombre: string
  email: string
  rol: string
  inicio: string
  /** Cuándo pulsó «Cerrar sesión»; null si no lo hizo (la sesión no terminó, o se abandonó). */
  fin: string | null
  /** Último aviso de presencia: el último momento en que se le vio usando el panel. */
  ultima_actividad: string
  /**
   * Segundos de uso real (con el panel a la vista y haciendo algo). null en las
   * sesiones anteriores a la medición: no se sabe, y no se inventa.
   */
  uso_segundos: number | null
  estado: EstadoSesion
  /** Atajo de `estado === 'en_linea'`. */
  activa: boolean
  ip: string
  user_agent: string
}

export interface ResumenSesiones {
  /** Usuarios distintos con al menos una sesión en el periodo listado. */
  usuarios: number
  sesiones: number
  /** Sesiones con el panel en uso ahora mismo. */
  en_linea: number
  /** Sesiones con tiempo de uso medido (las anteriores a la medición no lo tienen). */
  medidas: number
  /** Suma del tiempo de uso medido. */
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

  const filas = await sql.unsafe<Array<Omit<SesionRegistrada, 'activa'>>>(
    `--sql
    SELECT s.id::text                AS id,
           s.user_id::text           AS user_id,
           u.name                    AS nombre,
           u.email                   AS email,
           u.role                    AS rol,
           s.started_at::text        AS inicio,
           s.ended_at::text          AS fin,
           s.last_seen_at::text      AS ultima_actividad,
           CASE WHEN s.active_seconds IS NULL THEN NULL ELSE ROUND(s.active_seconds)::int END
                                     AS uso_segundos,
           ${ESTADO_SQL}             AS estado,
           s.ip                      AS ip,
           s.user_agent              AS user_agent
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE $3::uuid IS NULL OR s.user_id = $3::uuid
    ORDER BY s.started_at DESC
    LIMIT $4 OFFSET $5
  `,
    [DURACION_SESION_S, EN_LINEA_S, filtro, limit, offset],
  )

  const totales = await sql.unsafe<{ total: string }[]>(
    `--sql
    SELECT COUNT(*)::text AS total FROM user_sessions s
    WHERE $1::uuid IS NULL OR s.user_id = $1::uuid
  `,
    [filtro],
  )

  return {
    items: filas.map((fila) => ({ ...fila, activa: fila.estado === 'en_linea' })),
    total: Number(totales[0]?.total ?? 0),
  }
}

/** Totales del periodo completo, para las tarjetas de resumen del panel. */
export async function resumenSesiones(usuarioId?: string): Promise<ResumenSesiones> {
  const filtro = usuarioId ?? null
  const filas = await sql.unsafe<
    Array<{
      usuarios: string
      sesiones: string
      en_linea: string
      medidas: string
      segundos: string
    }>
  >(
    `--sql
    SELECT COUNT(DISTINCT s.user_id)::text                          AS usuarios,
           COUNT(*)::text                                           AS sesiones,
           COUNT(*) FILTER (WHERE ${ESTADO_SQL} = 'en_linea')::text AS en_linea,
           COUNT(s.active_seconds)::text                            AS medidas,
           COALESCE(SUM(s.active_seconds), 0)::text                 AS segundos
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE $3::uuid IS NULL OR s.user_id = $3::uuid
  `,
    [DURACION_SESION_S, EN_LINEA_S, filtro],
  )
  const f = filas[0]
  return {
    usuarios: Number(f?.usuarios ?? 0),
    sesiones: Number(f?.sesiones ?? 0),
    en_linea: Number(f?.en_linea ?? 0),
    medidas: Number(f?.medidas ?? 0),
    segundos_totales: Math.round(Number(f?.segundos ?? 0)),
  }
}

/** Solo para pruebas: la ventana de avisos es estado en memoria del proceso. */
export function _limpiarAvisos(): void {
  ultimoAviso.clear()
}

/** Solo para pruebas: cuántas sesiones recuerda la ventana de avisos. */
export function _avisosRecordados(): number {
  return ultimoAviso.size
}
