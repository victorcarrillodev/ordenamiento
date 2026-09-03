import { createHmac, timingSafeEqual } from 'node:crypto'

import { sql } from '../db/pool.ts'

/**
 * SESSION_SECRET firma las cookies de sesión con HMAC. Si su valor fuera
 * predecible (el fallback de desarrollo), cualquiera podría forjar una
 * sesión de admin válida solo conociendo un userId. Por eso, igual que
 * ROOT_PASSWORD en seed.ts, en producción es obligatorio y el server no
 * arranca sin él.
 */
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error(
    '[auth] SESSION_SECRET es obligatorio en producción. Defínela vía variable de entorno (Docker).',
  )
}
const SECRET = process.env.SESSION_SECRET ?? 'cambia-este-secreto-en-produccion'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 días

function sign(value: string): string {
  return createHmac('sha256', SECRET).update(value).digest('base64url')
}

export async function createSessionToken(userId: string): Promise<string> {
  const payload = `${userId}.${Date.now()}`
  const sig = sign(payload)
  return `${payload}.${sig}`
}

const UUID_RE_AUTH = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\d+)$/i

export async function verifySessionToken(token: string): Promise<string | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const payload = `${parts[0]}.${parts[1]}`
  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(parts[2])

  // Comparación en tiempo constante: evita filtrar la firma esperada por
  // el tiempo de respuesta (timing attack) al comparar carácter a carácter.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  const userId = parts[0]
  if (!UUID_RE_AUTH.test(userId)) return null

  // Expiración: el timestamp (parte 2) no debe exceder MAX_AGE_SECONDS.
  const issued = Number(parts[1])
  if (!Number.isInteger(issued) || issued <= 0) return null
  if (Date.now() - issued > MAX_AGE_SECONDS * 1000) return null

  return userId
}

/**
 * Momento (ms epoch) en que se firmó el token, o null si no se puede leer.
 * Se usa para descartar sesiones anteriores a un cambio de contraseña; la
 * autenticidad del token la sigue verificando `verifySessionToken`.
 */
export function sessionIssuedAt(token: string): number | null {
  const issued = Number(token.split('.')[1])
  return Number.isInteger(issued) && issued > 0 ? issued : null
}

export function sessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === 'production'
  const isSecure = isProd && process.env.COOKIE_SECURE !== 'false'
  const attrs = [
    `ordenamiento_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ]
  if (isSecure) {
    attrs.push('Secure')
  }
  return attrs.join('; ')
}

export function clearSessionCookie(): string {
  const isProd = process.env.NODE_ENV === 'production'
  const isSecure = isProd && process.env.COOKIE_SECURE !== 'false'
  const attrs = ['ordenamiento_session=', 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0']
  if (isSecure) {
    attrs.push('Secure')
  }
  return attrs.join('; ')
}

export interface SessionUser {
  id: string
  name: string
  email: string
  role: string
  /**
   * Corte de sesiones en ms epoch: las emitidas antes ya no valen. 0 (o
   * ausente) significa «sin corte», que es el valor por omisión de la columna
   * para las cuentas que nunca han restablecido su contraseña.
   */
  sessionsValidFrom?: number
}

/**
 * Único punto donde se derivan hashes de contraseña: alta de usuario y
 * restablecimiento por correo deben usar exactamente los mismos parámetros
 * de argon2id, o una contraseña restablecida quedaría peor protegida que
 * la original sin que nada lo delate.
 */
export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
  })
}

export async function registerUser(input: {
  email: string
  name: string
  password: string
  role?: 'admin' | 'user'
}): Promise<{ id: string }> {
  const password_hash = await hashPassword(input.password)

  const rows = await sql<{ id: string }[]>`--sql
    INSERT INTO users (email, name, password_hash, role)
    VALUES (${input.email.toLowerCase()}, ${input.name}, ${password_hash}, ${input.role ?? 'user'})
    ON CONFLICT (email) DO NOTHING
    RETURNING id::text AS id
  `

  if (rows.length === 0) {
    throw new Error('EMAIL_TAKEN')
  }

  return { id: rows[0].id }
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const rows = await sql<
    Array<{ id: string; name: string; email: string; role: string; password_hash: string }>
  >`--sql
    SELECT id::text AS id, name, email, role, password_hash FROM users WHERE email = ${email.toLowerCase()}
  `

  if (rows.length === 0) return null

  const user = rows[0]
  const ok = await Bun.password.verify(password, user.password_hash)
  if (!ok) return null

  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

/**
 * ¿Es esta la contraseña actual de la cuenta? Se usa como segundo factor de
 * intención en los cambios sensibles del perfil (correo, contraseña): tener la
 * sesión abierta no basta para reasignar la cuenta a otra dirección.
 */
export async function verifyPasswordById(id: string, password: string): Promise<boolean> {
  if (!password) return false
  const rows = await sql<Array<{ password_hash: string }>>`--sql
    SELECT password_hash FROM users WHERE id = ${id}
  `
  if (rows.length === 0) return false
  return Bun.password.verify(password, rows[0].password_hash)
}

/** Renombra al usuario. Devuelve el nombre guardado, o null si el id no existe. */
export async function updateUserName(id: string, name: string): Promise<string | null> {
  const limpio = name.trim().replace(/\s+/g, ' ')
  if (limpio.length === 0) return null
  const rows = await sql<{ name: string }[]>`--sql
    UPDATE users SET name = ${limpio} WHERE id = ${id} RETURNING name
  `
  return rows[0]?.name ?? null
}

/**
 * Reemplaza la contraseña de un usuario y anula sus sesiones abiertas.
 * Devuelve false si el id no existe.
 *
 * El corte se sella con el reloj de la aplicación —el mismo que firma los
 * tokens— y no con `now()` de Postgres: si los dos relojes van desfasados, un
 * `now()` adelantado invalidaría al instante la sesión que se cree justo
 * después de restablecer.
 */
export async function updateUserPassword(id: string, password: string): Promise<boolean> {
  const password_hash = await hashPassword(password)
  const rows = await sql<{ id: string }[]>`--sql
    UPDATE users
       SET password_hash = ${password_hash},
           sessions_valid_from = ${new Date()}
     WHERE id = ${id}
     RETURNING id::text AS id
  `
  return rows.length > 0
}

export async function getUserById(id: string): Promise<SessionUser | null> {
  const rows = await sql<
    Array<{ id: string; name: string; email: string; role: string; sessions_valid_from: string }>
  >`--sql
    SELECT id::text AS id, name, email, role, sessions_valid_from FROM users WHERE id = ${id}
  `
  const row = rows[0]
  if (!row) return null
  const corte = row.sessions_valid_from ? new Date(row.sessions_valid_from).getTime() : 0
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    sessionsValidFrom: Number.isFinite(corte) ? corte : 0,
  }
}

// ---------------------------------------------------------------------------
// Límite de intentos de inicio de sesión (mitiga fuerza bruta / credential
// stuffing contra cuentas conocidas, p. ej. la cuenta ROOT). En memoria: es
// suficiente porque el backend corre como una sola instancia (ver
// docker-compose.yml); no sobrevive un reinicio, lo cual es aceptable aquí.
// ---------------------------------------------------------------------------

const LOGIN_MAX_ATTEMPTS = 10
const LOGIN_WINDOW_MS = 15 * 60 * 1000

const loginAttempts = new Map<string, { count: number; windowStart: number }>()

export function isLoginRateLimited(email: string): boolean {
  const entry = loginAttempts.get(email.toLowerCase())
  if (!entry) return false
  if (Date.now() - entry.windowStart > LOGIN_WINDOW_MS) return false
  return entry.count >= LOGIN_MAX_ATTEMPTS
}

export function recordLoginFailure(email: string): void {
  const key = email.toLowerCase()
  const now = Date.now()
  const entry = loginAttempts.get(key)
  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now })
    return
  }
  entry.count++
}

export function clearLoginAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase())
}
