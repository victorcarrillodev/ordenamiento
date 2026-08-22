import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { sql } from './pool.ts'

const SCHEMA_PATH = join(process.cwd(), 'schema.sql')

export async function migrate(): Promise<void> {
  const schema = await readFile(SCHEMA_PATH, 'utf8')
  await sql.unsafe(schema)
  console.log('[db] schema aplicado')
}
