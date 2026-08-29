import { sql } from '../db/pool.ts'

export const CATEGORIAS_POEL = ['Talleres Sectoriales', 'Consulta pública'] as const
export type CategoriaPoel = (typeof CATEGORIAS_POEL)[number]

export function isCategoriaPoel(v: string): v is CategoriaPoel {
  return (CATEGORIAS_POEL as readonly string[]).includes(v)
}

/**
 * Sesiones del Programa de Ordenamiento Ecológico (POEL).
 */
export interface PoelSesion {
  id: string
  categoria: string
  orden: number
  titulo: string
  descripcion: string
  fecha: string | null
  ubicacion: string
  activo: boolean
  /** Coordenadas del lugar, aparte de la direccion escrita. */
  latitud: string
  longitud: string
  imagen_ruta: string
  imagen_nombre: string
  imagen_mime: string
}

export async function listPoel(): Promise<PoelSesion[]> {
  return sql<PoelSesion[]>`
    SELECT id::text AS id, categoria, orden, titulo, descripcion,
           fecha::text AS fecha, ubicacion, activo,
           latitud, longitud, imagen_ruta, imagen_nombre, imagen_mime
    FROM poel_sesiones
    ORDER BY orden ASC, id ASC
  `
}

export async function createPoelSesion(input: {
  categoria: string
  orden: number
  titulo: string
  descripcion?: string
  fecha?: string | null
  ubicacion?: string
  latitud?: string
  longitud?: string
}): Promise<PoelSesion> {
  if (!isCategoriaPoel(input.categoria)) {
    throw Object.assign(new Error('categoría inválida'), { status: 400 })
  }
  const rows = await sql<PoelSesion[]>`
    INSERT INTO poel_sesiones (categoria, orden, titulo, descripcion, fecha, ubicacion, latitud, longitud)
    VALUES (${input.categoria}, ${input.orden}, ${input.titulo}, ${input.descripcion ?? ''},
            ${input.fecha ?? null}, ${input.ubicacion ?? ''}, ${input.latitud ?? ''}, ${input.longitud ?? ''})
    RETURNING id::text AS id, categoria, orden, titulo, descripcion, fecha::text AS fecha,
              ubicacion, activo, latitud, longitud, imagen_ruta, imagen_nombre, imagen_mime
  `
  return rows[0]
}

export interface PoelUpdate {
  categoria?: string
  orden?: number
  titulo?: string
  descripcion?: string
  fecha?: string | null
  ubicacion?: string
  latitud?: string
  longitud?: string
  activo?: boolean
}

/**
 * Actualiza una sesión. Es un update PARCIAL: solo se tocan las claves que
 * vienen en `input`, para que el botón de activar/desactivar no tenga que
 * reenviar el resto del formulario y pisar lo que otro admin acabe de editar.
 * Devuelve null si la sesión no existe.
 */
export async function updatePoelSesion(id: string, input: PoelUpdate): Promise<PoelSesion | null> {
  if (input.categoria !== undefined && !isCategoriaPoel(input.categoria)) {
    throw Object.assign(new Error('categoría inválida'), { status: 400 })
  }

  // `fecha` se resuelve fuera de la consulta: aquí null SÍ es un valor válido
  // (quitar la fecha), así que COALESCE no sirve para distinguir "no tocar" de
  // "ponla en null". El fragmento va aparte porque no se pueden anidar
  // backticks dentro de otro template literal.
  const fechaFrag = input.fecha === undefined ? sql`fecha` : sql`${input.fecha}::date`

  const rows = await sql<PoelSesion[]>`
    UPDATE poel_sesiones SET
      categoria   = COALESCE(${input.categoria ?? null}, categoria),
      orden       = COALESCE(${input.orden ?? null}, orden),
      titulo      = COALESCE(${input.titulo ?? null}, titulo),
      descripcion = COALESCE(${input.descripcion ?? null}, descripcion),
      ubicacion   = COALESCE(${input.ubicacion ?? null}, ubicacion),
      latitud     = COALESCE(${input.latitud ?? null}, latitud),
      longitud    = COALESCE(${input.longitud ?? null}, longitud),
      activo      = COALESCE(${input.activo ?? null}, activo),
      fecha       = ${fechaFrag},
      updated_at  = now()
    WHERE id = ${id}
    RETURNING id::text AS id, categoria, orden, titulo, descripcion, fecha::text AS fecha,
              ubicacion, activo, latitud, longitud, imagen_ruta, imagen_nombre, imagen_mime
  `
  return rows[0] ?? null
}

/** Guarda la referencia de la imagen ya escrita en disco por `upload.ts`. */
export async function setPoelImagen(
  id: string,
  imagen: { nombreOriginal: string; mime: string; rutaLocal: string },
): Promise<PoelSesion | null> {
  const rows = await sql<PoelSesion[]>`
    UPDATE poel_sesiones
    SET imagen_ruta = ${imagen.rutaLocal},
        imagen_nombre = ${imagen.nombreOriginal},
        imagen_mime = ${imagen.mime},
        updated_at = now()
    WHERE id = ${id}
    RETURNING id::text AS id, categoria, orden, titulo, descripcion, fecha::text AS fecha,
              ubicacion, activo, latitud, longitud, imagen_ruta, imagen_nombre, imagen_mime
  `
  return rows[0] ?? null
}

/** Datos mínimos para servir la imagen de una sesión. */
export async function getPoelImagen(
  id: string,
): Promise<{ ruta: string; mime: string; nombre: string } | null> {
  const rows = await sql<
    Array<{ imagen_ruta: string; imagen_mime: string; imagen_nombre: string }>
  >`
    SELECT imagen_ruta, imagen_mime, imagen_nombre FROM poel_sesiones WHERE id = ${id}
  `
  const r = rows[0]
  if (!r || !r.imagen_ruta) return null
  return { ruta: r.imagen_ruta, mime: r.imagen_mime, nombre: r.imagen_nombre }
}

export async function deletePoelSesion(id: string): Promise<boolean> {
  const rows = await sql`DELETE FROM poel_sesiones WHERE id = ${id} RETURNING id`
  return rows.length > 0
}
