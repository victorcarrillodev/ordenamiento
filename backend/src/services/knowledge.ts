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
 * Mejora v2: una SOLA query batch con unnest + ILIKE ANY para evitar N+1.
 *
 * Fórmula IDF Robertson-Sparck Jones suavizada:
 *   ln((N - df + 0.5) / (df + 0.5) + 1) + 1
 * Siempre ≥ 1; N = total de chunks en el corpus.
 */
const ID_CORPUS_TABLES: readonly IdCorpus[] = ['participation_chunks', 'skill_knowledge']

export async function getIdfMap(
  terms: string[],
  table: IdCorpus = 'participation_chunks',
): Promise<Record<string, number>> {
  // El tipo `IdCorpus` no protege en runtime (se borra al compilar), y este
  // nombre de tabla se interpola como identificador SQL más abajo. Se
  // revalida aquí contra la lista blanca real para que un futuro llamador
  // que derive `table` de datos externos no abra una inyección SQL.
  if (!ID_CORPUS_TABLES.includes(table)) {
    throw new Error(`Tabla no permitida para IDF: ${table}`)
  }
  if (terms.length === 0) return {}

  // Total de chunks en el corpus (una sola query)
  const total = await sql<{ n: string }[]>`
    SELECT count(*)::text AS n FROM ${sql(table)}
  `
  const N = Number(total[0].n)
  if (N === 0) return {}

  // Conteo de chunks que contienen cada término — UNA sola query con unnest
  // Se construye dinámicamente porque sql tagged-template no soporta arrays de LIKE.
  const termList = [...new Set(terms)] // deduplicar
  const patterns = termList.map((t) => `%${t}%`)

  // Consulta batch: para cada término del array, cuenta los chunks que lo contienen
  const rows = await sql<Array<{ term: string; d: string }>>`
    SELECT t.term, count(c.id)::text AS d
    FROM unnest(${patterns}::text[]) WITH ORDINALITY AS t(pattern, ord)
    JOIN unnest(${termList}::text[]) WITH ORDINALITY AS u(term, ord) ON u.ord = t.ord
    LEFT JOIN ${sql(table)} c ON c.content ILIKE t.pattern
    GROUP BY t.term
  `

  const result: Record<string, number> = {}
  for (const row of rows) {
    const df = Number(row.d)
    result[row.term] = Math.log((N - df + 0.5) / (df + 0.5) + 1) + 1
  }

  // Términos sin match en el corpus → IDF máximo (término muy raro → muy relevante)
  for (const term of termList) {
    if (!(term in result)) {
      result[term] = Math.log((N + 0.5) / 0.5 + 1) + 1
    }
  }

  return result
}
