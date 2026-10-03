/**
 * Respuesta a una participación: el área responsable prepara y firma el oficio
 * fuera del sistema, lo escanea y lo carga; revisa su vista previa y, solo
 * entonces, lo envía. Cargar el PDF nunca envía nada por sí solo.
 *
 * Cada envío deja su constancia (fecha, hora y resultado). No toca el dictamen
 * ni su «notificada»: son dos cosas distintas (el dictamen dice si procede; la
 * respuesta es el oficio firmado).
 */
import { readFile } from 'node:fs/promises'

import { sql } from '../db/pool.ts'
import { datosDeParticipacion } from './acuse-datos.ts'
import { obtenerDocumento } from './documentos-participacion.ts'
import { detalleDeError, registrarEnvio, type Envio } from './envios.ts'
import { asuntoRespuesta, enviarCorreoRespuesta, mailConfigurado } from './mail.ts'
import { rutaEnUploads } from './actividades.ts'

export type ResultadoRespuesta =
  { ok: true; envio: Envio } | { ok: false; status: number; error: string; envio?: Envio }

/** Nombre con que el oficio llega adjunto: lleva el folio, que es como se identifica el expediente. */
export const nombreArchivoOficio = (folio: string) => `Oficio de respuesta ${folio}.pdf`

/** Dependencias externas, sustituibles en las pruebas. */
export interface DependenciasRespuesta {
  correoConfigurado: typeof mailConfigurado
  enviarCorreo: typeof enviarCorreoRespuesta
  leerArchivo: (ruta: string) => Promise<Buffer>
}

const REAL: DependenciasRespuesta = {
  correoConfigurado: mailConfigurado,
  enviarCorreo: enviarCorreoRespuesta,
  leerArchivo: (ruta) => readFile(ruta),
}

/**
 * Envía el oficio de respuesta íntegro al correo registrado de la participación.
 * Requiere que el oficio ya esté cargado; no usa la versión pública.
 */
export async function enviarRespuesta(
  participationId: string,
  enviadoPor: string,
  deps: DependenciasRespuesta = REAL,
): Promise<ResultadoRespuesta> {
  const p = await datosDeParticipacion({ id: participationId })
  if (!p) return { ok: false, status: 404, error: 'Participación no encontrada' }

  const oficio = await obtenerDocumento(participationId, 'oficio')
  if (!oficio) {
    return { ok: false, status: 409, error: 'Primero carga el oficio de respuesta en PDF' }
  }

  const registrar = (resultado: 'enviado' | 'error', detalle: string) =>
    registrarEnvio({
      participationId,
      tipo: 'respuesta',
      para: p.correo,
      asunto: asuntoRespuesta(p.folio),
      resultado,
      detalle,
      enviadoPor,
    })

  if (!deps.correoConfigurado()) {
    const envio = await registrar('error', 'El correo no está configurado en el servidor')
    return { ok: false, status: 503, error: 'El correo no está configurado en el servidor', envio }
  }

  try {
    const ruta = rutaEnUploads(oficio.ruta_local)
    if (!ruta) throw new Error('El archivo del oficio no está disponible')
    const contenido = await deps.leerArchivo(ruta)
    await deps.enviarCorreo({
      para: p.correo,
      folio: p.folio,
      oficio: contenido,
      nombreArchivo: nombreArchivoOficio(p.folio),
    })
  } catch (err) {
    const detalle = detalleDeError(err)
    const envio = await registrar('error', detalle)
    return { ok: false, status: 502, error: `No se pudo enviar el correo: ${detalle}`, envio }
  }

  return { ok: true, envio: await registrar('enviado', '') }
}

/** ¿Existe la participación? Para responder 404 antes de leer archivos. */
export async function existeParticipacion(id: string): Promise<boolean> {
  const filas = await sql<
    { id: string }[]
  >`SELECT id::text AS id FROM participations WHERE id = ${id}`
  return filas.length > 0
}
