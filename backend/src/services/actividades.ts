import { rm } from 'node:fs/promises'
import { isAbsolute, resolve, sep } from 'node:path'

import { sql, type Db } from '../db/pool.ts'
import { linea, parrafos } from './texto.ts'
import { getExtension } from './upload-guard.ts'
import type { ArchivoSubido } from './upload.ts'

/**
 * Actividades y avances del Programa.
 *
 * Cada actividad se registra UNA sola vez y el portal decide dónde mostrarla
 * según su fecha, su estado y su publicación (ver las condiciones de abajo):
 * programada → próximas actividades y calendario; realizada → avances del
 * Programa; con aviso en vigencia → franja de avisos de la portada. Sustituye
 * a los apartados separados de avisos, reuniones, sesiones POEL y documentos.
 */

// ── Catálogos ───────────────────────────────────────────────────────────────
// Espejo de app/data/programa.ts y de los CHECK de schema.sql.

export const FASES_PROGRAMA = [
  'Formulación',
  'Expedición',
  'Ejecución',
  'Evaluación',
  'Modificación',
] as const
export type FasePrograma = (typeof FASES_PROGRAMA)[number]

export const TIPOS_ACTIVIDAD = [
  'Sesión del Comité',
  'Sesión del Consejo',
  'Sesión de Cabildo',
  'Foro',
  'Taller',
  'Mesa de trabajo',
  'Reunión técnica',
  'Presentación',
  'Consulta pública',
  'Firma de convenio',
  'Aprobación',
  'Publicación de producto técnico',
  'Otra',
] as const
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number]

export const ESTADOS_ACTIVIDAD = ['programada', 'realizada', 'reprogramada', 'cancelada'] as const
export type EstadoActividad = (typeof ESTADOS_ACTIVIDAD)[number]

export const ESTADOS_PUBLICACION = ['borrador', 'publicado', 'oculto'] as const
export type EstadoPublicacion = (typeof ESTADOS_PUBLICACION)[number]

export const TIPOS_ARCHIVO = [
  'Convocatoria',
  'Orden del día',
  'Acta',
  'Acuerdo',
  'Lista de asistencia',
  'Presentación',
  'Dictamen',
  'Documento aprobado',
  'Fotografía',
  'Otro',
] as const
export type TipoArchivo = (typeof TIPOS_ARCHIVO)[number]

export const TIPO_FOTOGRAFIA: TipoArchivo = 'Fotografía'

/** Tope de archivos por envío del formulario (fotografías + documentos). */
export const MAX_ARCHIVOS_POR_ENVIO = 20

function esDe<T extends string>(lista: readonly T[], valor: unknown): valor is T {
  return typeof valor === 'string' && (lista as readonly string[]).includes(valor)
}

export const esFasePrograma = (v: unknown): v is FasePrograma => esDe(FASES_PROGRAMA, v)
export const esTipoActividad = (v: unknown): v is TipoActividad => esDe(TIPOS_ACTIVIDAD, v)
export const esEstadoActividad = (v: unknown): v is EstadoActividad => esDe(ESTADOS_ACTIVIDAD, v)
export const esEstadoPublicacion = (v: unknown): v is EstadoPublicacion =>
  esDe(ESTADOS_PUBLICACION, v)
export const esTipoArchivo = (v: unknown): v is TipoArchivo => esDe(TIPOS_ARCHIVO, v)

/**
 * Una «fotografía» se muestra en una galería, así que solo valen formatos que
 * cualquier navegador dibuja. `isImageExtension` del guard no sirve aquí: da
 * por imagen un DWG o un TIFF, que en la galería serían un recuadro roto.
 */
const EXTENSIONES_FOTO = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

export function esFotoWeb(nombreArchivo: string): boolean {
  return EXTENSIONES_FOTO.has(getExtension(nombreArchivo))
}

// ── Validación de lo que llega del formulario ──────────────────────────────

export interface DatosActividad {
  titulo: string
  fase: FasePrograma
  tipo: TipoActividad
  estado: EstadoActividad
  fecha: string
  hora_inicio: string
  hora_fin: string
  lugar: string
  direccion: string
  latitud: string
  longitud: string
  descripcion: string
  resultados: string
  acuerdos: string
  publicacion: EstadoPublicacion
  aviso_activo: boolean
  aviso_titulo: string
  aviso_descripcion: string
  aviso_inicio: string | null
  aviso_fin: string | null
}

export type ResultadoValidacion = { ok: true; datos: DatosActividad } | { ok: false; error: string }

const LARGO = {
  titulo: 300,
  lugar: 300,
  direccion: 500,
  texto: 5000,
  avisoTitulo: 200,
  avisoDescripcion: 500,
} as const

/** `YYYY-MM-DD` que además existe en el calendario (rechaza 2026-02-31). */
export function esFechaIso(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  )
}

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function coordenadaValida(valor: string, limite: number): boolean {
  return /^-?\d{1,3}(\.\d+)?$/.test(valor) && Math.abs(Number(valor)) <= limite
}

const VERDADERO = new Set(['1', 'on', 'true', 'si', 'sí'])

/**
 * Normaliza y valida el formulario de una actividad. `hoy` (YYYY-MM-DD, hora de
 * México) es el inicio por omisión del aviso. Devuelve el primer error con un
 * texto que se puede mostrar tal cual al administrador.
 */
export function validarActividad(
  entrada: Record<string, string | undefined>,
  hoy: string,
): ResultadoValidacion {
  const falla = (error: string): ResultadoValidacion => ({ ok: false, error })

  const titulo = linea(entrada.titulo)
  if (!titulo) return falla('Escribe el nombre de la actividad.')
  if (titulo.length > LARGO.titulo) {
    return falla(`El nombre de la actividad admite hasta ${LARGO.titulo} caracteres.`)
  }

  const { fase, tipo, estado } = entrada
  if (!esFasePrograma(fase)) return falla('Elige la fase del Programa a la que corresponde.')
  if (!esTipoActividad(tipo)) return falla('Elige el tipo de actividad.')
  if (!esEstadoActividad(estado)) return falla('Elige el estado de la actividad.')

  const publicacion = entrada.publicacion?.trim() || 'publicado'
  if (!esEstadoPublicacion(publicacion)) return falla('Elige el estado de publicación.')

  const fecha = (entrada.fecha ?? '').trim()
  if (!esFechaIso(fecha)) return falla('Indica una fecha válida para la actividad.')

  const horaInicio = (entrada.hora_inicio ?? '').trim()
  const horaFin = (entrada.hora_fin ?? '').trim()
  if (horaInicio && !HORA_RE.test(horaInicio)) return falla('La hora de inicio no es válida.')
  if (horaFin && !HORA_RE.test(horaFin)) return falla('La hora de conclusión no es válida.')
  if (horaFin && !horaInicio) return falla('Indica también la hora de inicio.')
  if (horaInicio && horaFin && horaFin <= horaInicio) {
    return falla('La hora de conclusión debe ser posterior a la de inicio.')
  }

  const lugar = linea(entrada.lugar)
  const direccion = linea(entrada.direccion)
  if (lugar.length > LARGO.lugar) {
    return falla(`El lugar admite hasta ${LARGO.lugar} caracteres.`)
  }
  if (direccion.length > LARGO.direccion) {
    return falla(`La dirección admite hasta ${LARGO.direccion} caracteres.`)
  }

  const latitud = (entrada.latitud ?? '').trim()
  const longitud = (entrada.longitud ?? '').trim()
  if (Boolean(latitud) !== Boolean(longitud)) {
    return falla('Indica latitud y longitud juntas, o deja ambas vacías.')
  }
  if (latitud && (!coordenadaValida(latitud, 90) || !coordenadaValida(longitud, 180))) {
    return falla('Las coordenadas del mapa no son válidas.')
  }

  const descripcion = parrafos(entrada.descripcion)
  const resultados = parrafos(entrada.resultados)
  const acuerdos = parrafos(entrada.acuerdos)
  for (const [texto, nombre] of [
    [descripcion, 'La descripción'],
    [resultados, 'El resultado'],
    [acuerdos, 'Los acuerdos'],
  ] as const) {
    if (texto.length > LARGO.texto)
      return falla(`${nombre} admite hasta ${LARGO.texto} caracteres.`)
  }

  // Aviso: pertenece a la actividad y solo sale en la portada en su vigencia.
  const avisoActivo = VERDADERO.has((entrada.aviso_activo ?? '').trim().toLowerCase())
  let avisoInicio = (entrada.aviso_inicio ?? '').trim() || null
  let avisoFin = (entrada.aviso_fin ?? '').trim() || null
  if (avisoInicio && !esFechaIso(avisoInicio)) {
    return falla('La fecha de inicio del aviso no es válida.')
  }
  if (avisoFin && !esFechaIso(avisoFin)) return falla('La fecha de término del aviso no es válida.')

  const avisoDescripcion = parrafos(entrada.aviso_descripcion)
  if (avisoDescripcion.length > LARGO.avisoDescripcion) {
    return falla(`La descripción del aviso admite hasta ${LARGO.avisoDescripcion} caracteres.`)
  }
  let avisoTitulo = linea(entrada.aviso_titulo)
  if (avisoTitulo.length > LARGO.avisoTitulo) {
    return falla(`El título del aviso admite hasta ${LARGO.avisoTitulo} caracteres.`)
  }

  if (avisoActivo) {
    avisoTitulo ||= titulo.slice(0, LARGO.avisoTitulo)
    avisoInicio ??= hoy
    // Por omisión el aviso se ve hasta el día de la actividad.
    avisoFin ??= fecha >= avisoInicio ? fecha : null
    if (!avisoFin) return falla('Indica hasta qué fecha se muestra el aviso.')
    if (avisoFin < avisoInicio) {
      return falla('El aviso debe terminar el mismo día de su inicio o después.')
    }
  }

  return {
    ok: true,
    datos: {
      titulo,
      fase,
      tipo,
      estado,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      lugar,
      direccion,
      latitud,
      longitud,
      descripcion,
      resultados,
      acuerdos,
      publicacion,
      aviso_activo: avisoActivo,
      aviso_titulo: avisoTitulo,
      aviso_descripcion: avisoDescripcion,
      aviso_inicio: avisoInicio,
      aviso_fin: avisoFin,
    },
  }
}

// ── Reglas de visibilidad (única fuente de verdad) ─────────────────────────
// Las mismas condiciones filtran las vistas públicas y alimentan el resumen
// «dónde aparece» del panel, así que no pueden contradecirse.

/** Hoy en México: el portal es municipal y el servidor corre en UTC. */
const hoySql = () => sql`(now() AT TIME ZONE 'America/Mexico_City')::date`

/** El mismo «hoy» que `hoySql`, en `YYYY-MM-DD`, para validar formularios. */
export function hoyEnMexico(ahora: Date = new Date()): string {
  // `en-CA` formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(ahora)
}

const esProxima = () =>
  sql`a.publicacion = 'publicado' AND a.estado IN ('programada', 'reprogramada') AND a.fecha >= ${hoySql()}`
const esAvance = () => sql`a.publicacion = 'publicado' AND a.estado = 'realizada'`
const avisoEnVigencia = () =>
  sql`a.aviso_activo AND a.aviso_inicio <= ${hoySql()} AND a.aviso_fin >= ${hoySql()}`

const columnas = () => sql`
  a.id::text AS id, a.titulo, a.fase, a.tipo, a.estado, a.fecha::text AS fecha,
  a.hora_inicio, a.hora_fin, a.lugar, a.direccion, a.latitud, a.longitud,
  a.descripcion, a.resultados, a.acuerdos, a.publicacion,
  a.aviso_activo, a.aviso_titulo, a.aviso_descripcion,
  a.aviso_inicio::text AS aviso_inicio, a.aviso_fin::text AS aviso_fin,
  a.created_at::text AS created_at, a.updated_at::text AS updated_at,
  (${avisoEnVigencia()}) AS aviso_vigente
`

const columnasGestion = () => sql`
  (${esProxima()}) AS en_proximas,
  (${esAvance()}) AS en_avances,
  CASE WHEN NOT a.aviso_activo THEN 'sin_aviso'
       WHEN a.aviso_fin < ${hoySql()} THEN 'vencido'
       WHEN a.aviso_inicio > ${hoySql()} THEN 'programado'
       ELSE 'vigente' END AS aviso_estado,
  (a.estado IN ('programada', 'reprogramada') AND a.fecha < ${hoySql()}) AS fecha_pasada,
  (SELECT count(*) FROM actividad_archivos f WHERE f.actividad_id = a.id)::int AS total_archivos
`

// ── Formas que se devuelven ─────────────────────────────────────────────────

interface FilaActividad extends DatosActividad {
  id: string
  created_at: string
  updated_at: string
  aviso_vigente: boolean
}

interface FilaGestion extends FilaActividad {
  en_proximas: boolean
  en_avances: boolean
  aviso_estado: EstadoAviso
  fecha_pasada: boolean
  total_archivos: number
}

/** Archivo tal como se expone: nunca incluye la ruta en disco. */
export interface ArchivoActividad {
  id: string
  actividad_id: string
  tipo: TipoArchivo
  titulo: string
  nombre_original: string
  mime: string
  size: number
  created_at: string
}

export interface AvisoActividad {
  titulo: string
  descripcion: string
  inicio: string
  fin: string
}

/** Lo que ve la ciudadanía: sin estado de publicación ni avisos fuera de vigencia. */
export interface ActividadPublica {
  id: string
  titulo: string
  fase: FasePrograma
  tipo: TipoActividad
  estado: EstadoActividad
  fecha: string
  hora_inicio: string
  hora_fin: string
  lugar: string
  direccion: string
  latitud: string
  longitud: string
  descripcion: string
  resultados: string
  acuerdos: string
  /** Solo si el aviso está en vigencia hoy. */
  aviso: AvisoActividad | null
  archivos?: ArchivoActividad[]
}

export type EstadoAviso = 'sin_aviso' | 'programado' | 'vigente' | 'vencido'

/** Dónde aparece hoy la actividad en el portal (resumen para el panel). */
export interface VisibilidadActividad {
  proximas: boolean
  calendario: boolean
  avances: boolean
  aviso: EstadoAviso
  /** Sigue «programada» con la fecha ya pasada: toca actualizar su estado. */
  fechaPasada: boolean
}

export interface ActividadGestion extends DatosActividad {
  id: string
  created_at: string
  updated_at: string
  total_archivos: number
  visibilidad: VisibilidadActividad
}

export interface ActividadDetalleGestion extends ActividadGestion {
  archivos: ArchivoActividad[]
}

function aPublica(fila: FilaActividad): ActividadPublica {
  return {
    id: fila.id,
    titulo: fila.titulo,
    fase: fila.fase,
    tipo: fila.tipo,
    estado: fila.estado,
    fecha: fila.fecha,
    hora_inicio: fila.hora_inicio,
    hora_fin: fila.hora_fin,
    lugar: fila.lugar,
    direccion: fila.direccion,
    latitud: fila.latitud,
    longitud: fila.longitud,
    descripcion: fila.descripcion,
    resultados: fila.resultados,
    acuerdos: fila.acuerdos,
    aviso:
      fila.aviso_vigente && fila.aviso_inicio && fila.aviso_fin
        ? {
            titulo: fila.aviso_titulo || fila.titulo,
            descripcion: fila.aviso_descripcion,
            inicio: fila.aviso_inicio,
            fin: fila.aviso_fin,
          }
        : null,
  }
}

function aGestion(fila: FilaGestion): ActividadGestion {
  return {
    id: fila.id,
    titulo: fila.titulo,
    fase: fila.fase,
    tipo: fila.tipo,
    estado: fila.estado,
    fecha: fila.fecha,
    hora_inicio: fila.hora_inicio,
    hora_fin: fila.hora_fin,
    lugar: fila.lugar,
    direccion: fila.direccion,
    latitud: fila.latitud,
    longitud: fila.longitud,
    descripcion: fila.descripcion,
    resultados: fila.resultados,
    acuerdos: fila.acuerdos,
    publicacion: fila.publicacion,
    aviso_activo: fila.aviso_activo,
    aviso_titulo: fila.aviso_titulo,
    aviso_descripcion: fila.aviso_descripcion,
    aviso_inicio: fila.aviso_inicio,
    aviso_fin: fila.aviso_fin,
    created_at: fila.created_at,
    updated_at: fila.updated_at,
    total_archivos: fila.total_archivos,
    visibilidad: {
      proximas: fila.en_proximas,
      calendario: fila.publicacion === 'publicado',
      avances: fila.en_avances,
      aviso: fila.aviso_estado,
      fechaPasada: fila.fecha_pasada,
    },
  }
}

async function archivosDe(ids: string[]): Promise<Map<string, ArchivoActividad[]>> {
  const porActividad = new Map<string, ArchivoActividad[]>()
  if (ids.length === 0) return porActividad
  const filas = await sql<ArchivoActividad[]>`
    SELECT id::text AS id, actividad_id::text AS actividad_id, tipo, titulo, nombre_original,
           mime, size::int AS size, created_at::text AS created_at
    FROM actividad_archivos
    WHERE actividad_id IN ${sql(ids)}
    ORDER BY created_at, id
  `
  for (const archivo of filas) {
    const lista = porActividad.get(archivo.actividad_id) ?? []
    lista.push(archivo)
    porActividad.set(archivo.actividad_id, lista)
  }
  return porActividad
}

// ── Vistas públicas ─────────────────────────────────────────────────────────

/** Próximas actividades: programadas o reprogramadas de hoy en adelante. */
export async function listarProximas(limite?: number): Promise<ActividadPublica[]> {
  const filas = await sql<FilaActividad[]>`
    SELECT ${columnas()} FROM actividades a
    WHERE ${esProxima()}
    ORDER BY a.fecha, a.hora_inicio, a.titulo
    ${limite ? sql`LIMIT ${limite}` : sql``}
  `
  return filas.map(aPublica)
}

/** Avances del Programa: las realizadas, en orden cronológico y con sus archivos. */
export async function listarAvances(fase?: FasePrograma): Promise<ActividadPublica[]> {
  const filas = await sql<FilaActividad[]>`
    SELECT ${columnas()} FROM actividades a
    WHERE ${esAvance()} ${fase ? sql`AND a.fase = ${fase}` : sql``}
    ORDER BY a.fecha, a.hora_inicio, a.titulo
  `
  const archivos = await archivosDe(filas.map((f) => f.id))
  return filas.map((f) => ({ ...aPublica(f), archivos: archivos.get(f.id) ?? [] }))
}

/** Rango [primer día, último día] de un mes `YYYY-MM`, o null si no es un mes válido. */
export function rangoDeMes(mes: string): { desde: string; hasta: string } | null {
  // El mismo criterio que la fecha de una actividad: así tampoco pasa el año
  // 0000, que Postgres no tiene y hacía fallar la consulta con un 500.
  const desde = `${mes}-01`
  if (!esFechaIso(desde)) return null
  const [anio, numero] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(anio, numero, 0)).getUTCDate()
  return { desde, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` }
}

/** Calendario: todas las publicadas del mes, con su estado. */
export async function listarCalendario(mes: string): Promise<ActividadPublica[] | null> {
  const rango = rangoDeMes(mes)
  if (!rango) return null
  const filas = await sql<FilaActividad[]>`
    SELECT ${columnas()} FROM actividades a
    WHERE a.publicacion = 'publicado' AND a.fecha BETWEEN ${rango.desde} AND ${rango.hasta}
    ORDER BY a.fecha, a.hora_inicio, a.titulo
  `
  return filas.map(aPublica)
}

export interface AvisoPortada extends AvisoActividad {
  actividad_id: string
}

/**
 * El aviso de la franja de la portada. Si hay varios en vigencia gana el que
 * empezó a publicarse más recientemente: un aviso nuevo sustituye al anterior.
 */
export async function obtenerAvisoVigente(): Promise<AvisoPortada | null> {
  const filas = await sql<AvisoPortada[]>`
    SELECT a.id::text AS actividad_id,
           COALESCE(NULLIF(a.aviso_titulo, ''), a.titulo) AS titulo,
           a.aviso_descripcion AS descripcion,
           a.aviso_inicio::text AS inicio, a.aviso_fin::text AS fin
    FROM actividades a
    WHERE a.publicacion = 'publicado' AND ${avisoEnVigencia()}
    ORDER BY a.aviso_inicio DESC, a.updated_at DESC
    LIMIT 1
  `
  return filas[0] ?? null
}

/** Ficha pública: solo actividades publicadas. */
export async function obtenerActividadPublica(id: string): Promise<ActividadPublica | null> {
  const filas = await sql<FilaActividad[]>`
    SELECT ${columnas()} FROM actividades a
    WHERE a.id = ${id} AND a.publicacion = 'publicado'
  `
  if (filas.length === 0) return null
  const archivos = await archivosDe([id])
  return { ...aPublica(filas[0]), archivos: archivos.get(id) ?? [] }
}

export interface DocumentoPublico extends ArchivoActividad {
  actividad_titulo: string
  actividad_fecha: string
  actividad_fase: FasePrograma
}

/** Repositorio público: los archivos (sin fotografías) de las actividades publicadas. */
export async function listarDocumentosPublicos(filtros: {
  tipo?: TipoArchivo
  fase?: FasePrograma
}): Promise<DocumentoPublico[]> {
  return sql<DocumentoPublico[]>`
    SELECT f.id::text AS id, f.actividad_id::text AS actividad_id, f.tipo, f.titulo,
           f.nombre_original, f.mime, f.size::int AS size, f.created_at::text AS created_at,
           a.titulo AS actividad_titulo, a.fecha::text AS actividad_fecha, a.fase AS actividad_fase
    FROM actividad_archivos f
    JOIN actividades a ON a.id = f.actividad_id
    WHERE a.publicacion = 'publicado' AND f.tipo <> ${TIPO_FOTOGRAFIA}
      ${filtros.tipo ? sql`AND f.tipo = ${filtros.tipo}` : sql``}
      ${filtros.fase ? sql`AND a.fase = ${filtros.fase}` : sql``}
    ORDER BY a.fecha DESC, f.created_at DESC, f.id
  `
}

// ── Panel ───────────────────────────────────────────────────────────────────

export interface FiltrosGestion {
  estado?: EstadoActividad
  publicacion?: EstadoPublicacion
  fase?: FasePrograma
  /** Mes `YYYY-MM` (vista de calendario del panel). */
  mes?: string
}

/** Todas las actividades, sin importar su publicación, con su resumen de visibilidad. */
export async function listarGestion(filtros: FiltrosGestion = {}): Promise<ActividadGestion[]> {
  const rango = filtros.mes ? rangoDeMes(filtros.mes) : null
  const filas = await sql<FilaGestion[]>`
    SELECT ${columnas()}, ${columnasGestion()} FROM actividades a
    WHERE true
      ${filtros.estado ? sql`AND a.estado = ${filtros.estado}` : sql``}
      ${filtros.publicacion ? sql`AND a.publicacion = ${filtros.publicacion}` : sql``}
      ${filtros.fase ? sql`AND a.fase = ${filtros.fase}` : sql``}
      ${rango ? sql`AND a.fecha BETWEEN ${rango.desde} AND ${rango.hasta}` : sql``}
    ORDER BY a.fecha DESC, a.hora_inicio DESC, a.created_at DESC
  `
  return filas.map(aGestion)
}

export async function obtenerActividadGestion(id: string): Promise<ActividadDetalleGestion | null> {
  const filas = await sql<FilaGestion[]>`
    SELECT ${columnas()}, ${columnasGestion()} FROM actividades a WHERE a.id = ${id}
  `
  if (filas.length === 0) return null
  const archivos = await archivosDe([id])
  return { ...aGestion(filas[0]), archivos: archivos.get(id) ?? [] }
}

export interface ArchivoNuevo extends ArchivoSubido {
  tipo: TipoArchivo
}

async function insertarArchivos(db: Db, actividadId: string, archivos: ArchivoNuevo[]) {
  if (archivos.length === 0) return
  const filas = archivos.map((a) => ({
    actividad_id: actividadId,
    tipo: a.tipo,
    nombre_original: a.nombreOriginal,
    mime: a.mime,
    size: a.size,
    ruta_local: a.rutaLocal,
  }))
  await db`INSERT INTO actividad_archivos ${db(filas)}`
}

export async function crearActividad(
  db: Db,
  datos: DatosActividad,
  archivos: ArchivoNuevo[],
  creadoPor: string | null,
): Promise<string> {
  const [fila] = await db<{ id: string }[]>`
    INSERT INTO actividades ${db({ ...datos, creado_por: creadoPor })}
    RETURNING id::text AS id
  `
  await insertarArchivos(db, fila.id, archivos)
  return fila.id
}

/**
 * Edita el MISMO registro (nunca se crea otro al realizarse la actividad): los
 * archivos nuevos se suman a los que ya tenía. Devuelve false si no existe.
 */
export async function actualizarActividad(
  db: Db,
  id: string,
  datos: DatosActividad,
  archivos: ArchivoNuevo[],
): Promise<boolean> {
  const filas = await db`
    UPDATE actividades SET ${db(datos)}, updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `
  if (filas.length === 0) return false
  await insertarArchivos(db, id, archivos)
  return true
}

const UPLOAD_DIR = resolve(process.cwd(), 'uploads')

/**
 * Ruta absoluta de un archivo guardado, solo si cae dentro de `uploads/`. Se
 * compara con el separador al final: `startsWith('/app/uploads')` también
 * aceptaría `/app/uploads-otra/…`.
 */
export function rutaEnUploads(rutaGuardada: string): string | null {
  const ruta = isAbsolute(rutaGuardada) ? resolve(rutaGuardada) : resolve(UPLOAD_DIR, rutaGuardada)
  return ruta.startsWith(UPLOAD_DIR + sep) ? ruta : null
}

/**
 * Borra del disco las rutas que ya ningún archivo usa. Un documento del
 * repositorio viejo ligado a dos actividades quedó como dos filas con la misma
 * ruta: quitarlo de una no debe dejar sin archivo a la otra.
 */
async function borrarHuerfanos(rutas: string[]): Promise<void> {
  const unicas = [...new Set(rutas)]
  if (unicas.length === 0) return
  const enUso = await sql<{ ruta_local: string }[]>`
    SELECT DISTINCT ruta_local FROM actividad_archivos WHERE ruta_local IN ${sql(unicas)}
  `
  const usadas = new Set(enUso.map((r) => r.ruta_local))
  await Promise.allSettled(
    unicas
      .filter((ruta) => !usadas.has(ruta))
      .map((ruta) => rutaEnUploads(ruta))
      .filter((ruta): ruta is string => ruta !== null)
      .map((ruta) => rm(ruta, { force: true })),
  )
}

export async function eliminarActividad(id: string): Promise<boolean> {
  const rutas = await sql.begin(async (tx) => {
    // El bloqueo va antes de leer los archivos: una edición en curso que sume
    // uno termina primero y su archivo entra en la lista; si no, el CASCADE
    // borraba la fila y el archivo se quedaba en disco sin nada que lo use.
    const existe = await tx`SELECT 1 FROM actividades WHERE id = ${id} FOR UPDATE`
    if (existe.length === 0) return null
    const archivos = await tx<{ ruta_local: string }[]>`
      SELECT ruta_local FROM actividad_archivos WHERE actividad_id = ${id}
    `
    await tx`DELETE FROM actividades WHERE id = ${id}`
    return archivos.map((a) => a.ruta_local)
  })
  if (rutas === null) return false
  await borrarHuerfanos(rutas)
  return true
}

// ── Archivos ────────────────────────────────────────────────────────────────

export interface ArchivoEnDisco {
  ruta: string
  nombre: string
  publicado: boolean
}

/**
 * Datos para servir un archivo. Los de actividades sin publicar solo los ve el
 * panel (`incluirNoPublicados`): un borrador no debe filtrarse por su enlace.
 */
export async function obtenerArchivo(
  aid: string,
  opciones: { incluirNoPublicados: boolean },
): Promise<ArchivoEnDisco | null> {
  const filas = await sql<{ ruta_local: string; nombre_original: string; publicacion: string }[]>`
    SELECT f.ruta_local, f.nombre_original, a.publicacion
    FROM actividad_archivos f JOIN actividades a ON a.id = f.actividad_id
    WHERE f.id = ${aid}
  `
  const fila = filas[0]
  if (!fila) return null
  const publicado = fila.publicacion === 'publicado'
  if (!publicado && !opciones.incluirNoPublicados) return null
  return { ruta: fila.ruta_local, nombre: fila.nombre_original, publicado }
}

export async function existeArchivo(aid: string): Promise<boolean> {
  const filas = await sql`SELECT 1 FROM actividad_archivos WHERE id = ${aid}`
  return filas.length > 0
}

export type ResultadoEdicionArchivo = 'ok' | 'no_encontrado' | 'no_es_foto'

/** Corrige el tipo o el nombre visible de un archivo ya cargado. */
export async function actualizarArchivo(
  aid: string,
  cambios: { tipo: TipoArchivo; titulo: string },
): Promise<ResultadoEdicionArchivo> {
  const filas = await sql<{ nombre_original: string }[]>`
    SELECT nombre_original FROM actividad_archivos WHERE id = ${aid}
  `
  if (filas.length === 0) return 'no_encontrado'
  if (cambios.tipo === TIPO_FOTOGRAFIA && !esFotoWeb(filas[0].nombre_original)) {
    return 'no_es_foto'
  }
  // Pudo borrarse (sola o con su actividad) entre la consulta y el cambio.
  const cambiadas = await sql`
    UPDATE actividad_archivos
    SET tipo = ${cambios.tipo}, titulo = ${linea(cambios.titulo).slice(0, LARGO.titulo)}
    WHERE id = ${aid}
    RETURNING id
  `
  return cambiadas.length === 0 ? 'no_encontrado' : 'ok'
}

export async function eliminarArchivo(aid: string): Promise<boolean> {
  const filas = await sql<{ ruta_local: string }[]>`
    DELETE FROM actividad_archivos WHERE id = ${aid} RETURNING ruta_local
  `
  if (filas.length === 0) return false
  await borrarHuerfanos([filas[0].ruta_local])
  return true
}

// ── Resumen para la vista general del panel ────────────────────────────────

export interface ResumenActividades {
  total: number
  proximas: number
  realizadas: number
  borradores: number
  avisosVigentes: number
  proxima: Pick<
    ActividadPublica,
    'id' | 'titulo' | 'fecha' | 'hora_inicio' | 'hora_fin' | 'lugar'
  > | null
  /** Avisos publicados en vigencia o por empezar, del más próximo al más lejano. */
  avisos: Array<{
    actividad_id: string
    titulo: string
    inicio: string
    fin: string
    estado: 'vigente' | 'programado'
  }>
}

export async function resumenActividades(): Promise<ResumenActividades> {
  const [conteos, proximas, avisos] = await Promise.all([
    sql<Omit<ResumenActividades, 'proxima' | 'avisos'>[]>`
      SELECT count(*)::int AS total,
             (count(*) FILTER (WHERE ${esProxima()}))::int AS proximas,
             (count(*) FILTER (WHERE a.estado = 'realizada'))::int AS realizadas,
             (count(*) FILTER (WHERE a.publicacion = 'borrador'))::int AS borradores,
             (count(*) FILTER (WHERE a.publicacion = 'publicado' AND ${avisoEnVigencia()}))::int
               AS "avisosVigentes"
      FROM actividades a
    `,
    listarProximas(1),
    sql<ResumenActividades['avisos']>`
      SELECT a.id::text AS actividad_id,
             COALESCE(NULLIF(a.aviso_titulo, ''), a.titulo) AS titulo,
             a.aviso_inicio::text AS inicio, a.aviso_fin::text AS fin,
             CASE WHEN a.aviso_inicio > ${hoySql()} THEN 'programado' ELSE 'vigente' END AS estado
      FROM actividades a
      WHERE a.publicacion = 'publicado' AND a.aviso_activo AND a.aviso_fin >= ${hoySql()}
      ORDER BY a.aviso_inicio, a.aviso_fin
      LIMIT 5
    `,
  ])
  const siguiente = proximas[0]
  return {
    ...conteos[0],
    proxima: siguiente
      ? {
          id: siguiente.id,
          titulo: siguiente.titulo,
          fecha: siguiente.fecha,
          hora_inicio: siguiente.hora_inicio,
          hora_fin: siguiente.hora_fin,
          lugar: siguiente.lugar,
        }
      : null,
    avisos,
  }
}
