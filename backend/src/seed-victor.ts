/**
 * Seed rápido para crear el usuario admin Victor Manuel Carrillo Rojas.
 *
 * Uso (desde backend/):
 *   bun run src/seed-victor.ts
 *
 * O con DATABASE_URL externo:
 *   DATABASE_URL=postgres://user:pass@host:5432/db bun run src/seed-victor.ts
 */

import { sql } from './db/pool.ts'
import { registerUser } from './auth/auth.ts'

const EMAIL = 'victorcarrillo.dev@gmail.com'
const NAME = 'Victor Manuel Carrillo Rojas'
const PASSWORD = process.env.SEED_VICTOR_PASSWORD || ''

if (!PASSWORD) {
  console.error('[seed-victor] ERROR: SEED_VICTOR_PASSWORD no está definido')
  process.exit(1)
}

async function main() {
  console.log('[seed-victor] Conectando a la base de datos...')

  try {
    await sql`SELECT 1`
    console.log('[seed-victor] Conexión OK')
  } catch (err) {
    console.error('[seed-victor] No se pudo conectar a la base de datos:', err)
    process.exit(1)
  }

  try {
    const { id } = await registerUser({
      email: EMAIL,
      name: NAME,
      password: PASSWORD,
      role: 'admin',
    })
    console.log(`[seed-victor] ✅ Usuario creado: ${EMAIL} (id ${id}, rol admin)`)
  } catch (err) {
    if (err instanceof Error && err.message === 'EMAIL_TAKEN') {
      console.log(`[seed-victor] ℹ️  ${EMAIL} ya existe — nada que hacer`)
    } else {
      console.error('[seed-victor] Error inesperado:', err)
      process.exit(1)
    }
  }

  await sql.end()
}

main()
