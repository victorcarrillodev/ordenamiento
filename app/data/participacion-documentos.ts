/**
 * Documentos PDF de una participación, vistos desde el panel. Los tipos y su
 * significado son los del backend (`services/documentos-participacion.ts`).
 */

export const TIPOS_DOCUMENTO = [
  'formato_escaneado',
  'version_publica',
  'oficio',
  'oficio_publico',
] as const
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number]

export const esTipoDocumento = (valor: unknown): valor is TipoDocumento =>
  typeof valor === 'string' && (TIPOS_DOCUMENTO as readonly string[]).includes(valor)

/** Los dos únicos que se muestran en el portal, y solo cuando alguien los publica. */
export const TIPOS_PUBLICABLES: readonly TipoDocumento[] = ['version_publica', 'oficio_publico']

export interface DocumentoParticipacion {
  id: string
  participation_id: string
  tipo: TipoDocumento
  nombre_original: string
  size: number
  numero_oficio: string
  fecha_oficio: string | null
  publicado: boolean
  publicado_en: string | null
  created_at: string
}

/** Un correo enviado a quien participó, con su resultado. */
export interface EnvioParticipacion {
  id: string
  tipo: 'acuse' | 'respuesta'
  para: string
  asunto: string
  resultado: 'enviado' | 'error'
  detalle: string
  enviado_por: string
  created_at: string
}

export function documentoDeTipo(
  documentos: readonly DocumentoParticipacion[],
  tipo: TipoDocumento,
): DocumentoParticipacion | undefined {
  return documentos.find((d) => d.tipo === tipo)
}

/** Peso legible: `1.2 MB`, `350 KB`. */
export function pesoLegible(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * «5 de octubre de 2026, 3:30:15 p. m.», en la hora de la Ciudad de México y con
 * segundos: es la constancia de un envío. Se arma por partes para que no cambie
 * con la versión de ICU del servidor (que escribe «p.m.» o «p. m.» según el caso).
 */
export function fechaHoraMx(iso: string): string {
  const fecha = new Date(iso)
  if (isNaN(fecha.getTime())) return iso
  const partes = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(fecha)
  const de = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  const periodo =
    de('dayPeriod')
      .toLowerCase()
      .replace(/[\s.\u202f]/g, '') === 'am'
      ? 'a. m.'
      : 'p. m.'
  return `${de('day')} de ${de('month')} de ${de('year')}, ${de('hour')}:${de('minute')}:${de('second')} ${periodo}`
}
