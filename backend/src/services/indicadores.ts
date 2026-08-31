import { sql, type Db } from '../db/pool.ts'

export interface Indicador {
  id: string
  nombre: string
  descripcion: string
  unidad: string
  meta: string | null
  fecha_evaluacion: string
  resultado_texto: string
  documento_respaldo_id: string | null
  creado_por: string | null
  created_at: string
  updated_at: string
  mediciones: Array<{ id: string; periodo: string; valor: string }>
  documento_respaldo: { id: string; titulo: string; tipo: string } | null
}

export async function listIndicadores(): Promise<Indicador[]> {
  const rows = await sql<
    Array<{
      id: string
      nombre: string
      descripcion: string
      unidad: string
      meta: string | null
      fecha_evaluacion: string
      resultado_texto: string
      documento_respaldo_id: string | null
      creado_por: string | null
      created_at: string
      updated_at: string
    }>
  >`--sql
    SELECT id::text AS id, nombre, descripcion, unidad, meta::text AS meta, fecha_evaluacion, resultado_texto,
           documento_respaldo_id::text AS documento_respaldo_id, creado_por::text AS creado_por,
           created_at::text, updated_at::text
    FROM indicadores ORDER BY created_at DESC
  `
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const meds = await sql<
    Array<{ indicador_id: string; id: string; periodo: string; valor: string }>
  >`--sql
    SELECT indicador_id::text AS indicador_id, id::text AS id, periodo, valor::text AS valor
    FROM mediciones WHERE indicador_id IN ${sql(ids)} ORDER BY created_at
  `
  const medByInd = new Map<string, Array<{ indicador_id: string; id: string; periodo: string; valor: string }>>()
  for (const m of meds) {
    const arr = medByInd.get(m.indicador_id) ?? []
    arr.push(m as { indicador_id: string; id: string; periodo: string; valor: string })
    medByInd.set(m.indicador_id, arr)
  }
  // documento respaldo batch
  const docIds = [...new Set(rows.map((r) => r.documento_respaldo_id).filter(Boolean) as string[])]
  const docRows =
    docIds.length > 0
      ? await sql<Array<{ id: string; titulo: string; tipo: string }>>`SELECT id::text AS id, titulo, tipo FROM documentos WHERE id IN ${sql(docIds)}`
      : []
  const docMap = new Map(docRows.map((d) => [d.id, d]))
  return rows.map((r) => ({
    ...r,
    mediciones: (medByInd.get(r.id) ?? []).map((m) => ({ id: m.id, periodo: m.periodo, valor: m.valor })),
    documento_respaldo: r.documento_respaldo_id ? (docMap.get(r.documento_respaldo_id) ?? null) : null,
  }))
}

export async function createIndicador(
  db: Db,
  input: {
    nombre: string
    descripcion?: string
    unidad?: string
    meta?: number | string | null
    fecha_evaluacion?: string
    resultado_texto?: string
    documento_respaldo_id?: string | null
    creadoPor?: string
  },
  mediciones: Array<{ periodo: string; valor: number | string }>,
): Promise<{ id: string }> {
  const rows = await db<{ id: string }[]>`--sql
    INSERT INTO indicadores (nombre, descripcion, unidad, meta, fecha_evaluacion, resultado_texto, documento_respaldo_id, creado_por)
    VALUES (${input.nombre}, ${input.descripcion ?? ''}, ${input.unidad ?? ''}, ${input.meta ?? null},
            ${input.fecha_evaluacion ?? ''}, ${input.resultado_texto ?? ''}, ${input.documento_respaldo_id ?? null}, ${input.creadoPor ?? null})
    RETURNING id::text AS id
  `
  const indicadorId = rows[0].id
  for (const m of mediciones) {
    await db`INSERT INTO mediciones (indicador_id, periodo, valor) VALUES (${indicadorId}, ${m.periodo ?? ''}, ${m.valor})`
  }
  return { id: indicadorId }
}

export async function updateIndicador(
  id: string,
  input: {
    nombre?: string
    descripcion?: string
    unidad?: string
    meta?: number | string | null
    fecha_evaluacion?: string
    resultado_texto?: string
    documento_respaldo_id?: string | null
  },
  mediciones?: Array<{ periodo: string; valor: number | string }>,
): Promise<boolean> {
  const fields: string[] = []
  const params: unknown[] = []
  const push = (col: string, val: unknown) => {
    params.push(val)
    fields.push(`${col} = $${params.length}`)
  }
  if (input.nombre !== undefined) push('nombre', input.nombre)
  if (input.descripcion !== undefined) push('descripcion', input.descripcion)
  if (input.unidad !== undefined) push('unidad', input.unidad)
  if (input.meta !== undefined) push('meta', input.meta)
  if (input.fecha_evaluacion !== undefined) push('fecha_evaluacion', input.fecha_evaluacion)
  if (input.resultado_texto !== undefined) push('resultado_texto', input.resultado_texto)
  if (input.documento_respaldo_id !== undefined) push('documento_respaldo_id', input.documento_respaldo_id)
  if (fields.length > 0) {
    fields.push('updated_at = now()')
    params.push(id)
    const rows = await sql.unsafe<{ id: string }[]>(
      `UPDATE indicadores SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING id`,
      params as string[],
    )
    if (rows.length === 0) return false
  } else {
    const exists = await sql<{ id: string }[]>`SELECT id FROM indicadores WHERE id = ${id}`
    if (exists.length === 0) return false
  }
  if (mediciones !== undefined) {
    await sql`DELETE FROM mediciones WHERE indicador_id = ${id}`
    for (const m of mediciones) {
      await sql`INSERT INTO mediciones (indicador_id, periodo, valor) VALUES (${id}, ${m.periodo ?? ''}, ${m.valor})`
    }
  }
  return true
}

export async function deleteIndicador(id: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`DELETE FROM indicadores WHERE id = ${id} RETURNING id`
  return rows.length > 0
}
