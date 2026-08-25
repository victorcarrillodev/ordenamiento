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

export async function createSessionToken(userId: number): Promise<string> {
  const payload = `${userId}.${Date.now()}`
  const sig = sign(payload)
  return `${payload}.${sig}`
}

export async function verifySessionToken(token: string): Promise<number | null> {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const payload = `${parts[0]}.${parts[1]}`
  const expected = Buffer.from(sign(payload))
  const actual = Buffer.from(parts[2])

  // Comparación en tiempo constante: evita filtrar la firma esperada por
  // el tiempo de respuesta (timing attack) al comparar carácter a carácter.
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  const userId = Number(parts[0])
  if (!Number.isInteger(userId) || userId <= 0) return null

  // Expiración: el timestamp (parte 2) no debe exceder MAX_AGE_SECONDS.
  const issued = Number(parts[1])
  if (!Number.isInteger(issued) || issued <= 0) return null
  if (Date.now() - issued > MAX_AGE_SECONDS * 1000) return null

  return userId
}

export function sessionCookie(token: string): string {
  const attrs = [
    `ordenamiento_session=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Secure',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ]
  return attrs.join('; ')
}

export function clearSessionCookie(): string {
  return [
    'ordenamiento_session=',
    'HttpOnly',
    'Secure',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ')
}

export interface SessionUser {
  id: number
  name: string
  email: string
  role: string
}

export async function registerUser(input: {
  email: string
  name: string
  password: string
  role?: 'admin' | 'user'
}): Promise<{ id: number }> {
  const password_hash = await Bun.password.hash(input.password, {
    algorithm: 'argon2id',
    memoryCost: 65536,
    timeCost: 3,
  })

  const rows = await sql<{ id: number }[]>`--sql
    INSERT INTO users (email, name, password_hash, role)
    VALUES (${input.email.toLowerCase()}, ${input.name}, ${password_hash}, ${input.role ?? 'user'})
    ON CONFLICT (email) DO NOTHING
    RETURNING id
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
    Array<{ id: number; name: string; email: string; role: string; password_hash: string }>
  >`--sql
    SELECT id, name, email, role, password_hash FROM users WHERE email = ${email.toLowerCase()}
  `

  if (rows.length === 0) return null

  const user = rows[0]
  const ok = await Bun.password.verify(password, user.password_hash)
  if (!ok) return null

  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export async function getUserById(id: number): Promise<SessionUser | null> {
  const rows = await sql<Array<{ id: number; name: string; email: string; role: string }>>`--sql
    SELECT id, name, email, role FROM users WHERE id = ${id}
  `
  return rows[0] ?? null
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
