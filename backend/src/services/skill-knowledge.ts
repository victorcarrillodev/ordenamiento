import { sql } from '../db/pool.ts'
import { chunkText } from '../text/chunk.ts'
import { featurizeWeighted, toVectorLiteral, tokenize } from '../vector/tfidf.ts'
import { getIdfMap } from './knowledge.ts'

/**
 * Adaptador del corpus de conocimiento reutilizable (RAG).
 * Política vs IO: aquí se decide qué se guarda y cómo se consulta la tabla
 * `skill_knowledge`; la matemática del vector vive en `src/vector/tfidf.ts`.
 */

export interface KnowledgeHit {
  id: number
  title: string
  kind: string
  content: string
  score: number
}

/**
 * Ingresa una unidad de conocimiento: parte el texto en chunks, calcula el
 * embedding TF-IDF de cada uno y lo inserta en `skill_knowledge`.
 * Devuelve el número de chunks escritos.
 */
export async function ingestSkillKnowledge(
  title: string,
  kind: string,
  content: string,
): Promise<number> {
  const chunks = chunkText(content)
  for (const chunk of chunks) {
    const terms = [...new Set(tokenize(chunk.content))]
    const idfWeights = await getIdfMap(terms, 'skill_knowledge')
    const vector = featurizeWeighted(chunk.content, idfWeights)
    await sql`
      INSERT INTO skill_knowledge (title, kind, content, embedding)
      VALUES (${title}, ${kind}, ${chunk.content}, ${toVectorLiteral(vector)}::vector)
    `
  }
  return chunks.length
}

/**
 * Búsqueda semántica sobre el corpus de conocimiento: vectoriza la consulta
 * con el IDF del propio corpus y la compara por distancia coseno (<=>).
 */
export async function searchSkillKnowledge(
  query: string,
  opts: { kind?: string; limit?: number } = {},
): Promise<KnowledgeHit[]> {
  const limit = opts.limit ?? 10
  const terms = [...new Set(tokenize(query))]
  const idfWeights = await getIdfMap(terms, 'skill_knowledge')
  const queryVector = toVectorLiteral(featurizeWeighted(query, idfWeights))

  const rows = await sql<
    Array<{ id: number; title: string; kind: string; content: string; distance: number }>
  >`--sql
    SELECT id, title, kind, content,
           (embedding <=> ${queryVector}::vector) AS distance
    FROM skill_knowledge
    ${opts.kind ? sql`WHERE kind = ${opts.kind}` : sql``}
    ORDER BY embedding <=> ${queryVector}::vector
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    content: r.content,
    score: Number((1 - r.distance).toFixed(4)),
  }))
}
