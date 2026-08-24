import { sql } from '../db/pool.ts'

/**
 * Tipo de tabla vectorial sobre la que calcular IDF (nombres validados).
 * Solo se aceptan estos valores para no permitir inyección por interpolación
 * de nombre de tabla: la política de seguridad es "lista blanca".
 */
export type IdCorpus = 'participation_chunks' | 'skill_knowledge'

/**
 * Adaptador de corpus (IO): calcula el peso IDF de un conjunto de términos
 * contando en cuántos chunks aparece cada uno, con la fórmula suavizada.
 *
 * Política vs IO: este módulo toca la base de datos; el cómputo puro de
 * vectores vive en `src/vector/tfidf.ts`. `N` (total de filas) se calcula
 * UNA sola vez por llamada y no dentro del bucle (evita N+1 en el count).
 */
export async function getIdfMap(
  terms: string[],
  table: IdCorpus = 'participation_chunks',
): Promise<Record<string, number>> {
  const total = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM ${sql(table)}
  `
  const N = Number(total[0].n)
  if (N === 0) return {}

  const result: Record<string, number> = {}
  for (const term of terms) {
    const row = await sql<{ d: string }[]>`
      SELECT count(*)::text AS d
      FROM ${sql(table)}
      WHERE content ILIKE ${'%' + term + '%'}
    `
    const docsWithTerm = Number(row[0].d)
    result[term] = Math.log(N / (1 + docsWithTerm)) + 1
  }
  return result
}
