import { createHmac } from 'node:crypto'

import { sql } from '../db/pool.ts'

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
  const expected = sign(payload)

  // La tercera parte es la firma HMAC del payload.
  if (expected !== parts[2]) return null

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
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_SECONDS}`,
  ]
  return attrs.join('; ')
}

export function clearSessionCookie(): string {
  return ['ordenamiento_session=', 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'].join('; ')
}

export interface SessionUser {
  id: number
  name: string
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
    Array<{ id: number; name: string; role: string; password_hash: string }>
  >`--sql
    SELECT id, name, role, password_hash FROM users WHERE email = ${email.toLowerCase()}
  `

  if (rows.length === 0) return null

  const user = rows[0]
  const ok = await Bun.password.verify(password, user.password_hash)
  if (!ok) return null

  return { id: user.id, name: user.name, role: user.role }
}

export async function getUserById(id: number): Promise<SessionUser | null> {
  const rows = await sql<Array<{ id: number; name: string; role: string }>>`--sql
    SELECT id, name, role FROM users WHERE id = ${id}
  `
  return rows[0] ?? null
}
