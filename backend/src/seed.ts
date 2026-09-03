import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { sql } from './db/pool.ts'
import { hashPassword, registerUser } from './auth/auth.ts'
import { comoRol } from './auth/roles.ts'

/**
 * Siembra la cuenta ROOT: la dueña del sistema.
 *
 * Idempotente y correctiva: en cada arranque garantiza que la cuenta exista y
 * que tenga rango `root`. Lo segundo importa para las instalaciones que ya
 * venían de antes, donde esta misma cuenta era un `admin` más: sin esta
 * corrección, el sistema arrancaría sin ninguna cuenta root y nadie podría
 * gestionar a los administradores.
 *
 * Seguridad: la contraseña NUNCA va escrita en el repositorio. Se lee de
 * variables de entorno (ROOT_PASSWORD / ROOT_EMAIL / ROOT_NAME). En producción,
 * si falta ROOT_PASSWORD, el servidor NO arranca. En desarrollo se genera una
 * aleatoria y se enseña una sola vez en consola, sin dejarla en ningún archivo.
 */
const ROOT_EMAIL = process.env.ROOT_EMAIL?.toLowerCase() ?? 'victorcarrillo.dev@gmail.com'
const ROOT_PASSWORD = process.env.ROOT_PASSWORD ?? ''
const ROOT_NAME = process.env.ROOT_NAME ?? 'Victor Carrillo Rojas'

export async function seedRootAdmin(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production'
  let password = ROOT_PASSWORD

  if (!password) {
    if (isProd) {
      throw new Error(
        '[seed] ROOT_PASSWORD es obligatorio en producción. Defínela vía variable de entorno (Docker).',
      )
    }
    // Dev: contraseña temporal, visible solo en esta consola.
    password = 'R_' + randomBytes(12).toString('base64url')
    console.log(`[seed] ROOT creado con contraseña temporal: ${password} (cámbiala con ROOT_PASSWORD)`)
  }

  const existente = await sql<{ id: string; role: string }[]>`--sql
    SELECT id::text AS id, role FROM users WHERE email = ${ROOT_EMAIL}
  `

  if (existente.length === 0) {
    const { id } = await registerUser({
      email: ROOT_EMAIL,
      name: ROOT_NAME,
      password,
      role: 'root',
    })
    console.log(`[seed] cuenta ROOT creada: ${ROOT_EMAIL} (id ${id})`)
    return
  }

  // La cuenta ya estaba. Se asegura el rango, y la contraseña solo se
  // sincroniza si hay ROOT_PASSWORD definida: si no, pisaríamos en cada
  // arranque la que su dueño haya cambiado desde el panel.
  if (comoRol(existente[0].role) !== 'root') {
    await sql`UPDATE users SET role = 'root' WHERE email = ${ROOT_EMAIL}`
    console.log(`[seed] ROOT (${ROOT_EMAIL}): rango elevado a root`)
  }

  if (ROOT_PASSWORD) {
    await sql`--sql
      UPDATE users SET password_hash = ${await hashPassword(ROOT_PASSWORD)}
      WHERE email = ${ROOT_EMAIL}
    `
    console.log(`[seed] ROOT (${ROOT_EMAIL}): contraseña sincronizada desde .env`)
  } else {
    console.log(
      `[seed] ROOT ya existe (${ROOT_EMAIL}); para cambiar la contraseña define ROOT_PASSWORD en .env`,
    )
  }
}

const SEED_ADMINS_PATH = process.env.SEED_ADMINS_FILE ?? join(process.cwd(), 'seed-admins.json')

interface SeedAdminEntry {
  email: string
  name: string
  password: string
  role?: 'root' | 'admin' | 'user'
}

/**
 * Siembra cuentas extra (admins u otras) desde un archivo JSON opcional.
 * Copia `seed-admins.example.json` a `seed-admins.json` (gitignorado, igual
 * que `.env`) y agrega ahí tantas cuentas como necesites. Idempotente: las
 * cuentas cuyo correo ya existe se omiten sin error.
 */
export async function seedExtraAdmins(): Promise<void> {
  let raw: string
  try {
    raw = await readFile(SEED_ADMINS_PATH, 'utf8')
  } catch {
    return // Archivo opcional: sin él, no se siembra nada extra.
  }

  const entries = JSON.parse(raw) as SeedAdminEntry[]

  for (const entry of entries) {
    try {
      const { id } = await registerUser({
        email: entry.email,
        name: entry.name,
        password: entry.password,
        role: comoRol(entry.role ?? 'admin'),
      })
      console.log(`[seed] cuenta creada desde seed-admins.json: ${entry.email} (id ${id})`)
    } catch (err) {
      if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
        console.log(`[seed] ${entry.email} ya existe; se omite`)
        continue
      }
      throw err
    }
  }
}
