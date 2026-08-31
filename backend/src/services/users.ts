import { sql } from '../db/pool.ts'

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024

export interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  avatar_ruta: string
}

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  const rows = await sql<UserProfile[]>`
    SELECT id::text AS id, email, name, role, created_at::text AS created_at, avatar_ruta
    FROM users WHERE id = ${id}
  `
  return rows[0] ?? null
}

export async function setUserAvatar(
  id: string,
  avatar: { nombreOriginal: string; mime: string; rutaLocal: string },
): Promise<{ avatar_ruta: string } | null> {
  const rows = await sql<{ avatar_ruta: string }[]>`
    UPDATE users SET avatar_ruta = ${avatar.rutaLocal},
                     avatar_nombre = ${avatar.nombreOriginal},
                     avatar_mime = ${avatar.mime}
    WHERE id = ${id} RETURNING avatar_ruta
  `
  return rows[0] ?? null
}

export async function getUserAvatar(
  id: string,
): Promise<{ ruta: string; mime: string; nombre: string } | null> {
  const rows = await sql<Array<{ avatar_ruta: string; avatar_mime: string; avatar_nombre: string }>>`
    SELECT avatar_ruta, avatar_mime, avatar_nombre FROM users WHERE id = ${id}
  `
  const r = rows[0]
  if (!r || !r.avatar_ruta) return null
  return { ruta: r.avatar_ruta, mime: r.avatar_mime, nombre: r.avatar_nombre }
}
