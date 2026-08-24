import { sql } from '../db/pool.ts'
import { featurizeWeighted, toVectorLiteral, tokenize } from '../vector/tfidf.ts'
import { getIdfMap } from './knowledge.ts'

export interface SearchHit {
  participationId: number
  folio: string
  nombre: string
  estado: string
  origen: string
  content: string
  score: number
}

export interface SearchOptions {
  origen?: string
  estado?: string
}

/**
 * Búsqueda híbrida:
 *  1) Vectorial: coseno (<=>) contra los chunks de la consulta.
 *  2) Textual:   ILIKE sobre folio/nombre/observación.
 * Se unen, fusionan por participación y ordenan por score.
 */
export async function searchParticipations(
  query: string,
  limit = 10,
  options: SearchOptions = {},
): Promise<SearchHit[]> {
  const terms = [...new Set(tokenize(query))]
  const idfWeights = await getIdfMap(terms)
  const queryVector = toVectorLiteral(featurizeWeighted(query, idfWeights))

  const vectorRows = await sql<
    Array<{
      participation_id: number
      folio: string
      nombre: string
      estado: string
      origen: string
      content: string
      distance: number
    }>
  >`--sql
    SELECT
      p.id            AS participation_id,
      p.folio         AS folio,
      p.nombre        AS nombre,
      p.estado        AS estado,
      p.origen        AS origen,
      c.content       AS content,
      (c.embedding <=> ${queryVector}::vector) AS distance
    FROM participation_chunks c
    JOIN participations p ON p.id = c.participation_id
    ${options.origen ? sql`WHERE p.origen = ${options.origen}` : sql``}
    ORDER BY c.embedding <=> ${queryVector}::vector
    LIMIT ${limit * 2}
  `

  // distancia coseno 0..2 → score 0..1
  const hits: SearchHit[] = vectorRows.map((r) => ({
    participationId: r.participation_id,
    folio: r.folio,
    nombre: r.nombre,
    estado: r.estado,
    origen: r.origen,
    content: r.content,
    score: Number((1 - r.distance).toFixed(4)),
  }))

  const textualRows = await sql<
    Array<{ id: number; folio: string; nombre: string; estado: string; origen: string }>
  >`--sql
    SELECT id, folio, nombre, estado, origen FROM participations
    WHERE folio ILIKE ${`%${query}%`}
       OR nombre ILIKE ${`%${query}%`}
       OR observacion ILIKE ${`%${query}%`}
       ${options.origen ? sql`AND origen = ${options.origen}` : sql``}
    ORDER BY
      CASE WHEN folio ILIKE ${`%${query}%`} THEN 0 ELSE 1 END,
      nombre
    LIMIT ${limit}
  `

  const merged: SearchHit[] = []
  const seen = new Set<number>()

  for (const t of textualRows) {
    const match = hits.find((h) => h.participationId === t.id)
    if (match && !seen.has(t.id)) {
      seen.add(t.id)
      merged.push({ ...match, score: Math.min(1, match.score + 0.25) })
    }
  }

  for (const h of hits) {
    if (!seen.has(h.participationId)) {
      seen.add(h.participationId)
      merged.push(h)
    }
  }

  return merged.slice(0, limit)
}
