import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { sql, type Db } from './pool.ts'

const SCHEMA_PATH = join(process.cwd(), 'schema.sql')
const MIGRATIONS_DIR = join(process.cwd(), 'migrations')

/**
 * Migraciones y schema son dos cosas distintas y por eso corren distinto:
 *
 *  · `migrations/*.sql` son conversiones puntuales sobre bases YA desplegadas
 *    (BIGINT → UUID, por ejemplo). Corren una sola vez, en orden lexicográfico
 *    y ANTES del schema, porque el schema asume el resultado de la conversión.
 *  · `schema.sql` describe el estado deseado y se aplica en CADA arranque:
 *    es idempotente y así una tabla o columna nueva aparece sola al desplegar.
 *
 * Aun así cada migración se escribe idempotente: si el registro en
 * `schema_migrations` falla después de aplicarla, el siguiente arranque la
 * reintenta y debe encontrar el trabajo hecho sin romperse.
 */
async function runPendingMigrations(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `

  let files: string[]
  try {
    files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
  } catch {
    // Sin directorio de migraciones no hay nada que aplicar (p. ej. en tests).
    return
  }

  const applied = new Set(
    (await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((row) => row.name),
  )

  for (const name of files) {
    if (applied.has(name)) continue
    const body = await readFile(join(MIGRATIONS_DIR, name), 'utf8')
    await sql.begin(async (tx: Db) => {
      await tx.unsafe(body)
      await tx`INSERT INTO schema_migrations (name) VALUES (${name})`
    })
    console.log(`[db] migración aplicada: ${name}`)
  }
}

export async function migrate(): Promise<void> {
  await runPendingMigrations()
  const schema = await readFile(SCHEMA_PATH, 'utf8')
  await sql.unsafe(schema)
  console.log('[db] schema aplicado')
}
