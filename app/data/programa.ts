/**
 * Actividades y avances del Programa: catálogos y formas de datos del frontend.
 *
 * Espejo de backend/src/services/actividades.ts (frontend y backend se
 * despliegan por separado y no comparten módulos). Cada actividad se registra
 * una sola vez y el backend decide dónde se ve: próximas actividades,
 * calendario, avances o franja de avisos.
 */

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

export const ETIQUETA_ESTADO: Record<EstadoActividad, string> = {
  programada: 'Programada',
  realizada: 'Realizada',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
}

export const ESTADOS_PUBLICACION = ['borrador', 'publicado', 'oculto'] as const
export type EstadoPublicacion = (typeof ESTADOS_PUBLICACION)[number]

export const ETIQUETA_PUBLICACION: Record<EstadoPublicacion, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  oculto: 'Oculto',
}

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

/** Tipos para los documentos (todo menos fotografía, que tiene su propio campo). */
export const TIPOS_DOCUMENTO = TIPOS_ARCHIVO.filter((t) => t !== TIPO_FOTOGRAFIA)

function esDe<T extends string>(lista: readonly T[], valor: unknown): valor is T {
  return typeof valor === 'string' && (lista as readonly string[]).includes(valor)
}

export const esFasePrograma = (v: unknown): v is FasePrograma => esDe(FASES_PROGRAMA, v)
export const esEstadoActividad = (v: unknown): v is EstadoActividad => esDe(ESTADOS_ACTIVIDAD, v)
export const esEstadoPublicacion = (v: unknown): v is EstadoPublicacion =>
  esDe(ESTADOS_PUBLICACION, v)
export const esTipoArchivo = (v: unknown): v is TipoArchivo => esDe(TIPOS_ARCHIVO, v)

// ── Formas que devuelve el backend ─────────────────────────────────────────

export interface ArchivoActividad {
  id: string
  actividad_id: string
  tipo: TipoArchivo
  /** Nombre para mostrar; vacío = el nombre del archivo. */
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

/** El aviso de la franja de la portada. */
export interface AvisoPortada extends AvisoActividad {
  actividad_id: string
}

/** Lo que ve la ciudadanía de una actividad publicada. */
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
  /** Solo si el aviso de la actividad está en vigencia hoy. */
  aviso: AvisoActividad | null
  archivos?: ArchivoActividad[]
}

/** Archivo del repositorio público, con la actividad a la que pertenece. */
export interface DocumentoPublico extends ArchivoActividad {
  actividad_titulo: string
  actividad_fecha: string
  actividad_fase: FasePrograma
}

export type EstadoAviso = 'sin_aviso' | 'programado' | 'vigente' | 'vencido'

/** Dónde aparece hoy la actividad en el portal. */
export interface VisibilidadActividad {
  proximas: boolean
  calendario: boolean
  avances: boolean
  aviso: EstadoAviso
  /** Sigue programada con la fecha ya pasada: toca actualizar su estado. */
  fechaPasada: boolean
}

/** Una actividad tal como la ve el panel (cualquier estado de publicación). */
export interface ActividadGestion {
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
  publicacion: EstadoPublicacion
  aviso_activo: boolean
  aviso_titulo: string
  aviso_descripcion: string
  aviso_inicio: string | null
  aviso_fin: string | null
  created_at: string
  updated_at: string
  total_archivos: number
  visibilidad: VisibilidadActividad
  archivos?: ArchivoActividad[]
}

/** Nombre visible de un archivo. */
export function nombreDeArchivo(archivo: Pick<ArchivoActividad, 'titulo' | 'nombre_original'>) {
  return archivo.titulo || archivo.nombre_original
}

/** Separa las fotografías (galería) de los documentos (lista con ver/descargar). */
export function separarArchivos(archivos: readonly ArchivoActividad[] = []) {
  return {
    fotos: archivos.filter((a) => a.tipo === TIPO_FOTOGRAFIA),
    documentos: archivos.filter((a) => a.tipo !== TIPO_FOTOGRAFIA),
  }
}

/** `1.2 MB`, `350 KB`… para acompañar la opción de descarga. */
export function pesoLegible(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Enlace «Cómo llegar». Las coordenadas mandan porque son exactas; si no hay,
 * un enlace de Maps pegado como dirección se usa tal cual (solo http/https:
 * cualquier otro esquema, como `javascript:`, nunca llega a un href); y si la
 * dirección es texto, se busca en Google Maps.
 */
export function enlaceUbicacion(
  actividad: Pick<ActividadPublica, 'latitud' | 'longitud' | 'direccion' | 'lugar'>,
): string | null {
  const { latitud, longitud, direccion, lugar } = actividad
  if (
    latitud &&
    longitud &&
    Number.isFinite(Number(latitud)) &&
    Number.isFinite(Number(longitud))
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${Number(latitud)},${Number(longitud)}`
  }
  if (/^https?:\/\//i.test(direccion)) return direccion
  const texto = [lugar, direccion].filter(Boolean).join(', ')
  return texto
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}`
    : null
}
