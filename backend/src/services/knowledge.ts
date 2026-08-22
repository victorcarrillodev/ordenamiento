import { sql } from '../db/pool.ts'

/**
 * Adaptador de corpus (IO): calcula el peso IDF de un conjunto de términos
 * contando en cuántos chunks aparece cada uno, con la fórmula suavizada.
 *
 * Política vs IO: este módulo toca la base de datos; el cómputo puro de
 * vectores vive en `src/vector/tfidf.ts`.
 */
export async function getIdfMap(terms: string[]): Promise<Record<string, number>> {
  const total = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM participation_chunks
  `
  const N = Number(total[0].n)

  const result: Record<string, number> = {}
  for (const term of terms) {
    const row = await sql<{ d: string }[]>`
      SELECT count(*)::text AS d
      FROM participation_chunks
      WHERE content ILIKE ${'%' + term + '%'}
    `
    const docsWithTerm = Number(row[0].d)
    result[term] = Math.log(N / (1 + docsWithTerm)) + 1
  }
  return result
}
