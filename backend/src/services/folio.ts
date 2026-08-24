import { sql } from '../db/pool.ts'

/**
 * Genera el siguiente folio con el formato SPAGU-DGTPU-E-000X.
 * Cuenta los registros existentes y rellena con ceros a 4 dígitos.
 */
export async function nextFolio(): Promise<string> {
  const rows = await sql<{ n: string }[]>`--sql
    SELECT count(*)::text AS n FROM participations
  `
  const next = Number(rows[0].n) + 1
  return `SPAGU-DGTPU-E-${String(next).padStart(4, '0')}`
}
