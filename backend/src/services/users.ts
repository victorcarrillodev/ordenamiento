import { sql } from '../db/pool.ts'
import type { Rol } from '../auth/roles.ts'

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
  const rows = await sql<
    Array<{ avatar_ruta: string; avatar_mime: string; avatar_nombre: string }>
  >`
    SELECT avatar_ruta, avatar_mime, avatar_nombre FROM users WHERE id = ${id}
  `
  const r = rows[0]
  if (!r || !r.avatar_ruta) return null
  return { ruta: r.avatar_ruta, mime: r.avatar_mime, nombre: r.avatar_nombre }
}

// ---------------------------------------------------------------------------
// Gestión de cuentas (altas, bajas, rol). Las reglas de quién puede hacer qué
// están en auth/roles.ts; aquí solo está el acceso a la base.
// ---------------------------------------------------------------------------

export interface CuentaListada {
  id: string
  email: string
  name: string
  role: string
  created_at: string
}

/** Todas las cuentas, con los rangos altos primero y luego por nombre. */
export async function listarUsuarios(): Promise<CuentaListada[]> {
  return sql<CuentaListada[]>`--sql
    SELECT id::text AS id, email, name, role, created_at::text AS created_at
    FROM users
    ORDER BY CASE role WHEN 'root' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, name
  `
}

/** Datos mínimos para decidir permisos sobre una cuenta. */
export async function obtenerCuenta(
  id: string,
): Promise<{ id: string; role: string; email: string; name: string } | null> {
  const filas = await sql<Array<{ id: string; role: string; email: string; name: string }>>`--sql
    SELECT id::text AS id, role, email, name FROM users WHERE id = ${id}
  `
  return filas[0] ?? null
}

/**
 * Cuántas cuentas root hay. Lo consultan las reglas que impiden quedarse sin
 * ninguna: sin root, el sistema se queda sin dueño y sin forma de recuperarlo
 * desde el panel.
 */
export async function contarRoots(): Promise<number> {
  const filas = await sql<{ n: string }[]>`--sql
    SELECT count(*)::text AS n FROM users WHERE role = 'root'
  `
  return Number(filas[0]?.n ?? 0)
}

/** Cambia el rango de una cuenta. Devuelve false si el id no existe. */
export async function cambiarRol(id: string, rol: Rol): Promise<boolean> {
  const filas = await sql<{ id: string }[]>`--sql
    UPDATE users SET role = ${rol} WHERE id = ${id} RETURNING id::text AS id
  `
  return filas.length > 0
}

/** Renombra y/o cambia el correo. Solo toca los campos que se pasen. */
export async function actualizarCuenta(
  id: string,
  cambios: { name?: string; email?: string },
): Promise<{ ok: true } | { ok: false; motivo: 'email_ocupado' | 'no_encontrada' }> {
  const nombre = cambios.name?.trim().replace(/\s+/g, ' ')
  const correo = cambios.email?.trim().toLowerCase()

  if (correo) {
    const ocupado = await sql<{ id: string }[]>`--sql
      SELECT id::text AS id FROM users WHERE email = ${correo} AND id <> ${id}
    `
    if (ocupado.length > 0) return { ok: false, motivo: 'email_ocupado' }
  }

  const filas = await sql<{ id: string }[]>`--sql
    UPDATE users
       SET name  = COALESCE(${nombre ?? null}, name),
           email = COALESCE(${correo ?? null}, email)
     WHERE id = ${id}
     RETURNING id::text AS id
  `
  return filas.length > 0 ? { ok: true } : { ok: false, motivo: 'no_encontrada' }
}

/**
 * Borra la cuenta. Las participaciones que haya capturado NO se borran: la
 * bitácora es un registro público y perder una participación ciudadana porque
 * se dio de baja a quien la capturó sería un error grave. El schema pone en
 * NULL las referencias (ON DELETE SET NULL) salvo donde el dato solo tiene
 * sentido con su dueño (sesiones, avatar, tokens).
 */
export async function eliminarUsuario(id: string): Promise<boolean> {
  const filas = await sql<{ id: string }[]>`--sql
    DELETE FROM users WHERE id = ${id} RETURNING id::text AS id
  `
  return filas.length > 0
}
