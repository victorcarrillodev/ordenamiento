import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { sql } from './db/pool.ts'
import { registerUser } from './auth/auth.ts'

/**
 * Siembra la cuenta ROOT única y permanente.
 * Idempotente: solo inserta si no existe; en cada arranque queda garantizada.
 *
 * Seguridad: el password NUNCA va hardcodeado ni en el repo. Se lee de
 * variables de entorno (ROOT_PASSWORD / ROOT_EMAIL / ROOT_NAME). En
 * producción, si falta ROOT_PASSWORD, el server NO arranca (fail-fast).
 * En desarrollo, si falta, se genera uno aleatorio y se muestra en consola
 * una sola vez (no queda en ningún archivo).
 */
const ROOT_EMAIL = process.env.ROOT_EMAIL?.toLowerCase() ?? 'root@ordenamiento.gob.mx'
const ROOT_PASSWORD = process.env.ROOT_PASSWORD ?? ''
const ROOT_NAME = process.env.ROOT_NAME ?? 'Administrador Root'

export async function seedRootAdmin(): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production'
  let password = ROOT_PASSWORD

  if (!password) {
    if (isProd) {
      throw new Error(
        '[seed] ROOT_PASSWORD es obligatorio en producción. Defínela vía variable de entorno (Docker).',
      )
    }
    // Dev: password aleatorio temporal, solo visible en esta consola.
    password = 'R_' + randomBytes(12).toString('base64url')
    console.log(
      `[seed] ROOT creado con password temporal: ${password} (cámbialo con ROOT_PASSWORD)`,
    )
  }

  const existing = await sql<{ id: string }[]>`
    SELECT id::text AS id FROM users WHERE email = ${ROOT_EMAIL}
  `
  if (existing.length > 0) {
    // El seed es insert-only a propósito: no pisa la contraseña de una cuenta
    // viva en cada arranque. Pero eso hace que cambiar ROOT_PASSWORD en el .env
    // no tenga ningún efecto, y desde fuera se ve como "el login no funciona".
    // Se dice en voz alta para que no haya que adivinarlo.
    console.log(
      process.env.ROOT_PASSWORD
        ? `[seed] ROOT ya existe (${ROOT_EMAIL}). OJO: se conserva la contraseña con la que se creó; ROOT_PASSWORD del entorno NO se aplica a una cuenta existente.`
        : `[seed] ROOT ya existe (${ROOT_EMAIL}); para cambiarlo define ROOT_PASSWORD y borra el usuario.`,
    )
    return
  }

  const { id } = await registerUser({
    email: ROOT_EMAIL,
    name: ROOT_NAME,
    password,
    role: 'admin',
  })

  console.log(`[seed] cuenta ROOT creada: ${ROOT_EMAIL} (id ${id})`)
}

const SEED_ADMINS_PATH = process.env.SEED_ADMINS_FILE ?? join(process.cwd(), 'seed-admins.json')

interface SeedAdminEntry {
  email: string
  name: string
  password: string
  role?: 'admin' | 'user'
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
        role: entry.role ?? 'admin',
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
