import { randomBytes } from 'node:crypto'

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
    console.log(`[seed] ROOT creado con password temporal: ${password} (cámbialo con ROOT_PASSWORD)`)
  }

  const existing = await sql<{ id: number }[]>`
    SELECT id FROM users WHERE email = ${ROOT_EMAIL}
  `
  if (existing.length > 0) {
    if (!process.env.ROOT_PASSWORD) {
      console.log(`[seed] ROOT ya existe (${ROOT_EMAIL}); para cambiarlo define ROOT_PASSWORD y borra el usuario.`)
    }
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
