/**
 * Lo que necesita la pantalla de detalle de una participación: sus datos, sus
 * documentos PDF y los correos que se le han enviado. Lo usan tanto la vista
 * como las acciones que la vuelven a dibujar tras un error.
 */
import { fetchJsonOr } from '../../backend.ts'
import type {
  DocumentoParticipacion,
  EnvioParticipacion,
} from '../../data/participacion-documentos.ts'

interface Adjunto {
  id: string
  nombre_original: string
  mime: string
  size: number
}

export interface DetalleParticipacion {
  id: string
  folio: string
  origen: string
  /** Presenciales: `asistida` o `manuscrita`. */
  captura: string
  nombre: string
  correo: string
  alcance_ubicacion: string
  calle: string
  colonia: string
  codigo_postal: string
  domicilio: string
  municipio_participante: string
  institucion: string
  ocupacion: string
  observacion: string
  estado: string
  fuente: string
  fuente_otra: string
  genero: string
  tematica: string
  tematica_otra: string
  fecha: string
  resolucion_motivo: string
  resolucion_direccion: string
  resolucion_cita: string
  resolucion_en: string | null
  notificado_en: string | null
  notificado_a: string
  adjuntos: Adjunto[]
}

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '')

/** Adapta la respuesta del backend; con una participación inexistente, `p` es null. */
export async function cargarDetalle(
  request: Request,
  id: string,
): Promise<{
  p: DetalleParticipacion | null
  documentos: DocumentoParticipacion[]
  envios: EnvioParticipacion[]
}> {
  const [raw, extra] = await Promise.all([
    fetchJsonOr<Record<string, unknown> | null>(
      request,
      `/api/participations/${encodeURIComponent(id)}`,
      null,
    ),
    fetchJsonOr<{ documentos: DocumentoParticipacion[]; envios: EnvioParticipacion[] }>(
      request,
      `/api/participations/${encodeURIComponent(id)}/documentos`,
      { documentos: [], envios: [] },
    ),
  ])

  const p: DetalleParticipacion | null = raw
    ? {
        id: raw.id as string,
        folio: raw.folio as string,
        origen: raw.origen as string,
        captura: texto(raw.captura),
        nombre: raw.nombre as string,
        correo: raw.correo as string,
        alcance_ubicacion: texto(raw.alcance_ubicacion),
        calle: texto(raw.calle),
        colonia: texto(raw.colonia),
        codigo_postal: texto(raw.codigo_postal),
        domicilio: raw.domicilio as string,
        municipio_participante: raw.municipio_participante as string,
        institucion: raw.institucion as string,
        ocupacion: raw.ocupacion as string,
        observacion: raw.observacion as string,
        estado: raw.estado as string,
        fuente: raw.fuente as string,
        fuente_otra: texto(raw.fuente_otra),
        genero: raw.genero as string,
        tematica: raw.tematica as string,
        tematica_otra: texto(raw.tematica_otra),
        fecha: raw.created_at as string,
        resolucion_motivo: texto(raw.resolucion_motivo),
        resolucion_direccion: texto(raw.resolucion_direccion),
        resolucion_cita: texto(raw.resolucion_cita),
        resolucion_en: (raw.resolucion_en as string) ?? null,
        notificado_en: (raw.notificado_en as string) ?? null,
        notificado_a: texto(raw.notificado_a),
        adjuntos: ((raw.attachments ?? []) as Adjunto[]).map((a) => ({
          id: a.id,
          nombre_original: a.nombre_original,
          mime: a.mime,
          size: a.size,
        })),
      }
    : null

  return { p, documentos: extra.documentos ?? [], envios: extra.envios ?? [] }
}
