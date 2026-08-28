import { sql } from '../db/pool.ts'

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
 * ts_rank devuelve valores pequeños y sin cota superior fija. Se comprime a
 * 0..1 para que el cliente pueda pintarlo como porcentaje de relevancia.
 */
function normalizar(rank: number): number {
  return Number((rank / (rank + 1)).toFixed(4))
}

/**
 * Búsqueda de participaciones sobre full-text nativo de Postgres:
 *
 *  1) Campos del formulario  → `participations.busqueda_tsv` (columna generada).
 *  2) Contenido de los PDF   → `attachments.texto_tsv` (columna generada).
 *  3) Coincidencia literal   → ILIKE sobre folio y nombre, porque el folio
 *     (SPAGU-DGTPU-E-0007) no se tokeniza de forma útil como texto natural.
 *
 * Los resultados se fusionan por participación quedándose con la mejor
 * puntuación, y se premia que la coincidencia venga de varias fuentes.
 */
export async function searchParticipations(
  query: string,
  limit = 10,
  options: SearchOptions = {},
): Promise<SearchHit[]> {
  const termino = query.trim()
  if (!termino) return []

  const like = `%${termino}%`

  // Los filtros se aplican como AND sobre TODO el grupo de coincidencia: el
  // OR va entre paréntesis a propósito, para que `origen`/`estado` no queden
  // colgando de la última rama por precedencia de operadores.
  const filtroOrigen = options.origen ? sql`AND p.origen = ${options.origen}` : sql``
  const filtroEstado = options.estado ? sql`AND p.estado = ${options.estado}` : sql``

  const porParticipacion = await sql<
    Array<{
      id: number
      folio: string
      nombre: string
      estado: string
      origen: string
      observacion: string
      rank: number
    }>
  >`--sql
    SELECT p.id, p.folio, p.nombre, p.estado, p.origen, p.observacion,
           ts_rank(p.busqueda_tsv, q.tsq) AS rank
    FROM participations p,
         websearch_to_tsquery('spanish', ${termino}) AS q(tsq)
    WHERE (
            p.busqueda_tsv @@ q.tsq
            OR p.folio ILIKE ${like}
            OR p.nombre ILIKE ${like}
          )
      ${filtroOrigen}
      ${filtroEstado}
    ORDER BY
      CASE WHEN p.folio ILIKE ${like} THEN 0 ELSE 1 END,
      rank DESC,
      p.created_at DESC
    LIMIT ${limit * 2}
  `

  const porAdjunto = await sql<
    Array<{
      id: number
      folio: string
      nombre: string
      estado: string
      origen: string
      extracto: string
      rank: number
    }>
  >`--sql
    SELECT p.id, p.folio, p.nombre, p.estado, p.origen,
           ts_headline(
             'spanish', a.texto_extraido, q.tsq,
             'MaxFragments=1, MaxWords=40, MinWords=15, StartSel=«, StopSel=»'
           ) AS extracto,
           ts_rank(a.texto_tsv, q.tsq) AS rank
    FROM attachments a
    JOIN participations p ON p.id = a.participation_id,
         websearch_to_tsquery('spanish', ${termino}) AS q(tsq)
    WHERE a.texto_tsv @@ q.tsq
      ${filtroOrigen}
      ${filtroEstado}
    ORDER BY rank DESC
    LIMIT ${limit * 2}
  `

  const hits = new Map<number, SearchHit>()

  for (const r of porParticipacion) {
    hits.set(r.id, {
      participationId: r.id,
      folio: r.folio,
      nombre: r.nombre,
      estado: r.estado,
      origen: r.origen,
      content: r.observacion.slice(0, 240),
      score: normalizar(Number(r.rank)),
    })
  }

  for (const r of porAdjunto) {
    const previo = hits.get(r.id)
    const score = normalizar(Number(r.rank))
    if (previo) {
      // Coincide por formulario y por PDF: la coincidencia es más fuerte.
      previo.score = Math.min(1, Math.max(previo.score, score) + 0.25)
      // El extracto del PDF dice más que la observación recortada.
      previo.content = r.extracto || previo.content
      continue
    }
    hits.set(r.id, {
      participationId: r.id,
      folio: r.folio,
      nombre: r.nombre,
      estado: r.estado,
      origen: r.origen,
      content: r.extracto,
      score,
    })
  }

  return [...hits.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}
