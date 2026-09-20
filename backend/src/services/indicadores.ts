import { sql, type Db } from '../db/pool.ts'

/** Campos que llegan del formulario. Los ausentes no se tocan al editar. */
export interface DatosIndicador {
  nombre?: string
  descripcion?: string
  unidad?: string
  meta?: number | null
  fecha_evaluacion?: string
  resultado_texto?: string
  documento_respaldo_id?: string | null
  mediciones?: Array<{ periodo: string; valor: number }>
}

export type ResultadoIndicador = { ok: true; datos: DatosIndicador } | { ok: false; error: string }

const CAMPOS_TEXTO = [
  'nombre',
  'descripcion',
  'unidad',
  'fecha_evaluacion',
  'resultado_texto',
] as const

/** Valor para una columna NUMERIC: null la vacía, undefined es que no es número. */
function numero(valor: unknown): number | null | undefined {
  if (valor === null || valor === '') return null
  const n = typeof valor === 'number' || typeof valor === 'string' ? Number(valor) : NaN
  return Number.isFinite(n) ? n : undefined
}

/**
 * Normaliza y valida el cuerpo JSON de un indicador. La meta y los valores de
 * las mediciones acaban en columnas NUMERIC y las mediciones se recorren como
 * lista: sin esta comprobación, un texto o una lista que no lo es llegaban a
 * la base y la petición acababa en 500 en vez de explicar qué venía mal.
 */
export function validarIndicador(cuerpo: unknown): ResultadoIndicador {
  const entrada = (cuerpo ?? {}) as Record<string, unknown>
  const falla = (error: string): ResultadoIndicador => ({ ok: false, error })
  const datos: DatosIndicador = {}

  for (const campo of CAMPOS_TEXTO) {
    const valor = entrada[campo]
    if (valor === undefined) continue
    if (typeof valor !== 'string') return falla(`El campo ${campo} debe ser texto.`)
    datos[campo] = valor
  }

  if (entrada.meta !== undefined) {
    const meta = numero(entrada.meta)
    if (meta === undefined) return falla('La meta debe ser un número.')
    datos.meta = meta
  }

  if (entrada.documento_respaldo_id !== undefined) {
    const id = entrada.documento_respaldo_id
    if (id !== null && typeof id !== 'string') return falla('El documento de respaldo no existe')
    // Sin respaldo llega como cadena vacía desde el formulario.
    datos.documento_respaldo_id = id === null || id === '' ? null : id
  }

  if (entrada.mediciones !== undefined) {
    if (!Array.isArray(entrada.mediciones)) return falla('Las mediciones deben venir en una lista.')
    datos.mediciones = []
    for (const fila of entrada.mediciones) {
      const medicion = (fila ?? {}) as Record<string, unknown>
      const valor = numero(medicion.valor)
      if (valor === undefined || valor === null) {
        return falla('Cada medición necesita un valor numérico.')
      }
      const periodo = medicion.periodo
      if (periodo !== undefined && typeof periodo !== 'string') {
        return falla('El periodo de cada medición debe ser texto.')
      }
      datos.mediciones.push({ periodo: periodo ?? '', valor })
    }
  }

  return { ok: true, datos }
}

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
  documento_respaldo: { id: string; titulo: string; tipo: string; actividad_id: string } | null
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
  const medByInd = new Map<
    string,
    Array<{ indicador_id: string; id: string; periodo: string; valor: string }>
  >()
  for (const m of meds) {
    const arr = medByInd.get(m.indicador_id) ?? []
    arr.push(m as { indicador_id: string; id: string; periodo: string; valor: string })
    medByInd.set(m.indicador_id, arr)
  }
  // El respaldo es un archivo de una actividad; solo se muestra si esa
  // actividad está publicada, porque el enlace lo abre cualquiera.
  const docIds = [...new Set(rows.map((r) => r.documento_respaldo_id).filter(Boolean) as string[])]
  const docRows =
    docIds.length > 0
      ? await sql<Array<{ id: string; titulo: string; tipo: string; actividad_id: string }>>`
          SELECT f.id::text AS id, COALESCE(NULLIF(f.titulo, ''), f.nombre_original) AS titulo,
                 f.tipo, f.actividad_id::text AS actividad_id
          FROM actividad_archivos f JOIN actividades a ON a.id = f.actividad_id
          WHERE f.id IN ${sql(docIds)} AND a.publicacion = 'publicado'
        `
      : []
  const docMap = new Map(docRows.map((d) => [d.id, d]))
  return rows.map((r) => ({
    ...r,
    mediciones: (medByInd.get(r.id) ?? []).map((m) => ({
      id: m.id,
      periodo: m.periodo,
      valor: m.valor,
    })),
    documento_respaldo: r.documento_respaldo_id
      ? (docMap.get(r.documento_respaldo_id) ?? null)
      : null,
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
  if (input.documento_respaldo_id !== undefined)
    push('documento_respaldo_id', input.documento_respaldo_id)
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
