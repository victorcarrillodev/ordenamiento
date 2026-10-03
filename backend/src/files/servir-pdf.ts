/**
 * Respuesta HTTP para un PDF guardado en disco: se ve en el visor del navegador o
 * se descarga, según se pida. Lo usan los documentos de las participaciones y los
 * del Proyecto del Programa.
 */
import { readFile } from 'node:fs/promises'

import { rutaEnUploads } from '../services/actividades.ts'
import { contentDispositionHeader } from '../services/upload-guard.ts'
import { json } from '../utils.ts'

export async function servirPdf(opciones: {
  /** Ruta guardada en la base (relativa o absoluta); debe quedar dentro de `uploads/`. */
  ruta: string
  /** Nombre con que se muestra y con que se guarda al descargar. */
  nombre: string
  descarga: boolean
}): Promise<Response> {
  const segura = rutaEnUploads(opciones.ruta)
  if (!segura) return json({ error: 'Acceso a archivo no autorizado' }, 403)

  let contenido: Buffer
  try {
    contenido = await readFile(segura)
  } catch {
    return json({ error: 'El archivo no está disponible en el servidor' }, 404)
  }
  return new Response(new Uint8Array(contenido), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': contentDispositionHeader(
        opciones.descarga ? 'attachment' : 'inline',
        opciones.nombre,
      ),
      'content-length': String(contenido.byteLength),
      'x-content-type-options': 'nosniff',
      // Sin `sandbox`: el visor de PDF del navegador no abre dentro de un documento aislado.
      'content-security-policy': "default-src 'none'; frame-ancestors 'self'",
      'cross-origin-resource-policy': 'same-origin',
      // Retirar una publicación debe surtir efecto al instante: ningún caché lo conserva.
      'cache-control': 'no-store',
    },
  })
}
